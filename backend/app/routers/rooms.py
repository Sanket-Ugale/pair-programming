from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services.room_service import RoomService
from app.schemas.room import RoomCreate, RoomResponse

router = APIRouter(prefix="/rooms", tags=["rooms"])


@router.post("", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
async def create_room(
    room_data: RoomCreate = RoomCreate(),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new collaborative coding room.
    
    Returns the room ID that can be used to join the room via WebSocket.
    """
    room = await RoomService.create_room(db, room_data)
    return RoomResponse(
        roomId=room.id,
        language=room.language,
        codeContent=room.code_content,
        activeUsers=room.active_users,
        createdAt=room.created_at,
    )


@router.get("/{room_id}", response_model=RoomResponse)
async def get_room(
    room_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get room details by ID.
    """
    room = await RoomService.get_room(db, room_id)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Room with ID '{room_id}' not found"
        )
    return RoomResponse(
        roomId=room.id,
        language=room.language,
        codeContent=room.code_content,
        activeUsers=room.active_users,
        createdAt=room.created_at,
    )


@router.get("", response_model=list[RoomResponse])
async def list_rooms(db: AsyncSession = Depends(get_db)):
    """
    List all available rooms.
    """
    rooms = await RoomService.get_all_rooms(db)
    return [
        RoomResponse(
            roomId=room.id,
            language=room.language,
            codeContent=room.code_content,
            activeUsers=room.active_users,
            createdAt=room.created_at,
        )
        for room in rooms
    ]
