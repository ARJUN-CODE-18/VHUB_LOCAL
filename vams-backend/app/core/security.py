"""
Security utilities for API authentication.
Simple API key-based auth for operator access.
"""
from fastapi import Security, HTTPException, status
from fastapi.security import APIKeyHeader
from passlib.context import CryptContext
from app.core.config import settings


api_key_header = APIKeyHeader(name=settings.API_KEY_HEADER, auto_error=False)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a plain-text password using bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    """Verify a plain-text password against a stored hash."""
    return pwd_context.verify(plain_password, password_hash)


async def verify_api_key(api_key: str = Security(api_key_header)) -> str:
    """
    Verify API key for operator access.
    
    Args:
        api_key: API key from request header
        
    Returns:
        Validated API key
        
    Raises:
        HTTPException: If API key is invalid or missing
    """
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API key",
        )
    
    if api_key != settings.OPERATOR_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API key",
        )
    
    return api_key
