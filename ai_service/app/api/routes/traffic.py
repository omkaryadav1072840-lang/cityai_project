"""
SmartCity AI - Traffic Prediction & Vision Endpoints
"""

from fastapi import APIRouter, Depends
from app.schemas import (
    TrafficPredictRequest,
    TrafficPredictResponse,
    CameraVisionRequest,
    CameraVisionResponse
)
from app.services.traffic_service import TrafficService
from app.security.auth import verify_internal_key

router = APIRouter(prefix="/api/v1/traffic", tags=["Traffic AI"])

@router.post("/predict", response_model=TrafficPredictResponse, dependencies=[Depends(verify_internal_key)])
async def predict_traffic_congestion(payload: TrafficPredictRequest):
    return TrafficService.predict_congestion(payload)

@router.post("/camera-vision", response_model=CameraVisionResponse, dependencies=[Depends(verify_internal_key)])
async def analyze_traffic_camera(payload: CameraVisionRequest):
    return TrafficService.analyze_camera_stream(payload)
