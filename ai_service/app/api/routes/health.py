"""
SmartCity AI - Health & Liveness Endpoints
Provides system status, versioning, and model registry state.
"""

from datetime import datetime
from fastapi import APIRouter
from app.config import settings
from app.schemas import HealthResponse

router = APIRouter(tags=["System Health"])

@router.get("/health", response_model=HealthResponse)
@router.get("/api/v1/health", response_model=HealthResponse)
async def check_health():
    return HealthResponse(
        status="healthy",
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        active_models=[
            "traffic-baseline-v2.0",
            "waste-priority-v2.0",
            "hospital-capacity-v2.0",
            "parking-occupancy-v2.0",
            "grounded-assistant-v2.0"
        ],
        system_time=datetime.now().isoformat()
    )
