const fs = require('fs');
const path = require('path');

const docsDir = path.join(__dirname, '..', 'docs');
if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

console.log('Generating DATA_FLOW_MAP.md...');

const md = `# SMARTCITY AI — END-TO-END DATA FLOW & DEPENDENCY MAP

This document maps the complete architectural and runtime data flow graphs, vertical component stacks, cross-module synchronization pipelines, and Single-Source-of-Truth (SSOT) boundaries across the SmartCity AI platform.

---

## 1. Vertical Architectural Stack & Data Flow Standard

Every end-to-end user transaction flows through an 8-layer vertical stack:

\`\`\`
[1. User Action / Event]
       │
       ▼
[2. Frontend UI / DOM Layer] (HTML5 / Vanilla CSS / Component Renderer)
       │
       ▼
[3. Client API Client] (frontend/api/client.js + Module API Wrapper)
       │
       ▼
[4. HTTP / WebSocket Gateway] (Express 5 REST API / Socket.IO Server on Port 5000)
       │
       ▼
[5. Security & RBAC Middleware] (JWT Verification, Rate Limiting, Input Sanitization)
       │
       ▼
[6. Route Handler & Controller] (backend/routes/* -> backend/controllers/*)
       │
       ▼
[7. Business Logic & Intelligence Layer] (backend/services/* & FastAPI on Port 8000)
       │
       ▼
[8. Data Persistence Layer] (MySQL 2 Connection Pool -> 101 Relational Tables)
       │
       ▼
[Response Pipeline: MySQL -> Model -> Controller -> JSON Response -> DOM / Map Update]
\`\`\`

---

## 2. Detailed Cross-Module Data Pipelines

### Pipeline 1: Emergency SOS ↔ Ambulance ↔ Traffic Green Wave ↔ Map
\`\`\`
Citizen presses SOS button (frontend/pages/emergency/emergency.html)
  │
  ├─► POST /api/emergency/sos (emergency.api.js)
  │     └─► EmergencyController.createSos()
  │           └─► INSERT INTO emergency_incidents (status='Dispatched', priority='Critical')
  │                 └─► Realtime: io.to("emergency-alerts").emit("emergency:new-sos")
  │
  ├─► Ambulance Dispatch & Auto-Assignment
  │     └─► SELECT FROM ambulances WHERE status='Available' ORDER BY ST_Distance_Sphere(...) LIMIT 1
  │           └─► UPDATE ambulances SET status='Dispatched', incident_id=?
  │
  ├─► Traffic Preemption (Green Wave Corridor)
  │     └─► POST /api/traffic/ambulance-preemption
  │           └─► TrafficEngine.activateGreenWave(routeJunctions)
  │                 └─► UPDATE traffic_signals SET state='GREEN', preemption_active=1
  │                       └─► Realtime: io.emit("traffic:signal-updated")
  │
  └─► Live GPS Tracking
        └─► AmbulanceSimulator -> PUT /api/ambulance/location/:id
              └─► Realtime: io.to("ambulance-tracking").emit("ambulance:location-updated")
                    └─► SmartCityMap.updateMarker(ambulanceId, [lat, lng])
\`\`\`
- **Source of Truth**: \`emergency_incidents\`, \`ambulances\`, \`traffic_signals\`
- **Cross-Module Verification**: SOS creation automatically activates traffic preemption, updates Leaflet map markers, and transmits telemetry over WebSocket.

---

### Pipeline 2: Parking Slot Booking ↔ Live Availability ↔ Map ↔ AI
\`\`\`
Citizen selects slot & clicks "Confirm Booking" (frontend/pages/parking/parking.html)
  │
  ├─► POST /api/parking/book (parking.api.js)
  │     └─► ParkingController.bookSlot()
  │           └─► MySQL Transaction (SERIALIZABLE):
  │                 1. SELECT status FROM parking_slots WHERE id = ? FOR UPDATE;
  │                 2. IF status != 'Available' ROLLBACK & return Error 409 (Conflict)
  │                 3. INSERT INTO parking_bookings (user_id, slot_id, vehicle_number, start_time, qr_code)
  │                 4. UPDATE parking_slots SET status = 'Booked' WHERE id = ?
  │                 5. COMMIT;
  │
  ├─► Real-Time Broadcast
  │     └─► io.to("parking-updates").emit("parking:slot-updated", { lot_id, slot_id, status: 'Booked' })
  │
  ├─► Map Layer Synchronization
  │     └─► SmartCityMap receives update -> updates lot badge & popup vacancy count
  │
  └─► Grounded AI Chatbot
        └─► Tool: get_parking_availability({ lot_id })
              └─► SELECT available_slots FROM parking_lots -> Immediately returns reduced vacancy
\`\`\`
- **Source of Truth**: \`parking_slots\` table (row-level lock prevents race conditions and double booking).

---

### Pipeline 3: Healthcare Beds ↔ Emergency Triage ↔ AI Recommender
\`\`\`
Hospital Staff updates Bed Count / Citizen checks ICU vacancy
  │
  ├─► PUT /api/hospital/beds/occupancy (hospital.api.js)
  │     └─► HospitalController.updateBeds()
  │           └─► UPDATE hospital_bed_categories SET occupied_beds = ? WHERE hospital_id = ? AND category = 'ICU'
  │
  ├─► AI Healthcare Bed Capacity Predictor
  │     └─► FastAPI POST /api/v1/healthcare/capacity
  │           └─► Evaluates surge threshold, bed turnover velocity, and ICU strain
  │                 └─► INSERT INTO hospital_predictions
  │
  └─► Grounded AI Chatbot ("ICU bed kaha available hai?")
        └─► Tool: find_available_beds({ bed_type: 'ICU' })
              └─► SELECT h.hospital_name, c.available_beds FROM hospital_bed_categories c
                    └─► Grounded reply: "AIIMS Gorakhpur me 14 ICU bed uplabdh hain."
\`\`\`
- **Source of Truth**: \`hospital_bed_categories\` table.

---

### Pipeline 4: Smart Waste Sensor ↔ AI Route Optimization ↔ Map
\`\`\`
IoT Bin Telemetry / Staff Manual Fill Update (frontend/pages/waste/waste.html)
  │
  ├─► POST /api/waste/bins/:id/fill-level (waste.api.js)
  │     └─► WasteController.updateFillLevel()
  │           └─► UPDATE waste_bins SET fill_percentage = ?, last_emptied = NOW()
  │
  ├─► AI Priority & Route Optimizer
  │     └─► FastAPI POST /api/v1/waste/predict
  │           └─► Returns collection priority score (High/Critical) and ETA to overflow
  │                 └─► UPDATE waste_routes SET optimized_path = ?
  │
  └─► Map Waste Layer
        └─► SmartCityMap.loadPOICategory('waste')
              └─► Color-coded bin markers (Green <50%, Yellow 50-80%, Red >80%)
\`\`\`
- **Source of Truth**: \`waste_bins\` table.

---

### Pipeline 5: Water SCADA Telemetry ↔ Anomaly Detection ↔ Tanker Booking
\`\`\`
SCADA Pressure/Level Sensor Trigger (frontend/pages/water/water.html)
  │
  ├─► POST /api/water/telemetry
  │     └─► WaterController.recordTelemetry()
  │           └─► INSERT INTO water_anomalies / water_quality_logs
  │
  ├─► AI Anomaly Detection
  │     └─► FastAPI POST /api/v1/water/anomaly
  │           └─► Flags pipeline bursts, pressure drops, or quality deviations
  │
  └─► Citizen Tanker Request
        └─► POST /api/water/tanker-booking
              └─► INSERT INTO water_tanker_bookings (ward, delivery_slot, status='Confirmed')
\`\`\`
- **Source of Truth**: \`water_tanks\`, \`water_anomalies\`, \`water_tanker_bookings\`.

---

### Pipeline 6: Traffic Junction Congestion ↔ ANPR ↔ E-Challan ↔ Heatmap
\`\`\`
CCTV Camera Feed / Simulation Loop (frontend/pages/traffic/traffic.html)
  │
  ├─► TrafficEngine.js background timer (every 10 seconds)
  │     └─► Calculates vehicles_per_minute, density, and average speed
  │           └─► UPDATE traffic_junctions SET congestion_level = ?, current_speed_kmh = ?
  │
  ├─► ANPR Speed / Red-Light Violation Detector
  │     └─► INSERT INTO traffic_violations (vehicle_plate, fine_amount, status='Issued')
  │
  └─► Frontend OpenLayers / Leaflet Visualization
        └─► GET /api/traffic/junctions
              └─► Renders real-time junction markers & color-coded arterial corridors
\`\`\`
- **Source of Truth**: \`traffic_junctions\`, \`traffic_signals\`, \`traffic_violations\`.

---

### Pipeline 7: Grounded AI Assistant (Strict Zero-Hallucination Pipeline)
\`\`\`
Citizen Query: "Ramgarh Tal kaise jaaye?" OR "Nearest ICU bed batao"
  │
  ├─► POST /api/ai/chat (frontend/components/ai_widget.js)
  │     └─► ChatbotEngine.detectIntent(query)
  │           ├─► Detects language (Hindi vs. English)
  │           ├─► Extracts domain intent (e.g., 'hospital_beds', 'parking', 'tourism')
  │           └─► Maps strictly to one of 14 Grounded Tools in backend/ai/tools/smartcity_tools.js
  │
  ├─► Tool Execution against MySQL
  │     └─► Tool queries trusted database tables with parameterized SQL
  │           └─► IF no records found:
  │                 Returns: "No verified data available." (ZERO HALLUCINATIONS)
  │           └─► IF records found:
  │                 Returns structured JSON payload with verified metadata
  │
  └─► Grounded Synthesis
        └─► ChatbotEngine.synthesizeResponse() formats clean Hindi/English text response
              └─► Delivered to citizen UI with actionable deep links
\`\`\`
- **Source of Truth**: Relational MySQL Tables queried directly by Grounded Tools.

---

## 3. Cross-Module Data Sharing & Dependency Matrix

| Module | Consumes Data From | Exposes Data To | Shared Entity | SSOT Table |
| :--- | :--- | :--- | :--- | :--- |
| **Traffic** | Emergency (Preemption), Weather, IoT Sensors | Map, Emergency (Routes), AI Assistant | Junction status, corridor density | \`traffic_junctions\` |
| **Emergency** | Ambulance GPS, Hospital ICU Beds, Traffic Signals | Map, Traffic (Green Wave), Staff Portal | SOS incidents, active dispatches | \`emergency_incidents\` |
| **Ambulance** | Emergency SOS, Traffic Routing | Map, Emergency Room, Hospital Trauma | Live location, vehicle state | \`ambulances\` |
| **Parking** | Citizen Bookings, ANPR Sensors | Map, AI Assistant, User Profile | Slot occupancy, lot capacity | \`parking_slots\` |
| **Hospital** | Bed Telemetry, Doctor Rosters, Appointments | Emergency Triage, AI Assistant, User Profile | Available ICU beds, doctors | \`hospital_bed_categories\` |
| **Waste** | IoT Bin Fill Sensors, Worker Schedules | Map, Municipal Operations, AI Predictor | Bin fill levels, collection routes | \`waste_bins\` |
| **Water** | SCADA Flow/Pressure, Tank Telemetry | Citizen Tanker Service, Alerts, AI | Tank water levels, supply schedule | \`water_tanks\` |
| **Police** | Citizen Complaints, e-FIR, Patrol Units | Map, Emergency Operations, Safety Score | Station jurisdiction, complaints | \`police_stations\` |
| **Tourism** | Heritage Sites, Citizen Reviews | Map, AI Tour Guide, Local Commerce | Places, hours, entry guidelines | \`famous_places\` |
| **User Profile**| Auth, Parking Bookings, Appointments, FIRs | Navigation, Dashboard, AI Assistant | Citizen identity, personal history | \`users\` |
| **AI Assistant**| ALL 10 Municipal Modules via 14 Grounded Tools | Citizen Chatbot, Floating Widget | Verified live data across city | Direct MySQL Tables |

---

## 4. Single Source of Truth (SSOT) Guarantees

1. **No Duplicate State**: In-memory variables are never used as authoritative state. In-memory data structures (such as Leaflet marker collections or socket caches) are strictly read replicas synchronized from MySQL.
2. **ACID Transactions**: Financial or capacity-constrained mutations (such as parking slot booking and appointment scheduling) utilize \`START TRANSACTION\`, \`SELECT ... FOR UPDATE\`, and explicit rollback on contention.
3. **Real-Time Consistency**: Whenever an SSOT table is mutated via an authorized POST/PUT/DELETE API, the corresponding Socket.IO event is emitted to all subscribed rooms, ensuring immediate convergence between the database and the frontend DOM.
`;

fs.writeFileSync(path.join(docsDir, 'DATA_FLOW_MAP.md'), md, 'utf8');
console.log('DATA_FLOW_MAP.md successfully generated!');
