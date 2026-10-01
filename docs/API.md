# SMARTCITY AI — Master REST API Specification

**Platform**: Gorakhpur Smart City Management Platform (Uttar Pradesh, India)  
**Base URL**: `http://localhost:5000` (Production: `https://smartcity.gorakhpur.gov.in`)  
**AI Microservice URL**: `http://localhost:8000` (Internal FastAPI Engine)  
**Protocols**: RESTful HTTP/1.1 & HTTP/2 • WebSockets (Socket.IO)  
**Total Registered Endpoints**: 467 Endpoints across 25 Route Modules  
**Default Content-Type**: `application/json`  
**Authentication Header**: `Authorization: Bearer <jwt_token>`  

---

## 1. Authentication & Session Management (`backend/routes/auth.routes.js`)

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/login` | Public | Citizen login with mobile/email & password. Returns JWT + user object. |
| `POST` | `/api/register` | Public | Register new citizen account with 10-digit mobile, email, and residence ward. |
| `POST` | `/api/staff-login` | Public | Departmental staff login (requires `staffId` and `password`). |
| `POST` | `/api/auth/demo-login` | Public | 1-Click developer persona login (`citizen`, `traffic`, `hospital`, `doctor`, `admin`). |
| `GET` | `/api/auth/me` | Authenticated | Fetch active user profile and authorized departmental permissions. |
| `PUT` | `/api/auth/profile` | Authenticated | Update user profile details (vehicle plate, ward, blood group, emergency contact). |
| `GET` | `/api/user/activities` | Authenticated | Centralized user timeline uniting audit logs, bookings, and grievances. |
| `POST` | `/api/auth/logout` | Authenticated | Invalidate session token and record security audit log. |

---

## 2. Smart Traffic & Transit Grid (`backend/routes/traffic.routes.js`)

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/traffic/junctions` | Public | List all 42 city junctions with live congestion scores and coordinates. |
| `GET` | `/api/traffic/signals` | Public | Real-time signal phase states (`RED`/`YELLOW`/`GREEN`) and cycle durations. |
| `POST` | `/api/traffic/signals/override` | Traffic Staff / Admin | Manual phase override or emergency flash mode for specific junctions. |
| `GET` | `/api/traffic/cameras` | Traffic Staff / Admin | Live optical CCTV camera stream URLs and ANPR camera feeds. |
| `POST` | `/api/cv/violations/:id/verify` | Traffic Staff / Admin | Approve or dismiss automatic ANPR red-light and speed violations. |
| `GET` | `/api/traffic/echallan/search` | Public | Search traffic e-Challan by vehicle number or challan ID. |
| `POST` | `/api/traffic/echallan/pay` | Citizen / Public | Settle traffic e-Challan via UPI / payment gateway with instant receipt. |

---

## 3. IoT Smart Parking System (`backend/routes/parking.routes.js`)

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/parking/lots` | Public | List city parking lots with live vacant/occupied capacity counts. |
| `GET` | `/api/parking/slots` | Public | Slot map and bay status (Bays A, B, C) for multi-level parking lots. |
| `POST` | `/api/parking/book` | Citizen | Reserve parking slot with vehicle number and duration. Generates QR ticket. |
| `GET` | `/api/parking/my-bookings` | Citizen | View active and historical parking tickets for authenticated user. |
| `GET` | `/api/parking/staff/overview` | Parking Staff / Admin | Active entry counter, lot capacity utilization, and bay overrides. |
| `POST` | `/api/parking/entry` | Parking Staff | Barrier gate check-in via ANPR license plate or QR scanner. |
| `POST` | `/api/parking/exit` | Parking Staff | Barrier gate checkout with automated duration and fee calculation. |

---

## 4. Healthcare, Hospitals & Diagnostics (`backend/routes/hospital.routes.js`, `doctor.routes.js`)

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/hospitals` | Public | Directory of hospitals (AIIMS, BRD Medical, District Hospital) with facility tags. |
| `GET` | `/api/hospital/beds` | Public | Real-time bed occupancy (ICU, Oxygen, General, Ventilator). |
| `GET` | `/api/hospital/bed-categories` | Public | Granular availability breakdown across 57 bed categories. |
| `GET` | `/api/doctors` | Public | Filter doctors by department, hospital, and consultation fee. |
| `POST` | `/api/appointments/book-strict` | Citizen | Book OPD consultation with slot conflict detection and token generation. |
| `GET` | `/api/doctor/:id/appointments` | Doctor | Active doctor queue with appointment statuses. |
| `POST` | `/api/doctor/consultation` | Doctor | Complete consultation with diagnosis, prescription, and EHR record update. |
| `GET` | `/api/diagnostics/tests` | Public | Pathology and radiology test catalog with pricing. |

---

## 5. Patient EMR & Ayushman Privacy QR Pass (`backend/routes/patient.routes.js`)

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/patients` | Citizen / Staff | Register patient and generate sequential ID (`P-YYYY-NNNNNN`) & QR token. |
| `GET` | `/api/patients` | Citizen (own) / Staff (all) | List patient records scoped by user ID or search term. |
| `GET` | `/api/patients/:id` | Citizen (owner) / Staff | Fetch patient medical profile with access control check. |
| `GET` | `/api/patients/:id/qr` | Citizen / Staff | Generate privacy-preserving QR code payload for physical/mobile pass. |
| `POST` | `/api/patients/verify-qr` | Public (masked) / Staff (full) | Verify scanned QR: returns masked summary to public; unlocks full EHR for medical staff. |

---

## 6. Waste Management (`backend/routes/waste.routes.js`)

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/waste/bins` | Public | Smart RFID dustbins with fill percentage and battery levels. |
| `POST` | `/api/waste/report` | Citizen | Report overflowing garbage bin with GPS coordinates and photo upload. |
| `GET` | `/api/waste/requests` | Waste Staff / Admin | Operational grievance queue for waste collection. |
| `POST` | `/api/waste/requests/update-status` | Waste Staff / Admin | Assign worker/vehicle and transition request status (`Assigned`, `In Progress`, `Resolved`). |
| `GET` | `/api/waste/vehicles` | Waste Staff / Admin | Track municipal compactor trucks and collection routes. |

---

## 7. SCADA Water Supply (`backend/routes/water.routes.js`)

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/water/tanks` | Public | Overhead reservoir and water tank storage levels. |
| `GET` | `/api/water/pipelines` | Public | SCADA pipeline network with pressure readings and flow rates. |
| `GET` | `/api/water/schedules` | Public | Daily water supply timing schedule by municipal ward. |
| `POST` | `/api/water/tanker-bookings` | Citizen | Request emergency potable water tanker delivery to residence. |
| `GET` | `/api/water/anomalies` | Water Staff / Admin | IoT detected pipe bursts, low pressure warnings, and contamination alerts. |

---

## 8. Emergency SOS & Ambulances (`backend/routes/emergency.routes.js`, `ambulance.routes.js`)

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/emergency/sos` | Public / Citizen | Trigger one-touch emergency dispatch with GPS coordinates and incident type. |
| `GET` | `/api/ambulances` | Public | Real-time GPS locations and availability of municipal ambulances. |
| `POST` | `/api/traffic/ambulances/:id/critical-dispatch` | Emergency / Admin | Engage green wave preemption corridor for transit to trauma center. |

---

## 9. Citizen Grievances & SLA Tracking (`backend/routes/requests.routes.js`)

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/requests` | Public / Citizen | Lodge grievance with automated SLA deadline assignment (2h to 72h). |
| `GET` | `/api/requests/track/:id` | Public | Public SLA tracker returning live countdown and response history. |
| `GET` | `/api/requests/my` | Citizen | List all complaints filed by authenticated user. |

---

## 10. Integrated Command & Control (ICCC) Admin (`backend/routes/admin.routes.js`)

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/command-center` | Admin / Staff | Aggregated municipal KPIs, critical alarms, SLA breach count. |
| `GET` | `/api/admin/stats` | Admin | Cross-departmental operational statistics and telemetry health. |
| `GET` | `/api/admin/users` | Admin | Manage citizen accounts, staff roster, and role assignments. |
| `POST` | `/api/admin/what-if-simulation` | Admin | Execute city-wide simulation scenarios (e.g. road closure, monsoon runoff). |

---

## 11. Grounded AI & Predictive Intelligence (`backend/routes/ai.routes.js`)

### 11.1 Grounded Bilingual Chatbot
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

### 11.2 Multi-Horizon Traffic Prediction
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

### 11.3 Webster Signal Optimization
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

### 11.4 Ambulance Corridor Preemption Wave
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

### 11.5 NLP Grievance Routing & SLA Classifier
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

### 11.6 Waste Route Optimization (Nearest-Neighbor TSP)
- **Endpoint**: `POST /api/waste/optimize-route`
- **Request Body**:
  ```json
  {
    "ward_number": 14,
    "min_fill_threshold": 70
  }
  ```
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

### 11.7 Hospital Bed Surge & OPD Queue Forecast
- **Endpoint**: `GET /api/hospital/bed-surge?hospital_id=HOSP-01`
- **Response**:
  ```json
  {
    "success": true,
    "hospital": { "id": "HOSP-01", "name": "AIIMS Gorakhpur" },
    "occupancy_forecast": {
      "total_occupancy_pct": 72.0,
      "icu_occupancy_pct": 80.0,
      "surge_risk": "ELEVATED"
    },
    "opd_forecast": {
      "estimated_queue_wait_mins": 40,
      "forecasted_daily_patient_load": 288
    },
    "data_source": "PREDICTED"
  }
  ```

### 11.8 Secure QR Patient Record Access (Medical Guard)
- **Endpoint**: `POST /api/hospital/qr-patient-access`
- **Headers**: `Authorization: Bearer <doctor_jwt_token>`
- **Request Body**: `{ "qr_token": "SCPAT-6e41b28d09f" }`
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

### 11.9 Model Catalog Health & Concept Drift
- **Endpoint**: `GET /api/ai/models/health`
- **Response**: Returns accuracy, precision, recall, latency, and concept drift status for all registered ML models.

### 11.10 Explainability & Factor Attribution (XAI)
- **Endpoint**: `GET /api/ai/explainability/:prediction_id`
- **Response**: Returns input summary, confidence margin, top contributing factors, and human audit trail.
