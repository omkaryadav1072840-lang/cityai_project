"""
SmartCity AI - Waste Management Endpoints
"""

from fastapi import APIRouter, Depends
from app.schemas import WastePredictionRequest, WastePredictionResponse
from app.services.waste_service import WasteService
from app.security.auth import verify_internal_key

router = APIRouter(prefix="/api/v1/waste", tags=["Waste AI"])

@router.post("/predict", response_model=WastePredictionResponse, dependencies=[Depends(verify_internal_key)])
async def predict_waste_accumulation(payload: WastePredictionRequest):
    return WasteService.predict_fill_and_priority(payload)
