from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.room import Room
from app.schemas.room import RoomCreate
import uuid


# Default starter code templates
STARTER_CODE = {
    "python": '# Welcome to Pair Programming!\n# Start coding together...\n\ndef main():\n    print("Hello, World!")\n\nif __name__ == "__main__":\n    main()\n',
    "javascript": '// Welcome to Pair Programming!\n// Start coding together...\n\nfunction main() {\n    console.log("Hello, World!");\n}\n\nmain();\n',
    "typescript": '// Welcome to Pair Programming!\n// Start coding together...\n\nfunction main(): void {\n    console.log("Hello, World!");\n}\n\nmain();\n',
    "java": '// Welcome to Pair Programming!\n// Start coding together...\n\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n',
    "cpp": '// Welcome to Pair Programming!\n// Start coding together...\n\n#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}\n',
    "go": '// Welcome to Pair Programming!\n// Start coding together...\n\npackage main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}\n',
    "rust": '// Welcome to Pair Programming!\n// Start coding together...\n\nfn main() {\n    println!("Hello, World!");\n}\n',
    "ruby": '# Welcome to Pair Programming!\n# Start coding together...\n\ndef main\n  puts "Hello, World!"\nend\n\nmain\n',
}


class RoomService:
    """Service class for room-related operations."""
    
    @staticmethod
    async def create_room(db: AsyncSession, room_data: RoomCreate) -> Room:
        """Create a new room."""
        language = room_data.language or "python"
        starter_code = STARTER_CODE.get(language, STARTER_CODE["python"])
        
        room = Room(
            id=str(uuid.uuid4()),
            language=language,
            code_content=starter_code,
            active_users=0,
        )
        db.add(room)
        await db.commit()
        await db.refresh(room)
        return room
    
    @staticmethod
    async def get_room(db: AsyncSession, room_id: str) -> Room | None:
        """Get a room by ID."""
        result = await db.execute(select(Room).where(Room.id == room_id))
        return result.scalar_one_or_none()
    
    @staticmethod
    async def update_room_code(db: AsyncSession, room_id: str, code: str) -> Room | None:
        """Update room code content."""
        room = await RoomService.get_room(db, room_id)
        if room:
            room.code_content = code
            await db.commit()
            await db.refresh(room)
        return room
    
    @staticmethod
    async def update_room_language(db: AsyncSession, room_id: str, language: str) -> Room | None:
        """Update room language."""
        room = await RoomService.get_room(db, room_id)
        if room:
            room.language = language
            await db.commit()
            await db.refresh(room)
        return room
    
    @staticmethod
    async def update_active_users(db: AsyncSession, room_id: str, delta: int) -> Room | None:
        """Update active users count."""
        room = await RoomService.get_room(db, room_id)
        if room:
            room.active_users = max(0, room.active_users + delta)
            await db.commit()
            await db.refresh(room)
        return room
    
    @staticmethod
    async def get_all_rooms(db: AsyncSession) -> list[Room]:
        """Get all rooms."""
        result = await db.execute(select(Room).order_by(Room.created_at.desc()))
        return list(result.scalars().all())
    
    @staticmethod
    async def delete_room(db: AsyncSession, room_id: str) -> bool:
        """Delete a room."""
        room = await RoomService.get_room(db, room_id)
        if room:
            await db.delete(room)
            await db.commit()
            return True
        return False
