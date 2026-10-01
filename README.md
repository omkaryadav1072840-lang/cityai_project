# SMARTCITY AI — Gorakhpur Smart City Management Platform

**Platform**: Gorakhpur Smart City Operations & Intelligent Municipal Operating System  
**Version**: 2.5.0 Enterprise  
**Location**: Gorakhpur, Uttar Pradesh, India  
**Target Environment**: Node.js (Express 5) • MySQL 8.0 • Python 3.13 (FastAPI) • Leaflet GIS • Socket.IO WebSockets  

---

## 1. Project Overview

**SMARTCITY AI** is a unified, municipal-grade operating system designed to optimize, automate, and govern urban operations across Gorakhpur, Uttar Pradesh. Rather than functioning as a collection of isolated proof-of-concept features, the platform integrates citizen services, real-time IoT feeds, emergency dispatch, traffic management, and administrative oversight around a **Single Source of Truth** pattern.

The platform combines:
1. **High-Concurrency Node.js / Express 5 Application Gateway** (Port `5000`)
2. **Grounded AI Orchestration Engine** with 17 allowlisted municipal database tools
3. **High-Performance Python FastAPI Microservices Layer** (Port `8000`)
4. **Relational MySQL 8.0 State Store** with 101 active tables and dedicated **AI Prediction & Audit Ledgers**
5. **Universal Floating AI Assistant** accessible in English and Hindi across every interface
6. **Real-Time Telemetry Daemons** (Webster IRC:93 traffic signal cycles, 6-ambulance live GPS tracking with 600m Green Wave preemption, and municipal SLA grievance escalation)

---

## 2. Main Features

- **Smart Traffic & ATCS**: 42 city junctions with live signal phasing, automated Webster IRC:93 cycle length optimization, CCTV ANPR violation staging, and citizen e-Challan payment.
- **IoT Smart Parking**: Real-time bay occupancy (Bays A, B, C) across Gorakhpur parking lots, advance QR reservations, and ANPR barrier gate check-in/out.
- **Hospital, Telemedicine & Ayushman QR Pass**: Live bed availability across 14 hospitals (AIIMS Gorakhpur, BRD Medical College) with 57 bed categories, conflict-free doctor OPD scheduling, doctor clinical consultation portal, and privacy-preserving Ayushman QR health passes.
- **SCADA Water Supply & Leak Detection**: Reservoir level tracking, SCADA pipeline pressure telemetry, automated pipe burst detection, ward supply schedules, and doorstep potable water tanker booking.
- **Smart Waste Management**: Ultrasonic dustbin fill-level telemetry, citizen photo evidence reporting, and Nearest-Neighbor TSP collection route optimization.
- **Emergency Services & Ambulance Green Wave**: 1-tap citizen SOS incident dispatch with browser GPS, live 6-ambulance moving radar, and automated 600m arterial Green Wave preemption corridors.
- **Police & Public Safety**: Gorakhpur Thana directory, jurisdiction map, beat patrol tracking, and online e-FIR grievance filing.
- **Cultural Tourism & Heritage**: Interactive landmark explorer for Ramgarh Tal, Gorakhnath Temple, Planetarium, audio guides, citizen reviews, and event calendar.
- **Integrated Command & Control Center (ICCC)**: Municipal executive dashboard, SLA countdown monitor, cross-department telemetry, and What-If scenario simulations.
- **Bilingual Grounded AI Assistant**: Natural language civic query resolution with strict zero-hallucination database bounds and deterministic local heuristic fallback.

---

## 3. Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Web** | Vanilla HTML5, Vanilla CSS3 (Custom Properties & Glassmorphic tokens), JavaScript (ES6+), Leaflet 1.9.4 GIS, OpenLayers 9.2.4, Socket.IO Client 4.8.1, QRCode.js |
| **Backend Gateway** | Node.js 20+, Express.js 5.1.0, Socket.IO 4.8.1, `mysql2/promise`, `jsonwebtoken` (JWT), `helmet` security headers |
| **Machine Learning** | Python 3.10–3.13, FastAPI, Uvicorn, Scikit-learn, Pandas, NumPy, Joblib, OpenCV, Tesseract OCR |
| **Database** | MySQL 8.0+ (`utf8mb4_unicode_ci`), connection pooling (max 20 concurrent connections) |
| **Real-Time Telemetry** | Socket.IO WebSocket channels for traffic signals, ambulances, and civic SLA tickers |
| **DevOps / Container** | Docker, Docker Compose, PM2, Nginx reverse proxy, Windows PowerShell automation |

---

## 4. Installation & Setup Guide

### 4.1 Prerequisites
Ensure the following runtimes are installed on your machine:
- **Node.js**: v18.0.0 or higher (`node -v`)
- **Python**: v3.10 to v3.13 (`python --version`)
- **MySQL Server**: 8.0+ running on port `3306`

### 4.2 Step 1: Configure Environment Variables
In the project root, configure your backend environment file:
```powershell
# Copy the environment template
Copy-Item backend\.env.example backend\.env
```
Ensure `backend\.env` contains your MySQL credentials and JWT secret:
```ini
PORT=5000
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_actual_mysql_password
MYSQL_DATABASE=smartcity_db
JWT_SECRET=smartcity_super_secret_jwt_key_gorakhpur_2026
AI_SERVICE_URL=http://127.0.0.1:8000
AI_SERVICE_KEY=smartcity_ai_internal_token_gorakhpur_2026
```

### 4.3 Step 2: Install Node.js Dependencies
```powershell
cd backend
npm install
cd ..
```

### 4.4 Step 3: Setup Python AI Microservices Environment
```powershell
# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install required ML packages
pip install fastapi uvicorn scikit-learn pandas numpy opencv-python joblib
```

### 4.5 Step 4: Execute Database Migrations
Run the three idempotent migration scripts to initialize all 101 tables and AI prediction ledgers:
```powershell
# 1. Core AI Orchestrator & Tool Logs Migration
node backend/database/run_phase1_migration.js

# 2. Traffic, CV/ANPR, Grievance, and Waste AI Migration
node backend/database/run_phase2_to_6_migration.js

# 3. Water, Healthcare, Parking, and Environment Migration
node backend/database/run_phase7_to_11_migration.js
```

---

## 5. How to Run Frontend & Backend

### 5.1 One-Click Launch (Windows Batch Script)
You can launch both the Python AI engine and the Node.js application gateway using the provided root runner:
```powershell
.\run.bat
```

### 5.2 Manual Terminal Launch

**Terminal 1: Start Python FastAPI ML Engine (Port 8000)**
```powershell
uvicorn ai_service.main:app --host 127.0.0.1 --port 8000 --reload
```
*(Note: If Python is offline, Node.js automatically falls back to local mathematical heuristics with zero downtime).*

**Terminal 2: Start Node.js Application Gateway (Port 5000)**
```powershell
node backend/server.js
```
Expected output:
```
🟢 MySQL Connection Pool initialized successfully.
🚀 Server running at http://localhost:5000
```

**Terminal 3: Access Frontend Application**
Open your browser and navigate to:
```
http://localhost:5000/
```
Or open [frontend/index.html](file:///d:/cityai_project%20-%20Copy/frontend/index.html) directly.

### 5.3 Docker Compose Option
```bash
docker compose up -d --build
```
- Web Application: `http://localhost:5000` or `http://localhost:3000`
- Direct Health Diagnostic: `http://localhost:5000/api/health`

---

## 6. AI Integration Overview

The platform uses a **Zero-Hallucination Grounded AI Framework**:
1. **17 Allowlisted Grounded Tools**: In `backend/services/grounded_tools.js`, queries are bound to real MySQL tables.
2. **Tri-State Provenance**: Every response carries `data_source: "REAL"`, `"PREDICTED"`, or `"SIMULATED"`.
3. **Audit Ledger**: Inferences are permanently stamped into the `ai_predictions` ledger with inputs, outputs, confidence score, and review status.
4. **Human-in-the-Loop Safeguards**: High-consequence operations (e-Challan fine referral, medical QR access) require explicit human officer verification.
5. **Local Intent Fallback**: If external LLM keys are absent, the platform uses its deterministic rule engine embedded in `backend/services/ai_orchestrator.js`.

For detailed architecture, model metrics, and mathematical formulas, see [docs/AI_SYSTEM.md](file:///d:/cityai_project%20-%20Copy/docs/AI_SYSTEM.md).

---

## 7. Main Modules Overview

| Module | Core Purpose | Key Endpoints | Documentation Link |
| :--- | :--- | :--- | :--- |
| **Traffic & ATCS** | Adaptive signal control, ANPR violation staging, e-Challan | `/api/traffic/junctions`, `/api/traffic/signals` | [docs/MODULES.md#1](file:///d:/cityai_project%20-%20Copy/docs/MODULES.md#1-smart-traffic--adaptive-signal-control-atcs) |
| **Waste Management** | Ultrasonic bin fill tracking, TSP collection routes | `/api/waste/bins`, `/api/waste/report` | [docs/MODULES.md#2](file:///d:/cityai_project%20-%20Copy/docs/MODULES.md#2-smart-waste-management--cleanliness) |
| **SCADA Water Supply** | Reservoir telemetry, pipe burst anomaly detection | `/api/water/tanks`, `/api/water/anomalies` | [docs/MODULES.md#3](file:///d:/cityai_project%20-%20Copy/docs/MODULES.md#3-scada-water-supply--leak-detection) |
| **Emergency & SOS** | 1-tap citizen SOS, 6 live GPS ambulances, 600m Green Wave | `/api/emergency/sos`, `/api/ambulances` | [docs/MODULES.md#4](file:///d:/cityai_project%20-%20Copy/docs/MODULES.md#4-emergency-services--600m-ambulance-green-wave) |
| **Smart Parking** | Multi-floor bay booking, ANPR check-in, surge pricing | `/api/parking/lots`, `/api/parking/book` | [docs/MODULES.md#5](file:///d:/cityai_project%20-%20Copy/docs/MODULES.md#5-iot-smart-parking--bay-guidance) |
| **Healthcare & Beds** | 14 hospitals, 57 bed categories, Doctor EHR, Ayushman QR | `/api/hospitals`, `/api/patients/:id/qr` | [docs/MODULES.md#6](file:///d:/cityai_project%20-%20Copy/docs/MODULES.md#6-hospital-telemedicine--ayushman-ehr-pass) |
| **Police & Safety** | Thana directory, e-FIR, community safety complaints | `/api/police/stations`, `/api/police/complaints`| [docs/MODULES.md#7](file:///d:/cityai_project%20-%20Copy/docs/MODULES.md#7-police--community-safety) |
| **Cultural Tourism** | Gorakhpur heritage sites, audio guides, reviews | `/api/famous-places`, `/api/famous/reviews` | [docs/MODULES.md#8](file:///d:/cityai_project%20-%20Copy/docs/MODULES.md#8-cultural-tourism-heritage--pois) |
| **Grounded AI Assistant**| Floating bilingual dialog, 17 allowlisted tools | `/api/ai/chat`, `/api/ai/assistant` | [docs/MODULES.md#9](file:///d:/cityai_project%20-%20Copy/docs/MODULES.md#9-universal-grounded-ai-assistant) |
| **ICCC Admin** | Executive city dashboard, What-If simulation engine | `/api/admin/command-center`, `/api/admin/stats` | [docs/MODULES.md#12](file:///d:/cityai_project%20-%20Copy/docs/MODULES.md#12-integrated-command--control-center-iccc) |

---

## 8. User Roles & RBAC Matrix

The system enforces strict 3-tier Role-Based Access Control:

1. **Citizen (`citizen`)**: Public city telemetry, personal parking reservations, grievance filing, doctor appointment booking, and personal Ayushman QR pass.
2. **Departmental Staff (`staff`, `doctor`, `hospital_staff`)**: Operations strictly scoped to the staff member's assigned department (`traffic`, `healthcare`, `parking`, `waste`, `water`, `emergency`, `police`). Staff members in outside modules operate with standard Citizen privileges.
3. **Administrator (`admin`)**: Unrestricted global oversight across all municipal modules, user management, staff provisioning, and audit ledgers.

For the full permission matrix and code implementation, see [docs/RBAC.md](file:///d:/cityai_project%20-%20Copy/docs/RBAC.md).

---

## 9. Project Directory Structure

```
d:\cityai_project - Copy\
├── backend/                  # Node.js Express 5 Application Gateway (:5000)
│   ├── config/               # MySQL pool configuration (db.js)
│   ├── database/             # Schemas, migrations (run_phase1_migration.js, etc.)
│   ├── middleware/           # Auth (JWT, RBAC), Error, Security, Upload middlewares
│   ├── routes/               # 24 modular Express routers
│   ├── services/             # Background engines (traffic_engine.js, sla_engine.js, ambulance_simulator.js, ai_orchestrator.js, grounded_tools.js)
│   ├── sockets/              # Socket.IO room manager & event emitters
│   ├── uploads/              # Uploaded grievance photos and medical attachments
│   ├── .env                  # Environment secrets & database credentials
│   └── server.js             # Master Express & HTTP server entry point
├── frontend/                 # Static Web Client (Vanilla JS, CSS3, HTML5)
│   ├── pages/                # 8 departmental sub-applications
│   │   ├── emergency/        # SOS dispatch & live ambulance tracker
│   │   ├── famous/           # Cultural tourism & heritage interactive map
│   │   ├── hospital/         # OPD booking, doctor portal, bed tracking, pharmacy
│   │   ├── parking/          # Multi-floor bay booking, ANPR, RFID Fastag
│   │   ├── police/           # FIR logging, station directory, crime stats
│   │   ├── traffic/          # Radar map, signal cycle override, CCTV
│   │   ├── waste/            # Bin tracking, photo grievance, compactor routes
│   │   └── water/            # Reservoir levels, tanker booking, SCADA leaks
│   ├── components/           # Universal widgets (ai_widget.js, cookie_consent.js)
│   ├── auth.js               # Universal authentication, glassmorphic login & profile modal
│   ├── realtime.js           # Shared Socket.IO client
│   ├── script.js             # Master dashboard orchestration & Leaflet map
│   ├── index.html            # Main citizen portal & Command Center dashboard
│   └── index.css             # Main stylesheet (Vanilla CSS with HSL tokens)
├── ai_service/               # Python FastAPI Microservices Layer (:8000)
│   ├── app/                  # FastAPI routers, schemas, services
│   ├── artifacts/models/     # Serialized Scikit-learn models (traffic_model.joblib, waste_model.joblib)
│   ├── training/             # Retraining scripts (train_traffic_model.py, train_waste_model.py)
│   └── main.py               # Uvicorn entry point
├── docs/                     # Detailed Technical Documentation
│   ├── ARCHITECTURE.md       # Multi-tier system architecture
│   ├── DATABASE.md           # 101 MySQL tables, schemas & relationships
│   ├── API.md                # 467 REST endpoints specification
│   ├── RBAC.md               # Citizen, Staff & Admin permissions
│   ├── AI_SYSTEM.md          # Machine learning models, grounded tools & math
│   └── MODULES.md            # Detailed guide to all 12 municipal modules
├── scratch/                  # Automated integration test harnesses
├── scripts/                  # Master test runners (run_all_tests.js)
├── docker-compose.yml        # Multi-container production deployment
├── run.bat                   # 1-Click Windows execution script
├── README.md                 # Primary platform overview (this file)
├── PROJECT_GUIDELINES.md     # Engineering development rules
├── PROJECT_STATUS.md         # Current working status & test scorecards
├── PROJECT_MAP.md            # Master feature, route & table matrix
├── CHANGELOG.md              # Chronological project version history
└── TODO.md                   # Genuinely pending tasks roadmap
```

---

## 10. Live Demonstration Scenarios

To demonstrate the platform's key operational capabilities:

### Scenario 1: Citizen Bilingual Querying via Floating AI Assistant
1. Open [frontend/index.html](file:///d:/cityai_project%20-%20Copy/frontend/index.html) in your browser.
2. Click the floating blue AI Assistant badge in the bottom-right corner.
3. Prompt (Hindi or English):
   > *"Golghar ke paas parking aur ICU beds kaha available hain?"*
4. The assistant queries `find_parking` and `find_hospital_beds` in real time, displaying available slots at Golghar Multi-Level Parking, ICU bed capacity at AIIMS Gorakhpur, and an audited badge showing **`DATA SOURCE: REAL`**.

### Scenario 2: Emergency Ambulance 600m Green Wave Preemption
1. In PowerShell, trigger emergency preemption:
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:5000/api/traffic/ambulance-preemption" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"ambulance_id":"AMB-01","latitude":26.7608,"longitude":83.3730,"junction_id":"JNC-GOLGHAR-01"}'
   ```
2. The corridor automatically forces a green wave on approaching signals and logs the transition into the `ambulance_green_waves` ledger.

### Scenario 3: Computer Vision Violation Staging & Officer Approval
1. Computer Vision detects a red-light violation, classifying it as `AI_FLAGGED`.
2. Traffic officer opens the review queue and submits verification:
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:5000/api/cv/violations/1/verify" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"decision":"APPROVE","staff_username":"officer_singh","notes":"Clear red light violation caught on optical sensor"}'
   ```
3. The violation transitions to `VERIFIED_CHALLAN_REFERRED`, issuing a formal fine with full officer attribution.

---

## 11. Important Documentation Links

- **Engineering Guidelines**: [PROJECT_GUIDELINES.md](file:///d:/cityai_project%20-%20Copy/PROJECT_GUIDELINES.md)
- **Current Project Status**: [PROJECT_STATUS.md](file:///d:/cityai_project%20-%20Copy/PROJECT_STATUS.md)
- **Comprehensive Project Map**: [PROJECT_MAP.md](file:///d:/cityai_project%20-%20Copy/PROJECT_MAP.md)
- **Project Changelog**: [CHANGELOG.md](file:///d:/cityai_project%20-%20Copy/CHANGELOG.md)
- **Future Tasks Roadmap**: [TODO.md](file:///d:/cityai_project%20-%20Copy/TODO.md)
- **Technical Architecture**: [docs/ARCHITECTURE.md](file:///d:/cityai_project%20-%20Copy/docs/ARCHITECTURE.md)
- **Database Catalog**: [docs/DATABASE.md](file:///d:/cityai_project%20-%20Copy/docs/DATABASE.md)
- **REST API Specification**: [docs/API.md](file:///d:/cityai_project%20-%20Copy/docs/API.md)
- **RBAC & Security Specification**: [docs/RBAC.md](file:///d:/cityai_project%20-%20Copy/docs/RBAC.md)
- **AI & ML System Architecture**: [docs/AI_SYSTEM.md](file:///d:/cityai_project%20-%20Copy/docs/AI_SYSTEM.md)
- **Grounded AI Architecture**: [docs/AI_ARCHITECTURE.md](file:///d:/cityai_project%20-%20Copy/docs/AI_ARCHITECTURE.md)
- **Municipal Modules Guide**: [docs/MODULES.md](file:///d:/cityai_project%20-%20Copy/docs/MODULES.md)
- **Deployment & Run Guide**: [docs/DEPLOYMENT.md](file:///d:/cityai_project%20-%20Copy/docs/DEPLOYMENT.md)
- **Automated Testing Guide**: [docs/TESTING.md](file:///d:/cityai_project%20-%20Copy/docs/TESTING.md)

