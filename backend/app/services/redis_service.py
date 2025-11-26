import redis.asyncio as redis
from typing import Optional
import json
from app.config import settings


class RedisService:
    """Redis service for caching and pub/sub."""
    
    _instance: Optional['RedisService'] = None
    _client: Optional[redis.Redis] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    async def connect(self) -> None:
        """Connect to Redis."""
        if self._client is None:
            self._client = redis.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=True,
            )
            # Test connection
            await self._client.ping()
            print(f"Connected to Redis at {settings.redis_host}:{settings.redis_port}")
    
    async def disconnect(self) -> None:
        """Disconnect from Redis."""
        if self._client:
            await self._client.close()
            self._client = None
    
    @property
    def client(self) -> redis.Redis:
        """Get Redis client."""
        if self._client is None:
            raise RuntimeError("Redis client not initialized. Call connect() first.")
        return self._client
    
    # Room state caching
    async def cache_room_code(self, room_id: str, code: str, ttl: int = 3600) -> None:
        """Cache room code with TTL."""
        await self.client.setex(f"room:{room_id}:code", ttl, code)
    
    async def get_cached_room_code(self, room_id: str) -> Optional[str]:
        """Get cached room code."""
        return await self.client.get(f"room:{room_id}:code")
    
    async def cache_room_language(self, room_id: str, language: str, ttl: int = 3600) -> None:
        """Cache room language."""
        await self.client.setex(f"room:{room_id}:language", ttl, language)
    
    async def get_cached_room_language(self, room_id: str) -> Optional[str]:
        """Get cached room language."""
        return await self.client.get(f"room:{room_id}:language")
    
    # User presence tracking
    async def add_user_to_room(self, room_id: str, user_id: str, user_data: dict, ttl: int = 3600) -> None:
        """Add user to room set."""
        await self.client.hset(f"room:{room_id}:users", user_id, json.dumps(user_data))
        await self.client.expire(f"room:{room_id}:users", ttl)
    
    async def remove_user_from_room(self, room_id: str, user_id: str) -> None:
        """Remove user from room."""
        await self.client.hdel(f"room:{room_id}:users", user_id)
    
    async def get_room_users(self, room_id: str) -> dict:
        """Get all users in a room."""
        users = await self.client.hgetall(f"room:{room_id}:users")
        return {k: json.loads(v) for k, v in users.items()}
    
    async def get_room_user_count(self, room_id: str) -> int:
        """Get number of users in a room."""
        return await self.client.hlen(f"room:{room_id}:users")
    
    # Chat history caching
    async def add_chat_message(self, room_id: str, message: dict, max_messages: int = 50) -> None:
        """Add chat message to room history."""
        key = f"room:{room_id}:chat"
        await self.client.rpush(key, json.dumps(message))
        # Keep only last max_messages
        await self.client.ltrim(key, -max_messages, -1)
        await self.client.expire(key, 86400)  # 24 hours
    
    async def get_chat_history(self, room_id: str, limit: int = 50) -> list:
        """Get chat history for a room."""
        messages = await self.client.lrange(f"room:{room_id}:chat", -limit, -1)
        return [json.loads(m) for m in messages]
    
    # Execution result caching
    async def cache_execution_result(self, code_hash: str, result: dict, ttl: int = 300) -> None:
        """Cache code execution result."""
        await self.client.setex(f"exec:{code_hash}", ttl, json.dumps(result))
    
    async def get_cached_execution_result(self, code_hash: str) -> Optional[dict]:
        """Get cached execution result."""
        result = await self.client.get(f"exec:{code_hash}")
        return json.loads(result) if result else None
    
    # Rate limiting
    async def check_rate_limit(self, key: str, limit: int, window: int) -> bool:
        """Check if rate limit is exceeded. Returns True if allowed."""
        current = await self.client.incr(key)
        if current == 1:
            await self.client.expire(key, window)
        return current <= limit


# Global Redis service instance
redis_service = RedisService()
