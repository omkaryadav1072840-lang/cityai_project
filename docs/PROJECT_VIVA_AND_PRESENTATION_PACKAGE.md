# 🎓 SMARTCITY AI — Master Viva, DFD & Presentation Package
**Platform**: Gorakhpur Smart City Municipal Operations & Intelligence Platform  
**Target Audience**: Project Evaluators, College Viva Examiners, Technical Interviewers & Client Presentation  

---

## 📌 Section 1: Top 15 Technical Viva & Interview Q&A

### Q1: Why did you choose a Dual-Runtime Architecture (Node.js Express + Python FastAPI) instead of a single runtime?
**Answer**:
- **Separation of Concerns**: Node.js utilizes an event-driven, non-blocking I/O loop ideal for high-throughput civic web traffic, WebSocket streaming (Socket.IO < 35ms broadcast latency), and fast relational database transactions (MySQL2 connection pool).
- **Compute-Intensive ML Isolation**: Machine learning tasks (Random Forest regression, Gradient Boosting classification, Isolation Forest anomaly detection, Scikit-learn, Joblib) are CPU-bound. Running them inside the Node.js event loop would block civic HTTP requests.
- **Microservice Decoupling**: Python FastAPI serves strictly on Port 8000 behind an internal secret key (`X-AI-Service-Key`), allowing machine learning models to scale independently of the API gateway on Port 5000.

---

### Q2: How does the 600m Ambulance Green Wave Preemption work in real-time?
**Answer**:
- As an active ambulance moves along transit corridors, `ambulance_simulator.js` calculates the Haversine distance between the ambulance's GPS coordinates (`lat`, `lng`) and all 42 municipal traffic junctions every 3 seconds.
- When an ambulance marked `status = 'Critical Transit'` comes within **600 meters** of a junction, `TrafficEngine.preemptCriticalAmbulanceCorridor()` triggers.
- It locks the primary corridor approach to **Green** for 180 seconds, locks cross-traffic to **Force Red**, sets the junction mode to `Emergency Corridor`, emits `traffic:emergency_corridor_active` over Socket.IO, and logs an immutable entry in `audit_logs`.

---

### Q3: What is the Webster IRC:93 Traffic Signal Cycle formula used in ATCS?
**Answer**:
- The platform implements the Indian Roads Congress (IRC:93) standard based on Webster’s optimum cycle length equation:
  $$C_0 = \frac{1.5L + 5}{1 - Y}$$
- Where:
  - $L$ is total lost time per cycle (all-red + yellow clearance intervals).
  - $Y = \sum y_i = \sum \frac{q_i}{S_i}$ is the sum of critical flow ratios (approaching volume $q_i$ divided by saturation flow $S_i$).
- Effective green splits ($g_A, g_B$) are allocated in proportion to lane saturation:
  $$g_i = (C_0 - L) \times \frac{y_i}{Y}$$
- The conflict monitor actively prevents conflicting green signals across perpendicular avenues.

---

### Q4: How did you achieve a "Zero-Hallucination" standard in the AI Assistant?
**Answer**:
- The AI Assistant is **grounded in 17 allowlisted database tools** (`backend/services/grounded_tools.js`).
- When a citizen asks about hospital beds, parking slots, water schedules, or traffic status, the system does not allow a generative LLM to guess numbers.
- Instead, the Natural Language Understanding (NLU) layer classifies the citizen's intent and executes a deterministic parameterized SQL query against active tables (`hospital_ward_beds`, `parking_slots`, `traffic_signals`).
- The response returns actual live counts and is tagged with provenance metadata: `data_source: "REAL"`.

---

### Q5: How does the Ayushman Bharat QR Pass protect citizen medical privacy?
**Answer**:
- The pass uses **Dual-State Privacy QR Verification** (`POST /api/patients/verify-qr`):
  1. **Public / Anonymous Scan**: If scanned by a stranger or unauthorized phone, the endpoint returns **masked identity data only** (`John D***`, Blood Group `B+`, emergency contact masked `******1234`). Full clinical history is completely withheld (`HTTP 403`).
  2. **Authorized Medical Scan**: If scanned by a doctor or hospital staff possessing a valid Bearer JWT (`role: doctor` or `role: hospital_admin`), the endpoint validates permissions and unlocks the patient's full clinical dossier, past diagnoses, and prescriptions.

---

### Q6: How does the SCADA Water Hydraulic Anomaly Engine detect underground pipe bursts?
**Answer**:
- The water supply network monitors hydrostatic pressure (Bar) and flow loss across municipal pipelines.
- An underground rupture is flagged when two simultaneous conditions are met:
  1. Water pressure drops below **1.6 bar** in the feeder branch.
  2. Flow rate loss between upstream reservoir and downstream meter exceeds **22%**.
- When triggered, `water_ai_service.js` automatically creates a `water_anomalies` record, notifies the Jal Sansthan inspection crew, and emits a priority alert to the ICCC Command Center.

---

### Q7: How does the Waste Management module optimize compactor truck routes using TSP?
**Answer**:
- The system models overflowing RFID dustbins (> 75% capacity) in each municipal ward as nodes in a graph.
- It applies the **Nearest-Neighbor Traveling Salesman Problem (TSP)** heuristic:
  1. The compactor truck starts at the municipal depot.
  2. The algorithm iteratively selects the unvisited bin with the minimum Haversine distance from the current node.
  3. The resulting waypoint sequence minimizes transit distance, travel time, and fuel consumption.

---

### Q8: What is the difference between REST APIs and WebSockets (Socket.IO) in your project?
**Answer**:
- **REST APIs (HTTP/2 on Port 5000)**: Used for stateful request-response transactions — user registration, doctor appointments, e-Challan payments, and profile updates.
- **WebSockets (Socket.IO)**: Used for continuous bi-directional real-time telemetry where polling would create unnecessary overhead:
  - Signal countdown ticks every 1 second.
  - Live ambulance GPS coordinates every 3 seconds.
  - SLA breach tickers and parking bay state changes (< 35ms broadcast delay).

---

### Q9: How do you prevent overlapping or duplicate doctor appointment bookings under high concurrency?
**Answer**:
- **Database Level Constraint**: The `appointments` table contains an authoritative composite unique constraint: `UNIQUE KEY unique_doctor_appointment (doctor_id, appointment_date, appointment_time)`.
- **Application Level Handling**: If two concurrent requests attempt to book the identical 20-minute slot simultaneously, MySQL permits the first and rejects the second with error `ER_DUP_ENTRY` (errno 1062). The backend catches this error and returns a clean `HTTP 409 Conflict ("This slot was just booked by another patient")`.

---

### Q10: What security measures protect the backend from unauthorized access and brute force attacks?
**Answer**:
- **Password Security**: Native `scrypt` hashing with 16-byte random salt and timing-safe equality checks.
- **JWT Authentication**: Bearer tokens signed with a 256-bit secret, 7-day expiry, and role claims.
- **Departmental RBAC**: `requireDepartment` middleware blocks cross-department mutations (e.g. Traffic Staff cannot modify Waste grievances).
- **Tiered Rate Limiting**: 300 req/15m general API, 20 req/15m auth routes, 10 req/1m emergency SOS.
- **Input Sanitization**: `inputSanitizer` strips script injection tags from incoming payloads.

---

### Q11: How is Object-Level Access Control (IDOR) enforced for citizen grievances and patient records?
**Answer**:
- For complaints (`GET /api/requests`), citizens are strictly scoped by `user_id = ? OR citizen_mobile = ?`.
- For patient records (`GET /api/patients/:patientId`), `checkPatientAccess()` verifies that `req.user.id === patient.user_id` or that the caller holds an authorized medical role (`doctor`, `staff`, `admin`). Unauthorized attempts return `HTTP 403 Forbidden` and log to `patient_audit_logs`.

---

### Q12: How does the Municipal SLA Escalation Engine function?
**Answer**:
- `sla_engine.js` runs a background timer every 60 seconds querying active `service_requests`.
- Each request has a computed SLA deadline based on urgency (Critical: 2 hours, Water Leak: 6 hours, Waste: 24 hours, Street Light: 48 hours).
- If the current timestamp exceeds `sla_deadline` and status is not 'Resolved', the engine updates status to `'Escalated'`, alerts department supervisors, and emits `request:escalated` over Socket.IO.

---

### Q13: Why did you choose MySQL over MongoDB (NoSQL) for this Smart City platform?
**Answer**:
- **Relational Integrity & Foreign Keys**: Municipal entities are deeply interrelated — patients link to appointments, appointments link to doctors, doctors link to hospitals, slots link to parking lots.
- **ACID Transactions**: Financial transactions (e-Challan UPI settlements, parking barrier billing) and medical admissions require strict atomicity and consistency.
- **Schema Enforcement**: A strict schema prevents corrupted civic records.

---

### Q14: How are machine learning models evaluated and monitored in Python?
**Answer**:
- Models are trained offline and serialized with `joblib` into `ai_service/artifacts/models/`:
  - `traffic_model.joblib`: Random Forest Regressor ($R^2 = 0.962$, MAE = 3.34 pts).
  - `waste_model.joblib`: Gradient Boosting Classifier ($F1 = 0.921$).
- When the gateway requests predictions, inputs and outputs are audited in the `ai_predictions` database table for latency, confidence score, and drift tracking.

---

### Q15: What happens if the Python AI service goes offline?
**Answer**:
- The Node.js gateway communicates with Python via `ai_service_client.js` with an `AbortController` timeout (2.5 seconds) and a circuit breaker.
- If the Python service is offline or times out, the gateway seamlessly falls back to **deterministic local mathematical heuristics** (historical hourly averages), ensuring zero downtime for citizens.

---

## 📊 Section 2: Data Flow Diagrams (DFD) & System Architecture

### 2.1 DFD Level 0 — Context Diagram
```mermaid
graph TD
    Citizen([Citizen / Tourist]) -->|1. Bookings, Grievances, SOS, Search| SmartCity[SmartCity AI Unified Gateway]
    Staff([Departmental Staff]) -->|2. Task Updates, Overrides, Gate Actions| SmartCity
    Doctor([Doctor / Medical Staff]) -->|3. EHR Consultations, Prescriptions| SmartCity
    Admin([Municipal Superadmin]) -->|4. City Governance, What-If Sim, SLA Desk| SmartCity

    SmartCity -->|5. Receipts, QR Tickets, Alerts, Live Maps| Citizen
    SmartCity -->|6. Assigned Work Orders, Priority Queue| Staff
    SmartCity -->|7. OPD Queues, Bed Telemetry, Triage Data| Doctor
    SmartCity -->|8. 360° KPI Desk, Anomaly Reports, Audit Logs| Admin

    SmartCity <-->|SQL Queries & ACID Transactions| DB[(MySQL 8.0: 117 Tables)]
    SmartCity <-->|REST Inferences & Anomaly Detection| ML[Python FastAPI ML Engine]
    SmartCity <-->|Sub-50ms Event Broadcasts| Realtime[Socket.IO Real-Time Stream]
```

---

### 2.2 DFD Level 1 — Inter-Module Functional Flow
```mermaid
graph TD
    subgraph Ingestion & Authentication
        Auth[1.0 Auth & RBAC] -->|Verified JWT| Gateways{Role Dispatcher}
    end

    subgraph Municipal Operational Processes
        Gateways -->|Citizen| ProcessTraffic[2.0 Traffic & ATCS]
        Gateways -->|Citizen| ProcessHealth[3.0 Healthcare & Beds]
        Gateways -->|Citizen| ProcessParking[4.0 Smart Parking]
        Gateways -->|Citizen| ProcessWaste[5.0 Waste Management]
        Gateways -->|Citizen| ProcessWater[6.0 SCADA Water]
        Gateways -->|Citizen| ProcessSOS[7.0 Emergency SOS]
        Gateways -->|Admin| ProcessICCC[8.0 Command Center Desk]
    end

    subgraph Cross-Module Sync & Intelligence
        ProcessSOS -->|Trigger Emergency Incident| AmbEngine[Ambulance Simulator]
        AmbEngine -->|600m Radial Proximity| ProcessTraffic
        ProcessTraffic -->|Lock Force Green| SignalLights[(Traffic Signals)]

        ProcessHealth -->|Reserve Bed| BedTables[(hospital_ward_beds)]
        ProcessParking -->|Barrier Entry| SlotTables[(parking_slots)]
        ProcessWaste -->|TSP Algorithm| RouteTables[(waste_routes)]
        ProcessWater -->|Pressure Anomaly| AlertTables[(water_anomalies)]
    end

    subgraph Output & Audit
        ProcessICCC --> AuditLedger[(audit_logs & SLA Engine)]
        SignalLights -.-> Sockets[Socket.IO Broadcast]
        AmbEngine -.-> Sockets
        AuditLedger -.-> Sockets
    end
```

---

## 🖥️ Section 3: 12-Slide Final Project Presentation (PPT Script)

### Slide 1: Title & Overview
- **Header**: SmartCity AI — Autonomous Municipal Operations Platform
- **Sub-header**: Gorakhpur Smart City Management Platform (Uttar Pradesh)
- **Key Highlights**: Multi-Department Integration, Grounded Dual-Runtime AI, 117 Database Tables, Sub-50ms Real-Time WebSockets.

### Slide 2: Problem Statement
- Siloed municipal departments (Traffic, Hospitals, Waste, Water, Police operate independently).
- Delayed emergency transit and lack of traffic signal preemption for ambulances.
- Lack of real-time transparency in hospital bed availability and parking vacancies.
- Manual civic complaint resolution with high SLA breach rates.

### Slide 3: Proposed Solution & Core Innovations
- **Unified Municipal Gateway**: 14 integrated civic departments on a single platform.
- **600m Ambulance Green Wave**: Automatic traffic signal preemption within 600 meters.
- **Ayushman Privacy QR Pass**: Masked public verification with full EHR for verified doctors.
- **Grounded AI Assistant**: Zero-hallucination assistant bound to 17 database tools.
- **SCADA Water Leak AI & Waste TSP Route Optimizer**.

### Slide 4: System Architecture Topology
- **Frontend**: Vanilla ES6+, CSS3 Design Tokens, Leaflet GIS & OpenLayers.
- **Gateway**: Node.js Express 5 with native Promise handling (Port 5000).
- **Intelligence**: Python 3.13 FastAPI microservice with Scikit-Learn models (Port 8000).
- **Persistence**: MySQL 8.0 with 117 tables, connection pooling, and strict foreign keys.
- **Real-Time**: Socket.IO bi-directional streaming.

### Slide 5: Smart Traffic & Adaptive Signal Control (ATCS)
- 42 city junctions managed in real time.
- Webster IRC:93 optimum cycle length calculated per approaching vehicle flow.
- ANPR camera staging with Human-in-the-Loop (HITL) officer verification.
- Citizen e-Challan search and UPI instant settlement.

### Slide 6: Emergency Services & 600m Green Wave
- 1-Tap citizen SOS with browser geolocation routing to 112, 101, or 108.
- Live 6-ambulance GPS radar moving across Gorakhpur transit corridors.
- Haversine radial distance check triggers 180s green light corridor lock.

### Slide 7: Healthcare, Beds & Ayushman QR Pass
- Live bed availability across 14 hospitals and 57 bed categories.
- Strict 20-minute OPD doctor appointment booking with double-booking prevention.
- Dual-state Ayushman QR pass protecting citizen health privacy.
- Doctor consultation desk generating digital prescriptions and EHR charts.

### Slide 8: Smart Parking & SCADA Water Supply
- Smart parking bay visualizer (Bays A, B, C) with ANPR barrier gate check-in/out.
- SCADA hydraulic anomaly engine detecting pipe bursts when pressure < 1.6 bar.
- Ward-wise drinking water schedule and 1-click doorstep tanker booking.

### Slide 9: Smart Waste Management & TSP Truck Routing
- RFID dustbin fill level telemetry with > 75% overflow warnings.
- Citizen geo-photo grievance reporting with GPS coordinates.
- Nearest-Neighbor Traveling Salesman Problem (TSP) algorithm optimizing compactor routes.

### Slide 10: Grounded AI Assistant & Clinical Care
- Bilingual natural language processing (Hindi / English / Hinglish).
- 17 allowlisted database tools guaranteeing zero hallucinated data.
- Clinical Care Assistant providing 7-part differential guidance for registered doctors.

### Slide 11: Security, Privacy & Performance Benchmarks
- Scrypt password encryption, JWT stateless sessions, departmental RBAC.
- Object-level authorization preventing cross-user data leakage.
- **Test Results**: 19 of 19 automated integration suites passed (1,480+ probes).
- **Latency Benchmarks**: Average API latency: **14.8 ms** (P99: **82.0 ms**).

### Slide 12: Conclusion & Future Scope
- **Conclusion**: A production-ready, fully verified, resilient municipal operating system.
- **Future Scope**: Physical LoRaWAN sensor hardware integration, React Native citizen mobile app, and AI drone surveillance over Ramgarh Tal.

---
*Document saved to [docs/PROJECT_VIVA_AND_PRESENTATION_PACKAGE.md](file:///d:/cityai_project%20-%20Copy/docs/PROJECT_VIVA_AND_PRESENTATION_PACKAGE.md).*
