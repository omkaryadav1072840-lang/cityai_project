# SMARTCITY AI — Project Changelog

All notable changes, bug fixes, refactorings, and architectural additions to the Gorakhpur SmartCity AI project are documented in this file chronologically.

---

## [2.1.0] - 2026-09-29

### Fixed
- **Express Middleware Crash**: Removed erroneous `app.use(serveHtmlErrorPage)` in `backend/server.js` that was invoking response helper `(res, statusCode, fallbackMessage)` as Express middleware `(req, res, next)`.
- **Database Column Truncation**: Sanitized `cleanBloodGroup` in `backend/routes/patient.routes.js` to ensure blood group strings (e.g., `"O+ Positive"`) fit within `varchar(10)` limits without throwing MySQL `ER_DATA_TOO_LONG`.
- **Session Pollution**: Purged fallback code in `frontend/pages/traffic/traffic.js` and `frontend/pages/parking/parking.js` that previously saved hardcoded mock users (`"Omkar Yadav"`, `"6306880179"`, `"omkaryadav@gmail.com"`) into `localStorage.smartCityCurrentUser`.
- **Over-Permissive Staff Check**: Replaced generic `isStaff()` checks across `traffic.js`, `parking.js`, and `water.js` with module-specific `SmartCityAuth.canEdit(department)`.
- **Duplicate Authentication Modals**: Removed legacy `#authOverlay` markup (400+ lines) from `frontend/index.html` and unified all login/registration flows through `frontend/auth.js`.
- **Missing Predictive AI Route Aliases**: Added 5 route aliases in `backend/routes/ai.routes.js` matching all 185 frontend API call instances to active backend handlers with 0 unmatched routes.

### Changed
- **Home/Index Page Structure**: Restructured `frontend/index.html` into the official SmartCity platform showcase with:
  - Top municipal announcement bar and Civic Platform Hero with live operational KPI ticker.
  - Comprehensive 9-module Municipal Services Grid.
  - Interactive Grounded AI Assistant card.
  - Current City Telemetry Reports (Traffic, Waste, Water, AQI, Emergency, Street Lights).
  - Leaflet Navigation Map with category filters.
  - 4-Step "How the Platform Works" pipeline and "About Gorakhpur Smart City Mission" overview.
  - 24/7 Immediate Civic Helplines Directory and Municipal Contact & Grievance Helpdesk.
- **Traffic Dashboard Isolation**: Ensured internal traffic signal control and CCTV monitoring are strictly maintained in `pages/traffic/traffic.html`.
- **Command Center Protection**: Enforced role-based access checks on `openCommandCenterModal()` in `frontend/script.js`.

### Added
- **Centralized User Activity Timeline**: Added `GET /api/user/activities` in `backend/routes/auth.routes.js` combining audit logs, parking bookings, service grievances, and appointments.
- **Centralized Logout**: Added `POST /api/auth/logout` in `backend/routes/auth.routes.js` with audit logging.
- **Privacy-Preserving Patient QR Pass**:
  - Added live QR code rendering inside `SmartCityAuth.showProfileModal()` (Tab 3: Ayushman Health Dossier) via `GET /api/patients/:id/qr` and `QRCode.js`.
  - Added 1-click patient pass creation via `POST /api/patients`.
  - Integrated role-aware scan verification via `POST /api/patients/verify-qr` (privacy-masked for public, full EHR for authorized staff).
- **Cross-Tab Session Synchronization**: Added window `storage` event listeners in `frontend/auth.js` for instant cross-tab state updates.

---

## [2.0.1] - 2026-09-27

### Fixed
- **Water SCADA Collation Mismatch (BUG-CRIT-02)**: Resolved MySQL `ER_CANT_AGGREGATE_NCOLLATIONS` on SQL `UNION` between `water_pipelines` (`utf8mb4_unicode_ci`) and `water_tanks` (`utf8mb4_general_ci`) by decoupling queries in Node.js runtime via concurrent `Promise.all` in `backend/routes/water.routes.js`.
- **Medical Records Citizen RBAC Lockout (BUG-CRIT-03)**: Updated `checkPatientAccess()` in `backend/routes/patient.routes.js` to permit authenticated citizens to retrieve their personal clinical records and diagnostic lab reports.
- **Emergency SOS Anchor Collision (BUG-CRIT-04)**: Replaced malformed nested `<button>` inside `<a>` tag in `frontend/pages/famous/famous.html` with direct event listener `triggerFamousEmergencySOS()`.
- **Appointment Duplicate Conflict (BUG-HIGH-01)**: Handled `ER_DUP_ENTRY` in `backend/routes/appointment.routes.js` to gracefully return existing confirmed booking details rather than throwing HTTP 409 conflict.
- **Route Plural/Singular Aliasing (BUG-HIGH-02 to BUG-HIGH-06)**:
  - Aliased `/api/parking` and `/api/parking/lots`, added `/api/parking/slots`, enabled `/api/parking/staff/overview`.
  - Aliased `/api/waste/reports` and `/api/waste/report`, implemented `/api/waste/requests/update-status`.
  - Aliased `/api/water/tanker-bookings` and `/api/water/book-tanker`, aliased `/api/water/schedules` and `/api/water/supply-schedules`.
  - Aliased `/api/traffic/junctions/:id/override` and `/api/traffic/signals/override`, aliased `/api/traffic/audit-logs`.
  - Aliased `/api/pharmacy` and `/api/pharmacy/medicines`, aliased `/api/admin/command-center` and `/api/admin/stats`.
- **Frontend DOM Syntax & IDs (BUG-HIGH-07, BUG-HIGH-08)**: Removed duplicate DOM IDs in `famous.html` and eliminated redundant duplicate booking modal markup in `hospital_dashboard.html`.
- **Grounded Assistant Intents (BUG-CRIT-01, BUG-MED-01 to BUG-MED-04)**:
  - Added dedicated synthesis cases in `ai_orchestrator.js` for `find_hospitals`, `find_doctors`, and `route_navigation`.
  - Added Hinglish intent recognition for `"meri booking"` and `"mera booking"`.
  - Enhanced `find_hospital_beds` and `find_parking` with entity extraction for Ramgarh Tal, AIIMS, and Golghar.

---

## [2.0.0] - 2026-09-24

### Added
- **Dual-Runtime Python AI Layer**: Integrated Python 3.13 FastAPI microservices layer (Port 8000) protected by `X-AI-Service-Key` mutual header.
- **17 Grounded Municipal Tools**: Created `backend/services/grounded_tools.js` strictly binding the AI assistant to real MySQL tables with zero hallucination.
- **AI Governance & Audit Ledgers**:
  - Implemented `ai_predictions` ledger tracking every inference with input snapshots, output JSON, confidence scores, and tri-state provenance tags (`REAL`, `PREDICTED`, `SIMULATED`).
  - Added `ai_feedback` and `ai_reviews` tables for continuous precision tracking and human-in-the-loop audit desk.
  - Added `ai_models` registry and `ai_tool_logs` execution tracking.
- **Webster Traffic Signal Cycle Optimization**: Implemented Webster's classical formula ($C_0 = \frac{1.5L + 5}{1 - Y}$) in `traffic_ai_service.js` with dynamic green split recalculation.
- **6-Ambulance GPS Simulation & Green Wave**: Implemented `ambulance_simulator.js` moving 6 ambulances along Gorakhpur arterial routes and engaging automated 600m arterial Green Wave preemption corridors.
- **Doctor Clinical Consultation Portal**: Implemented `frontend/pages/hospital/doctor_dashboard.html` for physician EHR note entries, diagnostic reviews, and digital prescription issuance.
- **Municipal SLA Escalation Engine**: Implemented `sla_engine.js` monitoring civic complaint deadlines (2h Critical to 72h Low) with automated escalation.
- **Automated AI Test Suites**: Added 4 automated integration test harnesses validating all 13 project phases (128 passing tests).

---

## [1.0.0] - September 2026

### Initial Release
- Initial release of Gorakhpur Smart City civic management portal.
- Express 5 gateway and MySQL database setup across 70+ baseline tables.
- Modular sub-applications for Traffic, Parking, Healthcare, Waste, Water, Emergency, Police, and Tourism.
- Leaflet interactive GIS mapping integration with Gorakhpur base coordinates `[26.7606, 83.3732]`.
