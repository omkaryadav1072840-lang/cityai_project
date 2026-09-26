"""
SmartCity AI - Environmental & AQI Telemetry Endpoints
"""

from fastapi import APIRouter, Depends
from app.schemas import AQIAnalysisRequest, AQIAnalysisResponse
from app.services.environment_service import EnvironmentService
from app.security.auth import verify_internal_key

router = APIRouter(prefix="/api/v1/environment", tags=["Environment AI"])

@router.post("/aqi-analysis", response_model=AQIAnalysisResponse, dependencies=[Depends(verify_internal_key)])
async def analyze_environmental_aqi(payload: AQIAnalysisRequest):
    return EnvironmentService.analyze_aqi(payload)
