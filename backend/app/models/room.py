from sqlalchemy import Column, String, Text, DateTime, Integer
from sqlalchemy.sql import func
from app.database import Base
import uuid


class Room(Base):
    """Room model for storing collaborative coding rooms."""
    
    __tablename__ = "rooms"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code_content = Column(Text, default="# Start coding here...\n")
    language = Column(String(50), default="python")
    active_users = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<Room(id={self.id}, language={self.language}, active_users={self.active_users})>"
