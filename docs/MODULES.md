# SMARTCITY AI — Municipal Modules Catalog & Architecture

**Platform**: Gorakhpur Smart City Management Platform (Uttar Pradesh, India)  
**Version**: 2.5.0 Enterprise  
**Operational Scope**: 12 Integrated Civic, Infrastructure, Emergency & Governance Modules  

---

## Module Index

1. [Smart Traffic & Adaptive Signal Control (ATCS)](#1-smart-traffic--adaptive-signal-control-atcs)
2. [Smart Waste Management & Cleanliness](#2-smart-waste-management--cleanliness)
3. [SCADA Water Supply & Leak Detection](#3-scada-water-supply--leak-detection)
4. [Emergency Services & 600m Ambulance Green Wave](#4-emergency-services--600m-ambulance-green-wave)
5. [IoT Smart Parking & Bay Guidance](#5-iot-smart-parking--bay-guidance)
6. [Hospital, Telemedicine & Ayushman EHR Pass](#6-hospital-telemedicine--ayushman-ehr-pass)
7. [Police & Community Safety](#7-police--community-safety)
8. [Cultural Tourism, Heritage & POIs](#8-cultural-tourism-heritage--pois)
9. [Universal Grounded AI Assistant](#9-universal-grounded-ai-assistant)
10. [Environmental Telemetry & AQI Hotspots](#10-environmental-telemetry--aqi-hotspots)
11. [Smart Street Lights & Energy Grid](#11-smart-street-lights--energy-grid)
12. [Integrated Command & Control Center (ICCC)](#12-integrated-command--control-center-iccc)

---

## 1. Smart Traffic & Adaptive Signal Control (ATCS)

### 1.1 Purpose & Scope
Optimizes traffic flow, mitigates congestion, and automates traffic law enforcement across 42 key junctions in Gorakhpur (including Golghar Chowk, Asuran Chowk, Mohaddipur, and University Intersection).

### 1.2 Frontend & Backend Topology
- **Frontend**: `frontend/pages/traffic/traffic.html`, `traffic.js`, `openlayers_map.js`
- **Backend Routes**: `backend/routes/traffic.routes.js`, `backend/routes/cv_anpr.routes.js`
- **Services**: `backend/services/traffic_engine.js`, `backend/services/traffic_ai_service.js`
- **Database Tables**: `traffic_junctions`, `traffic_signals`, `traffic_cameras`, `traffic_violations`, `traffic_predictions`, `signal_optimizations`

### 1.3 Key Features & Intelligence
- **Webster IRC:93 Optimum Cycle Length**: Computes signal split ($C_0$, $g_A$, $g_B$) every second based on approaching flow rates.
- **ANPR Computer Vision Staging**: Optical camera analysis flags red light and speeding infractions as `AI_FLAGGED` for human officer verification.
- **Citizen e-Challan Portal**: Citizens can search violation history by license plate and settle fines via UPI.
- **Role Permissions**: Public can view signals and traffic congestion; only Traffic Staff (`department: traffic`) or Admin can manually override signal states.

---

## 2. Smart Waste Management & Cleanliness

### 2.1 Purpose & Scope
Monitors municipal solid waste generation, smart RFID/ultrasonic dustbin fill levels, and optimizes sanitation truck routing across Gorakhpur's municipal wards.

### 2.2 Frontend & Backend Topology
- **Frontend**: `frontend/pages/waste/waste.html`, `waste.js`
- **Backend Routes**: `backend/routes/waste.routes.js`
- **Services**: `backend/services/waste_ai_service.js`, `backend/middleware/upload.middleware.js`
- **Database Tables**: `waste_bins`, `waste_bin_requests`, `waste_routes`, `waste_vehicles`, `waste_workers`, `service_requests`

### 2.3 Key Features & Intelligence
- **Ultrasonic Fill-Level Telemetry**: Real-time bin capacity tracking with automatic threshold warnings (> 75% fill).
- **Citizen Photo Reporting**: Citizens report illegal dumping or overflowing bins with GPS location and photo attachments.
- **Nearest-Neighbor TSP Route Optimization**: Orders waste bin pickups to minimize compactor fuel consumption and transit time.
- **Role Permissions**: Citizens submit reports; Waste Staff (`department: waste`) assign workers, update route sequences, and resolve tickets.

---

## 3. SCADA Water Supply & Leak Detection

### 3.1 Purpose & Scope
Automates urban potable water distribution, tracks reservoir levels across municipal water tanks, detects pipeline bursts, and manages doorstep tanker delivery.

### 3.2 Frontend & Backend Topology
- **Frontend**: `frontend/pages/water/water.html`, `water.js`
- **Backend Routes**: `backend/routes/water.routes.js`
- **Services**: `backend/services/water_ai_service.js`
- **Database Tables**: `water_tanks`, `water_pipelines`, `water_anomalies`, `water_supply_schedules`, `water_tanker_bookings`, `water_quality_logs`

### 3.3 Key Features & Intelligence
- **SCADA Hydraulic Anomaly Engine**: Detects line bursts when pressure drops below 1.6 bar and flow loss exceeds 22%.
- **Ward Supply Schedule**: Transparent morning/evening water supply timings displayed per municipal ward.
- **Potable Water Tanker Booking**: 1-click citizen booking for residential delivery during supply interruptions.
- **Role Permissions**: Public view of schedules and reservoir levels; Water Staff (`department: water`) manage feeder valve throttles and anomaly resolutions.

---

## 4. Emergency Services & 600m Ambulance Green Wave

### 4.1 Purpose & Scope
Provides immediate 1-tap citizen SOS incident logging and manages real-time emergency medical transit to trauma centers with traffic signal preemption.

### 4.2 Frontend & Backend Topology
- **Frontend**: `frontend/pages/emergency/emergency.html`, `emergency.js`
- **Backend Routes**: `backend/routes/emergency.routes.js`, `backend/routes/ambulance.routes.js`
- **Services**: `backend/services/ambulance_simulator.js`
- **Database Tables**: `ambulances`, `ambulance_waypoints`, `ambulance_green_waves`, `emergency_incidents`, `emergency_departments`

### 4.3 Key Features & Intelligence
- **1-Tap SOS Dispatch**: Instant trigger with browser geolocation, routing to Police (112), Fire (101), or Ambulance (108).
- **Live 6-Ambulance Radar**: Dynamic GPS telemetry loop moving units across Gorakhpur road networks.
- **600m Green Wave Corridor**: Automatically locks green lights along the ambulance's path when approaching within 600 meters of a junction.
- **Role Permissions**: Public access to SOS; Emergency Staff and Traffic Staff hold corridor override authorization.

---

## 5. IoT Smart Parking & Bay Guidance

### 5.1 Purpose & Scope
Alleviates urban parking congestion through sensor-based slot occupancy tracking, advance reservations, and ANPR barrier gate check-in/out.

### 5.2 Frontend & Backend Topology
- **Frontend**: `frontend/pages/parking/parking.html`, `parking.js`
- **Backend Routes**: `backend/routes/parking.routes.js`
- **Services**: `backend/services/parking_ai_service.js`
- **Database Tables**: `parking_lots`, `parking_slots`, `parking_bookings`, `parking_entries`, `parking_anpr_scans`

### 5.3 Key Features & Intelligence
- **Bay Picker (Bays A, B, C)**: Visual multi-level bay layout with atomic slot reservation.
- **QR Digital Parking Ticket**: Instant pass generation with entry validation.
- **Diurnal Demand Forecasting & Surge Pricing**: Projects peak load windows and recommends alternative lots if a primary lot is saturated.
- **Role Permissions**: Citizens book and manage passes; Parking Staff operate barrier check-in/out and manual bay overrides.

---

## 6. Hospital, Telemedicine & Ayushman EHR Pass

### 6.1 Purpose & Scope
Integrates clinical healthcare services across 14 Gorakhpur hospitals (including AIIMS Gorakhpur and BRD Medical College), bed availability tracking, doctor appointments, and privacy-preserving patient health records.

### 6.2 Frontend & Backend Topology
- **Frontend**: `frontend/pages/hospital/hospital.html`, `hospital_dashboard.html`, `doctor_dashboard.html`, `hospital.js`
- **Backend Routes**: `backend/routes/hospital.routes.js`, `backend/routes/doctor.routes.js`, `backend/routes/appointment.routes.js`, `backend/routes/patient.routes.js`
- **Services**: `backend/services/healthcare_ai_service.js`
- **Database Tables**: `hospitals`, `hospital_beds`, `hospital_ward_beds`, `doctors`, `doctor_schedules`, `appointments`, `patients`, `patient_records`, `patient_reports`, `prescriptions`, `patient_audit_logs`

### 6.3 Key Features & Intelligence
- **Live Bed Availability**: Tracks 57 bed categories (General, Oxygen, ICU, Pediatric, Ventilator).
- **Conflict-Free OPD Booking**: Real-time slot locking with sequential token assignment.
- **Doctor EHR Consultation Portal**: Enables physicians to review medical history, input clinical notes, and issue digital prescriptions.
- **Ayushman Privacy QR Pass**: Scanning a patient QR pass displays a masked summary to the public, while unlocking full clinical records for verified medical personnel.
- **Role Permissions**: Public view of beds and doctors; Doctors (`role: doctor`) manage EHRs; Hospital Staff manage ward capacity.

---

## 7. Police & Community Safety

### 7.1 Purpose & Scope
Provides public access to Gorakhpur police stations, beat patrol areas, safety helplines, and online grievance registration.

### 7.2 Frontend & Backend Topology
- **Frontend**: `frontend/pages/police/police.html`, `police.js`
- **Backend Routes**: `backend/routes/police.routes.js`
- **Database Tables**: `police_stations`, `police_complaints`, `police_stats`, `police_patrol_units`

### 7.3 Key Features & Intelligence
- **Police Station Directory**: Contact numbers, SHO details, and jurisdiction zones for all Gorakhpur Thanavs.
- **Online Grievance / e-FIR**: Citizens lodge theft, harassment, or loss complaints with tracking codes.
- **Patrol Unit Radar**: Displays active community patrol presence across sensitive municipal zones.

---

## 8. Cultural Tourism, Heritage & POIs

### 8.1 Purpose & Scope
Showcases Gorakhpur's cultural, spiritual, and historical landmarks to citizens and pilgrims.

### 8.2 Frontend & Backend Topology
- **Frontend**: `frontend/pages/famous/famous.html`, `famous.js`
- **Backend Routes**: `backend/routes/famous_places.routes.js`
- **Database Tables**: `famous_places`, `place_reviews`, `events`, `city_atms`

### 8.3 Key Features & Intelligence
- **Interactive Landmark Explorer**: Detailed profiles for Ramgarh Tal, Gorakhnath Temple, Veer Bahadur Singh Planetarium, and Rail Museum.
- **Audio Guides & Multilingual Narrations**: Embedded audio overview of monument history.
- **Citizen Reviews & Event Calendar**: Community ratings and notices for light-and-sound shows and festivals.

---

## 9. Universal Grounded AI Assistant

### 9.1 Purpose & Scope
A floating bilingual (English/Hindi) civic intelligence assistant mounted globally across all platform pages.

### 9.2 Frontend & Backend Topology
- **Frontend**: `frontend/components/ai_widget.js`, `ai_widget.css`
- **Backend Routes**: `backend/routes/ai.routes.js`
- **Services**: `backend/services/ai_orchestrator.js`, `backend/services/grounded_tools.js`
- **Database Tables**: `ai_predictions`, `ai_tool_logs`, `ai_chat_messages`, `ai_models`

### 9.3 Key Features & Intelligence
- **17 Grounded Municipal Tools**: Queries live database tables for beds, parking, transit routes, and water supply with zero hallucinations.
- **Deterministic Heuristic Fallback**: Continues operating seamlessly using local database semantics even if external LLM APIs are offline.
- **Instant Action Chips**: Returns deep-links to specific platform workflows (e.g. "Book Parking", "Open Navigation Map", "Call 108").

---

## 10. Environmental Telemetry & AQI Hotspots

### 10.1 Purpose & Scope
Monitors real-time air quality and monsoon weather hazards across Gorakhpur's urban clusters.

### 10.2 Frontend & Backend Topology
- **Frontend**: Embedded in Home (`frontend/index.html`), Traffic, and Admin dashboards
- **Backend Routes**: `backend/routes/environment.routes.js`, `backend/routes/traffic.routes.js`
- **Database Tables**: `city_environmental_sensors`, `environment_predictions`, `disaster_predictions`

### 10.3 Key Features & Intelligence
- **Standardized Indian National AQI Calculation**: Computes aggregate AQI from PM2.5, PM10, temperature, and humidity.
- **Monsoon Waterlogging Radar**: Evaluates low-lying drainage basins near Ramgarh Tal to issue localized runoff advisories.

---

## 11. Smart Street Lights & Energy Grid

### 11.1 Purpose & Scope
Monitors the municipal LED street lighting network, energy consumption, and automated fault detection.

### 11.2 Frontend & Backend Topology
- **Frontend**: Integrated in Admin & Staff dashboards
- **Backend Routes**: `backend/routes/street_lights.routes.js`
- **Database Tables**: `street_lights`

### 11.3 Key Features & Intelligence
- **Automated Dusk-to-Dawn Control**: Automated scheduling tied to solar ephemeris.
- **Fault Detection Telemetry**: Flags dead fixtures and unusual voltage drops for maintenance dispatch.

---

## 12. Integrated Command & Control Center (ICCC)

### 12.1 Purpose & Scope
The executive nerve center for Gorakhpur city commissioners, senior administrators, and departmental directors.

### 12.2 Frontend & Backend Topology
- **Frontend**: `frontend/pages/admin/`, modal in `frontend/script.js`
- **Backend Routes**: `backend/routes/admin.routes.js`
- **Services**: `backend/services/command_center_simulation_service.js`, `backend/services/sla_engine.js`
- **Database Tables**: Cross-system aggregation of `audit_logs`, `service_requests`, `ai_predictions`

### 12.3 Key Features & Intelligence
- **Unified Municipal KPI Ticker**: Real-time counters for traffic congestion, active ambulances, bed occupancy, and water reservoir status.
- **SLA Breach Escalation Monitor**: Auto-escalates unresolved civic complaints to department heads.
- **Executive What-If Simulation Engine**: Projects traffic diversions and hospital load impacts for hypothetical events (such as arterial road closures or monsoon flood surcharges).
