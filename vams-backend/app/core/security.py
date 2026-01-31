"""
Security utilities for API authentication.
Simple API key-based auth for operator access.
"""
from fastapi import Security, HTTPException, status
from fastapi.security import APIKeyHeader
from app.core.config import settings


api_key_header = APIKeyHeader(name=settings.API_KEY_HEADER, auto_error=False)


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
print("🔐 OPERATOR_API_KEY loaded:", settings.OPERATOR_API_KEY)
