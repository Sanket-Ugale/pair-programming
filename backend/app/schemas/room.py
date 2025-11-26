from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class RoomCreate(BaseModel):
    """Schema for creating a new room."""
    language: str = Field(default="python", description="Programming language for the room")


class RoomResponse(BaseModel):
    """Schema for room response."""
    roomId: str = Field(..., description="Unique room identifier")
    language: str = Field(..., description="Programming language")
    codeContent: str = Field(..., description="Current code content")
    activeUsers: int = Field(..., description="Number of active users")
    createdAt: datetime = Field(..., description="Room creation timestamp")
    
    class Config:
        from_attributes = True


class RoomCodeUpdate(BaseModel):
    """Schema for code updates via WebSocket."""
    code: str = Field(..., description="Updated code content")
    cursorPosition: int = Field(..., description="Current cursor position")
    userId: Optional[str] = Field(None, description="User identifier")


class AutocompleteRequest(BaseModel):
    """Schema for autocomplete request."""
    code: str = Field(..., description="Current code content")
    cursorPosition: int = Field(..., ge=0, description="Current cursor position")
    language: str = Field(default="python", description="Programming language")


class AutocompleteResponse(BaseModel):
    """Schema for autocomplete response."""
    suggestion: str = Field(..., description="Suggested code completion")
    startPosition: int = Field(..., description="Start position for insertion")
    endPosition: int = Field(..., description="End position for insertion")
    description: Optional[str] = Field(None, description="Description of the suggestion")


class WebSocketMessage(BaseModel):
    """Schema for WebSocket messages."""
    type: str = Field(..., description="Message type: 'code_update', 'cursor_update', 'user_joined', 'user_left'")
    payload: dict = Field(..., description="Message payload")
    userId: Optional[str] = Field(None, description="User identifier")
    timestamp: Optional[datetime] = Field(None, description="Message timestamp")
