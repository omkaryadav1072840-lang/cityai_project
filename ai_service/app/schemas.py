"""
SmartCity AI - Pydantic Request & Response Schemas
Provides strict type-checking, input sanitization, and output schemas for all AI endpoints.
"""

from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

# =========================================================
# 1. SYSTEM HEALTH & MONITORING SCHEMAS
# =========================================================

class HealthResponse(BaseModel):
    status: str = Field(default="healthy", description="Status of the AI service")
    version: str = Field(default="2.0.0", description="Semantic version of the AI service")
    environment: str = Field(default="production", description="Runtime environment")
    active_models: List[str] = Field(default_factory=list)
    system_time: str


# =========================================================
# 2. TRAFFIC AI SCHEMAS
# =========================================================

class TrafficPredictRequest(BaseModel):
    junction_id: str = Field(default="JNC-GOLGHAR-01", description="Identifier of the traffic junction")
    hour: Optional[int] = Field(None, ge=0, le=23, description="Hour of the day (0-23)")
    day_of_week: Optional[int] = Field(None, ge=0, le=6, description="Day of week (0=Mon, 6=Sun)")
    aqi: Optional[float] = Field(120.0, ge=0.0, description="Current AQI near junction")
    active_incidents: Optional[int] = Field(0, ge=0, description="Count of active bottlenecks or accidents")
    weather: Optional[str] = Field("Clear", description="Weather condition (Clear, Rain, Fog, etc.)")

class TrafficPredictResponse(BaseModel):
    junction_id: str
    predicted_congestion: str = Field(..., description="LOW, MEDIUM, HIGH, CRITICAL")
    severity_score: float = Field(..., ge=0.0, le=100.0)
    confidence: float = Field(..., ge=0.0, le=1.0)
    is_peak_hour: bool
    model_version: str
    data_source_mode: str
    features_evaluated: Dict[str, Any]

class CameraVisionRequest(BaseModel):
    camera_id: str
    camera_name: str
    stream_url: str
    direction: Optional[str] = "North"
    is_simulated: Optional[bool] = False

class CameraVisionResponse(BaseModel):
    camera_id: str
    camera_name: str
    ai_analysis_available: bool
    stream_url: str
    vehicle_count: Optional[int] = None
    queue_length_meters: Optional[int] = None
    congestion_estimate: str
    reason: Optional[str] = None


# =========================================================
# 3. WASTE MANAGEMENT AI SCHEMAS
# =========================================================

class WastePredictionRequest(BaseModel):
    bin_id: str = Field(..., description="Unique smart bin code, e.g. BIN-001")
    days_since_collection: float = Field(default=1.0, ge=0.0)
    ward: Optional[str] = Field("Ward 14 - Golghar", description="Municipal Ward zone")
    waste_type: Optional[str] = Field("Solid Waste", description="Category of waste")
    historical_samples_count: Optional[int] = Field(0, ge=0)

class WastePredictionResponse(BaseModel):
    bin_id: str
    estimated_fill_pct: float = Field(..., ge=0.0, le=100.0)
    priority_rank: str = Field(..., description="NORMAL, MEDIUM, HIGH, IMMEDIATE_DISPATCH")
    collection_recommended: bool
    data_readiness_status: str
    model_version: str


# =========================================================
# 4. WATER MANAGEMENT AI SCHEMAS
# =========================================================

class WaterAnomalyRequest(BaseModel):
    tank_id: str = Field(..., description="Water reservoir or supply tank ID")
    current_level_pct: float = Field(..., ge=0.0, le=100.0)
    daily_inflow_liters: float = Field(..., ge=0.0)
    daily_outflow_liters: float = Field(..., ge=0.0)
    historical_avg_outflow: float = Field(..., ge=0.0)

class WaterAnomalyResponse(BaseModel):
    tank_id: str
    is_anomaly_indicator: bool
    deviation_sigma: float
    risk_level: str = Field(..., description="NOMINAL, ELEVATED, SUSPECTED_LEAK_INDICATOR")
    message: str
    recommendation: str


# =========================================================
# 5. HEALTHCARE AI SCHEMAS
# =========================================================

class HospitalCapacityRequest(BaseModel):
    hospital_id: str
    total_beds: int = Field(..., ge=1)
    occupied_beds: int = Field(..., ge=0)
    icu_beds: int = Field(default=10, ge=0)
    occupied_icu: int = Field(default=0, ge=0)

class HospitalCapacityResponse(BaseModel):
    hospital_id: str
    projected_bed_occupancy_pct: float
    is_near_saturation: bool
    critical_care_status: str
    model_version: str
    safety_disclaimer: str = "Decision support only. Clinical admissions require authorized triage staff."


# =========================================================
# 6. EMERGENCY DISPATCH AI SCHEMAS
# =========================================================

class EmergencyRouteRequest(BaseModel):
    incident_id: Optional[str] = "EM-SOS-001"
    origin_lat: float
    origin_lng: float
    dest_lat: float
    dest_lng: float
    incident_severity: Optional[str] = "HIGH"
    active_road_blocks: Optional[int] = 0

class EmergencyRouteResponse(BaseModel):
    incident_id: str
    estimated_travel_minutes: float
    distance_km: float
    priority_level: str
    suggested_corridor: str
    human_in_the_loop_required: bool = True
    disclaimer: str = "Dispatches remain strictly under human 108/112 operator authority."


# =========================================================
# 7. PARKING DEMAND AI SCHEMAS
# =========================================================

class ParkingDemandRequest(BaseModel):
    lot_id: str = Field(..., description="Parking lot code, e.g. GKP-PARK-01")
    total_slots: int = Field(..., ge=1)
    current_occupied: int = Field(..., ge=0)
    hour: Optional[int] = Field(None, ge=0, le=23)
    day_of_week: Optional[int] = Field(None, ge=0, le=6)

class ParkingDemandResponse(BaseModel):
    lot_id: str
    projected_occupancy_pct: float
    projected_available_slots: int
    peak_probability: float
    recommendation: str
    model_version: str


# =========================================================
# 8. ENVIRONMENT / AQI SCHEMAS
# =========================================================

class AQIAnalysisRequest(BaseModel):
    sensor_id: str = "AQI-GKP-01"
    pm25: float = Field(..., ge=0.0)
    pm10: float = Field(..., ge=0.0)
    temperature_c: Optional[float] = 28.0
    humidity_pct: Optional[float] = 65.0

class AQIAnalysisResponse(BaseModel):
    sensor_id: str
    calculated_aqi: int
    aqi_category: str
    dominant_pollutant: str
    health_advisory: str
    trend_24h: str


# =========================================================
# 9. SMARTCITY AI ASSISTANT SCHEMAS
# =========================================================

class AssistantQueryRequest(BaseModel):
    question: str = Field(..., min_length=2, max_length=500)
    user_role: Optional[str] = "citizen"
    user_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None

class AssistantQueryResponse(BaseModel):
    reply: str
    intent: str
    tool_called: Optional[str] = None
    data: Optional[Any] = None
    suggested_actions: List[Dict[str, str]] = Field(default_factory=list)
    confidence: float
