"""
SmartCity AI - Healthcare Endpoints
"""

from fastapi import APIRouter, Depends
from app.schemas import HospitalCapacityRequest, HospitalCapacityResponse
from app.services.healthcare_service import HealthcareService
from app.security.auth import verify_internal_key

router = APIRouter(prefix="/api/v1/healthcare", tags=["Healthcare AI"])

@router.post("/capacity", response_model=HospitalCapacityResponse, dependencies=[Depends(verify_internal_key)])
async def evaluate_hospital_capacity(payload: HospitalCapacityRequest):
    return HealthcareService.evaluate_capacity(payload)
