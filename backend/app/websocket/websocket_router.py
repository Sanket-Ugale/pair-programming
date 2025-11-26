from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
import json
import uuid
from app.database import get_db, async_session_maker
from app.services.room_service import RoomService
from app.websocket.connection_manager import manager

router = APIRouter()

# User colors palette
USER_COLORS = [
    '#ff6b6b', '#4ecdc4', '#45b7d1', '#96c93d', '#f9ca24',
    '#f0932b', '#eb4d4b', '#6c5ce7', '#a29bfe', '#fd79a8',
    '#00b894', '#0984e3', '#e17055', '#fdcb6e',
]

def get_color_for_user(user_id: str) -> str:
    """Generate consistent color for a user based on their ID."""
    hash_val = sum(ord(c) for c in user_id)
    return USER_COLORS[hash_val % len(USER_COLORS)]


@router.websocket("/ws/{room_id}")
async def websocket_endpoint(
    websocket: WebSocket, 
    room_id: str,
    username: str = Query(default=None),
    userId: str = Query(default=None),
):
    """
    WebSocket endpoint for real-time collaborative editing.
    
    Query Parameters:
    - username: Display name for the user
    - userId: Persistent user ID (stored in localStorage)
    
    Message Types:
    - code_update: Sent when user types/edits code
    - cursor_update: Sent when user moves cursor
    - chat_message: Sent when user sends a chat message
    - typing_start: Sent when user starts typing in chat
    - typing_stop: Sent when user stops typing in chat
    - language_change: Sent when user changes the language
    - user_joined: Broadcast when a new user joins
    - user_left: Broadcast when a user leaves
    - room_state: Sent to new user with current room state
    """
    # Use provided userId or generate a new one
    user_id = userId or str(uuid.uuid4())[:8]
    user_name = username or f"User_{user_id[:4]}"
    user_color = get_color_for_user(user_id)
    
    # Verify room exists and load initial state
    async with async_session_maker() as db:
        room = await RoomService.get_room(db, room_id)
        if room:
            # Load code from database to cache if not already cached
            if room_id not in manager.room_code_cache:
                manager.set_room_code(room_id, room.code_content)
                manager.set_room_language(room_id, room.language)
            
            # Update active users count
            await RoomService.update_active_users(db, room_id, 1)
    
    # Accept connection and add to room
    await manager.connect(websocket, room_id, user_id, user_name, user_color)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                message_type = message.get("type")
                payload = message.get("payload", {})
                
                if message_type == "code_update":
                    # Handle code update
                    code = payload.get("code", "")
                    cursor_position = payload.get("cursorPosition", 0)
                    
                    await manager.handle_code_update(
                        room_id, user_id, user_name, code, cursor_position, websocket
                    )
                    
                    # Persist code to database
                    async with async_session_maker() as db:
                        await RoomService.update_room_code(db, room_id, code)
                
                elif message_type == "cursor_update":
                    # Handle cursor position update
                    cursor_position = payload.get("cursorPosition", 0)
                    selection = payload.get("selection")
                    
                    await manager.handle_cursor_update(
                        room_id, user_id, user_name, cursor_position, selection, websocket
                    )
                
                elif message_type == "chat_message":
                    # Handle chat message
                    content = payload.get("content", "")
                    msg_type = payload.get("messageType", "message")
                    
                    if content.strip():
                        await manager.handle_chat_message(
                            room_id, user_id, user_name, content, msg_type
                        )
                
                elif message_type == "typing_start":
                    await manager.handle_typing_start(room_id, user_id, user_name, websocket)
                
                elif message_type == "typing_stop":
                    await manager.handle_typing_stop(room_id, user_id, user_name, websocket)
                
                elif message_type == "language_change":
                    language = payload.get("language", "python")
                    await manager.handle_language_change(room_id, user_id, user_name, language)
                    
                    # Persist language to database
                    async with async_session_maker() as db:
                        await RoomService.update_room_language(db, room_id, language)
                
                elif message_type == "ping":
                    # Handle heartbeat ping
                    await websocket.send_json({"type": "pong"})
                
            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "payload": {"message": "Invalid JSON format"}
                })
    
    except WebSocketDisconnect:
        # Handle disconnect
        username_left = manager.disconnect(websocket, room_id, user_id)
        
        # Update active users count in database
        async with async_session_maker() as db:
            await RoomService.update_active_users(db, room_id, -1)
        
        # Notify others
        await manager.broadcast_to_room(room_id, {
            "type": "user_left",
            "payload": {
                "userId": user_id,
                "username": username_left,
                "activeUsers": manager.get_room_users_count(room_id)
            }
        })
