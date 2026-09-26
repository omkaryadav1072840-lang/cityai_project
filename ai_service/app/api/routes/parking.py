"""
SmartCity AI - Parking Demand Endpoints
"""

from fastapi import APIRouter, Depends
from app.schemas import ParkingDemandRequest, ParkingDemandResponse
from app.services.parking_service import ParkingService
from app.security.auth import verify_internal_key

router = APIRouter(prefix="/api/v1/parking", tags=["Parking AI"])

@router.post("/demand", response_model=ParkingDemandResponse, dependencies=[Depends(verify_internal_key)])
async def forecast_parking_demand(payload: ParkingDemandRequest):
    return ParkingService.forecast_demand(payload)
