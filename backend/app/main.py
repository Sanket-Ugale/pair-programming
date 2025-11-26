from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_db, close_db
from app.routers import rooms_router, autocomplete_router
from app.routers.execute import router as execute_router
from app.websocket import websocket_router

# Redis import with fallback
try:
    from app.services.redis_service import redis_service
    REDIS_ENABLED = True
except ImportError:
    REDIS_ENABLED = False
    redis_service = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup and shutdown events."""
    # Startup
    print(f"Starting {settings.app_name}...")
    print(f"Environment: {settings.environment}")
    print(f"Database: {settings.postgres_host}:{settings.postgres_port}")
    
    await init_db()
    print("Database initialized")
    
    # Connect to Redis if enabled
    if REDIS_ENABLED and redis_service:
        try:
            await redis_service.connect()
            print(f"Redis connected at {settings.redis_host}:{settings.redis_port}")
        except Exception as e:
            print(f"Warning: Could not connect to Redis: {e}")
    
    yield
    
    # Shutdown
    print("Shutting down...")
    if REDIS_ENABLED and redis_service:
        try:
            await redis_service.disconnect()
        except Exception:
            pass
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
        - Execute code and see results
        
        ## Features
        
        - **Room Management**: Create and join collaborative coding rooms
        - **Real-Time Sync**: WebSocket-based real-time code synchronization
        - **AI Autocomplete**: Mocked AI-style code suggestions
        - **Code Execution**: Run code in multiple languages
        - **Multi-Language Support**: Python, JavaScript, TypeScript, Java, C++, Go, Rust
        """,
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )
    
    # Configure CORS - allow all origins in development
    origins = settings.cors_origins
    if settings.environment == "development":
        origins = ["*"]
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
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
            "version": "1.0.0",
            "environment": settings.environment,
        }
    
    @app.get("/health", tags=["health"])
    async def health_check():
        """Detailed health check endpoint."""
        redis_status = "disabled"
        if REDIS_ENABLED and redis_service:
            try:
                await redis_service.client.ping()
                redis_status = "connected"
            except Exception:
                redis_status = "disconnected"
        
        return {
            "status": "healthy",
            "database": "connected",
            "redis": redis_status,
            "websocket": "ready",
        }
    
    return app


app = create_app()
