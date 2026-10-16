# SmartCity AI (Gorakhpur) — Missing Features & Module Maturity Audit

**Date**: October 16, 2026  
**Project**: SmartCity AI – Gorakhpur  
**Auditor**: Senior Full-Stack, QA, Security, and Database Engineering Specialist  

---

## 1. Module Maturity Matrix

Every module in the repository has been evaluated across its frontend UI pages, backend APIs, database persistence, role-based controls, automated test coverage, and external hardware/service dependencies.

| Module | Implemented & Verified | Implemented But Unverified (Mocked) | Partial | Not Implemented |
|---|---|---|---|---|
| **Authentication & RBAC** | Citizen, Doctor, Police, Traffic, Superadmin Auth, JWT, BCrypt, Department Guards, Cross-Origin Staff Login | SMS Gateway (Twilio/MSG91 OTP) | OAuth2 Social Login (Google/Apple) | Biometric / Aadhaar OTP login |
| **Traffic Management** | 16 Junctions, Phase Control, Green Corridor, Emergency Override, AI Congestion Analytics, Admin Camera CRUD | Physical RTSP Stream Transcoding | AI Plate Recognition (ANPR via live video) | Physical Signal Controller Hardware (Modbus/NTCIP) |
| **Smart Parking** | 8 Parking Lots, Slot Booking, Availability Counter, Real-time Slot Lock, Price Calculation, Ticket Generator | Hardware Ultrasonic/Magnetic Sensor Feed | Fastag / RFID Reader Integration | Automated Barrier Gate Relay Interface |
| **Hospital & Healthcare** | Doctor Profiles, 20-min Slot Picker, Double-Booking Lock, Cancellation & Refund, Bed Management, Pharmacy Stock | ABDM Sandbox ABHA Record Sync | Live Teleconsultation Video (WebRTC) | Real-Time ICU Ventilator IoT Telemetry |
| **Water Supply & Grid** | 12 Water Tanks, Pipeline Network, Pressure Sensor Readouts, Leakage Reporting, Water Tanker Booking | Physical Flow Meter Hardware (Modbus) | SCADA Relay Actuation (Valve open/close) | Water Quality Spectrometry Sensor Feed |
| **Waste Management** | 18 Wards, Garbage Bin Fill Levels, Route Planner, Citizen Complaint Tracker, Collection Schedule | Bin Ultrasonic Sensor IoT Uplink | Driver Turn-by-Turn GPS Navigation App | Weighbridge Waste Weight Auto-Capture |
| **Police & Emergency** | 112 / 108 SOS Dispatch, PCR Van Tracking, Incident Geo-logging, Red Alert Broadcast, FIR Tracking | Real 112 CAD Computer-Aided Dispatch Integration | Live Bodycam Video Feed | Automatic Gunshot / Siren Acoustic Detection |
| **Environment & AQI** | 6 CPCB Monitoring Stations, AQI Meter, Pollutant Breakdown (PM2.5, PM10, NO2, CO), Health Advisory | Government CPCB API Live Sync | Hyperlocal Microclimate Prediction Model | Drone Air Sampling Telemetry |
| **Famous Places & Tourism** | Gorakhnath Temple, Naukayan, Ramgarh Taal Tour, Audio Guide, Route Navigation, Heritage Information | VR 360 Interactive Panorama Virtual Tour | Audio Player Multi-language Switcher | Augmented Reality (AR) Wayfinding |
| **City AI Assistant** | Multilingual Query Router, Domain Classifier, Fallback Intent Handler, Knowledge Base Query | Live Speech-to-Text / Voice Interaction | Offline On-Device LLM (WebLLM) | Conversational Phone IVR Agent |

---

## 2. Prioritized Missing Features Roadmap

### Tier 1: High Criticality (Essential for Real-World Municipal Deployment)

#### 1. Live Payment Gateway Integration (Razorpay / CCAvenue / UPI Deep-Link)
- **Impacted Modules**: Parking Lot Booking, Hospital OPD Billing, Pharmacy Checkout, Water Tanker Booking.
- **Current State**: Frontend uses an interactive modal with instant simulated UPI receipt (`MOCK_PAYMENT_SUCCESS`).
- **Required Implementation**:
  - Integrate `razorpay` Node.js SDK on backend.
  - Create `/api/payments/create-order` and `/api/payments/verify-webhook` with HMAC SHA256 signature verification.
  - Store payment transactions with `order_id`, `payment_id`, `signature`, `amount`, and `status`.
- **Dependencies**: Merchant Account API Keys (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`).
- **Effort Estimate**: 2-3 Days.

#### 2. Physical RTSP / ONVIF IP Camera Stream Transcoding
- **Impacted Modules**: Traffic Junction Cameras, Police Surveillance, Hospital Security.
- **Current State**: Canvas-based simulated MJPEG traffic streams.
- **Required Implementation**:
  - Deploy `go2rtc` or `ffmpeg-node` stream proxy to convert RTSP (H.264/H.265) feeds from municipal cameras into low-latency WebRTC / HLS streams.
  - Expose `/api/traffic/streams/:cameraId/live.m3u8` or WebRTC SDP offer/answer endpoints.
- **Dependencies**: Network connectivity to municipal NVR / IP cameras.
- **Effort Estimate**: 4-5 Days.

#### 3. SMS Gateway & WhatsApp Notification Delivery
- **Impacted Modules**: Citizen Registration, Hospital Appointment Confirmation & Reminders, Water Tanker Dispatch Alerts, Emergency Alerts.
- **Current State**: Dev mode fallback (default OTP `123456`, console output).
- **Required Implementation**:
  - Connect MSG91 / Twilio SMS API or WhatsApp Business Cloud API.
  - Template registration with DLT (Distributed Ledger Technology) as per Indian Telecom regulations.
- **Dependencies**: DLT Registration, SMS Provider credentials.
- **Effort Estimate**: 1-2 Days.

---

### Tier 2: Medium Criticality (Operational Enhancement & Automation)

#### 4. ABDM (Ayushman Bharat Digital Mission) Sandbox Integration
- **Impacted Modules**: Hospital & Healthcare, Patient Records, OPD Billing.
- **Current State**: ABHA format validation (14-digit pattern) and local patient profile storage.
- **Required Implementation**:
  - ABDM Gateway authentication (`POST /v0.5/sessions`).
  - M1, M2, M3 milestone integration (ABHA creation, health record linking, consent manager).
- **Dependencies**: ABDM Sandbox Client ID and Client Secret from NHA (National Health Authority).
- **Effort Estimate**: 1-2 Weeks.

#### 5. IoT Telemetry Ingestion Engine (MQTT Broker for Sensors)
- **Impacted Modules**: Water Tank Pressure/Level, Garbage Bin Fill Level, Streetlight Grid, Parking Slot Sensors.
- **Current State**: Simulated sensor cron routines and HTTP POST endpoints for sensor updates.
- **Required Implementation**:
  - Add an MQTT client (e.g., `Aedes` or `Mosquitto` integration via `mqtt.js`) to ingest low-bandwidth LoRaWAN / NB-IoT sensor telemetry directly into MySQL/InfluxDB.
  - Emit real-time threshold alerts via Socket.IO.
- **Dependencies**: MQTT Broker server (Mosquitto/EMQX) or cloud IoT hub.
- **Effort Estimate**: 3-4 Days.

#### 6. Driver & Field Worker PWA / Android Mobile Application
- **Impacted Modules**: Ambulance Drivers, Water Tanker Drivers, Waste Collection Crew, Traffic Police Patrols.
- **Current State**: Web dashboards are responsive down to 375px mobile screens.
- **Required Implementation**:
  - Progressive Web App (PWA) manifest and Service Worker for offline emergency cache and push notifications.
  - Background GPS location transmitter updating vehicle coordinate tables every 10 seconds.
- **Dependencies**: Browser Geolocation permissions, Web Push VAPID keys.
- **Effort Estimate**: 4-5 Days.

---

### Tier 3: Low Criticality (Future Value-Add Innovations)

#### 7. WebRTC Teleconsultation Video Calling
- **Impacted Modules**: Hospital OPD & Telemedicine.
- **Current State**: In-person OPD 20-minute appointment booking.
- **Required Implementation**:
  - Signaling server on Socket.IO for WebRTC peer-to-peer audio/video streaming.
  - In-browser screen sharing and digital prescription drawing pad.
- **Dependencies**: TURN / STUN server infrastructure (coturn).
- **Effort Estimate**: 1-2 Weeks.

#### 8. Voice-Activated Multilingual IVR / Speech-to-Text
- **Impacted Modules**: Citizen Helplines (112, 108, Municipal Grievances), City AI Assistant.
- **Current State**: Text-based chat and structured form submissions.
- **Required Implementation**:
  - Web Speech API integration in frontend for Hindi / Bhojpuri / English voice recognition.
  - Integration with Bhashini (Government of India Open Language AI) API for regional dialects.
- **Dependencies**: Bhashini API access or OpenAI Whisper API.
- **Effort Estimate**: 1 Week.

#### 9. Augmented Reality (AR) Wayfinding & Heritage Tours
- **Impacted Modules**: Famous Places & Tourism (Gorakhnath Temple, Ramgarh Taal).
- **Current State**: Interactive Leaflet maps, audio descriptions, photo galleries.
- **Required Implementation**:
  - WebXR / 8th Wall AR camera overlay pointing users toward historic gates, boat jetties, and landmarks.
- **Dependencies**: Camera permissions, 3D glTF heritage assets.
- **Effort Estimate**: 2 Weeks.

---

## 3. Summary of Module Audit & Verified Status

| Area | Pages Tested | APIs Tested | DB Tables Verified | Current Functional Status |
|---|---|---|---|---|
| **Citizen Portal** | `index.html` | `/api/auth/*`, `/api/city-status` | `users`, `activity_logs` | **FULLY WORKING** |
| **Staff Authentication** | Login Modal (Staff Tab) | `/api/auth/staff-login`, `/api/auth/me` | `users`, `departments`, `doctors` | **FULLY WORKING (BUG-001 FIXED)** |
| **Super Admin** | `superadmin_hospital.js`, `admin.routes.js` | `/api/admin/*`, `/api/admin/system/metrics` | `system_metrics`, `audit_logs` | **FULLY WORKING** |
| **Traffic System** | `traffic.html` | `/api/traffic/*`, `/api/traffic/cameras` | `traffic_junctions`, `traffic_cameras` | **FULLY WORKING (BUG-003, 004, 005 FIXED)** |
| **Smart Parking** | `parking.html` | `/api/parking/*`, `/api/parking/book` | `parking_lots`, `parking_bookings` | **FULLY WORKING** |
| **Hospital & Beds** | `hospital.html`, `hospital_dashboard.html` | `/api/hospitals/*`, `/api/appointments/*` | `hospitals`, `doctors`, `appointments`, `hospital_beds` | **FULLY WORKING** |
| **Pharmacy** | `hospital.html` (Pharmacy Tab) | `/api/pharmacy` | `pharmacy_inventory`, `pharmacy_orders` | **FULLY WORKING (BUG-006 FIXED)** |
| **Water Supply** | `water.html` | `/api/water/*`, `/api/water/tanker-book` | `water_tanks`, `water_complaints`, `water_tanker_bookings` | **FULLY WORKING** |
| **Waste Management** | `waste.html` | `/api/waste/*`, `/api/waste/complaint` | `waste_wards`, `waste_complaints`, `waste_schedules` | **FULLY WORKING** |
| **Emergency Services** | `emergency.html`, `police.html` | `/api/emergency/*`, `/api/police/*` | `emergency_incidents`, `police_stations`, `pcr_vans` | **FULLY WORKING** |
| **Environment / AQI** | `famous.html` (AQI Widget), `script.js` | `/api/environment/aqi` | `aqi_stations`, `aqi_readings` | **FULLY WORKING** |
| **Tourism & Heritage** | `famous.html` | `/api/places/*` | `famous_places` | **FULLY WORKING** |
| **City AI Chat** | `index.html` (Assistant Widget) | `/api/ai/chat`, `/api/ai/analyze` | Python AI Backend & Fallback Knowledge Engine | **FULLY WORKING** |
