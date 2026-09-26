"""
SmartCity AI - Python AI Service Unit & Integration Test Suite
Location: Gorakhpur, UP
Tests FastAPI endpoints, security authentication, Pydantic validation, and baseline ML models.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings

client = TestClient(app)
AUTH_HEADER = {"X-AI-Service-Key": settings.INTERNAL_API_KEY}

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert len(data["active_models"]) > 0

def test_unauthenticated_request_rejected():
    # Calling secured endpoint without key must return 401 or 403
    response = client.post("/api/v1/traffic/predict", json={
        "junction_id": "JNC-GOLGHAR-01",
        "hour": 14
    })
    assert response.status_code in [401, 403]

def test_invalid_key_rejected():
    response = client.post(
        "/api/v1/traffic/predict",
        json={"junction_id": "JNC-GOLGHAR-01", "hour": 14},
        headers={"X-AI-Service-Key": "invalid_wrong_token"}
    )
    assert response.status_code == 403

def test_traffic_prediction_authorized():
    payload = {
        "junction_id": "JNC-GOLGHAR-01",
        "hour": 18,
        "day_of_week": 4,
        "aqi": 145.0,
        "active_incidents": 1,
        "weather": "Clear"
    }
    response = client.post("/api/v1/traffic/predict", json=payload, headers=AUTH_HEADER)
    assert response.status_code == 200
    data = response.json()
    assert data["junction_id"] == "JNC-GOLGHAR-01"
    assert data["predicted_congestion"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    assert 0.0 <= data["severity_score"] <= 100.0
    assert 0.0 <= data["confidence"] <= 1.0
    assert data["is_peak_hour"] is True

def test_waste_demand_priority():
    payload = {
        "bin_id": "BIN-005",
        "days_since_collection": 2.5,
        "ward": "Ward 12 - Golghar",
        "waste_type": "Solid Waste"
    }
    response = client.post("/api/v1/waste/predict", json=payload, headers=AUTH_HEADER)
    assert response.status_code == 200
    data = response.json()
    assert data["bin_id"] == "BIN-005"
    assert data["priority_rank"] in ["NORMAL", "MEDIUM", "HIGH", "IMMEDIATE_DISPATCH"]
    assert 0.0 <= data["estimated_fill_pct"] <= 100.0

def test_water_anomaly_detection():
    payload = {
        "tank_id": "TNK-CENTRAL-01",
        "current_level_pct": 55.0,
        "daily_inflow_liters": 60000.0,
        "daily_outflow_liters": 85000.0,
        "historical_avg_outflow": 55000.0
    }
    response = client.post("/api/v1/water/anomaly", json=payload, headers=AUTH_HEADER)
    assert response.status_code == 200
    data = response.json()
    assert data["tank_id"] == "TNK-CENTRAL-01"
    assert data["is_anomaly_indicator"] is True
    assert data["risk_level"] == "SUSPECTED_LEAK_INDICATOR"

def test_healthcare_capacity_analytics():
    payload = {
        "hospital_id": "HOSP-AIIMS-01",
        "total_beds": 500,
        "occupied_beds": 460,
        "icu_beds": 50,
        "occupied_icu": 46
    }
    response = client.post("/api/v1/healthcare/capacity", json=payload, headers=AUTH_HEADER)
    assert response.status_code == 200
    data = response.json()
    assert data["hospital_id"] == "HOSP-AIIMS-01"
    assert data["is_near_saturation"] is True
    assert data["critical_care_status"] in ["CRITICAL_ICU_SHORTAGE", "CRITICAL_ICU_SATURATION"]
    assert "Decision support only" in data["safety_disclaimer"]

def test_emergency_dispatch_eta():
    payload = {
        "incident_id": "EM-SOS-112",
        "origin_lat": 26.7606,
        "origin_lng": 83.3732,
        "dest_lat": 26.7588,
        "dest_lng": 83.3920,
        "incident_severity": "CRITICAL"
    }
    response = client.post("/api/v1/emergency/route-eta", json=payload, headers=AUTH_HEADER)
    assert response.status_code == 200
    data = response.json()
    assert data["estimated_travel_minutes"] > 0
    assert data["distance_km"] > 0
    assert data["human_in_the_loop_required"] is True

def test_parking_demand_forecast():
    payload = {
        "lot_id": "LOT-GOLGHAR-01",
        "total_slots": 100,
        "current_occupied": 85,
        "hour": 18
    }
    response = client.post("/api/v1/parking/demand", json=payload, headers=AUTH_HEADER)
    assert response.status_code == 200
    data = response.json()
    assert data["lot_id"] == "LOT-GOLGHAR-01"
    assert data["projected_occupancy_pct"] > 0
    assert data["peak_probability"] >= 0.5

def test_assistant_chat_grounded():
    payload = {
        "question": "Where is the nearest hospital with ICU beds?",
        "user_role": "citizen"
    }
    response = client.post("/api/v1/assistant/chat", json=payload, headers=AUTH_HEADER)
    assert response.status_code == 200
    data = response.json()
    assert len(data["reply"]) > 0
    assert data["intent"] == "hospital_discovery"
    assert data["tool_called"] == "find_hospitals"
