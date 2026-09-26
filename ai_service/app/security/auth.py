"""
SmartCity AI - Internal Security & Service Authentication
Enforces mutual authentication between Node.js and Python FastAPI service.
"""

from fastapi import Header, HTTPException, status
from app.config import settings

async def verify_internal_key(
    x_ai_service_key: str = Header(None, alias="X-AI-Service-Key")
):
    """
    Validates internal service API key to ensure only authorized
    Node.js backend instances can invoke AI models.
    """
    if not x_ai_service_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing required X-AI-Service-Key header."
        )
    
    if x_ai_service_key != settings.INTERNAL_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Invalid internal AI service authentication key."
        )
    
    return True
