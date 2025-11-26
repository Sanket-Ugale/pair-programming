# Real-Time Pair Programming Application

A full-stack real-time pair-programming web application where two or more users can join the same room, edit code together, and see each other's changes instantly. The system also provides AI-style autocomplete suggestions (mocked).

## 🚀 Features

- **Room Creation & Joining**: Create new coding rooms or join existing ones via room ID
- **Real-Time Collaborative Editing**: WebSocket-based real-time code synchronization
- **AI Autocomplete**: Mocked rule-based code suggestions for Python, JavaScript, and TypeScript
- **Multi-User Cursor Tracking**: See other users' cursor positions in real-time
- **No Authentication Required**: Just create a room and start coding
- **Persistent Room State**: Code is stored in database (SQLite default, PostgreSQL optional)

## 🏗 Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  React Frontend │────▶│  FastAPI        │────▶│  SQLite/        │
│  (TypeScript)   │◀────│  Backend        │◀────│  PostgreSQL     │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │    WebSocket          │
        │    Connection         │
        └───────────────────────┘
```

### Backend Structure
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app entry point
│   ├── config.py            # Settings and configuration
│   ├── database.py          # Database connection and session
│   ├── models/              # SQLAlchemy models
│   │   └── room.py          # Room model
│   ├── schemas/             # Pydantic schemas
│   │   └── room.py          # Request/Response schemas
│   ├── routers/             # API route handlers
│   │   ├── rooms.py         # Room CRUD endpoints
│   │   └── autocomplete.py  # Autocomplete endpoint
│   ├── services/            # Business logic
│   │   ├── room_service.py  # Room operations
│   │   └── autocomplete_service.py  # Autocomplete logic
│   └── websocket/           # WebSocket handling
│       ├── connection_manager.py  # Connection management
│       └── websocket_router.py    # WebSocket endpoint
├── requirements.txt
├── .env
└── .env.example
```

### Frontend Structure
```
frontend/
├── src/
│   ├── main.tsx             # App entry point
│   ├── App.tsx              # Route configuration
│   ├── index.css            # Global styles (Tailwind)
│   ├── types/               # TypeScript type definitions
│   ├── store/               # Redux store
│   │   ├── index.ts         # Store configuration
│   │   └── slices/          # Redux slices
│   │       ├── editorSlice.ts
│   │       └── roomSlice.ts
│   ├── services/            # API services
│   │   └── api.ts           # REST API client
│   ├── hooks/               # Custom React hooks
│   │   ├── useWebSocket.ts  # WebSocket hook
│   │   └── useAutocomplete.ts
│   ├── components/          # React components
│   │   ├── Layout.tsx
│   │   ├── Header.tsx
│   │   ├── CodeEditor.tsx   # Monaco Editor wrapper
│   │   └── RoomInfo.tsx
│   └── pages/               # Page components
│       ├── Home.tsx         # Landing page
│       └── Room.tsx         # Coding room page
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

## 🛠 Tech Stack

### Backend
- **Python 3.10+**
- **FastAPI** - Modern, fast web framework
- **WebSockets** - Real-time bidirectional communication
- **SQLAlchemy** - Async ORM for SQLite/PostgreSQL
- **SQLite** - Default database (zero configuration)
- **PostgreSQL** - Optional production database
- **Pydantic** - Data validation and settings management

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Redux Toolkit** - State management
- **Monaco Editor** - VS Code's code editor
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first styling

## 📦 Prerequisites

- Python 3.10+
- Node.js 18+
- npm or yarn
- PostgreSQL 13+ (optional, for production)

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd tredence
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# (Optional) Configure environment variables
# The app uses SQLite by default - no configuration needed!
# For PostgreSQL, edit .env file (see below)
cp .env.example .env

# Run the backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend will be available at:
- API: http://localhost:8000
- Swagger Docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### 3. Frontend Setup

```bash
# Open a new terminal
cd frontend

# Install dependencies
npm install

# Run the development server
npm run dev
```

The frontend will be available at http://localhost:3000

### 4. (Optional) PostgreSQL Setup

If you want to use PostgreSQL instead of SQLite:

```bash
# Create a new database
psql -U postgres
CREATE DATABASE pair_programming;
\q

# Edit backend/.env file and set:
DATABASE_URL=postgresql+asyncpg://postgres:yourpassword@localhost:5432/pair_programming
DATABASE_URL_SYNC=postgresql://postgres:yourpassword@localhost:5432/pair_programming
USE_POSTGRES=true
```

## 📖 API Documentation

### REST Endpoints

#### Create Room
```http
POST /api/rooms
Content-Type: application/json

{
  "language": "python"  // optional, defaults to "python"
}

Response:
{
  "roomId": "uuid-string",
  "language": "python",
  "codeContent": "# Start coding here...\n",
  "activeUsers": 0,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

#### Get Room
```http
GET /api/rooms/{room_id}

Response:
{
  "roomId": "uuid-string",
  "language": "python",
  "codeContent": "...",
  "activeUsers": 2,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

#### Autocomplete
```http
POST /api/autocomplete
Content-Type: application/json

{
  "code": "def",
  "cursorPosition": 3,
  "language": "python"
}

Response:
{
  "suggestion": "def function_name():\n    pass",
  "startPosition": 0,
  "endPosition": 3,
  "description": "Complete 'def' statement"
}
```

### WebSocket Endpoint

```
WebSocket: ws://localhost:8000/ws/{room_id}
```

#### Message Types

**Code Update (Client → Server)**
```json
{
  "type": "code_update",
  "payload": {
    "code": "print('Hello')",
    "cursorPosition": 15
  }
}
```

**Room State (Server → Client on connect)**
```json
{
  "type": "room_state",
  "payload": {
    "code": "# Start coding here...\n",
    "activeUsers": 1,
    "cursors": {},
    "userId": "abc123"
  }
}
```

**User Joined/Left (Server → Client)**
```json
{
  "type": "user_joined",  // or "user_left"
  "payload": {
    "userId": "xyz789",
    "activeUsers": 2
  }
}
```

## 🎨 Design Decisions

### Why Last-Write-Wins?
For simplicity, this implementation uses a last-write-wins approach for conflict resolution. This works well for small teams and short sessions. For production use, consider implementing Operational Transformation (OT) or CRDTs.

### Why WebSockets?
WebSockets provide low-latency, bidirectional communication essential for real-time collaboration. The connection is maintained throughout the session, enabling instant updates.

### Why Redux Toolkit?
Redux Toolkit simplifies state management with built-in best practices. It handles:
- Editor state (code, cursor position, suggestions)
- Room state (room info, active users)
- Connection state (WebSocket status)

### Why Monaco Editor?
Monaco Editor (VS Code's editor) provides:
- Syntax highlighting for multiple languages
- Code completion and suggestions
- Multi-cursor support
- Excellent performance with large files

## 🔧 Configuration

### Backend Environment Variables (.env)
```env
DEBUG=true
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/pair_programming
DATABASE_URL_SYNC=postgresql://postgres:postgres@localhost:5432/pair_programming
CORS_ORIGINS=["http://localhost:3000", "http://localhost:5173"]
WS_HEARTBEAT_INTERVAL=30
```

### Frontend Configuration (vite.config.ts)
The Vite config includes proxy settings for development:
- `/api` → Backend REST API
- `/ws` → Backend WebSocket

## 📝 Improvements with More Time

1. **Conflict Resolution**: Implement Operational Transformation (OT) or CRDTs for proper conflict resolution instead of last-write-wins

2. **Real AI Autocomplete**: Integrate with OpenAI Codex or similar for intelligent code suggestions

3. **User Authentication**: Add optional user accounts for persistent history

4. **Room Features**:
   - Private rooms with passwords
   - Room expiration/cleanup
   - Chat functionality
   - Voice/video integration

5. **Editor Features**:
   - Multiple file support
   - File tree explorer
   - Terminal integration
   - Syntax checking/linting

6. **Performance**:
   - Connection pooling optimization
   - Redis for session caching
   - Load balancing for WebSocket connections

7. **Testing**:
   - Unit tests for services
   - Integration tests for API endpoints
   - E2E tests with Playwright

8. **Deployment**:
   - Docker containerization
   - Kubernetes configuration
   - CI/CD pipeline

## ⚠️ Limitations

1. **No Conflict Resolution**: Last-write-wins can cause data loss with simultaneous edits
2. **In-Memory Caching**: WebSocket connection manager stores state in memory (not suitable for multi-instance deployment)
3. **No Authentication**: Anyone with the room ID can join
4. **Limited Language Support**: Autocomplete only supports Python, JavaScript, and TypeScript
5. **Single File**: Each room supports only one file

## 🧪 Testing the Application

### Using the Web Interface
1. Open http://localhost:3000
2. Click "Create Room" to create a new room
3. Copy the room URL from the browser
4. Open the URL in another browser/incognito window
5. Type in one editor and see changes in the other

### Using Postman/cURL

**Create a Room:**
```bash
curl -X POST http://localhost:8000/api/rooms \
  -H "Content-Type: application/json" \
  -d '{"language": "python"}'
```

**Get Autocomplete:**
```bash
curl -X POST http://localhost:8000/api/autocomplete \
  -H "Content-Type: application/json" \
  -d '{"code": "def", "cursorPosition": 3, "language": "python"}'
```

**WebSocket (using wscat):**
```bash
npm install -g wscat
wscat -c ws://localhost:8000/ws/<room_id>
```

## 📄 License

MIT License

## 👤 Author

Built as a prototype for Tredence Full-Stack Developer Assessment.
