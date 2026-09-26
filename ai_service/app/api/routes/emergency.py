"""
SmartCity AI - Emergency & Rapid Dispatch Endpoints
"""

from fastapi import APIRouter, Depends
from app.schemas import EmergencyRouteRequest, EmergencyRouteResponse
from app.services.emergency_service import EmergencyService
from app.security.auth import verify_internal_key

router = APIRouter(prefix="/api/v1/emergency", tags=["Emergency AI"])

@router.post("/route-eta", response_model=EmergencyRouteResponse, dependencies=[Depends(verify_internal_key)])
async def estimate_emergency_travel_time(payload: EmergencyRouteRequest):
    return EmergencyService.estimate_travel_time(payload)
