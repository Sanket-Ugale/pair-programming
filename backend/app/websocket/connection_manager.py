from fastapi import WebSocket
from typing import Dict, Set, List, Optional
import json
import asyncio
from datetime import datetime


class User:
    """Represents a connected user."""
    def __init__(self, user_id: str, username: str, color: str):
        self.id = user_id
        self.username = username
        self.color = color
        self.is_typing = False
        self.last_active = datetime.utcnow().isoformat()
    
    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "color": self.color,
            "isTyping": self.is_typing,
            "lastActive": self.last_active,
        }


class ChatMessage:
    """Represents a chat message."""
    def __init__(self, msg_id: str, user_id: str, username: str, content: str, msg_type: str = "message"):
        self.id = msg_id
        self.user_id = user_id
        self.username = username
        self.content = content
        self.timestamp = datetime.utcnow().isoformat()
        self.type = msg_type
    
    def to_dict(self):
        return {
            "id": self.id,
            "userId": self.user_id,
            "username": self.username,
            "content": self.content,
            "timestamp": self.timestamp,
            "type": self.type,
        }


class ConnectionManager:
    """
    Manages WebSocket connections for real-time collaborative editing.
    
    Features:
    - Room-based connection management
    - Broadcasting messages to all users in a room
    - User presence tracking with names and colors
    - In-memory code state caching for faster access
    - Chat message history
    - Typing indicators
    """
    
    def __init__(self):
        # Map of room_id -> set of WebSocket connections
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # Map of room_id -> current code state (cache)
        self.room_code_cache: Dict[str, str] = {}
        # Map of room_id -> language
        self.room_language_cache: Dict[str, str] = {}
        # Map of room_id -> dict of user_id -> cursor position
        self.user_cursors: Dict[str, Dict[str, dict]] = {}
        # Map of websocket -> user info
        self.connection_info: Dict[WebSocket, dict] = {}
        # Map of room_id -> dict of user_id -> User
        self.room_users: Dict[str, Dict[str, User]] = {}
        # Map of room_id -> list of chat messages (last 50)
        self.room_chat_history: Dict[str, List[ChatMessage]] = {}
        # Map of room_id -> set of typing user_ids
        self.room_typing_users: Dict[str, Set[str]] = {}
    
    async def connect(self, websocket: WebSocket, room_id: str, user_id: str, username: str, color: str):
        """Accept a new WebSocket connection and add it to a room."""
        await websocket.accept()
        
        # Initialize room if it doesn't exist
        if room_id not in self.active_connections:
            self.active_connections[room_id] = set()
            self.user_cursors[room_id] = {}
            self.room_users[room_id] = {}
            self.room_chat_history[room_id] = []
            self.room_typing_users[room_id] = set()
        
        # Add connection to room
        self.active_connections[room_id].add(websocket)
        
        # Create user
        user = User(user_id, username, color)
        self.room_users[room_id][user_id] = user
        
        # Store connection info
        self.connection_info[websocket] = {
            "room_id": room_id,
            "user_id": user_id,
            "username": username,
            "color": color,
            "connected_at": datetime.utcnow().isoformat()
        }
        
        # Initialize user cursor
        self.user_cursors[room_id][user_id] = {
            "position": 0,
            "selection": None,
            "username": username,
            "color": color,
        }
        
        try:
            # Get all users dict
            users_dict = {uid: u.to_dict() for uid, u in self.room_users[room_id].items()}
            
            # Get chat history
            chat_history = [msg.to_dict() for msg in self.room_chat_history.get(room_id, [])]
            
            # Send current room state to new user first
            welcome_message = {
                "type": "room_state",
                "payload": {
                    "code": self.room_code_cache.get(room_id, "# Welcome to Pair Programming!\n# Start coding together...\n\n"),
                    "language": self.room_language_cache.get(room_id, "python"),
                    "activeUsers": len(self.active_connections[room_id]),
                    "users": users_dict,
                    "cursors": self.user_cursors[room_id],
                    "userId": user_id,
                    "chatHistory": chat_history,
                }
            }
            await websocket.send_json(welcome_message)
            
            # Notify others in the room
            await self.broadcast_to_room(room_id, {
                "type": "user_joined",
                "payload": {
                    "userId": user_id,
                    "username": username,
                    "color": color,
                    "activeUsers": len(self.active_connections[room_id]),
                    "users": users_dict,
                    "cursors": self.user_cursors[room_id]
                }
            }, exclude=websocket)
        except Exception as e:
            print(f"Error sending welcome message: {e}")
            # Connection may have been closed, clean up
            self.active_connections[room_id].discard(websocket)
            if user_id in self.room_users.get(room_id, {}):
                del self.room_users[room_id][user_id]
            if user_id in self.user_cursors.get(room_id, {}):
                del self.user_cursors[room_id][user_id]
            raise
    
    def disconnect(self, websocket: WebSocket, room_id: str, user_id: str):
        """Remove a WebSocket connection from a room."""
        username = "Unknown"
        
        if room_id in self.active_connections:
            self.active_connections[room_id].discard(websocket)
            
            # Get username before removing
            if room_id in self.room_users and user_id in self.room_users[room_id]:
                username = self.room_users[room_id][user_id].username
                del self.room_users[room_id][user_id]
            
            # Remove user cursor
            if room_id in self.user_cursors and user_id in self.user_cursors[room_id]:
                del self.user_cursors[room_id][user_id]
            
            # Remove from typing users
            if room_id in self.room_typing_users:
                self.room_typing_users[room_id].discard(user_id)
            
            # Clean up empty rooms after a delay (keep code cached for a while)
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]
                if room_id in self.user_cursors:
                    del self.user_cursors[room_id]
                if room_id in self.room_users:
                    del self.room_users[room_id]
                if room_id in self.room_typing_users:
                    del self.room_typing_users[room_id]
                # Keep code cache and chat history for reconnections
        
        # Remove connection info
        if websocket in self.connection_info:
            del self.connection_info[websocket]
        
        return username
    
    async def broadcast_to_room(self, room_id: str, message: dict, exclude: WebSocket = None):
        """Send a message to all connections in a room except the excluded one."""
        if room_id not in self.active_connections:
            return
        
        disconnected = set()
        for connection in self.active_connections[room_id]:
            if connection != exclude:
                try:
                    await connection.send_json(message)
                except Exception:
                    disconnected.add(connection)
        
        # Clean up disconnected connections
        for conn in disconnected:
            self.active_connections[room_id].discard(conn)
    
    async def handle_code_update(self, room_id: str, user_id: str, username: str, code: str, cursor_position: int, websocket: WebSocket):
        """Handle code update from a user."""
        # Update code cache
        self.room_code_cache[room_id] = code
        
        # Update user cursor
        if room_id in self.user_cursors:
            color = self.user_cursors[room_id].get(user_id, {}).get("color", "#ffffff")
            self.user_cursors[room_id][user_id] = {
                "position": cursor_position,
                "selection": None,
                "username": username,
                "color": color,
            }
        
        # Update last active
        if room_id in self.room_users and user_id in self.room_users[room_id]:
            self.room_users[room_id][user_id].last_active = datetime.utcnow().isoformat()
        
        # Broadcast to other users
        await self.broadcast_to_room(room_id, {
            "type": "code_update",
            "payload": {
                "code": code,
                "cursorPosition": cursor_position,
                "userId": user_id,
                "username": username,
                "timestamp": datetime.utcnow().isoformat()
            }
        }, exclude=websocket)
    
    async def handle_cursor_update(self, room_id: str, user_id: str, username: str, cursor_position: int, selection: dict = None, websocket: WebSocket = None):
        """Handle cursor position update from a user."""
        if room_id in self.user_cursors:
            color = self.user_cursors[room_id].get(user_id, {}).get("color", "#ffffff")
            self.user_cursors[room_id][user_id] = {
                "position": cursor_position,
                "selection": selection,
                "username": username,
                "color": color,
            }
        
        await self.broadcast_to_room(room_id, {
            "type": "cursor_update",
            "payload": {
                "userId": user_id,
                "username": username,
                "cursorPosition": cursor_position,
                "selection": selection
            }
        }, exclude=websocket)
    
    async def handle_chat_message(self, room_id: str, user_id: str, username: str, content: str, msg_type: str = "message"):
        """Handle a chat message from a user."""
        import uuid
        msg = ChatMessage(str(uuid.uuid4()), user_id, username, content, msg_type)
        
        # Store in history (keep last 50 messages)
        if room_id not in self.room_chat_history:
            self.room_chat_history[room_id] = []
        self.room_chat_history[room_id].append(msg)
        if len(self.room_chat_history[room_id]) > 50:
            self.room_chat_history[room_id] = self.room_chat_history[room_id][-50:]
        
        # Broadcast to all users including sender
        await self.broadcast_to_room(room_id, {
            "type": "chat_message",
            "payload": {
                "message": msg.to_dict()
            }
        })
    
    async def handle_typing_start(self, room_id: str, user_id: str, username: str, websocket: WebSocket):
        """Handle typing start indicator."""
        if room_id not in self.room_typing_users:
            self.room_typing_users[room_id] = set()
        self.room_typing_users[room_id].add(user_id)
        
        if room_id in self.room_users and user_id in self.room_users[room_id]:
            self.room_users[room_id][user_id].is_typing = True
        
        await self.broadcast_to_room(room_id, {
            "type": "typing_start",
            "payload": {
                "userId": user_id,
                "username": username,
            }
        }, exclude=websocket)
    
    async def handle_typing_stop(self, room_id: str, user_id: str, username: str, websocket: WebSocket):
        """Handle typing stop indicator."""
        if room_id in self.room_typing_users:
            self.room_typing_users[room_id].discard(user_id)
        
        if room_id in self.room_users and user_id in self.room_users[room_id]:
            self.room_users[room_id][user_id].is_typing = False
        
        await self.broadcast_to_room(room_id, {
            "type": "typing_stop",
            "payload": {
                "userId": user_id,
                "username": username,
            }
        }, exclude=websocket)
    
    async def handle_language_change(self, room_id: str, user_id: str, username: str, language: str):
        """Handle language change."""
        self.room_language_cache[room_id] = language
        
        await self.broadcast_to_room(room_id, {
            "type": "language_change",
            "payload": {
                "language": language,
                "userId": user_id,
                "username": username,
            }
        })
    
    def get_room_users_count(self, room_id: str) -> int:
        """Get the number of active users in a room."""
        if room_id in self.active_connections:
            return len(self.active_connections[room_id])
        return 0
    
    def get_room_code(self, room_id: str) -> str:
        """Get cached code for a room."""
        return self.room_code_cache.get(room_id, "# Welcome to Pair Programming!\n# Start coding together...\n\n")
    
    def set_room_code(self, room_id: str, code: str):
        """Set cached code for a room."""
        self.room_code_cache[room_id] = code
    
    def set_room_language(self, room_id: str, language: str):
        """Set cached language for a room."""
        self.room_language_cache[room_id] = language


# Global connection manager instance
manager = ConnectionManager()
