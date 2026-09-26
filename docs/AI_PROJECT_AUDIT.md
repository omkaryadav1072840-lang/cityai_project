# SmartCity AI Gorakhpur - Complete Architectural & AI Readiness Audit

**Document Version:** 1.0.0  
**Author:** Senior AI Architect & Full-Stack Engineer  
**Date:** September 2026  
**Target:** Production-Grade Modular AI Intelligence Layer Integration  

---

## 1. Executive Summary

This audit establishes the ground-truth technical foundation of the **SmartCity AI Gorakhpur** project. The project is an operational multi-department civic management platform serving Gorakhpur, Uttar Pradesh. It integrates civic services, real-time IoT feeds, municipal emergency dispatch, traffic management, and administrative dashboards.

The primary objective is to integrate a **production-style, modular AI Intelligence Layer** (Python FastAPI, Scikit-learn, Pandas, NumPy, Joblib, OpenCV/Vision, secure Tool Calling) without disrupting existing working modules, authentication, database schemas, or frontend UI.

---

## 2. Directory Structure & Technology Stack

```
d:\cityai_project - Copy\
├── ai_service/               # Legacy Python scripts (CLI spawn pattern via child_process)
│   ├── anomaly_detection.py
│   ├── camera_vision.py
│   ├── city_assistant.py
│   ├── traffic_prediction.py
│   └── waste_prediction.py
├── backend/
│   ├── config/               # MySQL pool configuration (db.js)
│   ├── database/             # Schemas, migrations, seed scripts (schema.sql, traffic_schema.sql, etc.)
│   ├── middleware/           # Auth (JWT, RBAC), Error, Security, Upload middlewares
│   ├── routes/               # 24 modular Express routers
│   ├── services/             # Background engines (traffic_engine.js, sla_engine.js, ambulance_simulator.js, python_ai_bridge.js)
│   ├── sockets/              # Socket.IO room manager & event emitters (index.js)
│   ├── uploads/              # Static uploads (prescriptions, diagnostic reports, photos)
│   ├── .env                  # Environment secrets & database credentials
│   ├── Dockerfile            # Node.js production image
│   ├── package.json          # Express 5.1.0, Socket.IO 4.8.1, mysql2, jsonwebtoken
│   └── server.js             # Master Express & HTTP server entry point
├── frontend/
│   ├── pages/                # 8 departmental sub-applications
│   │   ├── emergency/        # Rapid SOS dispatch & incident routing
│   │   ├── famous/           # Cultural tourism & heritage interactive map
│   │   ├── hospital/         # OPD booking, doctor portal, bed tracking, pharmacy
│   │   ├── parking/          # Multi-floor bay booking, ANPR, RFID Fastag
│   │   ├── police/           # FIR logging, station directory, crime stats
│   │   ├── traffic/          # OpenLayers radar map, signal cycle override, CCTV
│   │   ├── waste/            # 3-layer citizen/staff/admin bin tracking & routes
│   │   └── water/            # IoT water flow, tanker booking, reservoir levels
│   ├── auth.js               # Universal authentication, glassmorphic login & profile modal
│   ├── realtime.js           # Shared Socket.IO client
│   ├── script.js             # Master dashboard orchestration & Leaflet map
│   ├── index.html            # Main citizen portal & Command Center dashboard
│   ├── index.css             # Main stylesheet
│   └── nginx.conf            # Production Nginx reverse-proxy
├── docker-compose.yml        # Multi-container orchestration (MySQL, Backend, Frontend)
└── package.json              # Monorepo/Root package descriptor
```

### Core Technologies:
* **Frontend:** Vanilla HTML5, CSS3 (Glassmorphic design system), JavaScript (ES6+), Leaflet 1.9.4, OpenLayers 9.2.4, Socket.IO Client 4.7.5.
* **Backend:** Node.js 20, Express.js 5.1.0, MySQL2 (Connection Pool), Socket.IO 4.8.1, JWT (`jsonwebtoken`), Scrypt password hashing.
* **Database:** MySQL 8.0+ (utf8mb4_unicode_ci) with connection pooling (15 connections).
* **Python Environment:** Python 3.13.14 (NumPy 2.4.4, Matplotlib, Pillow available on host).

---

## 3. Existing Architecture & Request Flow

```
[ Citizen / Staff / Admin Browser ]
               │
               ▼
      [ Nginx (Port 80/3000) ]
               │
               ▼
  [ Node.js + Express (Port 5000) ]
       │               │
       │ (JWT / RBAC)  ├─► [ Socket.IO Server (Port 5000) ]
       │               │       ├── ambulance:location-updated
       │               │       ├── parking:slot-updated
       │               │       └── emergency:new-sos
       ▼               │
 [ Express Routers ] ◄─┘
       │
       ├─► [ MySQL 8.0 Pool (Port 3306) ] (70+ authoritative tables)
       │
       └─► [ Current AI Integration: python_ai_bridge.js ]
               │ (child_process.spawn - CLI stdin/stdout)
               ▼
         [ ai_service/*.py scripts ]
```

---

## 4. Node.js Server & Express Route Audit

Entry point: `backend/server.js` (332 lines).
* Initializes HTTP server and binds Socket.IO (`app.set("io", io)`).
* Applies security headers (`helmet` style anti-clickjack, XSS filter, anti-sniff).
* Enforces CORS (`CORS_ORIGIN || "*"`).
* Mounts uploads directory and static frontend files.
* Starts background services:
  * `trafficEngine.start()`: Simulates adaptive signal timers and vehicle flow cycles.
  * `slaEngine.start()`: Monitors municipal SLA deadlines on civic requests every 60s.
  * `ambulanceSimulator.start()`: Generates live GPS coordinates for 6 ambulances with automated green corridor preemption.

### The 24 Registered Router Modules:

| Router | File | Key Capabilities |
| :--- | :--- | :--- |
| `auth` | `backend/routes/auth.routes.js` | Citizen registration, citizen login, staff login, profile retrieval, profile updates (`PUT /api/auth/profile`). |
| `city` | `backend/routes/city.routes.js` | General Gorakhpur city statistics, landmarks, civic overview. |
| `patient` | `backend/routes/patient.routes.js` | Citizen patient registration, digital medical dossier, blood group, medical history. |
| `appointment` | `backend/routes/appointment.routes.js` | OPD slot scheduling, doctor availability, appointment cancellation. |
| `doctor` | `backend/routes/doctor.routes.js` | Doctor directory, specialization filtering, shift schedules. |
| `hospital` | `backend/routes/hospital.routes.js` | Hospital registry (AIIMS, BRD Medical), bed tracking, ICU availability, department listings. |
| `diagnostics` | `backend/routes/diagnostics.routes.js` | Lab tests (LFT, KFT, Lipid, CBC), booking, authenticated reports upload/download. |
| `ambulance` | `backend/routes/ambulance.routes.js` | Ambulance dispatch, driver GPS telemetry ingest, automated ETA estimation. |
| `emergency` | `backend/routes/emergency.routes.js` | SOS panic button, incident logging, emergency department dispatch. |
| `pharmacy` | `backend/routes/pharmacy.routes.js` | Medicine catalog, cart, automated bill generation, stock levels. |
| `waste` | `backend/routes/waste.routes.js` | Smart bin fill-levels, collection routes, citizen garbage requests, worker assignments. |
| `parking` | `backend/routes/parking.routes.js` | Multi-floor lot status, ANPR license plate scans, bay booking, QR gate passes. |
| `water` | `backend/routes/water.routes.js` | Reservoir levels, water flow telemetry, tanker dispatch, citizen water complaints. |
| `police` | `backend/routes/police.routes.js` | Station directory, FIR/complaint filing, verified crime statistics. |
| `traffic` | `backend/routes/traffic.routes.js` | Junctions, approaching signal phases, CCTV feeds, incidents, emergency green corridors. |
| `famous_places`| `backend/routes/famous_places.routes.js` | Gorakhnath Temple, Ramgarh Taal, heritage tourism spots, ratings, saved places. |
| `ai` | `backend/routes/ai.routes.js` | City assistant intent parser, traffic congestion prediction, anomaly stream, camera analysis. |
| `requests` | `backend/routes/requests.routes.js` | Unified civic grievance management, SLA tracking, priority escalation. |
| `notifications`| `backend/routes/notifications.routes.js` | User-specific and city-wide push alert system, unread counts. |
| `street_lights`| `backend/routes/street_lights.routes.js` | Smart lighting grid status, energy consumption, fault detection. |
| `environment` | `backend/routes/environment.routes.js` | AQI sensor telemetry, PM2.5, PM10, temperature, humidity readings. |
| `admin` | `backend/routes/admin.routes.js` | Municipal oversight, user permissions, system health checks, audit logs. |
| `search` | `backend/routes/search.routes.js` | Unified global search across hospitals, parking lots, police stations, and tourist sites. |
| `map` | `backend/routes/map.routes.js` | Geospatial GeoJSON layers for city boundaries, zones, and municipal assets. |

---

## 5. Authentication & RBAC Audit

Implementation: `backend/middleware/auth.middleware.js`
* **Tokens:** Signed JWT with `crypto.scryptSync` password verification and backward-compatible legacy support.
* **Roles:**
  * `citizen`: Standard public access, personal bookings, grievances, medical records.
  * `staff`: Departmental access restricted via `requireDepartment(['traffic', 'hospital', 'waste', 'water', 'police'])`.
  * `admin`: Complete unrestricted access across all routes.
* **Payload Structure:**
  ```json
  {
    "id": 1,
    "name": "Omkar Yadav",
    "role": "citizen",
    "mobile": "6306880179",
    "email": "omkaryadav@gmail.com",
    "department": null,
    "editable": []
  }
  ```
* **Client Synchronization:** Handled universally via `frontend/auth.js` (`SmartCityAuth`).

---

## 6. Database Schema & Relationships Audit

Primary Database: `smartcity` (MySQL 8.0).  
Key Tables & Cross-Module Relationships:

```
[ users ] (Citizens & Operators)
   ├──< [ appointments ] >── [ doctors ] >── [ hospitals ]
   ├──< [ parking_bookings ] >── [ parking_lots ] >──< [ parking_slots ]
   ├──< [ waste_bin_requests ] >── [ waste_bins ]
   ├──< [ water_tanker_bookings ] >── [ water_tanks ]
   ├──< [ traffic_incidents ] >── [ traffic_junctions ] >──< [ traffic_signals ]
   ├──< [ emergency_incidents ] >── [ ambulances ]
   └──< [ requests ] (Unified Civic Grievances with SLA Tracking)

[ Real-Time IoT & Telemetry Tables ]
   ├── [ traffic_cameras ] (CCTV Optical Vision Feeds)
   ├── [ city_environmental_sensors ] (AQI, PM2.5, Humidity)
   ├── [ parking_anpr_scans ] (Automated Number Plate Recognition)
   └── [ audit_logs ] (System Security & Access Trail)
```

### Table Relationships Breakdown:
1. **Traffic:** `traffic_junctions` is parent to `traffic_signals`, `traffic_cameras`, `traffic_movement_rules`, and `traffic_incidents`.
2. **Parking:** `parking_lots` is parent to `parking_slots`, `parking_rates`, `parking_entries`, `parking_exits`, and `parking_bookings`.
3. **Healthcare:** `hospitals` is parent to `hospital_departments`, `hospital_wards`, `hospital_beds`, `doctors`, and `appointments`.
4. **Waste:** `waste_bins` link to `waste_routes` and `waste_vehicles`; citizen complaints flow into `waste_bin_requests`.
5. **Grievances:** `requests` links citizen requests to departments with target SLA hours and priority weights (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).

---

## 7. Current AI Implementation Audit

### Existing Code in `ai_service/`:
1. `traffic_prediction.py`:
   * Rule-based heuristic scoring based on current hour, day-of-week, hardcoded AQI, and incidents count.
   * Returns `predicted_congestion`, `severity_score`, `confidence`.
   * Execution: Spawned as a child process via `python_ai_bridge.js`.
2. `waste_prediction.py`:
   * Simple linear extrapolation using days since last collection and population density factors.
3. `anomaly_detection.py`:
   * Threshold-based rule checks on incoming JSON metrics (e.g. `active_incidents >= 6`, `bed_occupancy_pct >= 85.0`).
4. `camera_vision.py`:
   * Evaluates camera stream URL. Filters out YouTube/web embeds; returns mock vehicle count and queue length for direct streams.
5. `city_assistant.py`:
   * Regex keyword matcher mapping citizen questions to predefined departmental intents.

### Inherent Limitations of the Current Setup:
* **Process Overhead:** Invoking Python via `child_process.spawn` on every request introduces 150ms-400ms startup latency per call.
* **No Shared State or Model Caching:** Heavy ML models (Scikit-Learn estimators, PyTorch weights) cannot remain in memory between requests.
* **No Real-Time Serving Pipeline:** Lack of FastAPI / Uvicorn server means no asynchronous concurrency, no HTTP connection pooling, and no OpenAPI/Swagger documentation.
* **Simulated Fallback Over-reliance:** High risk of confusion between simulated heuristic predictions and real validated ML models.

---

## 8. Target Architecture

```
[ Frontend: Web Dashboard & Departmental Pages ]
                       │
                       │ HTTPS / Socket.IO
                       ▼
    [ Node.js + Express (Port 5000) ]
      ├── Authentication & RBAC Guard
      ├── Input Sanitization & Business Rules
      ├── Existing MySQL Queries & Transaction Safety
      └── Dedicated AI Service Client (HTTP/REST)
                       │
                       │ Internal Network / Authorized Mutual Secret
                       │ Header: X-AI-Service-Key: <SECRET>
                       ▼
    [ Python FastAPI AI Service (Port 8000) ]
      ├── /api/v1/health (Liveness & Model Status)
      ├── /api/v1/traffic (Congestion & Vision Inference)
      ├── /api/v1/waste (Overflow & Route Optimization)
      ├── /api/v1/water (Demand Forecasting & Anomaly Indicators)
      ├── /api/v1/healthcare (Capacity & Search Inference)
      ├── /api/v1/emergency (Travel-Time & Triage Support)
      ├── /api/v1/parking (Demand & Peak Forecasting)
      ├── /api/v1/environment (AQI Trends & Forecasting)
      ├── /api/v1/assistant (Strict Grounded Tool Calling)
      │
      ├── [ Pipelines & Model Store (Scikit-learn, Joblib) ]
      └── [ Model Evaluation & Metrics Logger ]
```

---

## 9. AI Integration Points by Module

| Module | AI Integration Point | Input Data Required | Expected Output / SLA | Guardrails & Fallbacks |
| :--- | :--- | :--- | :--- | :--- |
| **Traffic** | Congestion prediction & CCTV vehicle counting | Junction ID, approach, vehicle count, hour, incidents | `congestion_level`, `predicted_delay_mins`, `confidence` | Never directly change real traffic signals; fallback to deterministic schedule if ML service times out. |
| **Waste** | Bin fill-rate & collection priority | Bin ID, last collection timestamp, historical fill logs | `estimated_fill_pct`, `priority_rank` | If historical data < 30 samples, return "Insufficient Historical Baseline". |
| **Water** | Consumption anomaly & leak indicator | Tank ID, daily inflow/outflow, pressure telemetry | `is_anomaly_indicator`, `deviation_score` | Clearly flag as "Possible Leak Indicator requiring field inspection"; never claim verified leak. |
| **Healthcare** | Bed occupancy trend & clinic discovery | Hospital ID, ward type, current admissions rate | `projected_bed_demand`, `department_recommendation` | Strict HIPAA/privacy protection; never output patient identities or autonomous clinical diagnosis. |
| **Emergency** | Ambulance travel time & priority ranking | Origin GPS, destination GPS, road incidents, time of day | `estimated_arrival_minutes`, `dispatch_priority` | Human operator retains 100% dispatch authority; automatic failover if AI unavailable. |
| **Parking** | Peak occupancy prediction | Lot ID, day of week, hour, historical bookings | `projected_occupancy_pct`, `peak_window` | Authoritative slot count checked against MySQL `parking_slots` before booking. |
| **AQI** | Trend analysis & anomaly detection | Sensor ID, PM2.5, PM10, temperature, time | `aqi_category`, `short_term_trend` | Clearly distinguish between live sensor readings and statistical trend predictions. |
| **Public Safety**| Incident categorization & trend clustering | Complaint description, category, timestamp | `suggested_classification`, `escalation_tag` | No facial recognition; no autonomous legal accusations; staff review mandatory. |
| **Assistant** | Grounded City Chatbot | User question, active user role, verified context | Natural language answer + Allowlisted Action Links | Zero direct SQL execution; strictly uses allowlisted internal tool functions. |

---

## 10. Database Schema Additions for AI (Versioned Migrations)

To ensure full observability, model governance, and audit trails without modifying existing tables, the following new tables are designed:

1. `ai_models`: Registry of all deployed models (name, version, framework, artifact path, trained date, metrics).
2. `ai_predictions`: Historical log of all predictions made (model ID, module, input snapshot, prediction result, confidence, timestamp, review status).
3. `ai_model_metrics`: Evaluation benchmark records (MAE, RMSE, F1-score, accuracy, test dataset identifier).
4. `ai_reviews`: Human-in-the-loop review log where municipal officers confirm or correct AI recommendations.

---

## 11. Risks & Dependencies

1. **Host Python Dependencies:** FastAPI, Uvicorn, Scikit-learn, Pandas, Joblib must be installed without breaking host stability.
2. **Data Sparsity:** Real historical traffic and water logs may have sparse intervals; the pipeline must gracefully detect low sample sizes and report data readiness status instead of inventing values.
3. **Network Resiliency:** If Python FastAPI restarts or fails, Node.js must seamlessly fall back to deterministic municipal rules without dropping user requests.
4. **Confidentiality:** Patient health records and sensitive police complaints must never be transmitted to external LLMs.

---

## 12. File Modification Matrix

### Files That Must NOT Be Overwritten / Ruined:
* `backend/server.js` (Must preserve Socket.IO binding and existing route mounts)
* `backend/config/db.js` (Preserve MySQL pool configuration)
* `backend/middleware/auth.middleware.js` (Preserve existing JWT and role-based permissions)
* `frontend/auth.js` (Preserve recent glassmorphic login & profile redesign)
* `backend/database/schema.sql` (Existing 70+ tables must remain intact)

### Files Requiring Modification:
* `backend/routes/ai.routes.js` (Upgrade from child_process spawn to HTTP AI Service Client)
* `backend/.env` & `docker-compose.yml` (Add `AI_SERVICE_URL` and `AI_SERVICE_SECRET`)

### New Files to Create:
* `ai_service/app/main.py`
* `ai_service/app/config.py`
* `ai_service/app/schemas.py`
* `ai_service/app/api/routes/*`
* `ai_service/app/services/*`
* `ai_service/requirements.txt`
* `backend/services/ai_service_client.js`
* `backend/database/ai_intelligence_migration.sql`

---

## 13. Recommended Implementation Order

1. **PHASE 1:** Complete project audit & verification (**COMPLETED HERE**).
2. **PHASE 2 & 3:** Create Python FastAPI service foundation with modular routes, health check, schemas, and security.
3. **PHASE 4:** Build `backend/services/ai_service_client.js` in Node.js with timeouts, fallback, and role-aware protection.
4. **PHASE 5:** Apply `ai_intelligence_migration.sql` to MySQL for model registry and prediction logging.
5. **PHASE 6 & 7:** Implement module-specific services (Traffic baseline, Waste prediction, Water anomaly indicators, Parking demand).
6. **PHASE 8:** Implement verified model evaluation and training scripts.
7. **PHASE 9:** Implement SmartCity AI Assistant with allowlisted tool execution.
8. **PHASE 10:** Comprehensive test suite, monitoring, and deployment documentation.
