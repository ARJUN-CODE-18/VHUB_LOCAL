"""
Configuration management for VAMS backend.
Environment-based settings with validation.
"""
from pydantic_settings import BaseSettings
from typing import Optional
from pathlib import Path


class Settings(BaseSettings):
    """Application configuration from environment variables"""
    
    # Application
    APP_NAME: str = "VAMS Backend"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:Password@localhost:5432/vams_db"
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10
    DB_ECHO: bool = False
    
    # Redis (optional, non-authoritative)
    REDIS_URL: Optional[str] = None
    REDIS_ENABLED: bool = False
    
    # Security
    SECRET_KEY: str = "CHANGE_THIS_IN_PRODUCTION"
    API_KEY_HEADER: str = "X-API-Key"
    OPERATOR_API_KEY: str = "dev-local-vams-key"

    # Vertipad configuration
    VERTIPAD_ID: str = "VP-001"
    VERTIPAD_CAPACITY: int = 1
    
    # Operational limits
    MAX_SLOT_BOOKING_HOURS: int = 24
    SLOT_DURATION_MINUTES: int = 30
    WEATHER_UPDATE_INTERVAL_SECONDS: int = 300  # 5 minutes
    
    # Safety thresholds
    MIN_VISIBILITY_METERS: float = 1000.0
    MAX_WIND_SPEED_MPS: float = 15.0
    MAX_CROSSWIND_MPS: float = 8.0
    
    # Energy thresholds
    MIN_BATTERY_DEPARTURE_PERCENT: float = 30.0
    CHARGING_RATE_KW: float = 50.0
    
    class Config:
        env_file = Path(__file__).resolve().parents[2] / ".env"
        case_sensitive = True


settings = Settings()