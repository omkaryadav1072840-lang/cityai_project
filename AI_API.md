# SMARTCITY AI — REST API SPECIFICATION
**Platform**: Gorakhpur Smart City Management Platform  
**Base URL**: `http://localhost:5000`  
**Authentication**: Bearer JWT in `Authorization` header  

---

## 1. Grounded AI Assistant & Tool Execution

### 1.1 Grounded Bilingual Chatbot
- **Endpoint**: `POST /api/ai/chat`
- **Headers**: `Content-Type: application/json`, `Authorization: Bearer <token>` (Optional)
- **Request Body**:
  ```json
  {
    "message": "Golghar ke paas parking available hai kya?",
    "session_id": "sess-user-991"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "reply": "Golghar me 2 parking lots uplabdh hain: 1. Golghar Multi-Level Parking (34/220 slots khali, ₹30/hr)...",
    "prediction_id": "PRED-MUJBM169-67880B",
    "data_source": "REAL",
    "tool_executed": "find_parking",
    "confidence": 0.94
  }
  ```

---

## 2. Smart Traffic & Computer Vision

### 2.1 Multi-Horizon Traffic Prediction
- **Endpoint**: `GET /api/traffic/prediction`
- **Query Params**: `junction_id=JNC-GOLGHAR-01&vehicle_count=85&queue_length=40`
- **Response**:
  ```json
  {
    "success": true,
    "junction_id": "JNC-GOLGHAR-01",
    "horizons": {
      "15m": { "predicted_vehicle_count": 92, "congestion_level": "MODERATE" },
      "30m": { "predicted_vehicle_count": 104, "congestion_level": "HIGH" },
      "60m": { "predicted_vehicle_count": 125, "congestion_level": "SEVERE" }
    },
    "data_source": "PREDICTED"
  }
  ```

### 2.2 Webster Signal Optimization
- **Endpoint**: `POST /api/traffic/optimize-signal`
- **Request Body**:
  ```json
  {
    "junction_id": "JNC-GOLGHAR-01",
    "approaches": [
      { "phase": "A", "flow_rate_vph": 950, "saturation_flow_vph": 1800 },
      { "phase": "B", "flow_rate_vph": 480, "saturation_flow_vph": 1800 }
    ]
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "cycle_length_seconds": 48,
    "phases": {
      "Phase_A_green_seconds": 31,
      "Phase_B_green_seconds": 17
    },
    "data_source": "PREDICTED"
  }
  ```

### 2.3 Ambulance Corridor Preemption Wave
- **Endpoint**: `POST /api/traffic/ambulance-preemption`
- **Request Body**:
  ```json
  {
    "ambulance_id": "AMB-01",
    "latitude": 26.7608,
    "longitude": 83.3730,
    "junction_id": "JNC-GOLGHAR-01"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "preemption_active": true,
    "corridor_status": "GREEN_WAVE_ENGAGED",
    "distance_meters": 180,
    "data_source": "REAL"
  }
  ```

---

## 3. Civic Grievances & Municipal AI

### 3.1 NLP Grievance Routing & SLA
- **Endpoint**: `POST /api/services/grievance-ai-analyze`
- **Request Body**:
  ```json
  {
    "description": "Exposed high voltage wire sparking near Asuran Chowk",
    "locality": "Asuran"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "category": "ELECTRICITY_HAZARD",
    "severity": "CRITICAL",
    "sla_hours": 2,
    "assigned_department": "Electricity Department (UPPCL)",
    "data_source": "PREDICTED"
  }
  ```

### 3.2 Waste Route Optimization (TSP)
- **Endpoint**: `POST /api/waste/optimize-route`
- **Request Body**: `{ "ward_number": 14, "min_fill_threshold": 70 }`
- **Response**:
  ```json
  {
    "success": true,
    "optimized_pickup_sequence": ["BIN-GKP-001", "BIN-GKP-004", "BIN-GKP-008"],
    "total_estimated_duration_mins": 34,
    "assigned_vehicle": "UP-53-TR-402 (Compactor 14)",
    "data_source": "PREDICTED"
  }
  ```

---

## 4. Healthcare & Emergency

### 4.1 Bed Surge & OPD Queue Forecast
- **Endpoint**: `GET /api/hospital/bed-surge?hospital_id=HOSP-01`
- **Response**:
  ```json
  {
    "success": true,
    "hospital": { "id": "HOSP-01", "name": "AIIMS Gorakhpur" },
    "occupancy_forecast": { "total_occupancy_pct": 72.0, "icu_occupancy_pct": 80.0, "surge_risk": "ELEVATED" },
    "opd_forecast": { "estimated_queue_wait_mins": 40, "forecasted_daily_patient_load": 288 },
    "data_source": "PREDICTED"
  }
  ```

### 4.2 Secure QR Patient Record Access (Medical Guard)
- **Endpoint**: `POST /api/hospital/qr-patient-access`
- **Headers**: `Authorization: Bearer <doctor_jwt_token>`
- **Request Body**: `{ "qr_token": "QR_ENCRYPTED_STRING" }`
- **Response**:
  ```json
  {
    "authorized": true,
    "status": "ACCESS_GRANTED",
    "audited_by": "Dr. A. Verma",
    "patient": {
      "patient_id": "PT-2026-9921",
      "name": "Rahul Verma",
      "blood_group": "O+",
      "known_allergies": ["Penicillin"]
    }
  }
  ```

---

## 5. Model Governance & Explainability (XAI)

### 5.1 Model Catalog Health & Drift
- **Endpoint**: `GET /api/ai/models/health`
- **Response**: Returns accuracy, precision, recall, latency, and concept drift status for all registered models.

### 5.2 Explainability & Factor Attribution
- **Endpoint**: `GET /api/ai/explainability/:prediction_id`
- **Response**: Returns input summary, confidence margin, top contributing factors, and human audit trail.
