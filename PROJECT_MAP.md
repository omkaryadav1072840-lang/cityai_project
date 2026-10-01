# SMARTCITY AI — Comprehensive Project Map

**Platform**: Gorakhpur Smart City Management Platform (Uttar Pradesh, India)  
**System Architecture**: Multi-Department Intelligent Municipal Operations & Citizen Platform  
**Backend Framework**: Node.js (Express 5) + Socket.IO + MySQL2 Connection Pool + Python FastAPI ML Layer  
**Frontend Framework**: Vanilla JavaScript (ES6+), Vanilla CSS3 Design System, Leaflet GIS  
**Last Updated**: September 30, 2026  

---

## 1. Architectural Topology

```
                              [ Citizen / Staff / Admin Browsers ]
                                                │
             ┌──────────────────────────────────┴──────────────────────────────────┐
             ▼                                                                     ▼
[ Port 3000: Nginx / Static Proxy ]                                [ Port 5000: Express Master Gateway ]
             │                                                                     │
             └───────────────────────────────┬─────────────────────────────────────┘
                                             │
                                 [ Express 5 Middleware ]
              ┌──────────────────────────────┼──────────────────────────────┐
              ▼                              ▼                              ▼
      [ Security Headers ]           [ Rate Limiters ]            [ JWT Authentication ]
      (XSS, HSTS, Sniff)             (DoS, SOS, AI, Auth)         (Bearer Token Validation)
              │                              │                              │
              └──────────────────────────────┼──────────────────────────────┘
                                             │
                                   [ Modular REST APIs ]
                                             │
             ┌───────────────┬───────────────┼───────────────┬───────────────┐
             ▼               ▼               ▼               ▼               ▼
        [ Traffic ]    [ Healthcare ]   [ Parking ]     [ Waste/Water ] [ AI & Telemetry ]
             │               │               │               │               │
             └───────────────┴───────────────┼───────────────┴───────────────┘
                                             │
             ┌───────────────────────────────┴──────────────────────────────┐
             ▼                                                              ▼
[ MySQL Database (101 Tables) ]                              [ Socket.IO Real-Time Engine ]
(Users, Staff, Sensors, Telemetry)                           (Traffic, Ambulances, SLA Ticker)
             │
             ▼
[ Python FastAPI AI Engine ] (Port 8000)
(Grounded ML Inference & Predictions)
```

---

## 2. Master Feature & Architecture Map

| Feature | Frontend Page / Component | Backend Route / Controller | Database Table(s) | Related API | User Role | Current Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **Civic Portal & Hero Showcase** | `frontend/index.html` | `backend/server.js`, `city.routes.js` | `city_environmental_sensors` | `GET /api/health`, `GET /api/city/overview` | Public / Any | 🟢 Active |
| **Citizen Auth & Registration** | `frontend/auth.js` | `backend/routes/auth.routes.js` | `users`, `auth_sessions`, `audit_logs` | `POST /api/login`, `POST /api/register` | Public | 🟢 Active |
| **Staff & Doctor Authentication** | `frontend/auth.js` | `backend/routes/auth.routes.js` | `staff`, `doctors`, `hospitals` | `POST /api/staff-login`, `POST /api/auth/demo-login` | Public | 🟢 Active |
| **Centralized Profile Drawer** | `frontend/auth.js` | `backend/routes/auth.routes.js` | `users`, `staff`, `patients` | `GET /api/auth/me`, `PUT /api/auth/profile` | Authenticated | 🟢 Active |
| **User Activity Audit Timeline** | `frontend/auth.js` | `backend/routes/auth.routes.js`, `requests.routes.js` | `audit_logs`, `service_requests` | `GET /api/user/activities`, `GET /api/requests/my` | Authenticated | 🟢 Active |
| **Ayushman Patient QR Pass** | `frontend/pages/hospital/`, `auth.js` | `backend/routes/patient.routes.js` | `patients`, `patient_records`, `patient_reports`, `patient_audit_logs` | `POST /api/patients`, `GET /api/patients/:id/qr`, `POST /api/patients/verify-qr` | Citizen / Doctor / Hospital Staff | 🟢 Active |
| **Traffic Signals & Phasing** | `frontend/pages/traffic/` | `backend/routes/traffic.routes.js`, `traffic_engine.js` | `traffic_junctions`, `traffic_signals` | `GET /api/traffic/junctions`, `GET /api/traffic/signals`, `POST /api/traffic/signals/override` | Citizen (Read) / Traffic Staff (Override) | 🟢 Active |
| **Webster Traffic Cycle AI** | `frontend/pages/traffic/` | `backend/services/traffic_ai_service.js` | `traffic_predictions`, `signal_optimizations` | `GET /api/traffic/prediction`, `POST /api/traffic/optimize-signal` | Traffic Staff / Admin | 🟢 Active |
| **ANPR Camera Staging & Review** | `frontend/pages/traffic/` | `backend/routes/cv_anpr.routes.js` | `traffic_cameras`, `traffic_violations`, `cv_detections` | `GET /api/traffic/cameras`, `POST /api/cv/violations/:id/verify` | Traffic Staff / Admin | 🟢 Active |
| **Traffic e-Challan Settle** | `frontend/pages/traffic/` | `backend/routes/traffic.routes.js` | `traffic_violations` | `GET /api/traffic/echallan/search`, `POST /api/traffic/echallan/pay` | Citizen / Public | 🟢 Active |
| **Smart Parking Directory** | `frontend/pages/parking/` | `backend/routes/parking.routes.js` | `parking_lots`, `parking_slots` | `GET /api/parking/lots`, `GET /api/parking/slots` | Public | 🟢 Active |
| **Parking Reservation Pass** | `frontend/pages/parking/` | `backend/routes/parking.routes.js` | `parking_bookings`, `parking_slots` | `POST /api/parking/book`, `GET /api/parking/my-bookings` | Citizen | 🟢 Active |
| **Parking Staff Barrier Gate** | `frontend/pages/parking/` | `backend/routes/parking.routes.js` | `parking_entries`, `parking_anpr_scans` | `GET /api/parking/staff/overview`, `POST /api/parking/entry`, `POST /api/parking/exit` | Parking Staff / Admin | 🟢 Active |
| **Hospital & Bed Telemetry** | `frontend/pages/hospital/` | `backend/routes/hospital.routes.js` | `hospitals`, `hospital_beds`, `hospital_ward_beds` | `GET /api/hospitals`, `GET /api/hospital/beds`, `GET /api/hospital/bed-categories` | Public | 🟢 Active |
| **Doctor OPD Appointments** | `frontend/pages/hospital/` | `backend/routes/appointment.routes.js`, `doctor.routes.js` | `doctors`, `appointments`, `patients` | `GET /api/doctors`, `POST /api/appointments/book-strict` | Citizen | 🟢 Active |
| **Doctor Clinical Consultation** | `frontend/pages/hospital/doctor_dashboard.html` | `backend/routes/doctor.routes.js` | `doctors`, `appointments`, `patient_records` | `GET /api/doctor/:id/appointments`, `POST /api/doctor/consultation` | Doctor (`role: doctor`) | 🟢 Active |
| **Hospital Capacity Surge AI** | `frontend/pages/hospital/` | `backend/services/healthcare_ai_service.js` | `hospital_predictions` | `GET /api/hospital/bed-surge` | Hospital Staff / Admin | 🟢 Active |
| **Waste Bins & Fill Telemetry** | `frontend/pages/waste/` | `backend/routes/waste.routes.js` | `waste_bins`, `waste_routes` | `GET /api/waste/bins`, `POST /api/waste/prediction` | Public | 🟢 Active |
| **Waste Grievance Reporting** | `frontend/pages/waste/` | `backend/routes/waste.routes.js` | `service_requests`, `waste_bin_requests` | `POST /api/waste/report`, `GET /api/waste/requests` | Citizen | 🟢 Active |
| **Waste TSP Route Optimizer** | `frontend/pages/waste/` | `backend/services/waste_ai_service.js` | `waste_routes`, `waste_vehicles` | `POST /api/waste/optimize-route`, `POST /api/waste/requests/update-status` | Waste Staff / Admin | 🟢 Active |
| **SCADA Water Reservoirs** | `frontend/pages/water/` | `backend/routes/water.routes.js` | `water_tanks`, `water_pipelines` | `GET /api/water/tanks`, `GET /api/water/pipelines` | Public | 🟢 Active |
| **SCADA Pipe Burst Anomaly AI**| `frontend/pages/water/` | `backend/services/water_ai_service.js` | `water_anomalies` | `GET /api/water/anomalies` | Water Staff / Admin | 🟢 Active |
| **Water Supply Schedule** | `frontend/pages/water/` | `backend/routes/water.routes.js` | `water_supply_schedules` | `GET /api/water/schedules` | Public | 🟢 Active |
| **Potable Tanker Booking** | `frontend/pages/water/` | `backend/routes/water.routes.js` | `water_tanker_bookings` | `POST /api/water/tanker-bookings` | Citizen | 🟢 Active |
| **Emergency SOS 1-Tap Trigger**| `frontend/pages/emergency/` | `backend/routes/emergency.routes.js` | `emergency_incidents` | `POST /api/emergency/sos` | Public / Citizen | 🟢 Active |
| **Live 6-Ambulance Radar** | `frontend/pages/emergency/` | `backend/routes/ambulance.routes.js`, `ambulance_simulator.js` | `ambulances`, `ambulance_waypoints` | `GET /api/ambulances`, WebSocket `ambulance:location-updated` | Public | 🟢 Active |
| **600m Green Wave Preemption** | `frontend/pages/emergency/` | `backend/routes/traffic.routes.js`, `ambulance_simulator.js` | `traffic_signals`, `ambulance_green_waves` | `POST /api/traffic/ambulance-preemption`, `POST /api/traffic/ambulances/:id/critical-dispatch` | Emergency / Traffic Staff / Admin | 🟢 Active |
| **Police Stations & e-FIR** | `frontend/pages/police/` | `backend/routes/police.routes.js` | `police_stations`, `police_complaints`, `police_patrol_units` | `GET /api/police/stations`, `POST /api/police/complaints` | Citizen / Police Staff | 🟢 Active |
| **Cultural Heritage Tourism** | `frontend/pages/famous/` | `backend/routes/famous_places.routes.js` | `famous_places`, `place_reviews`, `events` | `GET /api/famous-places`, `GET /api/famous/reviews` | Public | 🟢 Active |
| **Grounded AI Assistant** | `frontend/components/ai_widget.js` | `backend/routes/ai.routes.js`, `ai_orchestrator.js` | `ai_predictions`, `ai_tool_logs`, `ai_chat_messages` | `POST /api/ai/chat`, `POST /api/ai/assistant` | Public / Citizen | 🟢 Active |
| **Civic Grievance SLA Tracker** | Global modal / Index | `backend/routes/requests.routes.js`, `sla_engine.js` | `service_requests` | `POST /api/requests`, `GET /api/requests/track/:id` | Citizen | 🟢 Active |
| **ICCC Municipal Command Desk**| `frontend/pages/admin/` | `backend/routes/admin.routes.js` | Cross-system joins, `audit_logs` | `GET /api/admin/command-center`, `GET /api/admin/stats`, `POST /api/admin/what-if-simulation` | Admin (`role: admin`) | 🟢 Active |

---

## 3. Shared Frontend Components

1. **`SmartCityAuth` (`frontend/auth.js`)**:
   - Universal authentication singleton managing tokens, login/register modals, profile drawer, patient QR generation, and role checks (`canEdit`, `hasPermission`).
2. **`SmartCityRealtime` (`frontend/realtime.js`)**:
   - Centralized Socket.IO subscriber managing real-time traffic signal phase animations, ambulance radar coordinates, and civic SLA tickers.
3. **`AIAssistantWidget` (`frontend/components/ai_widget.js`)**:
   - Global floating bilingual dialog with 17 allowlisted database tools, action chips, and speech recognition.
4. **`CookieConsent` (`frontend/components/cookie_consent.js`)**:
   - Municipal privacy banner managing session storage consent.
5. **`AnalyticsEngine` (`frontend/components/analytics.js`)**:
   - Tokenized, privacy-preserving civic usage telemetry.
