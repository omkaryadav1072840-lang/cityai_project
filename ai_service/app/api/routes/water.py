"""
SmartCity AI - Water Management Endpoints
"""

from fastapi import APIRouter, Depends
from app.schemas import WaterAnomalyRequest, WaterAnomalyResponse
from app.services.water_service import WaterService
from app.security.auth import verify_internal_key

router = APIRouter(prefix="/api/v1/water", tags=["Water AI"])

@router.post("/anomaly", response_model=WaterAnomalyResponse, dependencies=[Depends(verify_internal_key)])
async def detect_water_anomaly(payload: WaterAnomalyRequest):
    return WaterService.evaluate_water_anomaly(payload)
