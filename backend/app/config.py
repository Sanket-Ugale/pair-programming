from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    app_name: str = "Real-Time Pair Programming API"
    debug: bool = True
    environment: str = "development"
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    workers: int = 4
    
    # Database - PostgreSQL configuration
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_user: str = "pairprog"
    postgres_password: str = "pairprog_secret"
    postgres_db: str = "pairprog"
    
    # For backwards compatibility - can also use DATABASE_URL directly
    database_url: Optional[str] = None
    
    # Redis configuration
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_password: Optional[str] = None
    redis_db: int = 0
    
    # WebSocket
    ws_heartbeat_interval: int = 30
    
    # CORS - allow all in development
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173", "http://localhost:*"]
    
    # Code Execution
    piston_api_url: str = "https://emkc.org/api/v2/piston/execute"
    execution_timeout: int = 30
    
    @property
    def async_database_url(self) -> str:
        """Get async database URL for SQLAlchemy."""
        if self.database_url:
            # If DATABASE_URL is provided, convert to async
            url = self.database_url
            if url.startswith("postgresql://"):
                return url.replace("postgresql://", "postgresql+asyncpg://")
            elif url.startswith("postgres://"):
                return url.replace("postgres://", "postgresql+asyncpg://")
            return url
        # Build from components
        return f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
    
    @property
    def sync_database_url(self) -> str:
        """Get sync database URL for Alembic migrations."""
        if self.database_url:
            url = self.database_url
            if "+asyncpg" in url:
                return url.replace("+asyncpg", "")
            return url
        return f"postgresql://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
    
    @property
    def redis_url(self) -> str:
        """Get Redis URL."""
        if self.redis_password:
            return f"redis://:{self.redis_password}@{self.redis_host}:{self.redis_port}/{self.redis_db}"
        return f"redis://{self.redis_host}:{self.redis_port}/{self.redis_db}"
    
    class Config:
        env_file = ".env"
        extra = "allow"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
