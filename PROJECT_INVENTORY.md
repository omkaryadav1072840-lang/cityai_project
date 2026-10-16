# SmartCity AI — Comprehensive Project Inventory

**Platform**: Gorakhpur Smart City Management Platform (Uttar Pradesh, India)  
**Version**: 2.5.0 Enterprise  
**Audit Timestamp**: October 16, 2026  
**Repository Path**: `d:\cityai_project - Copy`  

---

## 1. Architectural System Overview

SmartCity AI is a multi-tier municipal management platform connecting citizen self-service portals, departmental staff operational consoles, and an Integrated Command & Control Center (ICCC) for municipal leadership.

```
                    ┌────────────────────────────────────────┐
                    │     Frontend Web & Mobile (PWA/Cap)    │
                    │   HTML5 / CSS3 / Vanilla JS / Three.js │
                    └──────────────────┬─────────────────────┘
                                       │ HTTP / WebSockets
                                       ▼
                    ┌────────────────────────────────────────┐
                    │      Node.js / Express 5 API Server    │
                    │   (Port 5000, 27 Routers, 593 Endpoints│
                    └───────┬────────────────────────┬───────┘
                            │ MySQL2 Pool            │ HTTP Proxy
                            ▼                        ▼
     ┌───────────────────────────────┐     ┌───────────────────────────────┐
     │      MySQL Database Grid      │     │  Python FastAPI AI Service    │
     │     117 Municipal Tables      │     │  Port 8001 (CV & Predictions) │
     └───────────────────────────────┘     └───────────────────────────────┘
```

---

## 2. Frontend Inventory (Pages, Styles, Scripts)

| Page Name | Path | Primary CSS | Primary JS | Components & Maps Used |
| :--- | :--- | :--- | :--- | :--- |
| **Citizen Home Portal** | [`frontend/index.html`](file:///d:/cityai_project%20-%20Copy/frontend/index.html) | `index.css` | `script.js`, `auth.js`, `realtime.js` | Leaflet, UI Components, Cookie Consent |
| **Traffic & ATCS** | [`frontend/pages/traffic/traffic.html`](file:///d:/cityai_project%20-%20Copy/frontend/pages/traffic/traffic.html) | `traffic.css` | `traffic.js`, `auth.js`, `realtime.js` | Leaflet, Heatmap, Webster Signal Loop |
| **IoT Smart Parking** | [`frontend/pages/parking/parking.html`](file:///d:/cityai_project%20-%20Copy/frontend/pages/parking/parking.html) | `parking.css` | `parking.js`, `auth.js` | Bay Grid, QR Pass Generator |
| **Healthcare & Beds** | [`frontend/pages/hospital/hospital.html`](file:///d:/cityai_project%20-%20Copy/frontend/pages/hospital/hospital.html) | `hospital.css` | `hospital.js`, `clinical_care_assistant.js` | Ayushman QR, OPD Booking, Pharmacy Modal |
| **Hospital Operations**| [`frontend/pages/hospital/hospital_dashboard.html`](file:///d:/cityai_project%20-%20Copy/frontend/pages/hospital/hospital_dashboard.html) | `hospital_dashboard.css` | `hospital_dashboard.js`, `auth.js` | Ward Manager, Diagnostics Desk, Formulary |
| **Doctor EHR Portal** | [`frontend/pages/hospital/doctor_dashboard.html`](file:///d:/cityai_project%20-%20Copy/frontend/pages/hospital/doctor_dashboard.html) | `doctor_dashboard.css` | `doctor_dashboard.js`, `auth.js` | Patient Queue, Rx Scripting, QR Scan |
| **Super Admin Hospital**| [`frontend/pages/hospital/superadmin_hospital.html`](file:///d:/cityai_project%20-%20Copy/frontend/pages/hospital/superadmin_hospital.html) | `superadmin_hospital.css`| `superadmin_hospital.js` | Multi-Tenant Hospital Provisioning |
| **Smart Waste System** | [`frontend/pages/waste/waste.html`](file:///d:/cityai_project%20-%20Copy/frontend/pages/waste/waste.html) | `waste.css` | `waste.js`, `auth.js` | Bin Telemetry, TSP Route Dispatch |
| **SCADA Water & 3D** | [`frontend/pages/water/water.html`](file:///d:/cityai_project%20-%20Copy/frontend/pages/water/water.html) | `water.css` | `water.js`, `water_3d_explorer.js` | Three.js WebGL Twin, Leaflet 2D SCADA |
| **Emergency Radar** | [`frontend/pages/emergency/emergency.html`](file:///d:/cityai_project%20-%20Copy/frontend/pages/emergency/emergency.html) | `emergency.css` | `emergency.js`, `auth.js`, `realtime.js` | Live Ambulance Simulation, SOS Beacon |
| **Police & Grievances**| [`frontend/pages/police/police.html`](file:///d:/cityai_project%20-%20Copy/frontend/pages/police/police.html) | `police.css` | `police.js`, `auth.js` | Thana Directory, Beat Patrol Radar |
| **Heritage & Tourism** | [`frontend/pages/famous/famous.html`](file:///d:/cityai_project%20-%20Copy/frontend/pages/famous/famous.html) | `famous.css` | `famous.js`, `auth.js` | Heritage Map, Review Stream, Audio Tour |
| **ICCC Super Admin** | [`frontend/pages/admin/gkp_admin.html`](file:///d:/cityai_project%20-%20Copy/frontend/pages/admin/gkp_admin.html) | `gkp_admin.css` | `gkp_admin.js`, `auth.js` | Citywide KPI Engine, Master Escalation |
| **Terms of Service** | [`frontend/pages/terms-and-conditions.html`](file:///d:/cityai_project%20-%20Copy/frontend/pages/terms-and-conditions.html) | `index.css` | None | Legal Compliance Documentation |
| **Privacy Policy** | [`frontend/pages/privacy-policy.html`](file:///d:/cityai_project%20-%20Copy/frontend/pages/privacy-policy.html) | `index.css` | None | DPDP Act 2023 Compliance |
| **403 Forbidden** | [`frontend/403.html`](file:///d:/cityai_project%20-%20Copy/frontend/403.html) | Inline / `index.css` | None | RBAC Access Restriction Gate |
| **404 Not Found** | [`frontend/404.html`](file:///d:/cityai_project%20-%20Copy/frontend/404.html) | Inline / `index.css` | None | Fallback Municipal Error Screen |
| **500 Server Error** | [`frontend/500.html`](file:///d:/cityai_project%20-%20Copy/frontend/500.html) | Inline / `index.css` | None | Server Fault Handling View |

---

## 3. Backend Routers & API Inventory (27 Registered Routers)

Backend entry point: [`backend/server.js`](file:///d:/cityai_project%20-%20Copy/backend/server.js)

| Router File | Base Route / Scope | Key Responsibilities |
| :--- | :--- | :--- |
| `auth.routes.js` | `/api/login`, `/api/staff-login`, `/api/register`, `/api/auth/*` | Civic & Staff JWT authentication, session validation, user profiles |
| `traffic.routes.js` | `/api/traffic/*` | 18 Junctions, Webster cycle calculation, CCTV cameras, e-challans |
| `hospital.routes.js` | `/api/hospitals/*` | Hospital registry, ward beds, doctor rosters, ICU capacity |
| `hospital_config.routes.js` | `/api/hospitals/:id/config/*` | Ward room generator, facility add, batch bed generation |
| `doctor.routes.js` | `/api/doctor/*` | Doctor OPD slots, clinical EHR notes, consultation queue |
| `patient.routes.js` | `/api/patients/*` | Patient identity, UHID issuance, medical records, ABHA linking |
| `appointment.routes.js` | `/api/appointments/*` | 20-minute OPD scheduling, double-booking prevention, cancellations |
| `diagnostics.routes.js` | `/api/diagnostics/*` | Diagnostic tests catalog, sample collection queue, lab reports |
| `pharmacy.routes.js` | `/api/pharmacy/*` | Hospital formulary, stock dispensing, prescription upload, cart checkout |
| `parking.routes.js` | `/api/parking/*` | 6 Multi-tier lots, bay booking, QR verification, surge pricing |
| `waste.routes.js` | `/api/waste/*` | Dustbin telemetry, citizen complaints, TSP collection routing |
| `water.routes.js` | `/api/water/*` | SCADA pressure, reservoirs, 3D glTF twin topology, pipeline routes |
| `ambulance.routes.js` | `/api/ambulances/*` | 14 Emergency ambulances, live moving loop, green corridor preemption |
| `emergency.routes.js` | `/api/emergency/*` | SOS incident dispatch, geolocation tracking, 112/108 routing |
| `police.routes.js` | `/api/police/*` | Thana directory, SHO contacts, e-complaints, beat patrol telemetry |
| `famous_places.routes.js` | `/api/famous-places/*` | Gorakhnath Temple, Ramgarh Tal, Planetarium profiles, reviews |
| `admin.routes.js` | `/api/admin/*` | Staff provisioning, RBAC role assignment, system audit trail |
| `ai.routes.js` | `/api/ai/*` | Grounded MySQL AI tool execution, bilingual assistant (EN/HI) |
| `clinical_care_assistant.routes.js` | `/api/clinical-assistant/*` | 7-part clinical decision guidance, disease assessment, drug interactions |
| `street_lights.routes.js` | `/api/street-lights/*` | Automated dusk-to-dawn switching, energy consumption telemetry |
| `environment.routes.js` | `/api/environment/*` | Real-time Indian National AQI computation, particulate sensors |
| `city.routes.js` | `/api/city-status` | High-level municipal KPI aggregation for public ticker |
| `analytics.routes.js` | `/api/analytics/*` | Multi-departmental trends, diurnal parking peaks, waste density |
| `notifications.routes.js` | `/api/notifications/*` | Civic alert broadcast, unread notification badges |
| `requests.routes.js` | `/api/requests/*` | Municipal service requests & grievances ledger |
| `search.routes.js` | `/api/search/*` | Universal platform-wide fuzzy search across services & doctors |
| `map.routes.js` | `/api/map/*` | GIS bounding boxes, ward boundary GeoJSON, city assets layer |

---

## 4. Database Schema Inventory

- **Active MySQL Tables**: 117 distinct tables
- **Connection Engine**: `mysql2` connection pool (`backend/config/db.js`)
- **Key Core Tables**:
  - `users`: Citizen credentials & profiles
  - `staff`: Department staff credentials, RBAC roles & assigned junctions/hospitals
  - `doctors`: Doctor specialization, OPD schedule, credentials
  - `hospitals`: Hospital facilities, beds capacity, operational status
  - `patients`: Patient master registry, UHIDs, ABHA numbers
  - `appointments`: OPD booking tokens, 20-min slot links, status lifecycle
  - `doctor_slots`: Discrete time slots with atomic locks
  - `traffic_junctions`, `traffic_signals`, `traffic_cameras`: Traffic network & CCTV
  - `parking_lots`, `parking_slots`, `parking_bookings`: IoT Parking bay telemetry
  - `waste_bins`, `waste_complaints`, `waste_trucks`: Waste management
  - `water_tanks`, `water_pipelines`, `water_network_nodes`: SCADA hydraulic network
  - `ambulances`, `emergency_incidents`: Emergency response & dispatch
  - `police_stations`, `police_grievances`: Law & civil safety
  - `pharmacy`, `prescriptions`, `patient_orders`: Medicines & formulary
  - `ai_predictions`: Audited log of all grounded AI assistant queries with tri-state provenance tags (`REAL`, `PREDICTED`, `SIMULATED`).

---

## 5. Startup & Execution Instructions

```bash
# 1. Full Development Mode (Launches Backend + Frontend Proxy)
npm run dev

# 2. Backend Server Only (Port 5000)
npm run dev:backend

# 3. Frontend Static Server Only (Port 3000)
npm run dev:frontend

# 4. Master Automated Test Runner (All 25 suites)
npm test:all

# 5. Python AI Service Tests
npm run test:py
```
