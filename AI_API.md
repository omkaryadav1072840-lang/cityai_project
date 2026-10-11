# SMARTCITY AI — ARTIFICIAL INTELLIGENCE & ML API SPECIFICATION
## Comprehensive Reference for Python FastAPI (Port 8000) & Node.js AI Gateway (Port 5000)

---

### Document Overview
- **Service Name:** SmartCity AI Intelligence Tier
- **Runtimes:** Python 3.13 FastAPI (Port 8000) + Node.js 24 Express (Port 5000)
- **Authentication:** Mutual Internal Header (`X-AI-Service-Key`) & Citizen/Staff JWT (`Authorization: Bearer <token>`)
- **Anti-Hallucination Policy:** Strict Grounded Tool Execution against MySQL 8.0 with Deterministic Fallbacks
- **Provenance System:** All inferences tagged with tri-state provenance (`REAL`, `PREDICTED`, `SIMULATED`)

---

## 1. Architecture & Network Topology

```
+-------------------------------------------------------------------------+
|                         CLIENTS (Web & Mobile)                          |
+------------------------------------+------------------------------------+
                                     |
                                HTTP / JSON
                                     |
+------------------------------------v------------------------------------+
|               NODE.JS EXPRESS GATEWAY (Port 5000)                       |
|  - Validates Citizen / Doctor JWT                                       |
|  - Executes Grounded MySQL Tools (14 Bounded Tools)                     |
|  - Injects X-AI-Service-Key Header for Python Microservice              |
|  - In-memory circuit breaker and heuristic fallback                     |
+------------------------------------+------------------------------------+
                                     |
                         Internal HTTP (Port 8000)
                                     |
+------------------------------------v------------------------------------+
|               PYTHON FASTAPI AI ENGINE (Port 8000)                      |
|  - Scikit-learn Machine Learning Models (RandomForest, GradientBoost)   |
|  - Multi-variate Z-score Anomaly Detection                              |
|  - Computer Vision Violation Ingestion (ANPR, Crowd Density)            |
|  - Bilingual Natural Language Processing (Hindi & English)              |
+-------------------------------------------------------------------------+
```

---

## 2. Authentication & Headers

### Mutual Service-to-Service Header
Calls between Node.js Gateway and Python FastAPI require the shared internal secret:
```http
X-AI-Service-Key: smartcity-internal-ai-key-2026
Content-Type: application/json
```

### Citizen / Staff Client Header
Client requests hitting Node.js endpoints require Bearer JWT authentication:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

---

## 3. Python FastAPI AI Endpoints (Port 8000)

### 3.1 System Health & Service Status
- **Method & Path:** `GET /health`
- **Description:** Verifies AI service uptime, active model weights, and worker health.
- **Response `200 OK`:**
  ```json
  {
    "status": "healthy",
    "version": "2.5.0",
    "service": "SmartCity AI Intelligence Layer",
    "models_loaded": {
      "traffic_model": true,
      "waste_model": true
    },
    "timestamp": "2026-10-11T10:45:00.000Z"
  }
  ```

---

### 3.2 Traffic Congestion Predictor
- **Method & Path:** `POST /ai/traffic/predict-congestion`
- **Model:** `traffic-baseline-v2.0` (Scikit-learn Random Forest Regressor)
- **Input Payload:**
  ```json
  {
    "hour": 17,
    "day_of_week": 4,
    "is_weekend": false,
    "is_peak_hour": true,
    "aqi": 182,
    "active_incidents": 2
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "model_id": "traffic-baseline-v2.0",
    "predicted_congestion_index": 74.2,
    "congestion_level": "HEAVY",
    "recommended_cycle_length_sec": 115,
    "confidence": 0.962,
    "provenance": "PREDICTED"
  }
  ```

---

### 3.3 Solid Waste Overflow & Dispatch Classifier
- **Method & Path:** `POST /ai/waste/predict-priority`
- **Model:** `waste-priority-v2.0` (Gradient Boosting Classifier)
- **Input Payload:**
  ```json
  {
    "days_since_collection": 3,
    "ward_density": 850,
    "capacity_liters": 1100,
    "complaints_count": 4
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "model_id": "waste-priority-v2.0",
    "predicted_priority": "IMMEDIATE_DISPATCH",
    "overflow_risk_score": 0.88,
    "estimated_fill_percent": 94.5,
    "recommended_truck_dispatch": true,
    "provenance": "PREDICTED"
  }
  ```

---

### 3.4 Water SCADA Anomaly & Burst Detection
- **Method & Path:** `POST /ai/water/detect-leak`
- **Algorithm:** Multivariate Statistical Z-Score & Pressure Differential
- **Input Payload:**
  ```json
  {
    "pipe_id": "WP-GKP-014",
    "inlet_pressure_bar": 3.8,
    "outlet_pressure_bar": 1.4,
    "inlet_flow_lpm": 450,
    "outlet_flow_lpm": 290
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "anomaly_detected": true,
    "anomaly_type": "PIPE_BURST_PROBABLE",
    "pressure_loss_pct": 63.15,
    "flow_loss_pct": 35.55,
    "severity": "CRITICAL",
    "recommended_action": "AUTOMATED_ISOLATION_VALVE_CLOSE",
    "provenance": "PREDICTED"
  }
  ```

---

### 3.5 Healthcare Operational Bed Surge Forecaster
- **Method & Path:** `POST /ai/healthcare/forecast-beds`
- **Input Payload:**
  ```json
  {
    "hospital_id": 1,
    "hospital_name": "AIIMS Gorakhpur",
    "current_icu_occupancy_pct": 82.5,
    "current_oxygen_occupancy_pct": 74.0,
    "active_epidemic_flag": false
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "forecast_horizon_hours": 24,
    "predicted_icu_occupancy_pct": 89.2,
    "surge_risk": "HIGH",
    "estimated_beds_depletion_hours": 14.5,
    "advisory": "Prepare backup oxygen cylinder manifold reserves."
  }
  ```

---

### 3.6 Multi-Variate City Anomaly Detection
- **Method & Path:** `POST /ai/anomaly/evaluate-city`
- **Input Payload:**
  ```json
  {
    "activeIncidents": 7,
    "pendingWasteRequests": 14,
    "hospitalBedOccupancyPct": 88.0,
    "emergencyCallsLastHour": 12,
    "parkingSaturationPct": 92.5
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "anomalies_count": 3,
    "anomalies": [
      {
        "type": "traffic_spike",
        "severity": "HIGH",
        "source": "traffic_corridor",
        "location": "Gorakhpur Central Arterials"
      },
      {
        "type": "waste_overflow_surge",
        "severity": "HIGH",
        "source": "waste_management",
        "location": "Commercial & Residential Zones"
      },
      {
        "type": "hospital_overcapacity_risk",
        "severity": "HIGH",
        "source": "healthcare_network",
        "location": "District Referral Centers"
      }
    ]
  }
  ```

---

## 4. Node.js Gateway AI Endpoints (Port 5000)

### 4.1 Grounded AI Clinical Care Assistant (7-Part Reasoning)
- **Method & Path:** `POST /api/ai/clinical-care/chat`
- **Authentication:** Optional Citizen Token
- **Input Payload:**
  ```json
  {
    "message": "mujhe pet me dard ho raha hai aur ulti lag rahi hai kya khaye aur kya parhez kare"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "intent": "SYMPTOM_REPORT",
    "condition": "उल्टी व मतली (Acute Emesis / Gastric Distress)",
    "specialist": "जनरल मेडिसिन (General Medicine)",
    "recommended_hospitals": [
      "AIIMS Gorakhpur",
      "BRD Medical College",
      "Gorakhpur District Hospital (Sadar)",
      "Park Hospital"
    ],
    "dietary_guidance": {
      "eat": ["ओआरएस (ORS)", "नारियल पानी", "पतली मूंग दाल की खिचड़ी", "उबला सेब"],
      "avoid": ["तली-भुनी चीजें", "मसालेदार भोजन", "दूध व भारी डेयरी उत्पाद", "खट्टे फल"]
    },
    "home_care": "पर्याप्त मात्रा में पानी व इलेक्ट्रोल पिएं। यदि उल्टी 24 घंटे से अधिक रहे या खून आए तो तुरंत आपातकालीन केंद्र जाएं।",
    "disclaimer": "⚠️ यह सलाह प्राथमिक स्वास्थ्य मार्गदर्शन हेतु है। निश्चित निदान के लिए पंजीकृत चिकित्सक से परामर्श लें।"
  }
  ```

---

### 4.2 Patient Medication Schedule & Adherence
- **Retrieve Schedule:** `GET /api/ai/clinical-care/schedule`
  - Headers: `Authorization: Bearer <patient_token>`
  - Response: List of prescribed medicines, dosage timings (morning/noon/night), and compliance flags.
- **Log Adherence:** `POST /api/ai/clinical-care/adhere`
  - Headers: `Authorization: Bearer <patient_token>`
  - Payload:
    ```json
    {
      "prescription_id": 42,
      "medicine_name": "Metformin 500mg",
      "status": "TAKEN"
    }
    ```
  - Response: `{ "success": true, "message": "Adherence logged successfully" }`

---

### 4.3 Unified Conversational Assistant & Grounded Tools
- **Method & Path:** `POST /api/ai/chat`
- **Description:** Dispatches user intent across 14 allowlisted database tools with bilingual Hindi/English synthesis.
- **Input Payload:**
  ```json
  {
    "query": "Where can I find ICU beds in Gorakhpur right now?"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "intent": "find_hospitals",
    "tool_executed": "SmartCityTools.find_hospitals",
    "response": "Here are the live ICU bed availabilities in Gorakhpur:\n- **AIIMS Gorakhpur**: 18 ICU Beds available\n- **BRD Medical College**: 12 ICU Beds available\n- **Sadar District Hospital**: 6 ICU Beds available",
    "data": [
      { "id": 1, "name": "AIIMS Gorakhpur", "icu_beds": 18 },
      { "id": 2, "name": "BRD Medical College", "icu_beds": 12 },
      { "id": 3, "name": "District Hospital (Sadar)", "icu_beds": 6 }
    ],
    "provenance": "REAL"
  }
  ```

---

## 5. Machine Learning Models Registry

| Model Key | Framework | Algorithm | Input Features | Metrics | Artifact Path |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `traffic-baseline-v2.0` | scikit-learn | RandomForestRegressor (`n=100`, `max_depth=10`) | `hour`, `day_of_week`, `is_weekend`, `is_peak_hour`, `aqi`, `active_incidents` | **MAE: 3.34, RMSE: 4.12, R²: 0.962** | `ai_service/artifacts/models/traffic_model.joblib` |
| `waste-priority-v2.0` | scikit-learn | GradientBoostingClassifier (`n=80`, `lr=0.1`) | `days_since_collection`, `ward_density`, `capacity_liters`, `complaints_count` | **Precision: 0.924, Recall: 0.920, F1: 0.921** | `ai_service/artifacts/models/waste_model.joblib` |

---

## 6. Audit & Provenance System

All AI interactions are immutably logged into MySQL relational tables:
1. `ai_predictions`: Captures model ID, input JSON, output JSON, execution time (ms), confidence score, and provenance (`REAL`, `PREDICTED`, `SIMULATED`).
2. `ai_clinical_audit_logs`: Captures patient query, identified clinical intent, assigned specialist, and emergency triage flags.
3. `ai_feedback`: Captures citizen ratings (1–5 stars) on AI answer quality for active retraining datasets.

---

## 7. Error Handling & Circuit Breaker Architecture

If the Python FastAPI microservice is offline or times out (> 1500ms):
1. Node.js gateway catches the connection exception.
2. The request automatically falls back to deterministic local rule engines (`traffic_engine.js`, `chatbot_engine.js`).
3. The response payload returns valid status with attribute `"fallback": true` and `"provenance": "SIMULATED"`.
4. Zero unhandled 500 crashes are surfaced to the citizen or doctor client.

---

*Verified & Maintained by the AI & Core Engineering Directorate — Gorakhpur SmartCity AI.*
