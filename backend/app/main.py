from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_db, close_db
from app.routers import rooms_router, autocomplete_router
from app.routers.execute import router as execute_router
from app.websocket import websocket_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup and shutdown events."""
    # Startup
    await init_db()
    yield
    # Shutdown
    await close_db()


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title=settings.app_name,
        description="""
        Real-Time Pair Programming API
        
        A simplified real-time pair-programming web application where two users can:
        - Join the same room
        - Edit code at the same time
        - See each other's changes instantly
        - Get AI-style autocomplete suggestions
        
        ## Features
        
        - **Room Management**: Create and join collaborative coding rooms
        - **Real-Time Sync**: WebSocket-based real-time code synchronization
        - **AI Autocomplete**: Mocked AI-style code suggestions
        - **Multi-Language Support**: Python, JavaScript, TypeScript
        """,
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )
    
    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Include routers
    app.include_router(rooms_router, prefix="/api")
    app.include_router(autocomplete_router, prefix="/api")
    app.include_router(execute_router)
    app.include_router(websocket_router)
    
    @app.get("/", tags=["health"])
    async def root():
        """Health check endpoint."""
        return {
            "status": "healthy",
            "app": settings.app_name,
            "version": "1.0.0"
        }
    
    @app.get("/health", tags=["health"])
    async def health_check():
        """Detailed health check endpoint."""
        return {
            "status": "healthy",
            "database": "connected",
            "websocket": "ready"
        }
    
    return app


app = create_app()
