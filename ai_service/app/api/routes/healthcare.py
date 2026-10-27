"""
SmartCity AI - Healthcare Endpoints
"""

from fastapi import APIRouter, Depends
from app.schemas import (
    HospitalCapacityRequest, 
    HospitalCapacityResponse,
    ClinicalIntentRequest,
    ClinicalIntentResponse
)
from app.services.healthcare_service import HealthcareService
from app.security.auth import verify_internal_key

router = APIRouter(prefix="/api/v1/healthcare", tags=["Healthcare AI"])

@router.post("/capacity", response_model=HospitalCapacityResponse, dependencies=[Depends(verify_internal_key)])
async def evaluate_hospital_capacity(payload: HospitalCapacityRequest):
    return HealthcareService.evaluate_capacity(payload)

@router.post("/clinical-intent", response_model=ClinicalIntentResponse, dependencies=[Depends(verify_internal_key)])
async def classify_clinical_intent(payload: ClinicalIntentRequest):
    return HealthcareService.classify_clinical_intent(payload)
