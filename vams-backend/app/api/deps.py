"""
API dependencies for FastAPI routes.
Provides common dependencies like database sessions and authentication.
"""
from typing import Generator
from fastapi import Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import verify_api_key


def get_db_session() -> Generator[Session, None, None]:
    """Dependency to get database session"""
    yield from get_db()


def get_current_operator(api_key: str = Depends(verify_api_key)) -> str:
    """
    Dependency to get current operator from API key.
    For production, this would map to actual operator identity.
    """
    return "operator_system"