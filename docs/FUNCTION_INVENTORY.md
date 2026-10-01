# SMARTCITY AI — MASTER FUNCTION INVENTORY

This document contains the complete and authoritative inventory of every executable feature, API endpoint, controller function, model query, AI tool, map interaction, real-time socket event, and frontend interactive component across the entire SmartCity AI platform.

---

## 1. Executive Summary & Inventory Statistics

| Category | Component / Resource Type | Total Discovered & Cataloged |
| :--- | :--- | :--- |
| **Backend** | API Endpoints & Routes | 426 |
| **Backend** | Service & Engine Operations | 45 |
| **Backend** | Controller & Model Handlers | 78 |
| **Database** | Verified MySQL Tables | 101 |
| **AI Layer** | Grounded Municipal Tools | 14 |
| **AI Layer** | Python ML & NLP Endpoints | 10 |
| **AI Layer** | Predictors & Recommenders | 7 |
| **Realtime** | Socket.IO Event Handlers & Rooms | 16 |
| **Map Engine**| Leaflet / OpenLayers Controls & Layers | 18 |
| **Frontend** | Interactive Pages | 16 |
| **Frontend** | Forms & Submissions | 20 |
| **Frontend** | Action Buttons & Modals | 568 |
| **Frontend** | Core Client Functions & Listeners | 1,050+ |

---

## 2. Inventory Classification Matrix

Every function card in this inventory adheres strictly to the canonical 18-point verification specification:
- **ID**: Unique deterministic identifier (e.g. `F-BEND-001`, `F-FE-001`, `F-AI-001`, `F-DB-001`, `F-MAP-001`, `F-RT-001`)
- **Module**: Core municipal department or cross-cutting subsystem
- **Feature**: Specific user-facing or platform capability
- **Function Name**: Exact programmatic signature or symbol
- **File**: Relative path to source file
- **Type**: Backend / Frontend / AI / Database / Map / Realtime
- **Input**: Parameters, headers, or request payload schema
- **Expected Output**: HTTP code, JSON structure, or UI mutation
- **Dependencies**: Subsystems, foreign keys, or prerequisites
- **API Endpoint**: Route path and HTTP method (or N/A)
- **Database Tables**: Tables queried, inserted, or updated
- **Authentication Requirement**: Public / Anonymous / Bearer JWT required
- **RBAC Requirement**: Citizen / Staff / Operator / Doctor / Admin / None
- **Realtime Dependency**: Socket.io room or event emitted/listened
- **AI Dependency**: Grounded tool / FastAPI ML model invocation
- **Map Dependency**: Coordinates, GeoJSON, or map layer interaction
- **Current Status**: IMPLEMENTED / ACTIVE
- **Test Status**: NOT TESTED (Initial Discovery Baseline)

---

## 3. AI & Grounded Tool Function Inventory (Phase 8–10 Grounding)

### F-AI-001 — find_hospitals()
- **Module**: Hospital
- **Feature**: AI Grounded Tool Execution
- **Function Name**: `SmartCityTools.find_hospitals`
- **File**: `backend/ai/tools/smartcity_tools.js`
- **Type**: AI / Grounded Tool
- **Input**: `{ location?: string, specialty?: string, emergency?: boolean }`
- **Expected Output**: `{ success: true, count: number, data: Hospital[] }`
- **Dependencies**: MySQL2 connection pool, verified database tables
- **API Endpoint**: `POST /api/ai/tool-execute` & `POST /api/ai/chat`
- **Database Tables**: `hospitals, hospital_bed_categories`
- **Authentication Requirement**: Optional for public queries; Required for personal bookings
- **RBAC Requirement**: None (Public citizen & authenticated)
- **Realtime Dependency**: Telemetry updates if available
- **AI Dependency**: Core grounded tool caller
- **Map Dependency**: GeoJSON coordinates returned
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-AI-002 — find_available_beds()
- **Module**: Hospital
- **Feature**: AI Grounded Tool Execution
- **Function Name**: `SmartCityTools.find_available_beds`
- **File**: `backend/ai/tools/smartcity_tools.js`
- **Type**: AI / Grounded Tool
- **Input**: `{ hospital_id?: string, bed_type?: string }`
- **Expected Output**: `{ success: true, count: number, data: BedCategory[] }`
- **Dependencies**: MySQL2 connection pool, verified database tables
- **API Endpoint**: `POST /api/ai/tool-execute` & `POST /api/ai/chat`
- **Database Tables**: `hospital_bed_categories, hospitals`
- **Authentication Requirement**: Optional for public queries; Required for personal bookings
- **RBAC Requirement**: None (Public citizen & authenticated)
- **Realtime Dependency**: Telemetry updates if available
- **AI Dependency**: Core grounded tool caller
- **Map Dependency**: GeoJSON coordinates returned
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-AI-003 — find_doctors()
- **Module**: Hospital
- **Feature**: AI Grounded Tool Execution
- **Function Name**: `SmartCityTools.find_doctors`
- **File**: `backend/ai/tools/smartcity_tools.js`
- **Type**: AI / Grounded Tool
- **Input**: `{ specialty?: string, hospital_id?: string, day?: string }`
- **Expected Output**: `{ success: true, count: number, data: Doctor[] }`
- **Dependencies**: MySQL2 connection pool, verified database tables
- **API Endpoint**: `POST /api/ai/tool-execute` & `POST /api/ai/chat`
- **Database Tables**: `doctors, doctor_slots`
- **Authentication Requirement**: Optional for public queries; Required for personal bookings
- **RBAC Requirement**: None (Public citizen & authenticated)
- **Realtime Dependency**: Telemetry updates if available
- **AI Dependency**: Core grounded tool caller
- **Map Dependency**: GeoJSON coordinates returned
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-AI-004 — find_parking()
- **Module**: Parking
- **Feature**: AI Grounded Tool Execution
- **Function Name**: `SmartCityTools.find_parking`
- **File**: `backend/ai/tools/smartcity_tools.js`
- **Type**: AI / Grounded Tool
- **Input**: `{ location?: string, vehicle_type?: string }`
- **Expected Output**: `{ success: true, count: number, data: ParkingLot[] }`
- **Dependencies**: MySQL2 connection pool, verified database tables
- **API Endpoint**: `POST /api/ai/tool-execute` & `POST /api/ai/chat`
- **Database Tables**: `parking_lots, parking_slots`
- **Authentication Requirement**: Optional for public queries; Required for personal bookings
- **RBAC Requirement**: None (Public citizen & authenticated)
- **Realtime Dependency**: Telemetry updates if available
- **AI Dependency**: Core grounded tool caller
- **Map Dependency**: GeoJSON coordinates returned
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-AI-005 — get_parking_availability()
- **Module**: Parking
- **Feature**: AI Grounded Tool Execution
- **Function Name**: `SmartCityTools.get_parking_availability`
- **File**: `backend/ai/tools/smartcity_tools.js`
- **Type**: AI / Grounded Tool
- **Input**: `{ lot_id: number }`
- **Expected Output**: `{ success: true, total: number, available: number, occupied: number, slots: Slot[] }`
- **Dependencies**: MySQL2 connection pool, verified database tables
- **API Endpoint**: `POST /api/ai/tool-execute` & `POST /api/ai/chat`
- **Database Tables**: `parking_slots, parking_lots`
- **Authentication Requirement**: Optional for public queries; Required for personal bookings
- **RBAC Requirement**: None (Public citizen & authenticated)
- **Realtime Dependency**: Telemetry updates if available
- **AI Dependency**: Core grounded tool caller
- **Map Dependency**: GeoJSON coordinates returned
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-AI-006 — get_traffic_status()
- **Module**: Traffic
- **Feature**: AI Grounded Tool Execution
- **Function Name**: `SmartCityTools.get_traffic_status`
- **File**: `backend/ai/tools/smartcity_tools.js`
- **Type**: AI / Grounded Tool
- **Input**: `{ junction_name?: string, corridor?: string }`
- **Expected Output**: `{ success: true, junctions: Junction[], incidents: Incident[] }`
- **Dependencies**: MySQL2 connection pool, verified database tables
- **API Endpoint**: `POST /api/ai/tool-execute` & `POST /api/ai/chat`
- **Database Tables**: `traffic_junctions, traffic_signals, traffic_incidents`
- **Authentication Requirement**: Optional for public queries; Required for personal bookings
- **RBAC Requirement**: None (Public citizen & authenticated)
- **Realtime Dependency**: Telemetry updates if available
- **AI Dependency**: Core grounded tool caller
- **Map Dependency**: GeoJSON coordinates returned
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-AI-007 — get_nearby_services()
- **Module**: General
- **Feature**: AI Grounded Tool Execution
- **Function Name**: `SmartCityTools.get_nearby_services`
- **File**: `backend/ai/tools/smartcity_tools.js`
- **Type**: AI / Grounded Tool
- **Input**: `{ lat: number, lng: number, radius_km?: number }`
- **Expected Output**: `{ success: true, services: POI[] }`
- **Dependencies**: MySQL2 connection pool, verified database tables
- **API Endpoint**: `POST /api/ai/tool-execute` & `POST /api/ai/chat`
- **Database Tables**: `hospitals, police_stations, parking_lots, famous_places`
- **Authentication Requirement**: Optional for public queries; Required for personal bookings
- **RBAC Requirement**: None (Public citizen & authenticated)
- **Realtime Dependency**: Telemetry updates if available
- **AI Dependency**: Core grounded tool caller
- **Map Dependency**: GeoJSON coordinates returned
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-AI-008 — get_emergency_services()
- **Module**: Emergency
- **Feature**: AI Grounded Tool Execution
- **Function Name**: `SmartCityTools.get_emergency_services`
- **File**: `backend/ai/tools/smartcity_tools.js`
- **Type**: AI / Grounded Tool
- **Input**: `{ lat?: number, lng?: number, type?: string }`
- **Expected Output**: `{ success: true, contacts: Contact[], ambulances_available: number }`
- **Dependencies**: MySQL2 connection pool, verified database tables
- **API Endpoint**: `POST /api/ai/tool-execute` & `POST /api/ai/chat`
- **Database Tables**: `emergency_departments, ambulances, police_stations`
- **Authentication Requirement**: Optional for public queries; Required for personal bookings
- **RBAC Requirement**: None (Public citizen & authenticated)
- **Realtime Dependency**: Telemetry updates if available
- **AI Dependency**: Core grounded tool caller
- **Map Dependency**: GeoJSON coordinates returned
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-AI-009 — get_police_stations()
- **Module**: Police
- **Feature**: AI Grounded Tool Execution
- **Function Name**: `SmartCityTools.get_police_stations`
- **File**: `backend/ai/tools/smartcity_tools.js`
- **Type**: AI / Grounded Tool
- **Input**: `{ sector?: string, emergency?: boolean }`
- **Expected Output**: `{ success: true, count: number, data: PoliceStation[] }`
- **Dependencies**: MySQL2 connection pool, verified database tables
- **API Endpoint**: `POST /api/ai/tool-execute` & `POST /api/ai/chat`
- **Database Tables**: `police_stations, police_complaints`
- **Authentication Requirement**: Optional for public queries; Required for personal bookings
- **RBAC Requirement**: None (Public citizen & authenticated)
- **Realtime Dependency**: Telemetry updates if available
- **AI Dependency**: Core grounded tool caller
- **Map Dependency**: GeoJSON coordinates returned
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-AI-010 — get_waste_status()
- **Module**: Waste
- **Feature**: AI Grounded Tool Execution
- **Function Name**: `SmartCityTools.get_waste_status`
- **File**: `backend/ai/tools/smartcity_tools.js`
- **Type**: AI / Grounded Tool
- **Input**: `{ ward?: string, bin_type?: string }`
- **Expected Output**: `{ success: true, bins: Bin[], critical_count: number }`
- **Dependencies**: MySQL2 connection pool, verified database tables
- **API Endpoint**: `POST /api/ai/tool-execute` & `POST /api/ai/chat`
- **Database Tables**: `waste_bins, waste_routes, waste_vehicles`
- **Authentication Requirement**: Optional for public queries; Required for personal bookings
- **RBAC Requirement**: None (Public citizen & authenticated)
- **Realtime Dependency**: Telemetry updates if available
- **AI Dependency**: Core grounded tool caller
- **Map Dependency**: GeoJSON coordinates returned
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-AI-011 — get_water_status()
- **Module**: Water
- **Feature**: AI Grounded Tool Execution
- **Function Name**: `SmartCityTools.get_water_status`
- **File**: `backend/ai/tools/smartcity_tools.js`
- **Type**: AI / Grounded Tool
- **Input**: `{ zone?: string, tank_name?: string }`
- **Expected Output**: `{ success: true, tanks: Tank[], schedule: Schedule[] }`
- **Dependencies**: MySQL2 connection pool, verified database tables
- **API Endpoint**: `POST /api/ai/tool-execute` & `POST /api/ai/chat`
- **Database Tables**: `water_tanks, water_supply_schedules, water_anomalies`
- **Authentication Requirement**: Optional for public queries; Required for personal bookings
- **RBAC Requirement**: None (Public citizen & authenticated)
- **Realtime Dependency**: Telemetry updates if available
- **AI Dependency**: Core grounded tool caller
- **Map Dependency**: GeoJSON coordinates returned
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-AI-012 — get_tourist_places()
- **Module**: Tourism
- **Feature**: AI Grounded Tool Execution
- **Function Name**: `SmartCityTools.get_tourist_places`
- **File**: `backend/ai/tools/smartcity_tools.js`
- **Type**: AI / Grounded Tool
- **Input**: `{ category?: string, query?: string }`
- **Expected Output**: `{ success: true, count: number, data: TouristPlace[] }`
- **Dependencies**: MySQL2 connection pool, verified database tables
- **API Endpoint**: `POST /api/ai/tool-execute` & `POST /api/ai/chat`
- **Database Tables**: `famous_places, place_reviews`
- **Authentication Requirement**: Optional for public queries; Required for personal bookings
- **RBAC Requirement**: None (Public citizen & authenticated)
- **Realtime Dependency**: Telemetry updates if available
- **AI Dependency**: Core grounded tool caller
- **Map Dependency**: GeoJSON coordinates returned
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-AI-013 — get_route_information()
- **Module**: Traffic
- **Feature**: AI Grounded Tool Execution
- **Function Name**: `SmartCityTools.get_route_information`
- **File**: `backend/ai/tools/smartcity_tools.js`
- **Type**: AI / Grounded Tool
- **Input**: `{ origin: string, destination: string }`
- **Expected Output**: `{ success: true, distance_km: number, eta_mins: number, congestion: string }`
- **Dependencies**: MySQL2 connection pool, verified database tables
- **API Endpoint**: `POST /api/ai/tool-execute` & `POST /api/ai/chat`
- **Database Tables**: `traffic_junctions, traffic_corridors`
- **Authentication Requirement**: Optional for public queries; Required for personal bookings
- **RBAC Requirement**: None (Public citizen & authenticated)
- **Realtime Dependency**: Telemetry updates if available
- **AI Dependency**: Core grounded tool caller
- **Map Dependency**: GeoJSON coordinates returned
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-AI-014 — get_user_bookings()
- **Module**: Profile
- **Feature**: AI Grounded Tool Execution
- **Function Name**: `SmartCityTools.get_user_bookings`
- **File**: `backend/ai/tools/smartcity_tools.js`
- **Type**: AI / Grounded Tool
- **Input**: `{ user_id: number }`
- **Expected Output**: `{ success: true, parking: Booking[], appointments: Appointment[] }`
- **Dependencies**: MySQL2 connection pool, verified database tables
- **API Endpoint**: `POST /api/ai/tool-execute` & `POST /api/ai/chat`
- **Database Tables**: `parking_bookings, appointments`
- **Authentication Requirement**: Optional for public queries; Required for personal bookings
- **RBAC Requirement**: None (Public citizen & authenticated)
- **Realtime Dependency**: Telemetry updates if available
- **AI Dependency**: Core grounded tool caller
- **Map Dependency**: GeoJSON coordinates returned
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

## 4. Real-Time Socket.IO Function Inventory

### F-RT-001 — join-ambulance-tracking
- **Module**: Realtime Telemetry
- **Feature**: Subscribes client to live ambulance GPS telemetry stream
- **Function Name**: `socket.on('join-ambulance-tracking')` / `io.emit('join-ambulance-tracking')`
- **File**: `backend/sockets/index.js` & `frontend/realtime.js`
- **Type**: Realtime / WebSocket
- **Input**: Room payload or broadcast telemetry packet
- **Expected Output**: Real-time WebSocket packet transmission & UI DOM update
- **Dependencies**: Socket.IO server & client connection
- **API Endpoint**: `ws://localhost:5000/socket.io/`
- **Database Tables**: Telemetry logs (`audit_logs`, `ambulances`, `parking_slots`)
- **Authentication Requirement**: Optional for broadcast rooms, JWT for private channels
- **RBAC Requirement**: None for public rooms; Operator for emergency dispatch
- **Realtime Dependency**: Core WebSocket Channel
- **AI Dependency**: Telemetry feed consumed by AI predictive models
- **Map Dependency**: Triggers real-time marker animation on Leaflet map
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-RT-002 — leave-ambulance-tracking
- **Module**: Realtime Telemetry
- **Feature**: Unsubscribes client from ambulance telemetry
- **Function Name**: `socket.on('leave-ambulance-tracking')` / `io.emit('leave-ambulance-tracking')`
- **File**: `backend/sockets/index.js` & `frontend/realtime.js`
- **Type**: Realtime / WebSocket
- **Input**: Room payload or broadcast telemetry packet
- **Expected Output**: Real-time WebSocket packet transmission & UI DOM update
- **Dependencies**: Socket.IO server & client connection
- **API Endpoint**: `ws://localhost:5000/socket.io/`
- **Database Tables**: Telemetry logs (`audit_logs`, `ambulances`, `parking_slots`)
- **Authentication Requirement**: Optional for broadcast rooms, JWT for private channels
- **RBAC Requirement**: None for public rooms; Operator for emergency dispatch
- **Realtime Dependency**: Core WebSocket Channel
- **AI Dependency**: Telemetry feed consumed by AI predictive models
- **Map Dependency**: Triggers real-time marker animation on Leaflet map
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-RT-003 — join-parking
- **Module**: Realtime Telemetry
- **Feature**: Subscribes client to live parking slot vacancy state updates
- **Function Name**: `socket.on('join-parking')` / `io.emit('join-parking')`
- **File**: `backend/sockets/index.js` & `frontend/realtime.js`
- **Type**: Realtime / WebSocket
- **Input**: Room payload or broadcast telemetry packet
- **Expected Output**: Real-time WebSocket packet transmission & UI DOM update
- **Dependencies**: Socket.IO server & client connection
- **API Endpoint**: `ws://localhost:5000/socket.io/`
- **Database Tables**: Telemetry logs (`audit_logs`, `ambulances`, `parking_slots`)
- **Authentication Requirement**: Optional for broadcast rooms, JWT for private channels
- **RBAC Requirement**: None for public rooms; Operator for emergency dispatch
- **Realtime Dependency**: Core WebSocket Channel
- **AI Dependency**: Telemetry feed consumed by AI predictive models
- **Map Dependency**: Triggers real-time marker animation on Leaflet map
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-RT-004 — join-emergency
- **Module**: Realtime Telemetry
- **Feature**: Subscribes emergency operators and citizens to SOS dispatch broadcasts
- **Function Name**: `socket.on('join-emergency')` / `io.emit('join-emergency')`
- **File**: `backend/sockets/index.js` & `frontend/realtime.js`
- **Type**: Realtime / WebSocket
- **Input**: Room payload or broadcast telemetry packet
- **Expected Output**: Real-time WebSocket packet transmission & UI DOM update
- **Dependencies**: Socket.IO server & client connection
- **API Endpoint**: `ws://localhost:5000/socket.io/`
- **Database Tables**: Telemetry logs (`audit_logs`, `ambulances`, `parking_slots`)
- **Authentication Requirement**: Optional for broadcast rooms, JWT for private channels
- **RBAC Requirement**: None for public rooms; Operator for emergency dispatch
- **Realtime Dependency**: Core WebSocket Channel
- **AI Dependency**: Telemetry feed consumed by AI predictive models
- **Map Dependency**: Triggers real-time marker animation on Leaflet map
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-RT-005 — join-water
- **Module**: Realtime Telemetry
- **Feature**: Subscribes client to water tank telemetry and pressure anomalies
- **Function Name**: `socket.on('join-water')` / `io.emit('join-water')`
- **File**: `backend/sockets/index.js` & `frontend/realtime.js`
- **Type**: Realtime / WebSocket
- **Input**: Room payload or broadcast telemetry packet
- **Expected Output**: Real-time WebSocket packet transmission & UI DOM update
- **Dependencies**: Socket.IO server & client connection
- **API Endpoint**: `ws://localhost:5000/socket.io/`
- **Database Tables**: Telemetry logs (`audit_logs`, `ambulances`, `parking_slots`)
- **Authentication Requirement**: Optional for broadcast rooms, JWT for private channels
- **RBAC Requirement**: None for public rooms; Operator for emergency dispatch
- **Realtime Dependency**: Core WebSocket Channel
- **AI Dependency**: Telemetry feed consumed by AI predictive models
- **Map Dependency**: Triggers real-time marker animation on Leaflet map
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-RT-006 — join-city
- **Module**: Realtime Telemetry
- **Feature**: Subscribes client to city-wide civic notifications and broadcast alerts
- **Function Name**: `socket.on('join-city')` / `io.emit('join-city')`
- **File**: `backend/sockets/index.js` & `frontend/realtime.js`
- **Type**: Realtime / WebSocket
- **Input**: Room payload or broadcast telemetry packet
- **Expected Output**: Real-time WebSocket packet transmission & UI DOM update
- **Dependencies**: Socket.IO server & client connection
- **API Endpoint**: `ws://localhost:5000/socket.io/`
- **Database Tables**: Telemetry logs (`audit_logs`, `ambulances`, `parking_slots`)
- **Authentication Requirement**: Optional for broadcast rooms, JWT for private channels
- **RBAC Requirement**: None for public rooms; Operator for emergency dispatch
- **Realtime Dependency**: Core WebSocket Channel
- **AI Dependency**: Telemetry feed consumed by AI predictive models
- **Map Dependency**: Triggers real-time marker animation on Leaflet map
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-RT-007 — ambulance:location-updated
- **Module**: Realtime Telemetry
- **Feature**: Pushes updated lat/lng coordinates and speed of active ambulances
- **Function Name**: `socket.on('ambulance:location-updated')` / `io.emit('ambulance:location-updated')`
- **File**: `backend/sockets/index.js` & `frontend/realtime.js`
- **Type**: Realtime / WebSocket
- **Input**: Room payload or broadcast telemetry packet
- **Expected Output**: Real-time WebSocket packet transmission & UI DOM update
- **Dependencies**: Socket.IO server & client connection
- **API Endpoint**: `ws://localhost:5000/socket.io/`
- **Database Tables**: Telemetry logs (`audit_logs`, `ambulances`, `parking_slots`)
- **Authentication Requirement**: Optional for broadcast rooms, JWT for private channels
- **RBAC Requirement**: None for public rooms; Operator for emergency dispatch
- **Realtime Dependency**: Core WebSocket Channel
- **AI Dependency**: Telemetry feed consumed by AI predictive models
- **Map Dependency**: Triggers real-time marker animation on Leaflet map
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-RT-008 — ambulance:status-updated
- **Module**: Realtime Telemetry
- **Feature**: Pushes ambulance status transitions (Available, Dispatched, On-Scene, Completed)
- **Function Name**: `socket.on('ambulance:status-updated')` / `io.emit('ambulance:status-updated')`
- **File**: `backend/sockets/index.js` & `frontend/realtime.js`
- **Type**: Realtime / WebSocket
- **Input**: Room payload or broadcast telemetry packet
- **Expected Output**: Real-time WebSocket packet transmission & UI DOM update
- **Dependencies**: Socket.IO server & client connection
- **API Endpoint**: `ws://localhost:5000/socket.io/`
- **Database Tables**: Telemetry logs (`audit_logs`, `ambulances`, `parking_slots`)
- **Authentication Requirement**: Optional for broadcast rooms, JWT for private channels
- **RBAC Requirement**: None for public rooms; Operator for emergency dispatch
- **Realtime Dependency**: Core WebSocket Channel
- **AI Dependency**: Telemetry feed consumed by AI predictive models
- **Map Dependency**: Triggers real-time marker animation on Leaflet map
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-RT-009 — parking:slot-updated
- **Module**: Realtime Telemetry
- **Feature**: Pushes slot state changes (Available -> Booked -> Occupied)
- **Function Name**: `socket.on('parking:slot-updated')` / `io.emit('parking:slot-updated')`
- **File**: `backend/sockets/index.js` & `frontend/realtime.js`
- **Type**: Realtime / WebSocket
- **Input**: Room payload or broadcast telemetry packet
- **Expected Output**: Real-time WebSocket packet transmission & UI DOM update
- **Dependencies**: Socket.IO server & client connection
- **API Endpoint**: `ws://localhost:5000/socket.io/`
- **Database Tables**: Telemetry logs (`audit_logs`, `ambulances`, `parking_slots`)
- **Authentication Requirement**: Optional for broadcast rooms, JWT for private channels
- **RBAC Requirement**: None for public rooms; Operator for emergency dispatch
- **Realtime Dependency**: Core WebSocket Channel
- **AI Dependency**: Telemetry feed consumed by AI predictive models
- **Map Dependency**: Triggers real-time marker animation on Leaflet map
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-RT-010 — emergency:new-sos
- **Module**: Realtime Telemetry
- **Feature**: Broadcasts immediate SOS alert with siren sound to operators
- **Function Name**: `socket.on('emergency:new-sos')` / `io.emit('emergency:new-sos')`
- **File**: `backend/sockets/index.js` & `frontend/realtime.js`
- **Type**: Realtime / WebSocket
- **Input**: Room payload or broadcast telemetry packet
- **Expected Output**: Real-time WebSocket packet transmission & UI DOM update
- **Dependencies**: Socket.IO server & client connection
- **API Endpoint**: `ws://localhost:5000/socket.io/`
- **Database Tables**: Telemetry logs (`audit_logs`, `ambulances`, `parking_slots`)
- **Authentication Requirement**: Optional for broadcast rooms, JWT for private channels
- **RBAC Requirement**: None for public rooms; Operator for emergency dispatch
- **Realtime Dependency**: Core WebSocket Channel
- **AI Dependency**: Telemetry feed consumed by AI predictive models
- **Map Dependency**: Triggers real-time marker animation on Leaflet map
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-RT-011 — emergency:resolved
- **Module**: Realtime Telemetry
- **Feature**: Broadcasts resolution of emergency incident
- **Function Name**: `socket.on('emergency:resolved')` / `io.emit('emergency:resolved')`
- **File**: `backend/sockets/index.js` & `frontend/realtime.js`
- **Type**: Realtime / WebSocket
- **Input**: Room payload or broadcast telemetry packet
- **Expected Output**: Real-time WebSocket packet transmission & UI DOM update
- **Dependencies**: Socket.IO server & client connection
- **API Endpoint**: `ws://localhost:5000/socket.io/`
- **Database Tables**: Telemetry logs (`audit_logs`, `ambulances`, `parking_slots`)
- **Authentication Requirement**: Optional for broadcast rooms, JWT for private channels
- **RBAC Requirement**: None for public rooms; Operator for emergency dispatch
- **Realtime Dependency**: Core WebSocket Channel
- **AI Dependency**: Telemetry feed consumed by AI predictive models
- **Map Dependency**: Triggers real-time marker animation on Leaflet map
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-RT-012 — water:tank-updated
- **Module**: Realtime Telemetry
- **Feature**: Broadcasts tank water level changes and supply schedule alerts
- **Function Name**: `socket.on('water:tank-updated')` / `io.emit('water:tank-updated')`
- **File**: `backend/sockets/index.js` & `frontend/realtime.js`
- **Type**: Realtime / WebSocket
- **Input**: Room payload or broadcast telemetry packet
- **Expected Output**: Real-time WebSocket packet transmission & UI DOM update
- **Dependencies**: Socket.IO server & client connection
- **API Endpoint**: `ws://localhost:5000/socket.io/`
- **Database Tables**: Telemetry logs (`audit_logs`, `ambulances`, `parking_slots`)
- **Authentication Requirement**: Optional for broadcast rooms, JWT for private channels
- **RBAC Requirement**: None for public rooms; Operator for emergency dispatch
- **Realtime Dependency**: Core WebSocket Channel
- **AI Dependency**: Telemetry feed consumed by AI predictive models
- **Map Dependency**: Triggers real-time marker animation on Leaflet map
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-RT-013 — city:status-updated
- **Module**: Realtime Telemetry
- **Feature**: Broadcasts city environmental conditions, AQI, and major traffic updates
- **Function Name**: `socket.on('city:status-updated')` / `io.emit('city:status-updated')`
- **File**: `backend/sockets/index.js` & `frontend/realtime.js`
- **Type**: Realtime / WebSocket
- **Input**: Room payload or broadcast telemetry packet
- **Expected Output**: Real-time WebSocket packet transmission & UI DOM update
- **Dependencies**: Socket.IO server & client connection
- **API Endpoint**: `ws://localhost:5000/socket.io/`
- **Database Tables**: Telemetry logs (`audit_logs`, `ambulances`, `parking_slots`)
- **Authentication Requirement**: Optional for broadcast rooms, JWT for private channels
- **RBAC Requirement**: None for public rooms; Operator for emergency dispatch
- **Realtime Dependency**: Core WebSocket Channel
- **AI Dependency**: Telemetry feed consumed by AI predictive models
- **Map Dependency**: Triggers real-time marker animation on Leaflet map
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-RT-014 — traffic:signal-updated
- **Module**: Realtime Telemetry
- **Feature**: Pushes traffic signal timing optimizations and green-wave triggers
- **Function Name**: `socket.on('traffic:signal-updated')` / `io.emit('traffic:signal-updated')`
- **File**: `backend/sockets/index.js` & `frontend/realtime.js`
- **Type**: Realtime / WebSocket
- **Input**: Room payload or broadcast telemetry packet
- **Expected Output**: Real-time WebSocket packet transmission & UI DOM update
- **Dependencies**: Socket.IO server & client connection
- **API Endpoint**: `ws://localhost:5000/socket.io/`
- **Database Tables**: Telemetry logs (`audit_logs`, `ambulances`, `parking_slots`)
- **Authentication Requirement**: Optional for broadcast rooms, JWT for private channels
- **RBAC Requirement**: None for public rooms; Operator for emergency dispatch
- **Realtime Dependency**: Core WebSocket Channel
- **AI Dependency**: Telemetry feed consumed by AI predictive models
- **Map Dependency**: Triggers real-time marker animation on Leaflet map
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-RT-015 — request:status_updated
- **Module**: Realtime Telemetry
- **Feature**: Broadcasts civic grievance status updates to citizen
- **Function Name**: `socket.on('request:status_updated')` / `io.emit('request:status_updated')`
- **File**: `backend/sockets/index.js` & `frontend/realtime.js`
- **Type**: Realtime / WebSocket
- **Input**: Room payload or broadcast telemetry packet
- **Expected Output**: Real-time WebSocket packet transmission & UI DOM update
- **Dependencies**: Socket.IO server & client connection
- **API Endpoint**: `ws://localhost:5000/socket.io/`
- **Database Tables**: Telemetry logs (`audit_logs`, `ambulances`, `parking_slots`)
- **Authentication Requirement**: Optional for broadcast rooms, JWT for private channels
- **RBAC Requirement**: None for public rooms; Operator for emergency dispatch
- **Realtime Dependency**: Core WebSocket Channel
- **AI Dependency**: Telemetry feed consumed by AI predictive models
- **Map Dependency**: Triggers real-time marker animation on Leaflet map
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-RT-016 — request:escalated
- **Module**: Realtime Telemetry
- **Feature**: Broadcasts automatic SLA breach escalation alerts
- **Function Name**: `socket.on('request:escalated')` / `io.emit('request:escalated')`
- **File**: `backend/sockets/index.js` & `frontend/realtime.js`
- **Type**: Realtime / WebSocket
- **Input**: Room payload or broadcast telemetry packet
- **Expected Output**: Real-time WebSocket packet transmission & UI DOM update
- **Dependencies**: Socket.IO server & client connection
- **API Endpoint**: `ws://localhost:5000/socket.io/`
- **Database Tables**: Telemetry logs (`audit_logs`, `ambulances`, `parking_slots`)
- **Authentication Requirement**: Optional for broadcast rooms, JWT for private channels
- **RBAC Requirement**: None for public rooms; Operator for emergency dispatch
- **Realtime Dependency**: Core WebSocket Channel
- **AI Dependency**: Telemetry feed consumed by AI predictive models
- **Map Dependency**: Triggers real-time marker animation on Leaflet map
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

## 5. Map Engine Function Inventory (Leaflet / OpenLayers)

### F-MAP-001 — SmartCityMap.constructor()
- **Module**: Map & GIS Engine
- **Feature**: Initializes Leaflet map on DOM container centered at Gorakhpur [26.7606, 83.3732]
- **Function Name**: `SmartCityMap.constructor()`
- **File**: `frontend/components/smartcity_map.js`
- **Type**: Map / GIS
- **Input**: Container ID, coordinates [lat, lng], options
- **Expected Output**: Interactive map rendering, marker placement, or polyline display
- **Dependencies**: Leaflet.js / OpenLayers library, OpenStreetMap tile servers
- **API Endpoint**: `GET /api/map/points`, `GET /api/map/corridors`
- **Database Tables**: `hospitals`, `police_stations`, `parking_lots`, `waste_bins`, `traffic_junctions`
- **Authentication Requirement**: Public
- **RBAC Requirement**: None
- **Realtime Dependency**: Reacts to socket telemetry
- **AI Dependency**: Displays AI-optimized routing corridors
- **Map Dependency**: Core Map Engine Component
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-MAP-002 — SmartCityMap.initMap()
- **Module**: Map & GIS Engine
- **Feature**: Configures OSM tile layer with fallback, zoom controls, and 12 standard category layer groups
- **Function Name**: `SmartCityMap.initMap()`
- **File**: `frontend/components/smartcity_map.js`
- **Type**: Map / GIS
- **Input**: Container ID, coordinates [lat, lng], options
- **Expected Output**: Interactive map rendering, marker placement, or polyline display
- **Dependencies**: Leaflet.js / OpenLayers library, OpenStreetMap tile servers
- **API Endpoint**: `GET /api/map/points`, `GET /api/map/corridors`
- **Database Tables**: `hospitals`, `police_stations`, `parking_lots`, `waste_bins`, `traffic_junctions`
- **Authentication Requirement**: Public
- **RBAC Requirement**: None
- **Realtime Dependency**: Reacts to socket telemetry
- **AI Dependency**: Displays AI-optimized routing corridors
- **Map Dependency**: Core Map Engine Component
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-MAP-003 — SmartCityMap.addMarker()
- **Module**: Map & GIS Engine
- **Feature**: Places custom category-styled SVG pin with interactive popup and action buttons
- **Function Name**: `SmartCityMap.addMarker()`
- **File**: `frontend/components/smartcity_map.js`
- **Type**: Map / GIS
- **Input**: Container ID, coordinates [lat, lng], options
- **Expected Output**: Interactive map rendering, marker placement, or polyline display
- **Dependencies**: Leaflet.js / OpenLayers library, OpenStreetMap tile servers
- **API Endpoint**: `GET /api/map/points`, `GET /api/map/corridors`
- **Database Tables**: `hospitals`, `police_stations`, `parking_lots`, `waste_bins`, `traffic_junctions`
- **Authentication Requirement**: Public
- **RBAC Requirement**: None
- **Realtime Dependency**: Reacts to socket telemetry
- **AI Dependency**: Displays AI-optimized routing corridors
- **Map Dependency**: Core Map Engine Component
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-MAP-004 — SmartCityMap.updateMarker()
- **Module**: Map & GIS Engine
- **Feature**: Smoothly animates marker position for moving ambulances or vehicles
- **Function Name**: `SmartCityMap.updateMarker()`
- **File**: `frontend/components/smartcity_map.js`
- **Type**: Map / GIS
- **Input**: Container ID, coordinates [lat, lng], options
- **Expected Output**: Interactive map rendering, marker placement, or polyline display
- **Dependencies**: Leaflet.js / OpenLayers library, OpenStreetMap tile servers
- **API Endpoint**: `GET /api/map/points`, `GET /api/map/corridors`
- **Database Tables**: `hospitals`, `police_stations`, `parking_lots`, `waste_bins`, `traffic_junctions`
- **Authentication Requirement**: Public
- **RBAC Requirement**: None
- **Realtime Dependency**: Reacts to socket telemetry
- **AI Dependency**: Displays AI-optimized routing corridors
- **Map Dependency**: Core Map Engine Component
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-MAP-005 — SmartCityMap.removeMarker()
- **Module**: Map & GIS Engine
- **Feature**: Removes specific marker by ID from layer group
- **Function Name**: `SmartCityMap.removeMarker()`
- **File**: `frontend/components/smartcity_map.js`
- **Type**: Map / GIS
- **Input**: Container ID, coordinates [lat, lng], options
- **Expected Output**: Interactive map rendering, marker placement, or polyline display
- **Dependencies**: Leaflet.js / OpenLayers library, OpenStreetMap tile servers
- **API Endpoint**: `GET /api/map/points`, `GET /api/map/corridors`
- **Database Tables**: `hospitals`, `police_stations`, `parking_lots`, `waste_bins`, `traffic_junctions`
- **Authentication Requirement**: Public
- **RBAC Requirement**: None
- **Realtime Dependency**: Reacts to socket telemetry
- **AI Dependency**: Displays AI-optimized routing corridors
- **Map Dependency**: Core Map Engine Component
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-MAP-006 — SmartCityMap.clearLayer()
- **Module**: Map & GIS Engine
- **Feature**: Clears all markers from a specific category layer
- **Function Name**: `SmartCityMap.clearLayer()`
- **File**: `frontend/components/smartcity_map.js`
- **Type**: Map / GIS
- **Input**: Container ID, coordinates [lat, lng], options
- **Expected Output**: Interactive map rendering, marker placement, or polyline display
- **Dependencies**: Leaflet.js / OpenLayers library, OpenStreetMap tile servers
- **API Endpoint**: `GET /api/map/points`, `GET /api/map/corridors`
- **Database Tables**: `hospitals`, `police_stations`, `parking_lots`, `waste_bins`, `traffic_junctions`
- **Authentication Requirement**: Public
- **RBAC Requirement**: None
- **Realtime Dependency**: Reacts to socket telemetry
- **AI Dependency**: Displays AI-optimized routing corridors
- **Map Dependency**: Core Map Engine Component
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-MAP-007 — SmartCityMap.toggleLayer()
- **Module**: Map & GIS Engine
- **Feature**: Shows/hides specific layer group based on user category filter toggle
- **Function Name**: `SmartCityMap.toggleLayer()`
- **File**: `frontend/components/smartcity_map.js`
- **Type**: Map / GIS
- **Input**: Container ID, coordinates [lat, lng], options
- **Expected Output**: Interactive map rendering, marker placement, or polyline display
- **Dependencies**: Leaflet.js / OpenLayers library, OpenStreetMap tile servers
- **API Endpoint**: `GET /api/map/points`, `GET /api/map/corridors`
- **Database Tables**: `hospitals`, `police_stations`, `parking_lots`, `waste_bins`, `traffic_junctions`
- **Authentication Requirement**: Public
- **RBAC Requirement**: None
- **Realtime Dependency**: Reacts to socket telemetry
- **AI Dependency**: Displays AI-optimized routing corridors
- **Map Dependency**: Core Map Engine Component
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-MAP-008 — SmartCityMap.locateUser()
- **Module**: Map & GIS Engine
- **Feature**: Requests browser HTML5 geolocation and drops blue radar user marker
- **Function Name**: `SmartCityMap.locateUser()`
- **File**: `frontend/components/smartcity_map.js`
- **Type**: Map / GIS
- **Input**: Container ID, coordinates [lat, lng], options
- **Expected Output**: Interactive map rendering, marker placement, or polyline display
- **Dependencies**: Leaflet.js / OpenLayers library, OpenStreetMap tile servers
- **API Endpoint**: `GET /api/map/points`, `GET /api/map/corridors`
- **Database Tables**: `hospitals`, `police_stations`, `parking_lots`, `waste_bins`, `traffic_junctions`
- **Authentication Requirement**: Public
- **RBAC Requirement**: None
- **Realtime Dependency**: Reacts to socket telemetry
- **AI Dependency**: Displays AI-optimized routing corridors
- **Map Dependency**: Core Map Engine Component
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-MAP-009 — SmartCityMap.renderRoute()
- **Module**: Map & GIS Engine
- **Feature**: Draws color-coded polyline corridor between origin and destination with traffic congestion styles
- **Function Name**: `SmartCityMap.renderRoute()`
- **File**: `frontend/components/smartcity_map.js`
- **Type**: Map / GIS
- **Input**: Container ID, coordinates [lat, lng], options
- **Expected Output**: Interactive map rendering, marker placement, or polyline display
- **Dependencies**: Leaflet.js / OpenLayers library, OpenStreetMap tile servers
- **API Endpoint**: `GET /api/map/points`, `GET /api/map/corridors`
- **Database Tables**: `hospitals`, `police_stations`, `parking_lots`, `waste_bins`, `traffic_junctions`
- **Authentication Requirement**: Public
- **RBAC Requirement**: None
- **Realtime Dependency**: Reacts to socket telemetry
- **AI Dependency**: Displays AI-optimized routing corridors
- **Map Dependency**: Core Map Engine Component
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-MAP-010 — SmartCityMap.loadPOICategory()
- **Module**: Map & GIS Engine
- **Feature**: Fetches backend POIs from /api/map/poi/:category and populates layer
- **Function Name**: `SmartCityMap.loadPOICategory()`
- **File**: `frontend/components/smartcity_map.js`
- **Type**: Map / GIS
- **Input**: Container ID, coordinates [lat, lng], options
- **Expected Output**: Interactive map rendering, marker placement, or polyline display
- **Dependencies**: Leaflet.js / OpenLayers library, OpenStreetMap tile servers
- **API Endpoint**: `GET /api/map/points`, `GET /api/map/corridors`
- **Database Tables**: `hospitals`, `police_stations`, `parking_lots`, `waste_bins`, `traffic_junctions`
- **Authentication Requirement**: Public
- **RBAC Requirement**: None
- **Realtime Dependency**: Reacts to socket telemetry
- **AI Dependency**: Displays AI-optimized routing corridors
- **Map Dependency**: Core Map Engine Component
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-MAP-011 — OpenLayersTrafficMap.init()
- **Module**: Map & GIS Engine
- **Feature**: Advanced OpenLayers vector layer for traffic density heatmap and junction overlays
- **Function Name**: `OpenLayersTrafficMap.init()`
- **File**: `frontend/pages/traffic/openlayers_map.js`
- **Type**: Map / GIS
- **Input**: Container ID, coordinates [lat, lng], options
- **Expected Output**: Interactive map rendering, marker placement, or polyline display
- **Dependencies**: Leaflet.js / OpenLayers library, OpenStreetMap tile servers
- **API Endpoint**: `GET /api/map/points`, `GET /api/map/corridors`
- **Database Tables**: `hospitals`, `police_stations`, `parking_lots`, `waste_bins`, `traffic_junctions`
- **Authentication Requirement**: Public
- **RBAC Requirement**: None
- **Realtime Dependency**: Reacts to socket telemetry
- **AI Dependency**: Displays AI-optimized routing corridors
- **Map Dependency**: Core Map Engine Component
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

## 6. Backend API Route & Controller Inventory (426 Endpoints)

### Module: CITY (4 Endpoints)

#### F-API-0001 — GET /
- **Module**: CITY
- **Feature**: CITY API Handler
- **Function Name**: Route Handler (`GET /`)
- **File**: `backend/routes/city.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /`
- **Database Tables**: Dependent on module (city)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0002 — GET /api
- **Module**: CITY
- **Feature**: CITY API Handler
- **Function Name**: Route Handler (`GET /api`)
- **File**: `backend/routes/city.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api`
- **Database Tables**: Dependent on module (city)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0003 — GET /api/status
- **Module**: CITY
- **Feature**: CITY API Handler
- **Function Name**: Route Handler (`GET /api/status`)
- **File**: `backend/routes/city.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/status`
- **Database Tables**: Dependent on module (city)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0004 — GET /api/city-status
- **Module**: CITY
- **Feature**: CITY API Handler
- **Function Name**: Route Handler (`GET /api/city-status`)
- **File**: `backend/routes/city.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/city-status`
- **Database Tables**: Dependent on module (city)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### Module: AUTH (11 Endpoints)

#### F-API-0005 — POST /api/register
- **Module**: AUTH
- **Feature**: AUTH API Handler
- **Function Name**: Route Handler (`POST /api/register`)
- **File**: `backend/routes/auth.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/register`
- **Database Tables**: Dependent on module (auth)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0006 — POST /api/login
- **Module**: AUTH
- **Feature**: AUTH API Handler
- **Function Name**: Route Handler (`POST /api/login`)
- **File**: `backend/routes/auth.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/login`
- **Database Tables**: Dependent on module (auth)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0007 — POST /api/staff-login
- **Module**: AUTH
- **Feature**: AUTH API Handler
- **Function Name**: Route Handler (`POST /api/staff-login`)
- **File**: `backend/routes/auth.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/staff-login`
- **Database Tables**: Dependent on module (auth)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0008 — GET /api/auth/me
- **Module**: AUTH
- **Feature**: AUTH API Handler
- **Function Name**: Route Handler (`GET /api/auth/me`)
- **File**: `backend/routes/auth.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/auth/me`
- **Database Tables**: Dependent on module (auth)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0009 — GET /api/user/profile
- **Module**: AUTH
- **Feature**: AUTH API Handler
- **Function Name**: Route Handler (`GET /api/user/profile`)
- **File**: `backend/routes/auth.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/user/profile`
- **Database Tables**: Dependent on module (auth)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0010 — PUT /api/auth/profile
- **Module**: AUTH
- **Feature**: AUTH API Handler
- **Function Name**: Route Handler (`PUT /api/auth/profile`)
- **File**: `backend/routes/auth.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/auth/profile`
- **Database Tables**: Dependent on module (auth)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0011 — POST /api/auth/logout
- **Module**: AUTH
- **Feature**: AUTH API Handler
- **Function Name**: Route Handler (`POST /api/auth/logout`)
- **File**: `backend/routes/auth.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/auth/logout`
- **Database Tables**: Dependent on module (auth)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0012 — POST /api/logout
- **Module**: AUTH
- **Feature**: AUTH API Handler
- **Function Name**: Route Handler (`POST /api/logout`)
- **File**: `backend/routes/auth.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/logout`
- **Database Tables**: Dependent on module (auth)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0013 — GET /api/user/activities
- **Module**: AUTH
- **Feature**: AUTH API Handler
- **Function Name**: Route Handler (`GET /api/user/activities`)
- **File**: `backend/routes/auth.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/user/activities`
- **Database Tables**: Dependent on module (auth)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0014 — GET /api/activities
- **Module**: AUTH
- **Feature**: AUTH API Handler
- **Function Name**: Route Handler (`GET /api/activities`)
- **File**: `backend/routes/auth.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/activities`
- **Database Tables**: Dependent on module (auth)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0015 — POST /api/auth/demo-login
- **Module**: AUTH
- **Feature**: AUTH API Handler
- **Function Name**: Route Handler (`POST /api/auth/demo-login`)
- **File**: `backend/routes/auth.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/auth/demo-login`
- **Database Tables**: Dependent on module (auth)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### Module: PATIENT (16 Endpoints)

#### F-API-0016 — POST /api/patients
- **Module**: PATIENT
- **Feature**: PATIENT API Handler
- **Function Name**: Route Handler (`POST /api/patients`)
- **File**: `backend/routes/patient.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/patients`
- **Database Tables**: Dependent on module (patient)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0017 — GET /api/patients
- **Module**: PATIENT
- **Feature**: PATIENT API Handler
- **Function Name**: Route Handler (`GET /api/patients`)
- **File**: `backend/routes/patient.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/patients`
- **Database Tables**: Dependent on module (patient)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0018 — GET /api/patients/:patientId
- **Module**: PATIENT
- **Feature**: PATIENT API Handler
- **Function Name**: Route Handler (`GET /api/patients/:patientId`)
- **File**: `backend/routes/patient.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/patients/:patientId`
- **Database Tables**: Dependent on module (patient)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0019 — PUT /api/patients/:patientId
- **Module**: PATIENT
- **Feature**: PATIENT API Handler
- **Function Name**: Route Handler (`PUT /api/patients/:patientId`)
- **File**: `backend/routes/patient.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/patients/:patientId`
- **Database Tables**: Dependent on module (patient)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0020 — GET /api/patients/:patientId/qr
- **Module**: PATIENT
- **Feature**: PATIENT API Handler
- **Function Name**: Route Handler (`GET /api/patients/:patientId/qr`)
- **File**: `backend/routes/patient.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/patients/:patientId/qr`
- **Database Tables**: Dependent on module (patient)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0021 — POST /api/patients/verify-qr
- **Module**: PATIENT
- **Feature**: PATIENT API Handler
- **Function Name**: Route Handler (`POST /api/patients/verify-qr`)
- **File**: `backend/routes/patient.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/patients/verify-qr`
- **Database Tables**: Dependent on module (patient)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0022 — POST /api/patients/:patientId/link-abha
- **Module**: PATIENT
- **Feature**: PATIENT API Handler
- **Function Name**: Route Handler (`POST /api/patients/:patientId/link-abha`)
- **File**: `backend/routes/patient.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/patients/:patientId/link-abha`
- **Database Tables**: Dependent on module (patient)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0023 — POST /api/patients/:patientId/unlink-abha
- **Module**: PATIENT
- **Feature**: PATIENT API Handler
- **Function Name**: Route Handler (`POST /api/patients/:patientId/unlink-abha`)
- **File**: `backend/routes/patient.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/patients/:patientId/unlink-abha`
- **Database Tables**: Dependent on module (patient)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0024 — PATCH /api/patients/:patientId/status
- **Module**: PATIENT
- **Feature**: PATIENT API Handler
- **Function Name**: Route Handler (`PATCH /api/patients/:patientId/status`)
- **File**: `backend/routes/patient.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PATCH /api/patients/:patientId/status`
- **Database Tables**: Dependent on module (patient)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0025 — GET /api/patients/:patientId/appointments
- **Module**: PATIENT
- **Feature**: PATIENT API Handler
- **Function Name**: Route Handler (`GET /api/patients/:patientId/appointments`)
- **File**: `backend/routes/patient.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/patients/:patientId/appointments`
- **Database Tables**: Dependent on module (patient)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0026 — GET /api/patients/:patientId/prescriptions
- **Module**: PATIENT
- **Feature**: PATIENT API Handler
- **Function Name**: Route Handler (`GET /api/patients/:patientId/prescriptions`)
- **File**: `backend/routes/patient.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/patients/:patientId/prescriptions`
- **Database Tables**: Dependent on module (patient)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0027 — GET /api/patients/:patientId/records
- **Module**: PATIENT
- **Feature**: PATIENT API Handler
- **Function Name**: Route Handler (`GET /api/patients/:patientId/records`)
- **File**: `backend/routes/patient.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/patients/:patientId/records`
- **Database Tables**: Dependent on module (patient)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0028 — POST /api/patients/:patientId/records
- **Module**: PATIENT
- **Feature**: PATIENT API Handler
- **Function Name**: Route Handler (`POST /api/patients/:patientId/records`)
- **File**: `backend/routes/patient.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/patients/:patientId/records`
- **Database Tables**: Dependent on module (patient)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0029 — GET /api/patients/:patientId/reports
- **Module**: PATIENT
- **Feature**: PATIENT API Handler
- **Function Name**: Route Handler (`GET /api/patients/:patientId/reports`)
- **File**: `backend/routes/patient.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/patients/:patientId/reports`
- **Database Tables**: Dependent on module (patient)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0030 — POST /api/patients/:patientId/reports
- **Module**: PATIENT
- **Feature**: PATIENT API Handler
- **Function Name**: Route Handler (`POST /api/patients/:patientId/reports`)
- **File**: `backend/routes/patient.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/patients/:patientId/reports`
- **Database Tables**: Dependent on module (patient)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0031 — GET /api/patients/search/:patientId
- **Module**: PATIENT
- **Feature**: PATIENT API Handler
- **Function Name**: Route Handler (`GET /api/patients/search/:patientId`)
- **File**: `backend/routes/patient.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/patients/search/:patientId`
- **Database Tables**: Dependent on module (patient)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### Module: APPOINTMENT (7 Endpoints)

#### F-API-0032 — GET /api/appointments/availability
- **Module**: APPOINTMENT
- **Feature**: APPOINTMENT API Handler
- **Function Name**: Route Handler (`GET /api/appointments/availability`)
- **File**: `backend/routes/appointment.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/appointments/availability`
- **Database Tables**: Dependent on module (appointment)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0033 — POST /api/appointments/book-strict
- **Module**: APPOINTMENT
- **Feature**: APPOINTMENT API Handler
- **Function Name**: Route Handler (`POST /api/appointments/book-strict`)
- **File**: `backend/routes/appointment.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/appointments/book-strict`
- **Database Tables**: Dependent on module (appointment)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0034 — POST /api/appointments
- **Module**: APPOINTMENT
- **Feature**: APPOINTMENT API Handler
- **Function Name**: Route Handler (`POST /api/appointments`)
- **File**: `backend/routes/appointment.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/appointments`
- **Database Tables**: Dependent on module (appointment)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0035 — PUT /api/appointments/:id/cancel
- **Module**: APPOINTMENT
- **Feature**: APPOINTMENT API Handler
- **Function Name**: Route Handler (`PUT /api/appointments/:id/cancel`)
- **File**: `backend/routes/appointment.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/appointments/:id/cancel`
- **Database Tables**: Dependent on module (appointment)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0036 — GET /api/appointments
- **Module**: APPOINTMENT
- **Feature**: APPOINTMENT API Handler
- **Function Name**: Route Handler (`GET /api/appointments`)
- **File**: `backend/routes/appointment.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/appointments`
- **Database Tables**: Dependent on module (appointment)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0037 — GET /api/appointments/my-appointments
- **Module**: APPOINTMENT
- **Feature**: APPOINTMENT API Handler
- **Function Name**: Route Handler (`GET /api/appointments/my-appointments`)
- **File**: `backend/routes/appointment.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/appointments/my-appointments`
- **Database Tables**: Dependent on module (appointment)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0038 — GET /api/appointments/:patientId
- **Module**: APPOINTMENT
- **Feature**: APPOINTMENT API Handler
- **Function Name**: Route Handler (`GET /api/appointments/:patientId`)
- **File**: `backend/routes/appointment.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/appointments/:patientId`
- **Database Tables**: Dependent on module (appointment)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### Module: DOCTOR (14 Endpoints)

#### F-API-0039 — POST /api/doctor/login
- **Module**: DOCTOR
- **Feature**: DOCTOR API Handler
- **Function Name**: Route Handler (`POST /api/doctor/login`)
- **File**: `backend/routes/doctor.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/doctor/login`
- **Database Tables**: Dependent on module (doctor)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0040 — GET /api/doctors
- **Module**: DOCTOR
- **Feature**: DOCTOR API Handler
- **Function Name**: Route Handler (`GET /api/doctors`)
- **File**: `backend/routes/doctor.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/doctors`
- **Database Tables**: Dependent on module (doctor)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0041 — POST /api/doctors
- **Module**: DOCTOR
- **Feature**: DOCTOR API Handler
- **Function Name**: Route Handler (`POST /api/doctors`)
- **File**: `backend/routes/doctor.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/doctors`
- **Database Tables**: Dependent on module (doctor)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0042 — PUT /api/doctors/:id
- **Module**: DOCTOR
- **Feature**: DOCTOR API Handler
- **Function Name**: Route Handler (`PUT /api/doctors/:id`)
- **File**: `backend/routes/doctor.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/doctors/:id`
- **Database Tables**: Dependent on module (doctor)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0043 — DELETE /api/doctors/:id
- **Module**: DOCTOR
- **Feature**: DOCTOR API Handler
- **Function Name**: Route Handler (`DELETE /api/doctors/:id`)
- **File**: `backend/routes/doctor.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `DELETE /api/doctors/:id`
- **Database Tables**: Dependent on module (doctor)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0044 — GET /api/doctor-slots
- **Module**: DOCTOR
- **Feature**: DOCTOR API Handler
- **Function Name**: Route Handler (`GET /api/doctor-slots`)
- **File**: `backend/routes/doctor.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/doctor-slots`
- **Database Tables**: Dependent on module (doctor)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0045 — GET /api/doctors/:doctorId/slots
- **Module**: DOCTOR
- **Feature**: DOCTOR API Handler
- **Function Name**: Route Handler (`GET /api/doctors/:doctorId/slots`)
- **File**: `backend/routes/doctor.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/doctors/:doctorId/slots`
- **Database Tables**: Dependent on module (doctor)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0046 — POST /api/doctor-slots
- **Module**: DOCTOR
- **Feature**: DOCTOR API Handler
- **Function Name**: Route Handler (`POST /api/doctor-slots`)
- **File**: `backend/routes/doctor.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/doctor-slots`
- **Database Tables**: Dependent on module (doctor)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0047 — DELETE /api/doctor-slots/:id
- **Module**: DOCTOR
- **Feature**: DOCTOR API Handler
- **Function Name**: Route Handler (`DELETE /api/doctor-slots/:id`)
- **File**: `backend/routes/doctor.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `DELETE /api/doctor-slots/:id`
- **Database Tables**: Dependent on module (doctor)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0048 — GET /api/doctor/:doctorId/appointments
- **Module**: DOCTOR
- **Feature**: DOCTOR API Handler
- **Function Name**: Route Handler (`GET /api/doctor/:doctorId/appointments`)
- **File**: `backend/routes/doctor.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/doctor/:doctorId/appointments`
- **Database Tables**: Dependent on module (doctor)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0049 — GET /api/doctor/patient-history/:patientId
- **Module**: DOCTOR
- **Feature**: DOCTOR API Handler
- **Function Name**: Route Handler (`GET /api/doctor/patient-history/:patientId`)
- **File**: `backend/routes/doctor.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/doctor/patient-history/:patientId`
- **Database Tables**: Dependent on module (doctor)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0050 — POST /api/doctor/consultation
- **Module**: DOCTOR
- **Feature**: DOCTOR API Handler
- **Function Name**: Route Handler (`POST /api/doctor/consultation`)
- **File**: `backend/routes/doctor.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/doctor/consultation`
- **Database Tables**: Dependent on module (doctor)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0051 — PUT /api/appointments/:id/status
- **Module**: DOCTOR
- **Feature**: DOCTOR API Handler
- **Function Name**: Route Handler (`PUT /api/appointments/:id/status`)
- **File**: `backend/routes/doctor.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/appointments/:id/status`
- **Database Tables**: Dependent on module (doctor)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0052 — POST /api/doctor/order-tests
- **Module**: DOCTOR
- **Feature**: DOCTOR API Handler
- **Function Name**: Route Handler (`POST /api/doctor/order-tests`)
- **File**: `backend/routes/doctor.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/doctor/order-tests`
- **Database Tables**: Dependent on module (doctor)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### Module: HOSPITAL (24 Endpoints)

#### F-API-0053 — GET /api/hospital/beds
- **Module**: HOSPITAL
- **Feature**: HOSPITAL API Handler
- **Function Name**: Route Handler (`GET /api/hospital/beds`)
- **File**: `backend/routes/hospital.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/hospital/beds`
- **Database Tables**: Dependent on module (hospital)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0054 — GET /api/hospital/bed-categories
- **Module**: HOSPITAL
- **Feature**: HOSPITAL API Handler
- **Function Name**: Route Handler (`GET /api/hospital/bed-categories`)
- **File**: `backend/routes/hospital.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/hospital/bed-categories`
- **Database Tables**: Dependent on module (hospital)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0055 — GET /api/hospital/bed_categories
- **Module**: HOSPITAL
- **Feature**: HOSPITAL API Handler
- **Function Name**: Route Handler (`GET /api/hospital/bed_categories`)
- **File**: `backend/routes/hospital.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/hospital/bed_categories`
- **Database Tables**: Dependent on module (hospital)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0056 — PUT /api/hospital/beds/:id
- **Module**: HOSPITAL
- **Feature**: HOSPITAL API Handler
- **Function Name**: Route Handler (`PUT /api/hospital/beds/:id`)
- **File**: `backend/routes/hospital.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/hospital/beds/:id`
- **Database Tables**: Dependent on module (hospital)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0057 — GET /api/hospitals
- **Module**: HOSPITAL
- **Feature**: HOSPITAL API Handler
- **Function Name**: Route Handler (`GET /api/hospitals`)
- **File**: `backend/routes/hospital.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/hospitals`
- **Database Tables**: Dependent on module (hospital)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0058 — GET /api/hospitals/nearby/search
- **Module**: HOSPITAL
- **Feature**: HOSPITAL API Handler
- **Function Name**: Route Handler (`GET /api/hospitals/nearby/search`)
- **File**: `backend/routes/hospital.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/hospitals/nearby/search`
- **Database Tables**: Dependent on module (hospital)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0059 — GET /api/hospitals/:hospitalId
- **Module**: HOSPITAL
- **Feature**: HOSPITAL API Handler
- **Function Name**: Route Handler (`GET /api/hospitals/:hospitalId`)
- **File**: `backend/routes/hospital.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/hospitals/:hospitalId`
- **Database Tables**: Dependent on module (hospital)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0060 — GET /api/hospitals/:hospitalId/beds
- **Module**: HOSPITAL
- **Feature**: HOSPITAL API Handler
- **Function Name**: Route Handler (`GET /api/hospitals/:hospitalId/beds`)
- **File**: `backend/routes/hospital.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/hospitals/:hospitalId/beds`
- **Database Tables**: Dependent on module (hospital)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0061 — GET /api/hospitals/:hospitalId/treatments
- **Module**: HOSPITAL
- **Feature**: HOSPITAL API Handler
- **Function Name**: Route Handler (`GET /api/hospitals/:hospitalId/treatments`)
- **File**: `backend/routes/hospital.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/hospitals/:hospitalId/treatments`
- **Database Tables**: Dependent on module (hospital)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0062 — GET /api/hospitals/:hospitalId/doctors
- **Module**: HOSPITAL
- **Feature**: HOSPITAL API Handler
- **Function Name**: Route Handler (`GET /api/hospitals/:hospitalId/doctors`)
- **File**: `backend/routes/hospital.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/hospitals/:hospitalId/doctors`
- **Database Tables**: Dependent on module (hospital)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0063 — POST /api/hospitals
- **Module**: HOSPITAL
- **Feature**: HOSPITAL API Handler
- **Function Name**: Route Handler (`POST /api/hospitals`)
- **File**: `backend/routes/hospital.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/hospitals`
- **Database Tables**: Dependent on module (hospital)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0064 — PUT /api/hospitals/:id
- **Module**: HOSPITAL
- **Feature**: HOSPITAL API Handler
- **Function Name**: Route Handler (`PUT /api/hospitals/:id`)
- **File**: `backend/routes/hospital.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/hospitals/:id`
- **Database Tables**: Dependent on module (hospital)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0065 — GET /api/hospitals/:hospitalId/dashboard
- **Module**: HOSPITAL
- **Feature**: HOSPITAL API Handler
- **Function Name**: Route Handler (`GET /api/hospitals/:hospitalId/dashboard`)
- **File**: `backend/routes/hospital.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/hospitals/:hospitalId/dashboard`
- **Database Tables**: Dependent on module (hospital)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0066 — GET /api/hospitals/:hospitalId/appointments
- **Module**: HOSPITAL
- **Feature**: HOSPITAL API Handler
- **Function Name**: Route Handler (`GET /api/hospitals/:hospitalId/appointments`)
- **File**: `backend/routes/hospital.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/hospitals/:hospitalId/appointments`
- **Database Tables**: Dependent on module (hospital)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0067 — POST /api/hospitals/:hospitalId/appointments
- **Module**: HOSPITAL
- **Feature**: HOSPITAL API Handler
- **Function Name**: Route Handler (`POST /api/hospitals/:hospitalId/appointments`)
- **File**: `backend/routes/hospital.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/hospitals/:hospitalId/appointments`
- **Database Tables**: Dependent on module (hospital)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0068 — PUT /api/hospitals/:hospitalId/appointments/:id/status
- **Module**: HOSPITAL
- **Feature**: HOSPITAL API Handler
- **Function Name**: Route Handler (`PUT /api/hospitals/:hospitalId/appointments/:id/status`)
- **File**: `backend/routes/hospital.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/hospitals/:hospitalId/appointments/:id/status`
- **Database Tables**: Dependent on module (hospital)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0069 — GET /api/hospitals/:hospitalId/wards
- **Module**: HOSPITAL
- **Feature**: HOSPITAL API Handler
- **Function Name**: Route Handler (`GET /api/hospitals/:hospitalId/wards`)
- **File**: `backend/routes/hospital.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/hospitals/:hospitalId/wards`
- **Database Tables**: Dependent on module (hospital)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0070 — GET /api/hospitals/:hospitalId/ward-beds
- **Module**: HOSPITAL
- **Feature**: HOSPITAL API Handler
- **Function Name**: Route Handler (`GET /api/hospitals/:hospitalId/ward-beds`)
- **File**: `backend/routes/hospital.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/hospitals/:hospitalId/ward-beds`
- **Database Tables**: Dependent on module (hospital)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0071 — POST /api/hospitals/:hospitalId/ward-beds/assign
- **Module**: HOSPITAL
- **Feature**: HOSPITAL API Handler
- **Function Name**: Route Handler (`POST /api/hospitals/:hospitalId/ward-beds/assign`)
- **File**: `backend/routes/hospital.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/hospitals/:hospitalId/ward-beds/assign`
- **Database Tables**: Dependent on module (hospital)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0072 — POST /api/hospitals/:hospitalId/ward-beds/release
- **Module**: HOSPITAL
- **Feature**: HOSPITAL API Handler
- **Function Name**: Route Handler (`POST /api/hospitals/:hospitalId/ward-beds/release`)
- **File**: `backend/routes/hospital.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/hospitals/:hospitalId/ward-beds/release`
- **Database Tables**: Dependent on module (hospital)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0073 — GET /api/hospitals/:hospitalId/invoices
- **Module**: HOSPITAL
- **Feature**: HOSPITAL API Handler
- **Function Name**: Route Handler (`GET /api/hospitals/:hospitalId/invoices`)
- **File**: `backend/routes/hospital.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/hospitals/:hospitalId/invoices`
- **Database Tables**: Dependent on module (hospital)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0074 — POST /api/hospitals/:hospitalId/invoices
- **Module**: HOSPITAL
- **Feature**: HOSPITAL API Handler
- **Function Name**: Route Handler (`POST /api/hospitals/:hospitalId/invoices`)
- **File**: `backend/routes/hospital.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/hospitals/:hospitalId/invoices`
- **Database Tables**: Dependent on module (hospital)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0075 — GET /api/hospitals/:hospitalId/staff
- **Module**: HOSPITAL
- **Feature**: HOSPITAL API Handler
- **Function Name**: Route Handler (`GET /api/hospitals/:hospitalId/staff`)
- **File**: `backend/routes/hospital.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/hospitals/:hospitalId/staff`
- **Database Tables**: Dependent on module (hospital)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0076 — GET /api/hospitals/:hospitalId/notifications
- **Module**: HOSPITAL
- **Feature**: HOSPITAL API Handler
- **Function Name**: Route Handler (`GET /api/hospitals/:hospitalId/notifications`)
- **File**: `backend/routes/hospital.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/hospitals/:hospitalId/notifications`
- **Database Tables**: Dependent on module (hospital)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### Module: DIAGNOSTICS (19 Endpoints)

#### F-API-0077 — GET /api/diagnostics/categories
- **Module**: DIAGNOSTICS
- **Feature**: DIAGNOSTICS API Handler
- **Function Name**: Route Handler (`GET /api/diagnostics/categories`)
- **File**: `backend/routes/diagnostics.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/diagnostics/categories`
- **Database Tables**: Dependent on module (diagnostics)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0078 — POST /api/diagnostics/categories
- **Module**: DIAGNOSTICS
- **Feature**: DIAGNOSTICS API Handler
- **Function Name**: Route Handler (`POST /api/diagnostics/categories`)
- **File**: `backend/routes/diagnostics.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/diagnostics/categories`
- **Database Tables**: Dependent on module (diagnostics)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0079 — GET /api/diagnostics/tests
- **Module**: DIAGNOSTICS
- **Feature**: DIAGNOSTICS API Handler
- **Function Name**: Route Handler (`GET /api/diagnostics/tests`)
- **File**: `backend/routes/diagnostics.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/diagnostics/tests`
- **Database Tables**: Dependent on module (diagnostics)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0080 — GET /api/diagnostics/hospitals/:hospitalId/tests
- **Module**: DIAGNOSTICS
- **Feature**: DIAGNOSTICS API Handler
- **Function Name**: Route Handler (`GET /api/diagnostics/hospitals/:hospitalId/tests`)
- **File**: `backend/routes/diagnostics.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/diagnostics/hospitals/:hospitalId/tests`
- **Database Tables**: Dependent on module (diagnostics)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0081 — GET /api/diagnostics/tests/:testId
- **Module**: DIAGNOSTICS
- **Feature**: DIAGNOSTICS API Handler
- **Function Name**: Route Handler (`GET /api/diagnostics/tests/:testId`)
- **File**: `backend/routes/diagnostics.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/diagnostics/tests/:testId`
- **Database Tables**: Dependent on module (diagnostics)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0082 — POST /api/diagnostics/tests
- **Module**: DIAGNOSTICS
- **Feature**: DIAGNOSTICS API Handler
- **Function Name**: Route Handler (`POST /api/diagnostics/tests`)
- **File**: `backend/routes/diagnostics.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/diagnostics/tests`
- **Database Tables**: Dependent on module (diagnostics)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0083 — PUT /api/diagnostics/tests/:testId
- **Module**: DIAGNOSTICS
- **Feature**: DIAGNOSTICS API Handler
- **Function Name**: Route Handler (`PUT /api/diagnostics/tests/:testId`)
- **File**: `backend/routes/diagnostics.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/diagnostics/tests/:testId`
- **Database Tables**: Dependent on module (diagnostics)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0084 — POST /api/diagnostics/bookings
- **Module**: DIAGNOSTICS
- **Feature**: DIAGNOSTICS API Handler
- **Function Name**: Route Handler (`POST /api/diagnostics/bookings`)
- **File**: `backend/routes/diagnostics.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/diagnostics/bookings`
- **Database Tables**: Dependent on module (diagnostics)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0085 — GET /api/diagnostics/bookings
- **Module**: DIAGNOSTICS
- **Feature**: DIAGNOSTICS API Handler
- **Function Name**: Route Handler (`GET /api/diagnostics/bookings`)
- **File**: `backend/routes/diagnostics.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/diagnostics/bookings`
- **Database Tables**: Dependent on module (diagnostics)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0086 — PUT /api/diagnostics/bookings/:bookingId/status
- **Module**: DIAGNOSTICS
- **Feature**: DIAGNOSTICS API Handler
- **Function Name**: Route Handler (`PUT /api/diagnostics/bookings/:bookingId/status`)
- **File**: `backend/routes/diagnostics.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/diagnostics/bookings/:bookingId/status`
- **Database Tables**: Dependent on module (diagnostics)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0087 — GET /api/diagnostics/queue
- **Module**: DIAGNOSTICS
- **Feature**: DIAGNOSTICS API Handler
- **Function Name**: Route Handler (`GET /api/diagnostics/queue`)
- **File**: `backend/routes/diagnostics.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/diagnostics/queue`
- **Database Tables**: Dependent on module (diagnostics)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0088 — POST /api/diagnostics/queue/call-next
- **Module**: DIAGNOSTICS
- **Feature**: DIAGNOSTICS API Handler
- **Function Name**: Route Handler (`POST /api/diagnostics/queue/call-next`)
- **File**: `backend/routes/diagnostics.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/diagnostics/queue/call-next`
- **Database Tables**: Dependent on module (diagnostics)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0089 — POST /api/diagnostics/samples
- **Module**: DIAGNOSTICS
- **Feature**: DIAGNOSTICS API Handler
- **Function Name**: Route Handler (`POST /api/diagnostics/samples`)
- **File**: `backend/routes/diagnostics.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/diagnostics/samples`
- **Database Tables**: Dependent on module (diagnostics)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0090 — GET /api/diagnostics/samples
- **Module**: DIAGNOSTICS
- **Feature**: DIAGNOSTICS API Handler
- **Function Name**: Route Handler (`GET /api/diagnostics/samples`)
- **File**: `backend/routes/diagnostics.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/diagnostics/samples`
- **Database Tables**: Dependent on module (diagnostics)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0091 — POST /api/diagnostics/reports
- **Module**: DIAGNOSTICS
- **Feature**: DIAGNOSTICS API Handler
- **Function Name**: Route Handler (`POST /api/diagnostics/reports`)
- **File**: `backend/routes/diagnostics.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/diagnostics/reports`
- **Database Tables**: Dependent on module (diagnostics)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0092 — GET /api/diagnostics/reports/:reportId
- **Module**: DIAGNOSTICS
- **Feature**: DIAGNOSTICS API Handler
- **Function Name**: Route Handler (`GET /api/diagnostics/reports/:reportId`)
- **File**: `backend/routes/diagnostics.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/diagnostics/reports/:reportId`
- **Database Tables**: Dependent on module (diagnostics)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0093 — GET /api/diagnostics/reports/verify/:qrToken
- **Module**: DIAGNOSTICS
- **Feature**: DIAGNOSTICS API Handler
- **Function Name**: Route Handler (`GET /api/diagnostics/reports/verify/:qrToken`)
- **File**: `backend/routes/diagnostics.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/diagnostics/reports/verify/:qrToken`
- **Database Tables**: Dependent on module (diagnostics)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0094 — GET /api/diagnostics/home-collections
- **Module**: DIAGNOSTICS
- **Feature**: DIAGNOSTICS API Handler
- **Function Name**: Route Handler (`GET /api/diagnostics/home-collections`)
- **File**: `backend/routes/diagnostics.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/diagnostics/home-collections`
- **Database Tables**: Dependent on module (diagnostics)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0095 — PUT /api/diagnostics/home-collections/:bookingId/assign
- **Module**: DIAGNOSTICS
- **Feature**: DIAGNOSTICS API Handler
- **Function Name**: Route Handler (`PUT /api/diagnostics/home-collections/:bookingId/assign`)
- **File**: `backend/routes/diagnostics.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/diagnostics/home-collections/:bookingId/assign`
- **Database Tables**: Dependent on module (diagnostics)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### Module: AMBULANCE (11 Endpoints)

#### F-API-0096 — GET /api/ambulances
- **Module**: AMBULANCE
- **Feature**: AMBULANCE API Handler
- **Function Name**: Route Handler (`GET /api/ambulances`)
- **File**: `backend/routes/ambulance.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/ambulances`
- **Database Tables**: Dependent on module (ambulance)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0097 — GET /api/emergency/ambulances
- **Module**: AMBULANCE
- **Feature**: AMBULANCE API Handler
- **Function Name**: Route Handler (`GET /api/emergency/ambulances`)
- **File**: `backend/routes/ambulance.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/emergency/ambulances`
- **Database Tables**: Dependent on module (ambulance)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0098 — GET /api/ambulances/:id
- **Module**: AMBULANCE
- **Feature**: AMBULANCE API Handler
- **Function Name**: Route Handler (`GET /api/ambulances/:id`)
- **File**: `backend/routes/ambulance.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/ambulances/:id`
- **Database Tables**: Dependent on module (ambulance)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0099 — PUT /api/ambulances/:id/location
- **Module**: AMBULANCE
- **Feature**: AMBULANCE API Handler
- **Function Name**: Route Handler (`PUT /api/ambulances/:id/location`)
- **File**: `backend/routes/ambulance.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/ambulances/:id/location`
- **Database Tables**: Dependent on module (ambulance)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0100 — POST /api/ambulances
- **Module**: AMBULANCE
- **Feature**: AMBULANCE API Handler
- **Function Name**: Route Handler (`POST /api/ambulances`)
- **File**: `backend/routes/ambulance.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/ambulances`
- **Database Tables**: Dependent on module (ambulance)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0101 — PUT /api/ambulances/:id
- **Module**: AMBULANCE
- **Feature**: AMBULANCE API Handler
- **Function Name**: Route Handler (`PUT /api/ambulances/:id`)
- **File**: `backend/routes/ambulance.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/ambulances/:id`
- **Database Tables**: Dependent on module (ambulance)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0102 — PUT /api/ambulances/:id/status
- **Module**: AMBULANCE
- **Feature**: AMBULANCE API Handler
- **Function Name**: Route Handler (`PUT /api/ambulances/:id/status`)
- **File**: `backend/routes/ambulance.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/ambulances/:id/status`
- **Database Tables**: Dependent on module (ambulance)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0103 — PUT /api/ambulances/:id/assign
- **Module**: AMBULANCE
- **Feature**: AMBULANCE API Handler
- **Function Name**: Route Handler (`PUT /api/ambulances/:id/assign`)
- **File**: `backend/routes/ambulance.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/ambulances/:id/assign`
- **Database Tables**: Dependent on module (ambulance)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0104 — PUT /api/ambulances/:id/reset
- **Module**: AMBULANCE
- **Feature**: AMBULANCE API Handler
- **Function Name**: Route Handler (`PUT /api/ambulances/:id/reset`)
- **File**: `backend/routes/ambulance.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/ambulances/:id/reset`
- **Database Tables**: Dependent on module (ambulance)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0105 — GET /api/ambulances/nearby/search
- **Module**: AMBULANCE
- **Feature**: AMBULANCE API Handler
- **Function Name**: Route Handler (`GET /api/ambulances/nearby/search`)
- **File**: `backend/routes/ambulance.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/ambulances/nearby/search`
- **Database Tables**: Dependent on module (ambulance)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0106 — DELETE /api/ambulances/:id
- **Module**: AMBULANCE
- **Feature**: AMBULANCE API Handler
- **Function Name**: Route Handler (`DELETE /api/ambulances/:id`)
- **File**: `backend/routes/ambulance.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `DELETE /api/ambulances/:id`
- **Database Tables**: Dependent on module (ambulance)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### Module: EMERGENCY (13 Endpoints)

#### F-API-0107 — GET /api/emergency-departments
- **Module**: EMERGENCY
- **Feature**: EMERGENCY API Handler
- **Function Name**: Route Handler (`GET /api/emergency-departments`)
- **File**: `backend/routes/emergency.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/emergency-departments`
- **Database Tables**: Dependent on module (emergency)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0108 — GET /api/emergency/departments
- **Module**: EMERGENCY
- **Feature**: EMERGENCY API Handler
- **Function Name**: Route Handler (`GET /api/emergency/departments`)
- **File**: `backend/routes/emergency.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/emergency/departments`
- **Database Tables**: Dependent on module (emergency)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0109 — POST /api/emergency-departments
- **Module**: EMERGENCY
- **Feature**: EMERGENCY API Handler
- **Function Name**: Route Handler (`POST /api/emergency-departments`)
- **File**: `backend/routes/emergency.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/emergency-departments`
- **Database Tables**: Dependent on module (emergency)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0110 — PUT /api/emergency-departments/:id
- **Module**: EMERGENCY
- **Feature**: EMERGENCY API Handler
- **Function Name**: Route Handler (`PUT /api/emergency-departments/:id`)
- **File**: `backend/routes/emergency.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/emergency-departments/:id`
- **Database Tables**: Dependent on module (emergency)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0111 — GET /api/emergency/incidents
- **Module**: EMERGENCY
- **Feature**: EMERGENCY API Handler
- **Function Name**: Route Handler (`GET /api/emergency/incidents`)
- **File**: `backend/routes/emergency.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/emergency/incidents`
- **Database Tables**: Dependent on module (emergency)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0112 — POST /api/emergency/incidents
- **Module**: EMERGENCY
- **Feature**: EMERGENCY API Handler
- **Function Name**: Route Handler (`POST /api/emergency/incidents`)
- **File**: `backend/routes/emergency.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/emergency/incidents`
- **Database Tables**: Dependent on module (emergency)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0113 — POST /api/emergency/sos
- **Module**: EMERGENCY
- **Feature**: EMERGENCY API Handler
- **Function Name**: Route Handler (`POST /api/emergency/sos`)
- **File**: `backend/routes/emergency.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/emergency/sos`
- **Database Tables**: Dependent on module (emergency)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0114 — PUT /api/emergency/incidents/:id/resolve
- **Module**: EMERGENCY
- **Feature**: EMERGENCY API Handler
- **Function Name**: Route Handler (`PUT /api/emergency/incidents/:id/resolve`)
- **File**: `backend/routes/emergency.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/emergency/incidents/:id/resolve`
- **Database Tables**: Dependent on module (emergency)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0115 — PUT /api/emergency/incidents/:id/status
- **Module**: EMERGENCY
- **Feature**: EMERGENCY API Handler
- **Function Name**: Route Handler (`PUT /api/emergency/incidents/:id/status`)
- **File**: `backend/routes/emergency.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/emergency/incidents/:id/status`
- **Database Tables**: Dependent on module (emergency)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0116 — GET /api/emergency/contacts
- **Module**: EMERGENCY
- **Feature**: EMERGENCY API Handler
- **Function Name**: Route Handler (`GET /api/emergency/contacts`)
- **File**: `backend/routes/emergency.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/emergency/contacts`
- **Database Tables**: Dependent on module (emergency)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0117 — GET /api/emergency-contacts
- **Module**: EMERGENCY
- **Feature**: EMERGENCY API Handler
- **Function Name**: Route Handler (`GET /api/emergency-contacts`)
- **File**: `backend/routes/emergency.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/emergency-contacts`
- **Database Tables**: Dependent on module (emergency)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0118 — POST /api/emergency/green-wave
- **Module**: EMERGENCY
- **Feature**: EMERGENCY API Handler
- **Function Name**: Route Handler (`POST /api/emergency/green-wave`)
- **File**: `backend/routes/emergency.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/emergency/green-wave`
- **Database Tables**: Dependent on module (emergency)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0119 — POST /api/emergency/critical-dispatch
- **Module**: EMERGENCY
- **Feature**: EMERGENCY API Handler
- **Function Name**: Route Handler (`POST /api/emergency/critical-dispatch`)
- **File**: `backend/routes/emergency.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/emergency/critical-dispatch`
- **Database Tables**: Dependent on module (emergency)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### Module: PHARMACY (14 Endpoints)

#### F-API-0120 — GET /api/pharmacy
- **Module**: PHARMACY
- **Feature**: PHARMACY API Handler
- **Function Name**: Route Handler (`GET /api/pharmacy`)
- **File**: `backend/routes/pharmacy.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/pharmacy`
- **Database Tables**: Dependent on module (pharmacy)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0121 — GET /api/pharmacy/medicines
- **Module**: PHARMACY
- **Feature**: PHARMACY API Handler
- **Function Name**: Route Handler (`GET /api/pharmacy/medicines`)
- **File**: `backend/routes/pharmacy.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/pharmacy/medicines`
- **Database Tables**: Dependent on module (pharmacy)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0122 — GET /api/pharmacy/search/:medicine
- **Module**: PHARMACY
- **Feature**: PHARMACY API Handler
- **Function Name**: Route Handler (`GET /api/pharmacy/search/:medicine`)
- **File**: `backend/routes/pharmacy.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/pharmacy/search/:medicine`
- **Database Tables**: Dependent on module (pharmacy)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0123 — POST /api/pharmacy
- **Module**: PHARMACY
- **Feature**: PHARMACY API Handler
- **Function Name**: Route Handler (`POST /api/pharmacy`)
- **File**: `backend/routes/pharmacy.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/pharmacy`
- **Database Tables**: Dependent on module (pharmacy)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0124 — PUT /api/pharmacy/:id
- **Module**: PHARMACY
- **Feature**: PHARMACY API Handler
- **Function Name**: Route Handler (`PUT /api/pharmacy/:id`)
- **File**: `backend/routes/pharmacy.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/pharmacy/:id`
- **Database Tables**: Dependent on module (pharmacy)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0125 — POST /api/pharmacy/prescriptions
- **Module**: PHARMACY
- **Feature**: PHARMACY API Handler
- **Function Name**: Route Handler (`POST /api/pharmacy/prescriptions`)
- **File**: `backend/routes/pharmacy.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/pharmacy/prescriptions`
- **Database Tables**: Dependent on module (pharmacy)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0126 — POST /api/pharmacy/cart
- **Module**: PHARMACY
- **Feature**: PHARMACY API Handler
- **Function Name**: Route Handler (`POST /api/pharmacy/cart`)
- **File**: `backend/routes/pharmacy.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/pharmacy/cart`
- **Database Tables**: Dependent on module (pharmacy)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0127 — GET /api/pharmacy/cart/:patientId
- **Module**: PHARMACY
- **Feature**: PHARMACY API Handler
- **Function Name**: Route Handler (`GET /api/pharmacy/cart/:patientId`)
- **File**: `backend/routes/pharmacy.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/pharmacy/cart/:patientId`
- **Database Tables**: Dependent on module (pharmacy)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0128 — DELETE /api/pharmacy/cart/:id
- **Module**: PHARMACY
- **Feature**: PHARMACY API Handler
- **Function Name**: Route Handler (`DELETE /api/pharmacy/cart/:id`)
- **File**: `backend/routes/pharmacy.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `DELETE /api/pharmacy/cart/:id`
- **Database Tables**: Dependent on module (pharmacy)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0129 — POST /api/pharmacy/checkout
- **Module**: PHARMACY
- **Feature**: PHARMACY API Handler
- **Function Name**: Route Handler (`POST /api/pharmacy/checkout`)
- **File**: `backend/routes/pharmacy.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/pharmacy/checkout`
- **Database Tables**: Dependent on module (pharmacy)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0130 — GET /api/pharmacy/bills/:patientId
- **Module**: PHARMACY
- **Feature**: PHARMACY API Handler
- **Function Name**: Route Handler (`GET /api/pharmacy/bills/:patientId`)
- **File**: `backend/routes/pharmacy.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/pharmacy/bills/:patientId`
- **Database Tables**: Dependent on module (pharmacy)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0131 — GET /api/prescriptions/:patientId
- **Module**: PHARMACY
- **Feature**: PHARMACY API Handler
- **Function Name**: Route Handler (`GET /api/prescriptions/:patientId`)
- **File**: `backend/routes/pharmacy.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/prescriptions/:patientId`
- **Database Tables**: Dependent on module (pharmacy)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0132 — POST /api/prescriptions/upload
- **Module**: PHARMACY
- **Feature**: PHARMACY API Handler
- **Function Name**: Route Handler (`POST /api/prescriptions/upload`)
- **File**: `backend/routes/pharmacy.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/prescriptions/upload`
- **Database Tables**: Dependent on module (pharmacy)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0133 — POST /api/pharmacy/payment
- **Module**: PHARMACY
- **Feature**: PHARMACY API Handler
- **Function Name**: Route Handler (`POST /api/pharmacy/payment`)
- **File**: `backend/routes/pharmacy.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/pharmacy/payment`
- **Database Tables**: Dependent on module (pharmacy)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### Module: WASTE (35 Endpoints)

#### F-API-0134 — POST /api/waste/upload-evidence
- **Module**: WASTE
- **Feature**: WASTE API Handler
- **Function Name**: Route Handler (`POST /api/waste/upload-evidence`)
- **File**: `backend/routes/waste.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/waste/upload-evidence`
- **Database Tables**: Dependent on module (waste)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0135 — GET /api/waste/bins
- **Module**: WASTE
- **Feature**: WASTE API Handler
- **Function Name**: Route Handler (`GET /api/waste/bins`)
- **File**: `backend/routes/waste.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/waste/bins`
- **Database Tables**: Dependent on module (waste)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0136 — POST /api/waste/reports
- **Module**: WASTE
- **Feature**: WASTE API Handler
- **Function Name**: Route Handler (`POST /api/waste/reports`)
- **File**: `backend/routes/waste.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/waste/reports`
- **Database Tables**: Dependent on module (waste)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0137 — POST /api/waste/report
- **Module**: WASTE
- **Feature**: WASTE API Handler
- **Function Name**: Route Handler (`POST /api/waste/report`)
- **File**: `backend/routes/waste.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/waste/report`
- **Database Tables**: Dependent on module (waste)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0138 — POST /api/waste/pickups
- **Module**: WASTE
- **Feature**: WASTE API Handler
- **Function Name**: Route Handler (`POST /api/waste/pickups`)
- **File**: `backend/routes/waste.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/waste/pickups`
- **Database Tables**: Dependent on module (waste)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0139 — GET /api/waste/my-requests
- **Module**: WASTE
- **Feature**: WASTE API Handler
- **Function Name**: Route Handler (`GET /api/waste/my-requests`)
- **File**: `backend/routes/waste.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/waste/my-requests`
- **Database Tables**: Dependent on module (waste)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0140 — GET /api/waste/facilities
- **Module**: WASTE
- **Feature**: WASTE API Handler
- **Function Name**: Route Handler (`GET /api/waste/facilities`)
- **File**: `backend/routes/waste.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/waste/facilities`
- **Database Tables**: Dependent on module (waste)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0141 — POST /api/waste/bin-requests
- **Module**: WASTE
- **Feature**: WASTE API Handler
- **Function Name**: Route Handler (`POST /api/waste/bin-requests`)
- **File**: `backend/routes/waste.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/waste/bin-requests`
- **Database Tables**: Dependent on module (waste)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0142 — GET /api/waste/bin-requests
- **Module**: WASTE
- **Feature**: WASTE API Handler
- **Function Name**: Route Handler (`GET /api/waste/bin-requests`)
- **File**: `backend/routes/waste.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/waste/bin-requests`
- **Database Tables**: Dependent on module (waste)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0143 — PUT /api/waste/bin-requests/:requestCode/status
- **Module**: WASTE
- **Feature**: WASTE API Handler
- **Function Name**: Route Handler (`PUT /api/waste/bin-requests/:requestCode/status`)
- **File**: `backend/routes/waste.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/waste/bin-requests/:requestCode/status`
- **Database Tables**: Dependent on module (waste)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0144 — GET /api/waste/requests
- **Module**: WASTE
- **Feature**: WASTE API Handler
- **Function Name**: Route Handler (`GET /api/waste/requests`)
- **File**: `backend/routes/waste.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/waste/requests`
- **Database Tables**: Dependent on module (waste)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0145 — GET /api/waste/requests/:id
- **Module**: WASTE
- **Feature**: WASTE API Handler
- **Function Name**: Route Handler (`GET /api/waste/requests/:id`)
- **File**: `backend/routes/waste.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/waste/requests/:id`
- **Database Tables**: Dependent on module (waste)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0146 — PUT /api/waste/requests/:id
- **Module**: WASTE
- **Feature**: WASTE API Handler
- **Function Name**: Route Handler (`PUT /api/waste/requests/:id`)
- **File**: `backend/routes/waste.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/waste/requests/:id`
- **Database Tables**: Dependent on module (waste)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0147 — POST /api/waste/requests/update-status
- **Module**: WASTE
- **Feature**: WASTE API Handler
- **Function Name**: Route Handler (`POST /api/waste/requests/update-status`)
- **File**: `backend/routes/waste.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/waste/requests/update-status`
- **Database Tables**: Dependent on module (waste)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0148 — POST /api/waste/requests/:id/reopen
- **Module**: WASTE
- **Feature**: WASTE API Handler
- **Function Name**: Route Handler (`POST /api/waste/requests/:id/reopen`)
- **File**: `backend/routes/waste.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/waste/requests/:id/reopen`
- **Database Tables**: Dependent on module (waste)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0149 — GET /api/waste/operations/summary
- **Module**: WASTE
- **Feature**: WASTE API Handler
- **Function Name**: Route Handler (`GET /api/waste/operations/summary`)
- **File**: `backend/routes/waste.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/waste/operations/summary`
- **Database Tables**: Dependent on module (waste)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0150 — POST /api/waste/bins
- **Module**: WASTE
- **Feature**: WASTE API Handler
- **Function Name**: Route Handler (`POST /api/waste/bins`)
- **File**: `backend/routes/waste.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/waste/bins`
- **Database Tables**: Dependent on module (waste)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0151 — PUT /api/waste/bins/:id
- **Module**: WASTE
- **Feature**: WASTE API Handler
- **Function Name**: Route Handler (`PUT /api/waste/bins/:id`)
- **File**: `backend/routes/waste.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/waste/bins/:id`
- **Database Tables**: Dependent on module (waste)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0152 — DELETE /api/waste/bins/:id
- **Module**: WASTE
- **Feature**: WASTE API Handler
- **Function Name**: Route Handler (`DELETE /api/waste/bins/:id`)
- **File**: `backend/routes/waste.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `DELETE /api/waste/bins/:id`
- **Database Tables**: Dependent on module (waste)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0153 — PUT /api/waste/bins/:id/fill
- **Module**: WASTE
- **Feature**: WASTE API Handler
- **Function Name**: Route Handler (`PUT /api/waste/bins/:id/fill`)
- **File**: `backend/routes/waste.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/waste/bins/:id/fill`
- **Database Tables**: Dependent on module (waste)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0154 — GET /api/waste/vehicles
- **Module**: WASTE
- **Feature**: WASTE API Handler
- **Function Name**: Route Handler (`GET /api/waste/vehicles`)
- **File**: `backend/routes/waste.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/waste/vehicles`
- **Database Tables**: Dependent on module (waste)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0155 — POST /api/waste/vehicles
- **Module**: WASTE
- **Feature**: WASTE API Handler
- **Function Name**: Route Handler (`POST /api/waste/vehicles`)
- **File**: `backend/routes/waste.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/waste/vehicles`
- **Database Tables**: Dependent on module (waste)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0156 — PUT /api/waste/vehicles/:id
- **Module**: WASTE
- **Feature**: WASTE API Handler
- **Function Name**: Route Handler (`PUT /api/waste/vehicles/:id`)
- **File**: `backend/routes/waste.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/waste/vehicles/:id`
- **Database Tables**: Dependent on module (waste)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0157 — DELETE /api/waste/vehicles/:id
- **Module**: WASTE
- **Feature**: WASTE API Handler
- **Function Name**: Route Handler (`DELETE /api/waste/vehicles/:id`)
- **File**: `backend/routes/waste.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `DELETE /api/waste/vehicles/:id`
- **Database Tables**: Dependent on module (waste)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0158 — GET /api/waste/workers
- **Module**: WASTE
- **Feature**: WASTE API Handler
- **Function Name**: Route Handler (`GET /api/waste/workers`)
- **File**: `backend/routes/waste.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/waste/workers`
- **Database Tables**: Dependent on module (waste)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0159 — POST /api/waste/workers
- **Module**: WASTE
- **Feature**: WASTE API Handler
- **Function Name**: Route Handler (`POST /api/waste/workers`)
- **File**: `backend/routes/waste.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/waste/workers`
- **Database Tables**: Dependent on module (waste)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0160 — PUT /api/waste/workers/:id
- **Module**: WASTE
- **Feature**: WASTE API Handler
- **Function Name**: Route Handler (`PUT /api/waste/workers/:id`)
- **File**: `backend/routes/waste.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/waste/workers/:id`
- **Database Tables**: Dependent on module (waste)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0161 — DELETE /api/waste/workers/:id
- **Module**: WASTE
- **Feature**: WASTE API Handler
- **Function Name**: Route Handler (`DELETE /api/waste/workers/:id`)
- **File**: `backend/routes/waste.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `DELETE /api/waste/workers/:id`
- **Database Tables**: Dependent on module (waste)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0162 — GET /api/waste/routes
- **Module**: WASTE
- **Feature**: WASTE API Handler
- **Function Name**: Route Handler (`GET /api/waste/routes`)
- **File**: `backend/routes/waste.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/waste/routes`
- **Database Tables**: Dependent on module (waste)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0163 — POST /api/waste/routes
- **Module**: WASTE
- **Feature**: WASTE API Handler
- **Function Name**: Route Handler (`POST /api/waste/routes`)
- **File**: `backend/routes/waste.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/waste/routes`
- **Database Tables**: Dependent on module (waste)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0164 — PUT /api/waste/routes/:id
- **Module**: WASTE
- **Feature**: WASTE API Handler
- **Function Name**: Route Handler (`PUT /api/waste/routes/:id`)
- **File**: `backend/routes/waste.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/waste/routes/:id`
- **Database Tables**: Dependent on module (waste)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0165 — DELETE /api/waste/routes/:id
- **Module**: WASTE
- **Feature**: WASTE API Handler
- **Function Name**: Route Handler (`DELETE /api/waste/routes/:id`)
- **File**: `backend/routes/waste.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `DELETE /api/waste/routes/:id`
- **Database Tables**: Dependent on module (waste)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0166 — GET /api/waste/analytics
- **Module**: WASTE
- **Feature**: WASTE API Handler
- **Function Name**: Route Handler (`GET /api/waste/analytics`)
- **File**: `backend/routes/waste.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/waste/analytics`
- **Database Tables**: Dependent on module (waste)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0167 — GET /api/waste/hotspots
- **Module**: WASTE
- **Feature**: WASTE API Handler
- **Function Name**: Route Handler (`GET /api/waste/hotspots`)
- **File**: `backend/routes/waste.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/waste/hotspots`
- **Database Tables**: Dependent on module (waste)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0168 — POST /api/waste/smart-priority
- **Module**: WASTE
- **Feature**: WASTE API Handler
- **Function Name**: Route Handler (`POST /api/waste/smart-priority`)
- **File**: `backend/routes/waste.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/waste/smart-priority`
- **Database Tables**: Dependent on module (waste)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### Module: PARKING (32 Endpoints)

#### F-API-0169 — GET /api/parking
- **Module**: PARKING
- **Feature**: PARKING API Handler
- **Function Name**: Route Handler (`GET /api/parking`)
- **File**: `backend/routes/parking.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/parking`
- **Database Tables**: Dependent on module (parking)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0170 — GET /api/parking/lots
- **Module**: PARKING
- **Feature**: PARKING API Handler
- **Function Name**: Route Handler (`GET /api/parking/lots`)
- **File**: `backend/routes/parking.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/parking/lots`
- **Database Tables**: Dependent on module (parking)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0171 — GET /api/parking/stats
- **Module**: PARKING
- **Feature**: PARKING API Handler
- **Function Name**: Route Handler (`GET /api/parking/stats`)
- **File**: `backend/routes/parking.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/parking/stats`
- **Database Tables**: Dependent on module (parking)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0172 — GET /api/parking/staff/overview
- **Module**: PARKING
- **Feature**: PARKING API Handler
- **Function Name**: Route Handler (`GET /api/parking/staff/overview`)
- **File**: `backend/routes/parking.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/parking/staff/overview`
- **Database Tables**: Dependent on module (parking)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0173 — GET /api/parking/active-entries
- **Module**: PARKING
- **Feature**: PARKING API Handler
- **Function Name**: Route Handler (`GET /api/parking/active-entries`)
- **File**: `backend/routes/parking.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/parking/active-entries`
- **Database Tables**: Dependent on module (parking)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0174 — GET /api/parking/users/search
- **Module**: PARKING
- **Feature**: PARKING API Handler
- **Function Name**: Route Handler (`GET /api/parking/users/search`)
- **File**: `backend/routes/parking.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/parking/users/search`
- **Database Tables**: Dependent on module (parking)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0175 — GET /api/parking/my-bookings
- **Module**: PARKING
- **Feature**: PARKING API Handler
- **Function Name**: Route Handler (`GET /api/parking/my-bookings`)
- **File**: `backend/routes/parking.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/parking/my-bookings`
- **Database Tables**: Dependent on module (parking)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0176 — GET /api/parking/slots
- **Module**: PARKING
- **Feature**: PARKING API Handler
- **Function Name**: Route Handler (`GET /api/parking/slots`)
- **File**: `backend/routes/parking.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/parking/slots`
- **Database Tables**: Dependent on module (parking)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0177 — GET /api/parking/:id
- **Module**: PARKING
- **Feature**: PARKING API Handler
- **Function Name**: Route Handler (`GET /api/parking/:id`)
- **File**: `backend/routes/parking.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/parking/:id`
- **Database Tables**: Dependent on module (parking)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0178 — POST /api/parking
- **Module**: PARKING
- **Feature**: PARKING API Handler
- **Function Name**: Route Handler (`POST /api/parking`)
- **File**: `backend/routes/parking.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/parking`
- **Database Tables**: Dependent on module (parking)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0179 — PUT /api/parking/:id
- **Module**: PARKING
- **Feature**: PARKING API Handler
- **Function Name**: Route Handler (`PUT /api/parking/:id`)
- **File**: `backend/routes/parking.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/parking/:id`
- **Database Tables**: Dependent on module (parking)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0180 — POST /api/parking/staff-book
- **Module**: PARKING
- **Feature**: PARKING API Handler
- **Function Name**: Route Handler (`POST /api/parking/staff-book`)
- **File**: `backend/routes/parking.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/parking/staff-book`
- **Database Tables**: Dependent on module (parking)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0181 — POST /api/parking/book
- **Module**: PARKING
- **Feature**: PARKING API Handler
- **Function Name**: Route Handler (`POST /api/parking/book`)
- **File**: `backend/routes/parking.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/parking/book`
- **Database Tables**: Dependent on module (parking)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0182 — POST /api/parking/:id/book
- **Module**: PARKING
- **Feature**: PARKING API Handler
- **Function Name**: Route Handler (`POST /api/parking/:id/book`)
- **File**: `backend/routes/parking.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/parking/:id/book`
- **Database Tables**: Dependent on module (parking)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0183 — POST /api/parking/:id/release
- **Module**: PARKING
- **Feature**: PARKING API Handler
- **Function Name**: Route Handler (`POST /api/parking/:id/release`)
- **File**: `backend/routes/parking.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/parking/:id/release`
- **Database Tables**: Dependent on module (parking)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0184 — GET /api/parking/:id/slots
- **Module**: PARKING
- **Feature**: PARKING API Handler
- **Function Name**: Route Handler (`GET /api/parking/:id/slots`)
- **File**: `backend/routes/parking.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/parking/:id/slots`
- **Database Tables**: Dependent on module (parking)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0185 — POST /api/parking/:id/book-slot
- **Module**: PARKING
- **Feature**: PARKING API Handler
- **Function Name**: Route Handler (`POST /api/parking/:id/book-slot`)
- **File**: `backend/routes/parking.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/parking/:id/book-slot`
- **Database Tables**: Dependent on module (parking)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0186 — POST /api/parking/bookings/:bookingId/cancel
- **Module**: PARKING
- **Feature**: PARKING API Handler
- **Function Name**: Route Handler (`POST /api/parking/bookings/:bookingId/cancel`)
- **File**: `backend/routes/parking.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/parking/bookings/:bookingId/cancel`
- **Database Tables**: Dependent on module (parking)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0187 — POST /api/parking/verify-qr
- **Module**: PARKING
- **Feature**: PARKING API Handler
- **Function Name**: Route Handler (`POST /api/parking/verify-qr`)
- **File**: `backend/routes/parking.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/parking/verify-qr`
- **Database Tables**: Dependent on module (parking)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0188 — PUT /api/parking/slots/:slotId/status
- **Module**: PARKING
- **Feature**: PARKING API Handler
- **Function Name**: Route Handler (`PUT /api/parking/slots/:slotId/status`)
- **File**: `backend/routes/parking.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/parking/slots/:slotId/status`
- **Database Tables**: Dependent on module (parking)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0189 — POST /api/parking/gate-action
- **Module**: PARKING
- **Feature**: PARKING API Handler
- **Function Name**: Route Handler (`POST /api/parking/gate-action`)
- **File**: `backend/routes/parking.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/parking/gate-action`
- **Database Tables**: Dependent on module (parking)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0190 — POST /api/parking/anpr-scan
- **Module**: PARKING
- **Feature**: PARKING API Handler
- **Function Name**: Route Handler (`POST /api/parking/anpr-scan`)
- **File**: `backend/routes/parking.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/parking/anpr-scan`
- **Database Tables**: Dependent on module (parking)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0191 — GET /api/parking/operations/summary
- **Module**: PARKING
- **Feature**: PARKING API Handler
- **Function Name**: Route Handler (`GET /api/parking/operations/summary`)
- **File**: `backend/routes/parking.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/parking/operations/summary`
- **Database Tables**: Dependent on module (parking)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0192 — GET /api/parking/staff/overstays
- **Module**: PARKING
- **Feature**: PARKING API Handler
- **Function Name**: Route Handler (`GET /api/parking/staff/overstays`)
- **File**: `backend/routes/parking.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/parking/staff/overstays`
- **Database Tables**: Dependent on module (parking)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0193 — POST /api/parking/emergency-barrier-override
- **Module**: PARKING
- **Feature**: PARKING API Handler
- **Function Name**: Route Handler (`POST /api/parking/emergency-barrier-override`)
- **File**: `backend/routes/parking.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/parking/emergency-barrier-override`
- **Database Tables**: Dependent on module (parking)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0194 — GET /api/parking/admin/pricing
- **Module**: PARKING
- **Feature**: PARKING API Handler
- **Function Name**: Route Handler (`GET /api/parking/admin/pricing`)
- **File**: `backend/routes/parking.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/parking/admin/pricing`
- **Database Tables**: Dependent on module (parking)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0195 — PUT /api/parking/lots/:id/pricing
- **Module**: PARKING
- **Feature**: PARKING API Handler
- **Function Name**: Route Handler (`PUT /api/parking/lots/:id/pricing`)
- **File**: `backend/routes/parking.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/parking/lots/:id/pricing`
- **Database Tables**: Dependent on module (parking)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0196 — GET /api/parking/admin/anpr-logs
- **Module**: PARKING
- **Feature**: PARKING API Handler
- **Function Name**: Route Handler (`GET /api/parking/admin/anpr-logs`)
- **File**: `backend/routes/parking.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/parking/admin/anpr-logs`
- **Database Tables**: Dependent on module (parking)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0197 — POST /api/parking/resolve-overstay-penalty
- **Module**: PARKING
- **Feature**: PARKING API Handler
- **Function Name**: Route Handler (`POST /api/parking/resolve-overstay-penalty`)
- **File**: `backend/routes/parking.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/parking/resolve-overstay-penalty`
- **Database Tables**: Dependent on module (parking)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0198 — POST /api/parking/send-overstay-alert
- **Module**: PARKING
- **Feature**: PARKING API Handler
- **Function Name**: Route Handler (`POST /api/parking/send-overstay-alert`)
- **File**: `backend/routes/parking.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/parking/send-overstay-alert`
- **Database Tables**: Dependent on module (parking)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0199 — PUT /api/parking/slots/:slotId/staff-override
- **Module**: PARKING
- **Feature**: PARKING API Handler
- **Function Name**: Route Handler (`PUT /api/parking/slots/:slotId/staff-override`)
- **File**: `backend/routes/parking.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/parking/slots/:slotId/staff-override`
- **Database Tables**: Dependent on module (parking)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0200 — GET /api/parking/staff/shift-summary
- **Module**: PARKING
- **Feature**: PARKING API Handler
- **Function Name**: Route Handler (`GET /api/parking/staff/shift-summary`)
- **File**: `backend/routes/parking.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/parking/staff/shift-summary`
- **Database Tables**: Dependent on module (parking)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### Module: WATER (24 Endpoints)

#### F-API-0201 — GET /api/water/operations/summary
- **Module**: WATER
- **Feature**: WATER API Handler
- **Function Name**: Route Handler (`GET /api/water/operations/summary`)
- **File**: `backend/routes/water.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/water/operations/summary`
- **Database Tables**: Dependent on module (water)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0202 — GET /api/water/tanks
- **Module**: WATER
- **Feature**: WATER API Handler
- **Function Name**: Route Handler (`GET /api/water/tanks`)
- **File**: `backend/routes/water.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/water/tanks`
- **Database Tables**: Dependent on module (water)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0203 — GET /api/water/tanks/:id
- **Module**: WATER
- **Feature**: WATER API Handler
- **Function Name**: Route Handler (`GET /api/water/tanks/:id`)
- **File**: `backend/routes/water.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/water/tanks/:id`
- **Database Tables**: Dependent on module (water)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0204 — POST /api/water/tanks
- **Module**: WATER
- **Feature**: WATER API Handler
- **Function Name**: Route Handler (`POST /api/water/tanks`)
- **File**: `backend/routes/water.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/water/tanks`
- **Database Tables**: Dependent on module (water)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0205 — PUT /api/water/tanks/:id
- **Module**: WATER
- **Feature**: WATER API Handler
- **Function Name**: Route Handler (`PUT /api/water/tanks/:id`)
- **File**: `backend/routes/water.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/water/tanks/:id`
- **Database Tables**: Dependent on module (water)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0206 — PUT /api/water/tanks/:id/pump
- **Module**: WATER
- **Feature**: WATER API Handler
- **Function Name**: Route Handler (`PUT /api/water/tanks/:id/pump`)
- **File**: `backend/routes/water.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/water/tanks/:id/pump`
- **Database Tables**: Dependent on module (water)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0207 — DELETE /api/water/tanks/:id
- **Module**: WATER
- **Feature**: WATER API Handler
- **Function Name**: Route Handler (`DELETE /api/water/tanks/:id`)
- **File**: `backend/routes/water.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `DELETE /api/water/tanks/:id`
- **Database Tables**: Dependent on module (water)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0208 — GET /api/water/reports
- **Module**: WATER
- **Feature**: WATER API Handler
- **Function Name**: Route Handler (`GET /api/water/reports`)
- **File**: `backend/routes/water.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/water/reports`
- **Database Tables**: Dependent on module (water)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0209 — POST /api/water/reports
- **Module**: WATER
- **Feature**: WATER API Handler
- **Function Name**: Route Handler (`POST /api/water/reports`)
- **File**: `backend/routes/water.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/water/reports`
- **Database Tables**: Dependent on module (water)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0210 — PUT /api/water/reports/:id/assign
- **Module**: WATER
- **Feature**: WATER API Handler
- **Function Name**: Route Handler (`PUT /api/water/reports/:id/assign`)
- **File**: `backend/routes/water.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/water/reports/:id/assign`
- **Database Tables**: Dependent on module (water)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0211 — PUT /api/water/reports/:id/status
- **Module**: WATER
- **Feature**: WATER API Handler
- **Function Name**: Route Handler (`PUT /api/water/reports/:id/status`)
- **File**: `backend/routes/water.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/water/reports/:id/status`
- **Database Tables**: Dependent on module (water)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0212 — POST /api/water/tanker-bookings
- **Module**: WATER
- **Feature**: WATER API Handler
- **Function Name**: Route Handler (`POST /api/water/tanker-bookings`)
- **File**: `backend/routes/water.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/water/tanker-bookings`
- **Database Tables**: Dependent on module (water)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0213 — POST /api/water/book-tanker
- **Module**: WATER
- **Feature**: WATER API Handler
- **Function Name**: Route Handler (`POST /api/water/book-tanker`)
- **File**: `backend/routes/water.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/water/book-tanker`
- **Database Tables**: Dependent on module (water)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0214 — GET /api/water/tanker-bookings
- **Module**: WATER
- **Feature**: WATER API Handler
- **Function Name**: Route Handler (`GET /api/water/tanker-bookings`)
- **File**: `backend/routes/water.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/water/tanker-bookings`
- **Database Tables**: Dependent on module (water)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0215 — PUT /api/water/tanker-bookings/:id/dispatch
- **Module**: WATER
- **Feature**: WATER API Handler
- **Function Name**: Route Handler (`PUT /api/water/tanker-bookings/:id/dispatch`)
- **File**: `backend/routes/water.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/water/tanker-bookings/:id/dispatch`
- **Database Tables**: Dependent on module (water)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0216 — PUT /api/water/tanker-bookings/:id/status
- **Module**: WATER
- **Feature**: WATER API Handler
- **Function Name**: Route Handler (`PUT /api/water/tanker-bookings/:id/status`)
- **File**: `backend/routes/water.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/water/tanker-bookings/:id/status`
- **Database Tables**: Dependent on module (water)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0217 — GET /api/water/pipelines
- **Module**: WATER
- **Feature**: WATER API Handler
- **Function Name**: Route Handler (`GET /api/water/pipelines`)
- **File**: `backend/routes/water.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/water/pipelines`
- **Database Tables**: Dependent on module (water)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0218 — GET /api/water/technicians
- **Module**: WATER
- **Feature**: WATER API Handler
- **Function Name**: Route Handler (`GET /api/water/technicians`)
- **File**: `backend/routes/water.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/water/technicians`
- **Database Tables**: Dependent on module (water)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0219 — GET /api/water/quality
- **Module**: WATER
- **Feature**: WATER API Handler
- **Function Name**: Route Handler (`GET /api/water/quality`)
- **File**: `backend/routes/water.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/water/quality`
- **Database Tables**: Dependent on module (water)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0220 — POST /api/water/quality
- **Module**: WATER
- **Feature**: WATER API Handler
- **Function Name**: Route Handler (`POST /api/water/quality`)
- **File**: `backend/routes/water.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/water/quality`
- **Database Tables**: Dependent on module (water)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0221 — GET /api/water/schedules
- **Module**: WATER
- **Feature**: WATER API Handler
- **Function Name**: Route Handler (`GET /api/water/schedules`)
- **File**: `backend/routes/water.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/water/schedules`
- **Database Tables**: Dependent on module (water)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0222 — GET /api/water/supply-schedules
- **Module**: WATER
- **Feature**: WATER API Handler
- **Function Name**: Route Handler (`GET /api/water/supply-schedules`)
- **File**: `backend/routes/water.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/water/supply-schedules`
- **Database Tables**: Dependent on module (water)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0223 — PUT /api/water/schedules/:id
- **Module**: WATER
- **Feature**: WATER API Handler
- **Function Name**: Route Handler (`PUT /api/water/schedules/:id`)
- **File**: `backend/routes/water.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/water/schedules/:id`
- **Database Tables**: Dependent on module (water)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0224 — GET /api/water/anomalies
- **Module**: WATER
- **Feature**: WATER API Handler
- **Function Name**: Route Handler (`GET /api/water/anomalies`)
- **File**: `backend/routes/water.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/water/anomalies`
- **Database Tables**: Dependent on module (water)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### Module: POLICE (6 Endpoints)

#### F-API-0225 — GET /api/police/stations
- **Module**: POLICE
- **Feature**: POLICE API Handler
- **Function Name**: Route Handler (`GET /api/police/stations`)
- **File**: `backend/routes/police.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/police/stations`
- **Database Tables**: Dependent on module (police)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0226 — GET /api/police/stats
- **Module**: POLICE
- **Feature**: POLICE API Handler
- **Function Name**: Route Handler (`GET /api/police/stats`)
- **File**: `backend/routes/police.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/police/stats`
- **Database Tables**: Dependent on module (police)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0227 — POST /api/police/complaint
- **Module**: POLICE
- **Feature**: POLICE API Handler
- **Function Name**: Route Handler (`POST /api/police/complaint`)
- **File**: `backend/routes/police.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/police/complaint`
- **Database Tables**: Dependent on module (police)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0228 — GET /api/police/complaints
- **Module**: POLICE
- **Feature**: POLICE API Handler
- **Function Name**: Route Handler (`GET /api/police/complaints`)
- **File**: `backend/routes/police.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/police/complaints`
- **Database Tables**: Dependent on module (police)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0229 — PUT /api/police/complaints/:id/status
- **Module**: POLICE
- **Feature**: POLICE API Handler
- **Function Name**: Route Handler (`PUT /api/police/complaints/:id/status`)
- **File**: `backend/routes/police.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/police/complaints/:id/status`
- **Database Tables**: Dependent on module (police)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0230 — GET /api/police/emergency-contacts
- **Module**: POLICE
- **Feature**: POLICE API Handler
- **Function Name**: Route Handler (`GET /api/police/emergency-contacts`)
- **File**: `backend/routes/police.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/police/emergency-contacts`
- **Database Tables**: Dependent on module (police)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### Module: AI (82 Endpoints)

#### F-API-0231 — GET /api/ai/status
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/ai/status`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/ai/status`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0232 — GET /api/ai/models
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/ai/models`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/ai/models`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0233 — POST /api/ai/assistant
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`POST /api/ai/assistant`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/ai/assistant`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0234 — POST /api/ai/chat
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`POST /api/ai/chat`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/ai/chat`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0235 — POST /api/ai/orchestrate
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`POST /api/ai/orchestrate`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/ai/orchestrate`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0236 — POST /api/ai/tool-call
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`POST /api/ai/tool-call`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/ai/tool-call`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0237 — POST /api/ai/emergency/dispatch
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`POST /api/ai/emergency/dispatch`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/ai/emergency/dispatch`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0238 — POST /api/ai/camera/analyze
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`POST /api/ai/camera/analyze`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/ai/camera/analyze`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0239 — GET /api/ai/anomalies
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/ai/anomalies`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/ai/anomalies`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0240 — GET /api/ai/predictions
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/ai/predictions`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/ai/predictions`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0241 — POST /api/ai/review/:predictionId
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`POST /api/ai/review/:predictionId`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/ai/review/:predictionId`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0242 — GET /api/ai/predictions/:id
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/ai/predictions/:id`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/ai/predictions/:id`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0243 — POST /api/ai/predictions/:id/feedback
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`POST /api/ai/predictions/:id/feedback`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/ai/predictions/:id/feedback`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0244 — GET /api/ai/metrics
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/ai/metrics`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/ai/metrics`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0245 — GET /api/admin/ai-command-center
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/admin/ai-command-center`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/admin/ai-command-center`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0246 — GET /api/traffic/prediction
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/traffic/prediction`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/traffic/prediction`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0247 — GET /api/ai/traffic/multi-horizon
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/ai/traffic/multi-horizon`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/ai/traffic/multi-horizon`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0248 — GET /api/ai/traffic/predict
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/ai/traffic/predict`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/ai/traffic/predict`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0249 — POST /api/traffic/optimize-signal
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`POST /api/traffic/optimize-signal`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/traffic/optimize-signal`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0250 — POST /api/ai/traffic/optimize-signal
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`POST /api/ai/traffic/optimize-signal`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/ai/traffic/optimize-signal`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0251 — GET /api/traffic/corridor-coordination
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/traffic/corridor-coordination`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/traffic/corridor-coordination`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0252 — GET /api/ai/traffic/corridor-coordination
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/ai/traffic/corridor-coordination`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/ai/traffic/corridor-coordination`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0253 — POST /api/traffic/ambulance-preemption
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`POST /api/traffic/ambulance-preemption`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/traffic/ambulance-preemption`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0254 — POST /api/ai/traffic/ambulance-preemption
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`POST /api/ai/traffic/ambulance-preemption`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/ai/traffic/ambulance-preemption`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0255 — POST /api/cv/analyze
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`POST /api/cv/analyze`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/cv/analyze`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0256 — POST /api/ai/cv/analyze
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`POST /api/ai/cv/analyze`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/ai/cv/analyze`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0257 — POST /api/anpr/analyze
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`POST /api/anpr/analyze`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/anpr/analyze`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0258 — POST /api/ai/anpr/process-violation
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`POST /api/ai/anpr/process-violation`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/ai/anpr/process-violation`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0259 — POST /api/cv/violations/:id/verify
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`POST /api/cv/violations/:id/verify`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/cv/violations/:id/verify`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0260 — POST /api/services/grievance-ai-analyze
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`POST /api/services/grievance-ai-analyze`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/services/grievance-ai-analyze`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0261 — POST /api/ai/grievance/analyze
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`POST /api/ai/grievance/analyze`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/ai/grievance/analyze`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0262 — POST /api/services/grievance-image-ai
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`POST /api/services/grievance-image-ai`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/services/grievance-image-ai`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0263 — POST /api/ai/grievance/image-analyze
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`POST /api/ai/grievance/image-analyze`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/ai/grievance/image-analyze`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0264 — GET /api/waste/prediction
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/waste/prediction`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/waste/prediction`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0265 — GET /api/ai/waste/bin-forecast
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/ai/waste/bin-forecast`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/ai/waste/bin-forecast`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0266 — GET /api/ai/waste/predict
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/ai/waste/predict`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/ai/waste/predict`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0267 — POST /api/waste/optimize-route
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`POST /api/waste/optimize-route`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/waste/optimize-route`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0268 — POST /api/ai/waste/optimize-route
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`POST /api/ai/waste/optimize-route`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/ai/waste/optimize-route`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0269 — GET /api/waste/ward-forecast
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/waste/ward-forecast`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/waste/ward-forecast`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0270 — GET /api/ai/waste/ward-forecast
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/ai/waste/ward-forecast`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/ai/waste/ward-forecast`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0271 — GET /api/water/anomalies
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/water/anomalies`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/water/anomalies`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0272 — GET /api/ai/water/anomalies
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/ai/water/anomalies`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/ai/water/anomalies`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0273 — GET /api/ai/water/analyze
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/ai/water/analyze`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/ai/water/analyze`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0274 — POST /api/water/detect-anomalies
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`POST /api/water/detect-anomalies`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/water/detect-anomalies`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0275 — POST /api/ai/water/detect-anomalies
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`POST /api/ai/water/detect-anomalies`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/ai/water/detect-anomalies`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0276 — GET /api/water/demand-forecast
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/water/demand-forecast`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/water/demand-forecast`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0277 — GET /api/ai/water/demand-forecast
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/ai/water/demand-forecast`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/ai/water/demand-forecast`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0278 — GET /api/hospital/forecast
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/hospital/forecast`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/hospital/forecast`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0279 — GET /api/hospital/bed-surge
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/hospital/bed-surge`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/hospital/bed-surge`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0280 — GET /api/ai/hospital/bed-surge
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/ai/hospital/bed-surge`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/ai/hospital/bed-surge`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0281 — GET /api/ai/healthcare/analyze
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/ai/healthcare/analyze`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/ai/healthcare/analyze`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0282 — POST /api/hospital/recommend-bed
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`POST /api/hospital/recommend-bed`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/hospital/recommend-bed`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0283 — POST /api/ai/hospital/recommend-bed
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`POST /api/ai/hospital/recommend-bed`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/ai/hospital/recommend-bed`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0284 — POST /api/hospital/recommend-ambulance
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`POST /api/hospital/recommend-ambulance`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/hospital/recommend-ambulance`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0285 — POST /api/ai/hospital/recommend-ambulance
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`POST /api/ai/hospital/recommend-ambulance`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/ai/hospital/recommend-ambulance`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0286 — POST /api/hospital/qr-patient-access
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`POST /api/hospital/qr-patient-access`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/hospital/qr-patient-access`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0287 — POST /api/ai/hospital/qr-patient-access
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`POST /api/ai/hospital/qr-patient-access`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/ai/hospital/qr-patient-access`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0288 — GET /api/parking/prediction
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/parking/prediction`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/parking/prediction`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0289 — GET /api/parking/occupancy-forecast
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/parking/occupancy-forecast`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/parking/occupancy-forecast`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0290 — GET /api/ai/parking/occupancy-forecast
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/ai/parking/occupancy-forecast`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/ai/parking/occupancy-forecast`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0291 — GET /api/ai/parking/forecast
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/ai/parking/forecast`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/ai/parking/forecast`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0292 — GET /api/parking/recommend-alternative
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/parking/recommend-alternative`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/parking/recommend-alternative`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0293 — GET /api/ai/parking/recommend-alternative
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/ai/parking/recommend-alternative`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/ai/parking/recommend-alternative`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0294 — POST /api/parking/detect-illegal
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`POST /api/parking/detect-illegal`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/parking/detect-illegal`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0295 — POST /api/ai/parking/detect-illegal
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`POST /api/ai/parking/detect-illegal`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/ai/parking/detect-illegal`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0296 — GET /api/environment/aqi-forecast
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/environment/aqi-forecast`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/environment/aqi-forecast`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0297 — GET /api/ai/environment/aqi-forecast
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/ai/environment/aqi-forecast`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/ai/environment/aqi-forecast`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0298 — GET /api/disaster/flood-risk
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/disaster/flood-risk`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/disaster/flood-risk`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0299 — GET /api/ai/disaster/flood-risk
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/ai/disaster/flood-risk`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/ai/disaster/flood-risk`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0300 — GET /api/tourism/attractions
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/tourism/attractions`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/tourism/attractions`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0301 — GET /api/ai/tourist/attractions
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/ai/tourist/attractions`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/ai/tourist/attractions`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0302 — GET /api/ai/tourist/places
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/ai/tourist/places`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/ai/tourist/places`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0303 — GET /api/admin/command-center-executive
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/admin/command-center-executive`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/admin/command-center-executive`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0304 — GET /api/ai/command-center/executive
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/ai/command-center/executive`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/ai/command-center/executive`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0305 — POST /api/admin/what-if-simulation
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`POST /api/admin/what-if-simulation`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/admin/what-if-simulation`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0306 — POST /api/ai/simulation/what-if
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`POST /api/ai/simulation/what-if`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/ai/simulation/what-if`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0307 — GET /api/admin/resource-optimization
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/admin/resource-optimization`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/admin/resource-optimization`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0308 — GET /api/ai/admin/resource-optimization
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/ai/admin/resource-optimization`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/ai/admin/resource-optimization`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0309 — GET /api/ai/models/health
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/ai/models/health`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/ai/models/health`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0310 — GET /api/ai/models/monitoring
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/ai/models/monitoring`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/ai/models/monitoring`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0311 — GET /api/ai/explainability/:prediction_id
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/ai/explainability/:prediction_id`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/ai/explainability/:prediction_id`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0312 — GET /api/ai/predictions/:prediction_id/explain
- **Module**: AI
- **Feature**: AI API Handler
- **Function Name**: Route Handler (`GET /api/ai/predictions/:prediction_id/explain`)
- **File**: `backend/routes/ai.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/ai/predictions/:prediction_id/explain`
- **Database Tables**: Dependent on module (ai)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### Module: FAMOUS_PLACES (18 Endpoints)

#### F-API-0313 — GET /api/famous-places
- **Module**: FAMOUS_PLACES
- **Feature**: FAMOUS_PLACES API Handler
- **Function Name**: Route Handler (`GET /api/famous-places`)
- **File**: `backend/routes/famous_places.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/famous-places`
- **Database Tables**: Dependent on module (famous_places)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0314 — GET /api/famous-places/categories
- **Module**: FAMOUS_PLACES
- **Feature**: FAMOUS_PLACES API Handler
- **Function Name**: Route Handler (`GET /api/famous-places/categories`)
- **File**: `backend/routes/famous_places.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/famous-places/categories`
- **Database Tables**: Dependent on module (famous_places)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0315 — GET /api/famous-places/:identifier
- **Module**: FAMOUS_PLACES
- **Feature**: FAMOUS_PLACES API Handler
- **Function Name**: Route Handler (`GET /api/famous-places/:identifier`)
- **File**: `backend/routes/famous_places.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/famous-places/:identifier`
- **Database Tables**: Dependent on module (famous_places)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0316 — GET /api/famous-places/:id/nearby-services
- **Module**: FAMOUS_PLACES
- **Feature**: FAMOUS_PLACES API Handler
- **Function Name**: Route Handler (`GET /api/famous-places/:id/nearby-services`)
- **File**: `backend/routes/famous_places.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/famous-places/:id/nearby-services`
- **Database Tables**: Dependent on module (famous_places)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0317 — GET /api/famous-places/:id/nearby-atms
- **Module**: FAMOUS_PLACES
- **Feature**: FAMOUS_PLACES API Handler
- **Function Name**: Route Handler (`GET /api/famous-places/:id/nearby-atms`)
- **File**: `backend/routes/famous_places.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/famous-places/:id/nearby-atms`
- **Database Tables**: Dependent on module (famous_places)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0318 — GET /api/famous-places/:id/nearby-food
- **Module**: FAMOUS_PLACES
- **Feature**: FAMOUS_PLACES API Handler
- **Function Name**: Route Handler (`GET /api/famous-places/:id/nearby-food`)
- **File**: `backend/routes/famous_places.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/famous-places/:id/nearby-food`
- **Database Tables**: Dependent on module (famous_places)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0319 — GET /api/famous-places/:id/traffic-analysis
- **Module**: FAMOUS_PLACES
- **Feature**: FAMOUS_PLACES API Handler
- **Function Name**: Route Handler (`GET /api/famous-places/:id/traffic-analysis`)
- **File**: `backend/routes/famous_places.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/famous-places/:id/traffic-analysis`
- **Database Tables**: Dependent on module (famous_places)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0320 — GET /api/famous-places/:id/reviews
- **Module**: FAMOUS_PLACES
- **Feature**: FAMOUS_PLACES API Handler
- **Function Name**: Route Handler (`GET /api/famous-places/:id/reviews`)
- **File**: `backend/routes/famous_places.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/famous-places/:id/reviews`
- **Database Tables**: Dependent on module (famous_places)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0321 — POST /api/famous-places/:id/reviews
- **Module**: FAMOUS_PLACES
- **Feature**: FAMOUS_PLACES API Handler
- **Function Name**: Route Handler (`POST /api/famous-places/:id/reviews`)
- **File**: `backend/routes/famous_places.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/famous-places/:id/reviews`
- **Database Tables**: Dependent on module (famous_places)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0322 — POST /api/famous-places/:id/issues
- **Module**: FAMOUS_PLACES
- **Feature**: FAMOUS_PLACES API Handler
- **Function Name**: Route Handler (`POST /api/famous-places/:id/issues`)
- **File**: `backend/routes/famous_places.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/famous-places/:id/issues`
- **Database Tables**: Dependent on module (famous_places)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0323 — GET /api/famous-places/user/favorites
- **Module**: FAMOUS_PLACES
- **Feature**: FAMOUS_PLACES API Handler
- **Function Name**: Route Handler (`GET /api/famous-places/user/favorites`)
- **File**: `backend/routes/famous_places.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/famous-places/user/favorites`
- **Database Tables**: Dependent on module (famous_places)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0324 — POST /api/famous-places/:id/favorite
- **Module**: FAMOUS_PLACES
- **Feature**: FAMOUS_PLACES API Handler
- **Function Name**: Route Handler (`POST /api/famous-places/:id/favorite`)
- **File**: `backend/routes/famous_places.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/famous-places/:id/favorite`
- **Database Tables**: Dependent on module (famous_places)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0325 — POST /api/famous-places/trip-planner
- **Module**: FAMOUS_PLACES
- **Feature**: FAMOUS_PLACES API Handler
- **Function Name**: Route Handler (`POST /api/famous-places/trip-planner`)
- **File**: `backend/routes/famous_places.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/famous-places/trip-planner`
- **Database Tables**: Dependent on module (famous_places)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0326 — POST /api/famous-places/ai-assistant
- **Module**: FAMOUS_PLACES
- **Feature**: FAMOUS_PLACES API Handler
- **Function Name**: Route Handler (`POST /api/famous-places/ai-assistant`)
- **File**: `backend/routes/famous_places.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/famous-places/ai-assistant`
- **Database Tables**: Dependent on module (famous_places)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0327 — GET /api/admin/famous-places/issues
- **Module**: FAMOUS_PLACES
- **Feature**: FAMOUS_PLACES API Handler
- **Function Name**: Route Handler (`GET /api/admin/famous-places/issues`)
- **File**: `backend/routes/famous_places.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/admin/famous-places/issues`
- **Database Tables**: Dependent on module (famous_places)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0328 — PUT /api/admin/famous-places/issues/:id
- **Module**: FAMOUS_PLACES
- **Feature**: FAMOUS_PLACES API Handler
- **Function Name**: Route Handler (`PUT /api/admin/famous-places/issues/:id`)
- **File**: `backend/routes/famous_places.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/admin/famous-places/issues/:id`
- **Database Tables**: Dependent on module (famous_places)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0329 — POST /api/admin/famous-places
- **Module**: FAMOUS_PLACES
- **Feature**: FAMOUS_PLACES API Handler
- **Function Name**: Route Handler (`POST /api/admin/famous-places`)
- **File**: `backend/routes/famous_places.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/admin/famous-places`
- **Database Tables**: Dependent on module (famous_places)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0330 — DELETE /api/admin/famous-places/:id/reviews/:reviewId
- **Module**: FAMOUS_PLACES
- **Feature**: FAMOUS_PLACES API Handler
- **Function Name**: Route Handler (`DELETE /api/admin/famous-places/:id/reviews/:reviewId`)
- **File**: `backend/routes/famous_places.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `DELETE /api/admin/famous-places/:id/reviews/:reviewId`
- **Database Tables**: Dependent on module (famous_places)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### Module: TRAFFIC (67 Endpoints)

#### F-API-0331 — GET /api/traffic/junctions
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`GET /api/traffic/junctions`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/traffic/junctions`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0332 — GET /api/traffic/junctions/:id
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`GET /api/traffic/junctions/:id`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/traffic/junctions/:id`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0333 — GET /api/traffic/junctions/:id/webster-timing
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`GET /api/traffic/junctions/:id/webster-timing`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/traffic/junctions/:id/webster-timing`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0334 — POST /api/traffic/junctions
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`POST /api/traffic/junctions`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/traffic/junctions`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0335 — PUT /api/traffic/junctions/:id
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`PUT /api/traffic/junctions/:id`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/traffic/junctions/:id`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0336 — DELETE /api/traffic/junctions/:id
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`DELETE /api/traffic/junctions/:id`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `DELETE /api/traffic/junctions/:id`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0337 — GET /api/traffic/signals
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`GET /api/traffic/signals`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/traffic/signals`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0338 — POST /api/traffic/signals
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`POST /api/traffic/signals`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/traffic/signals`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0339 — PUT /api/traffic/signals/:id
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`PUT /api/traffic/signals/:id`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/traffic/signals/:id`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0340 — PUT /api/traffic/signals/:id/location
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`PUT /api/traffic/signals/:id/location`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/traffic/signals/:id/location`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0341 — DELETE /api/traffic/signals/:id
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`DELETE /api/traffic/signals/:id`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `DELETE /api/traffic/signals/:id`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0342 — PUT /api/traffic/junctions/:id/signals
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`PUT /api/traffic/junctions/:id/signals`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/traffic/junctions/:id/signals`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0343 — POST /api/traffic/junctions/:id/override
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`POST /api/traffic/junctions/:id/override`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/traffic/junctions/:id/override`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0344 — POST /api/traffic/signals/override
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`POST /api/traffic/signals/override`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/traffic/signals/override`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0345 — PUT /api/traffic/junctions/:id/override
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`PUT /api/traffic/junctions/:id/override`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/traffic/junctions/:id/override`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0346 — PUT /api/traffic/signals/override
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`PUT /api/traffic/signals/override`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/traffic/signals/override`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0347 — GET /api/traffic/cameras
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`GET /api/traffic/cameras`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/traffic/cameras`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0348 — GET /api/traffic/junctions/:id/cameras
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`GET /api/traffic/junctions/:id/cameras`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/traffic/junctions/:id/cameras`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0349 — POST /api/traffic/cameras/test-connection
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`POST /api/traffic/cameras/test-connection`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/traffic/cameras/test-connection`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0350 — POST /api/traffic/cameras
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`POST /api/traffic/cameras`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/traffic/cameras`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0351 — POST /api/traffic/junctions/:id/cameras
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`POST /api/traffic/junctions/:id/cameras`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/traffic/junctions/:id/cameras`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0352 — POST /api/traffic/cameras
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`POST /api/traffic/cameras`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/traffic/cameras`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0353 — PUT /api/traffic/cameras/:id
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`PUT /api/traffic/cameras/:id`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/traffic/cameras/:id`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0354 — DELETE /api/traffic/cameras/:id
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`DELETE /api/traffic/cameras/:id`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `DELETE /api/traffic/cameras/:id`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0355 — GET /api/traffic/cameras/:id/telemetry
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`GET /api/traffic/cameras/:id/telemetry`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/traffic/cameras/:id/telemetry`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0356 — POST /api/traffic/cameras/:id/traffic-feed
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`POST /api/traffic/cameras/:id/traffic-feed`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/traffic/cameras/:id/traffic-feed`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0357 — GET /api/traffic/cameras/:id/ai-vision
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`GET /api/traffic/cameras/:id/ai-vision`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/traffic/cameras/:id/ai-vision`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0358 — POST /api/traffic/cameras/:id/sync-ai-flow
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`POST /api/traffic/cameras/:id/sync-ai-flow`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/traffic/cameras/:id/sync-ai-flow`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0359 — GET /api/traffic/junctions/:id/camera-traffic-summary
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`GET /api/traffic/junctions/:id/camera-traffic-summary`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/traffic/junctions/:id/camera-traffic-summary`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0360 — GET /api/traffic/violations/search
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`GET /api/traffic/violations/search`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/traffic/violations/search`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0361 — POST /api/traffic/violations/:id/pay
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`POST /api/traffic/violations/:id/pay`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/traffic/violations/:id/pay`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0362 — GET /api/traffic/violations
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`GET /api/traffic/violations`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/traffic/violations`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0363 — GET /api/traffic/violations/:id/evidence
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`GET /api/traffic/violations/:id/evidence`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/traffic/violations/:id/evidence`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0364 — POST /api/traffic/violations
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`POST /api/traffic/violations`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/traffic/violations`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0365 — PUT /api/traffic/violations/:id/review
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`PUT /api/traffic/violations/:id/review`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/traffic/violations/:id/review`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0366 — GET /api/traffic/movement-rules
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`GET /api/traffic/movement-rules`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/traffic/movement-rules`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0367 — POST /api/traffic/movement-rules
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`POST /api/traffic/movement-rules`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/traffic/movement-rules`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0368 — PUT /api/traffic/movement-rules/:id/toggle
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`PUT /api/traffic/movement-rules/:id/toggle`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/traffic/movement-rules/:id/toggle`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0369 — GET /api/traffic/incidents
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`GET /api/traffic/incidents`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/traffic/incidents`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0370 — POST /api/traffic/incidents
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`POST /api/traffic/incidents`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/traffic/incidents`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0371 — PUT /api/traffic/incidents/:id/status
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`PUT /api/traffic/incidents/:id/status`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/traffic/incidents/:id/status`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0372 — PUT /api/traffic/incidents/:id
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`PUT /api/traffic/incidents/:id`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/traffic/incidents/:id`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0373 — DELETE /api/traffic/incidents/:id
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`DELETE /api/traffic/incidents/:id`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `DELETE /api/traffic/incidents/:id`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0374 — GET /api/traffic/corridors
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`GET /api/traffic/corridors`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/traffic/corridors`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0375 — POST /api/traffic/corridors/dispatch
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`POST /api/traffic/corridors/dispatch`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/traffic/corridors/dispatch`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0376 — POST /api/traffic/corridors/:id/deactivate
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`POST /api/traffic/corridors/:id/deactivate`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/traffic/corridors/:id/deactivate`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0377 — GET /api/traffic/alternative-routes
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`GET /api/traffic/alternative-routes`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/traffic/alternative-routes`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0378 — GET /api/traffic/parking-lots
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`GET /api/traffic/parking-lots`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/traffic/parking-lots`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0379 — GET /api/traffic/ai-insights
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`GET /api/traffic/ai-insights`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/traffic/ai-insights`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0380 — POST /api/traffic/ai-recommendation/apply
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`POST /api/traffic/ai-recommendation/apply`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/traffic/ai-recommendation/apply`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0381 — GET /api/traffic/admin/users
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`GET /api/traffic/admin/users`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/traffic/admin/users`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0382 — POST /api/traffic/admin/users
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`POST /api/traffic/admin/users`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/traffic/admin/users`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0383 — GET /api/traffic/admin/audit-logs
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`GET /api/traffic/admin/audit-logs`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/traffic/admin/audit-logs`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0384 — GET /api/traffic/audit-logs
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`GET /api/traffic/audit-logs`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/traffic/audit-logs`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0385 — GET /api/traffic/admin/ai-settings
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`GET /api/traffic/admin/ai-settings`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/traffic/admin/ai-settings`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0386 — PUT /api/traffic/admin/ai-settings
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`PUT /api/traffic/admin/ai-settings`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/traffic/admin/ai-settings`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: Enforced (Specific Role Check)
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0387 — GET /api/traffic/analytics/summary
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`GET /api/traffic/analytics/summary`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/traffic/analytics/summary`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0388 — GET /api/traffic/dashboard-metrics
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`GET /api/traffic/dashboard-metrics`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/traffic/dashboard-metrics`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0389 — GET /api/traffic/analytics/historical
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`GET /api/traffic/analytics/historical`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/traffic/analytics/historical`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0390 — GET /api/traffic/waterlogging
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`GET /api/traffic/waterlogging`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/traffic/waterlogging`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0391 — GET /api/traffic/reports/export-csv
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`GET /api/traffic/reports/export-csv`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/traffic/reports/export-csv`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0392 — GET /api/traffic/vms-boards
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`GET /api/traffic/vms-boards`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/traffic/vms-boards`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0393 — POST /api/traffic/vms-boards/:id/message
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`POST /api/traffic/vms-boards/:id/message`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/traffic/vms-boards/:id/message`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0394 — POST /api/traffic/commute-alerts/subscribe
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`POST /api/traffic/commute-alerts/subscribe`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/traffic/commute-alerts/subscribe`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0395 — GET /api/traffic/ambulances/live
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`GET /api/traffic/ambulances/live`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/traffic/ambulances/live`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0396 — POST /api/traffic/ambulances/:id/critical-dispatch
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`POST /api/traffic/ambulances/:id/critical-dispatch`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/traffic/ambulances/:id/critical-dispatch`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0397 — POST /api/traffic/ambulances/:id/clear-critical
- **Module**: TRAFFIC
- **Feature**: TRAFFIC API Handler
- **Function Name**: Route Handler (`POST /api/traffic/ambulances/:id/clear-critical`)
- **File**: `backend/routes/traffic.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/traffic/ambulances/:id/clear-critical`
- **Database Tables**: Dependent on module (traffic)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### Module: REQUESTS (7 Endpoints)

#### F-API-0398 — POST /api/requests
- **Module**: REQUESTS
- **Feature**: REQUESTS API Handler
- **Function Name**: Route Handler (`POST /api/requests`)
- **File**: `backend/routes/requests.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/requests`
- **Database Tables**: Dependent on module (requests)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0399 — GET /api/requests
- **Module**: REQUESTS
- **Feature**: REQUESTS API Handler
- **Function Name**: Route Handler (`GET /api/requests`)
- **File**: `backend/routes/requests.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/requests`
- **Database Tables**: Dependent on module (requests)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0400 — GET /api/requests/:id
- **Module**: REQUESTS
- **Feature**: REQUESTS API Handler
- **Function Name**: Route Handler (`GET /api/requests/:id`)
- **File**: `backend/routes/requests.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/requests/:id`
- **Database Tables**: Dependent on module (requests)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0401 — PUT /api/requests/:id/assign
- **Module**: REQUESTS
- **Feature**: REQUESTS API Handler
- **Function Name**: Route Handler (`PUT /api/requests/:id/assign`)
- **File**: `backend/routes/requests.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/requests/:id/assign`
- **Database Tables**: Dependent on module (requests)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0402 — PUT /api/requests/:id/status
- **Module**: REQUESTS
- **Feature**: REQUESTS API Handler
- **Function Name**: Route Handler (`PUT /api/requests/:id/status`)
- **File**: `backend/routes/requests.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/requests/:id/status`
- **Database Tables**: Dependent on module (requests)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0403 — GET /api/staff/my-tasks
- **Module**: REQUESTS
- **Feature**: REQUESTS API Handler
- **Function Name**: Route Handler (`GET /api/staff/my-tasks`)
- **File**: `backend/routes/requests.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/staff/my-tasks`
- **Database Tables**: Dependent on module (requests)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0404 — POST /api/requests/:id/feedback
- **Module**: REQUESTS
- **Feature**: REQUESTS API Handler
- **Function Name**: Route Handler (`POST /api/requests/:id/feedback`)
- **File**: `backend/routes/requests.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/requests/:id/feedback`
- **Database Tables**: Dependent on module (requests)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### Module: NOTIFICATIONS (4 Endpoints)

#### F-API-0405 — GET /api/notifications
- **Module**: NOTIFICATIONS
- **Feature**: NOTIFICATIONS API Handler
- **Function Name**: Route Handler (`GET /api/notifications`)
- **File**: `backend/routes/notifications.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/notifications`
- **Database Tables**: Dependent on module (notifications)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0406 — GET /api/notifications/unread-count
- **Module**: NOTIFICATIONS
- **Feature**: NOTIFICATIONS API Handler
- **Function Name**: Route Handler (`GET /api/notifications/unread-count`)
- **File**: `backend/routes/notifications.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/notifications/unread-count`
- **Database Tables**: Dependent on module (notifications)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0407 — PUT /api/notifications/:id/read
- **Module**: NOTIFICATIONS
- **Feature**: NOTIFICATIONS API Handler
- **Function Name**: Route Handler (`PUT /api/notifications/:id/read`)
- **File**: `backend/routes/notifications.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/notifications/:id/read`
- **Database Tables**: Dependent on module (notifications)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0408 — PUT /api/notifications/read-all
- **Module**: NOTIFICATIONS
- **Feature**: NOTIFICATIONS API Handler
- **Function Name**: Route Handler (`PUT /api/notifications/read-all`)
- **File**: `backend/routes/notifications.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/notifications/read-all`
- **Database Tables**: Dependent on module (notifications)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### Module: STREET_LIGHTS (4 Endpoints)

#### F-API-0409 — GET /api/street-lights
- **Module**: STREET_LIGHTS
- **Feature**: STREET_LIGHTS API Handler
- **Function Name**: Route Handler (`GET /api/street-lights`)
- **File**: `backend/routes/street_lights.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/street-lights`
- **Database Tables**: Dependent on module (street_lights)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0410 — GET /api/street-lights/faults
- **Module**: STREET_LIGHTS
- **Feature**: STREET_LIGHTS API Handler
- **Function Name**: Route Handler (`GET /api/street-lights/faults`)
- **File**: `backend/routes/street_lights.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/street-lights/faults`
- **Database Tables**: Dependent on module (street_lights)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0411 — POST /api/street-lights
- **Module**: STREET_LIGHTS
- **Feature**: STREET_LIGHTS API Handler
- **Function Name**: Route Handler (`POST /api/street-lights`)
- **File**: `backend/routes/street_lights.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/street-lights`
- **Database Tables**: Dependent on module (street_lights)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0412 — PUT /api/street-lights/:id/status
- **Module**: STREET_LIGHTS
- **Feature**: STREET_LIGHTS API Handler
- **Function Name**: Route Handler (`PUT /api/street-lights/:id/status`)
- **File**: `backend/routes/street_lights.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/street-lights/:id/status`
- **Database Tables**: Dependent on module (street_lights)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### Module: ENVIRONMENT (3 Endpoints)

#### F-API-0413 — GET /api/environment/aqi
- **Module**: ENVIRONMENT
- **Feature**: ENVIRONMENT API Handler
- **Function Name**: Route Handler (`GET /api/environment/aqi`)
- **File**: `backend/routes/environment.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/environment/aqi`
- **Database Tables**: Dependent on module (environment)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0414 — GET /api/environment/stations
- **Module**: ENVIRONMENT
- **Feature**: ENVIRONMENT API Handler
- **Function Name**: Route Handler (`GET /api/environment/stations`)
- **File**: `backend/routes/environment.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/environment/stations`
- **Database Tables**: Dependent on module (environment)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0415 — PUT /api/environment/sensors/:id
- **Module**: ENVIRONMENT
- **Feature**: ENVIRONMENT API Handler
- **Function Name**: Route Handler (`PUT /api/environment/sensors/:id`)
- **File**: `backend/routes/environment.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/environment/sensors/:id`
- **Database Tables**: Dependent on module (environment)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### Module: ADMIN (7 Endpoints)

#### F-API-0416 — GET /api/admin/command-center
- **Module**: ADMIN
- **Feature**: ADMIN API Handler
- **Function Name**: Route Handler (`GET /api/admin/command-center`)
- **File**: `backend/routes/admin.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/admin/command-center`
- **Database Tables**: Dependent on module (admin)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0417 — GET /api/admin/stats
- **Module**: ADMIN
- **Feature**: ADMIN API Handler
- **Function Name**: Route Handler (`GET /api/admin/stats`)
- **File**: `backend/routes/admin.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/admin/stats`
- **Database Tables**: Dependent on module (admin)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0418 — GET /api/admin/audit-logs
- **Module**: ADMIN
- **Feature**: ADMIN API Handler
- **Function Name**: Route Handler (`GET /api/admin/audit-logs`)
- **File**: `backend/routes/admin.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/admin/audit-logs`
- **Database Tables**: Dependent on module (admin)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0419 — GET /api/admin/users
- **Module**: ADMIN
- **Feature**: ADMIN API Handler
- **Function Name**: Route Handler (`GET /api/admin/users`)
- **File**: `backend/routes/admin.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/admin/users`
- **Database Tables**: Dependent on module (admin)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0420 — GET /api/admin/staff
- **Module**: ADMIN
- **Feature**: ADMIN API Handler
- **Function Name**: Route Handler (`GET /api/admin/staff`)
- **File**: `backend/routes/admin.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/admin/staff`
- **Database Tables**: Dependent on module (admin)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0421 — PUT /api/admin/users/:id/role
- **Module**: ADMIN
- **Feature**: ADMIN API Handler
- **Function Name**: Route Handler (`PUT /api/admin/users/:id/role`)
- **File**: `backend/routes/admin.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `PUT /api/admin/users/:id/role`
- **Database Tables**: Dependent on module (admin)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0422 — GET /api/admin/analytics
- **Module**: ADMIN
- **Feature**: ADMIN API Handler
- **Function Name**: Route Handler (`GET /api/admin/analytics`)
- **File**: `backend/routes/admin.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/admin/analytics`
- **Database Tables**: Dependent on module (admin)
- **Authentication Requirement**: Required (Bearer JWT)
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### Module: SEARCH (1 Endpoints)

#### F-API-0423 — GET /api/search
- **Module**: SEARCH
- **Feature**: SEARCH API Handler
- **Function Name**: Route Handler (`GET /api/search`)
- **File**: `backend/routes/search.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/search`
- **Database Tables**: Dependent on module (search)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### Module: MAP (1 Endpoints)

#### F-API-0424 — GET /api/map/incidents
- **Module**: MAP
- **Feature**: MAP API Handler
- **Function Name**: Route Handler (`GET /api/map/incidents`)
- **File**: `backend/routes/map.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/map/incidents`
- **Database Tables**: Dependent on module (map)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### Module: ANALYTICS (2 Endpoints)

#### F-API-0425 — POST /api/analytics/event
- **Module**: ANALYTICS
- **Feature**: ANALYTICS API Handler
- **Function Name**: Route Handler (`POST /api/analytics/event`)
- **File**: `backend/routes/analytics.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `POST /api/analytics/event`
- **Database Tables**: Dependent on module (analytics)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

#### F-API-0426 — GET /api/analytics/summary
- **Module**: ANALYTICS
- **Feature**: ANALYTICS API Handler
- **Function Name**: Route Handler (`GET /api/analytics/summary`)
- **File**: `backend/routes/analytics.routes.js`
- **Type**: Backend / API
- **Input**: Headers: `{ Accept, Authorization? }`, Params/Query/Body
- **Expected Output**: JSON Response `{ success: boolean, data?: any, message?: string }`
- **Dependencies**: Express Router, MySQL connection pool, controller/service
- **API Endpoint**: `GET /api/analytics/summary`
- **Database Tables**: Dependent on module (analytics)
- **Authentication Requirement**: Public / Optional
- **RBAC Requirement**: None / Inherited
- **Realtime Dependency**: Socket.io notifications on mutations
- **AI Dependency**: Enabled where route interacts with AI predictions
- **Map Dependency**: Enabled where route returns coordinates
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

## 7. Frontend Interactive Component & Page Inventory

### F-PAGE-001 — Page: `frontend/403.html`
- **Module**: Frontend UI
- **Feature**: Interactive Page View (0 Buttons, 0 Forms, 0 Action Links)
- **File**: `frontend/403.html`
- **Type**: Frontend / HTML & DOM
- **Forms Defined**:
  - No explicit HTML form tags (uses asynchronous button action handlers)
- **Primary Action Buttons Sample**:
- **Authentication Requirement**: Contextual (Public view with citizen/staff restricted sections)
- **RBAC Requirement**: Multi-role support (Citizen, Staff, Operator, Admin)
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-PAGE-002 — Page: `frontend/404.html`
- **Module**: Frontend UI
- **Feature**: Interactive Page View (0 Buttons, 0 Forms, 0 Action Links)
- **File**: `frontend/404.html`
- **Type**: Frontend / HTML & DOM
- **Forms Defined**:
  - No explicit HTML form tags (uses asynchronous button action handlers)
- **Primary Action Buttons Sample**:
- **Authentication Requirement**: Contextual (Public view with citizen/staff restricted sections)
- **RBAC Requirement**: Multi-role support (Citizen, Staff, Operator, Admin)
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-PAGE-003 — Page: `frontend/500.html`
- **Module**: Frontend UI
- **Feature**: Interactive Page View (1 Buttons, 0 Forms, 0 Action Links)
- **File**: `frontend/500.html`
- **Type**: Frontend / HTML & DOM
- **Forms Defined**:
  - No explicit HTML form tags (uses asynchronous button action handlers)
- **Primary Action Buttons Sample**:
  - Button: "🔄 Retry Request" | ID: `none` | Class: `btn-secondary` | OnClick: `window.location.reload()`
- **Authentication Requirement**: Contextual (Public view with citizen/staff restricted sections)
- **RBAC Requirement**: Multi-role support (Citizen, Staff, Operator, Admin)
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-PAGE-004 — Page: `frontend/index.html`
- **Module**: Frontend UI
- **Feature**: Interactive Page View (37 Buttons, 1 Forms, 14 Action Links)
- **File**: `frontend/index.html`
- **Type**: Frontend / HTML & DOM
- **Forms Defined**:
  - Form ID: `scGrievanceForm` | OnSubmit: `handleGrievanceSubmit(event)`
- **Primary Action Buttons Sample**:
  - Button: "📋 Lodge Grievance" | ID: `none` | Class: `sc-btn-hero-secondary` | OnClick: `openGrievanceModal()`
  - Button: "🚨 Dispatch Municipal Emergency" | ID: `none` | Class: `sc-btn-hero-primary` | OnClick: `window.location.href=`
  - Button: "🗑️" | ID: `clearChatBtn` | Class: `none` | OnClick: `via JS listener`
  - Button: "🅿️ Parking at Golghar" | ID: `none` | Class: `ai-chip` | OnClick: `handleQuickPrompt(`
  - Button: "🚨 Emergency 108" | ID: `none` | Class: `ai-chip` | OnClick: `handleQuickPrompt(`
  - Button: "🏥 Hospital Beds" | ID: `none` | Class: `ai-chip` | OnClick: `handleQuickPrompt(`
  - Button: "💧 Water Timings" | ID: `none` | Class: `ai-chip` | OnClick: `handleQuickPrompt(`
  - Button: "🎤" | ID: `aiVoiceBtn` | Class: `ai-voice-btn` | OnClick: `via JS listener`
  - Button: "🔊" | ID: `aiSpeakerBtn` | Class: `ai-speaker-btn` | OnClick: `via JS listener`
  - Button: "Send ➔" | ID: `sendButton` | Class: `none` | OnClick: `via JS listener`
  - ... plus 27 additional interactive buttons
- **Authentication Requirement**: Contextual (Public view with citizen/staff restricted sections)
- **RBAC Requirement**: Multi-role support (Citizen, Staff, Operator, Admin)
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-PAGE-005 — Page: `frontend/pages\emergency\emergency.html`
- **Module**: Frontend UI
- **Feature**: Interactive Page View (29 Buttons, 0 Forms, 3 Action Links)
- **File**: `frontend/pages\emergency\emergency.html`
- **Type**: Frontend / HTML & DOM
- **Forms Defined**:
  - No explicit HTML form tags (uses asynchronous button action handlers)
- **Primary Action Buttons Sample**:
  - Button: "🚨 1. Citizen Emergency Helplines & SOS" | ID: `tab-btn-citizen` | Class: `layer-tab-btn active` | OnClick: `switchEmergencyLayer(`
  - Button: "⚡ 2. First Responder & Dispatch Operations" | ID: `tab-btn-staff` | Class: `layer-tab-btn` | OnClick: `switchEmergencyLayer(`
  - Button: "⚙️ 3. Disaster Management Admin & Fleet" | ID: `tab-btn-admin` | Class: `layer-tab-btn` | OnClick: `switchEmergencyLayer(`
  - Button: "🚨 Report Emergency" | ID: `none` | Class: `danger-btn` | OnClick: `openEmergencyModal()`
  - Button: "📍 Share Location" | ID: `none` | Class: `location-btn` | OnClick: `getCurrentLocation()`
  - Button: "📞 Call" | ID: `none` | Class: `none` | OnClick: `callEmergency(`
  - Button: "📞 Call" | ID: `none` | Class: `none` | OnClick: `callEmergency(`
  - Button: "📞 Call" | ID: `none` | Class: `none` | OnClick: `callEmergency(`
  - Button: "📞 Call" | ID: `none` | Class: `none` | OnClick: `callEmergency(`
  - Button: "Request Ambulance" | ID: `none` | Class: `none` | OnClick: `requestAmbulance()`
  - ... plus 19 additional interactive buttons
- **Authentication Requirement**: Contextual (Public view with citizen/staff restricted sections)
- **RBAC Requirement**: Multi-role support (Citizen, Staff, Operator, Admin)
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-PAGE-006 — Page: `frontend/pages\famous\famous.html`
- **Module**: Frontend UI
- **Feature**: Interactive Page View (62 Buttons, 1 Forms, 0 Action Links)
- **File**: `frontend/pages\famous\famous.html`
- **Type**: Frontend / HTML & DOM
- **Forms Defined**:
  - Form ID: `fieldIssueForm` | OnSubmit: `submitFieldIssue(event)`
- **Primary Action Buttons Sample**:
  - Button: "⭐ Saved Places" | ID: `none` | Class: `nav-action-btn` | OnClick: `openSavedPlacesModal()`
  - Button: "🛡️ Staff Portal" | ID: `adminPortalBtn` | Class: `nav-action-btn` | OnClick: `openAdminModal()`
  - Button: "🏛️ 1. Tourist & Heritage Explorer" | ID: `tab-btn-citizen` | Class: `layer-tab-btn active` | OnClick: `switchFamousLayer(`
  - Button: "⚡ 2. Tourism Officer & Field Duty" | ID: `tab-btn-staff` | Class: `layer-tab-btn` | OnClick: `switchFamousLayer(`
  - Button: "⚙️ 3. Tourism Board & Heritage Analytics" | ID: `tab-btn-admin` | Class: `layer-tab-btn` | OnClick: `switchFamousLayer(`
  - Button: "🧭 Explore Interactive Map" | ID: `none` | Class: `primary-btn` | OnClick: `scrollToMap()`
  - Button: "✨ Plan My Trip" | ID: `none` | Class: `secondary-btn` | OnClick: `openTripPlannerModal()`
  - Button: "🤖 AI Tourist Guide" | ID: `none` | Class: `secondary-btn` | OnClick: `openAIDrawer()`
  - Button: "✕ Clear Filters" | ID: `clearFiltersBtn` | Class: `clear-filter-btn` | OnClick: `resetFilters()`
  - Button: "🌟 All Places 14" | ID: `countAll` | Class: `cat-chip active` | OnClick: `selectCategory(`
  - ... plus 52 additional interactive buttons
- **Authentication Requirement**: Contextual (Public view with citizen/staff restricted sections)
- **RBAC Requirement**: Multi-role support (Citizen, Staff, Operator, Admin)
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-PAGE-007 — Page: `frontend/pages\hospital\doctor_dashboard.html`
- **Module**: Frontend UI
- **Feature**: Interactive Page View (8 Buttons, 0 Forms, 0 Action Links)
- **File**: `frontend/pages\hospital\doctor_dashboard.html`
- **Type**: Frontend / HTML & DOM
- **Forms Defined**:
  - No explicit HTML form tags (uses asynchronous button action handlers)
- **Primary Action Buttons Sample**:
  - Button: "All" | ID: `none` | Class: `filter-chip active` | OnClick: `filterQueue(`
  - Button: "Waiting" | ID: `none` | Class: `filter-chip` | OnClick: `filterQueue(`
  - Button: "In Progress" | ID: `none` | Class: `filter-chip` | OnClick: `filterQueue(`
  - Button: "Done" | ID: `none` | Class: `filter-chip` | OnClick: `filterQueue(`
  - Button: "📹 Start Camera Scan" | ID: `btnStartCamera` | Class: `btn btn-primary` | OnClick: `startCameraScanner()`
  - Button: "⏹️ Stop Camera" | ID: `btnStopCamera` | Class: `btn btn-secondary` | OnClick: `stopCameraScanner()`
  - Button: "🔍 Open Dossier" | ID: `none` | Class: `btn btn-primary` | OnClick: `lookupPatientFromInput()`
  - Button: "✕" | ID: `none` | Class: `modal-close` | OnClick: `closeDossierModal()`
- **Authentication Requirement**: Contextual (Public view with citizen/staff restricted sections)
- **RBAC Requirement**: Multi-role support (Citizen, Staff, Operator, Admin)
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-PAGE-008 — Page: `frontend/pages\hospital\hospital.html`
- **Module**: Frontend UI
- **Feature**: Interactive Page View (95 Buttons, 2 Forms, 0 Action Links)
- **File**: `frontend/pages\hospital\hospital.html`
- **Type**: Frontend / HTML & DOM
- **Forms Defined**:
  - Form ID: `patientForm` | OnSubmit: `via addEventListener`
  - Form ID: `prescriptionForm` | OnSubmit: `via addEventListener`
- **Primary Action Buttons Sample**:
  - Button: "🏥 1. Citizen Healthcare & Patient Services" | ID: `tab-btn-citizen` | Class: `layer-tab-btn active` | OnClick: `switchHospitalLayer(`
  - Button: "⚡ 2. Medical Staff & Ward Operations" | ID: `tab-btn-staff` | Class: `layer-tab-btn` | OnClick: `switchHospitalLayer(`
  - Button: "⚙️ 3. Hospital Administration & Bed Inventory" | ID: `tab-btn-admin` | Class: `layer-tab-btn` | OnClick: `switchHospitalLayer(`
  - Button: "📅 Book Doctor" | ID: `none` | Class: `primary-btn` | OnClick: `openDoctorBooking()`
  - Button: "🚨 Emergency" | ID: `none` | Class: `secondary-btn` | OnClick: `openEmergency()`
  - Button: "👨‍⚕️ Doctor Portal" | ID: `none` | Class: `secondary-btn` | OnClick: `openDoctorLoginModal()`
  - Button: "🔄 Refresh Audit Stream" | ID: `none` | Class: `secondary-btn` | OnClick: `loadAIHealthcareAuditTable()`
  - Button: "⚡ Run AI Surge Analysis" | ID: `none` | Class: `primary-btn` | OnClick: `runAIHealthcareAnalysis()`
  - Button: "🌟 All Services 12" | ID: `none` | Class: `cat-pill active` | OnClick: `filterServiceCards(`
  - Button: "🩺 Doctors & OPD 4" | ID: `none` | Class: `cat-pill` | OnClick: `filterServiceCards(`
  - ... plus 85 additional interactive buttons
- **Authentication Requirement**: Contextual (Public view with citizen/staff restricted sections)
- **RBAC Requirement**: Multi-role support (Citizen, Staff, Operator, Admin)
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-PAGE-009 — Page: `frontend/pages\hospital\hospital_dashboard.html`
- **Module**: Frontend UI
- **Feature**: Interactive Page View (42 Buttons, 6 Forms, 0 Action Links)
- **File**: `frontend/pages\hospital\hospital_dashboard.html`
- **Type**: Frontend / HTML & DOM
- **Forms Defined**:
  - Form ID: `dashboardStaffLoginForm` | OnSubmit: `handleDashboardStaffLogin(event)`
  - Form ID: `offlineBookingForm` | OnSubmit: `handleOfflineBookingSubmit(event)`
  - Form ID: `publishReportForm` | OnSubmit: `handlePublishReportSubmit(event)`
  - Form ID: `assignBedForm` | OnSubmit: `handleAssignBedSubmit(event)`
  - Form ID: `createInvoiceForm` | OnSubmit: `handleCreateInvoiceSubmit(event)`
  - Form ID: `registerWalkInForm` | OnSubmit: `handleRegisterWalkInSubmit(event)`
- **Primary Action Buttons Sample**:
  - Button: "🔓 Verify & Enter Hospital Dashboard" | ID: `none` | Class: `hd-btn hd-btn-primary` | OnClick: `via JS listener`
  - Button: "⚡ Quick Demo Access (Dr. Alok Verma - Admin)" | ID: `none` | Class: `hd-btn` | OnClick: `quickDemoStaffLogin()`
  - Button: "🔄 Refresh Stats" | ID: `none` | Class: `hd-btn hd-btn-outline hd-btn-sm` | OnClick: `refreshDashboardData()`
  - Button: "➕ Register Walk-in Patient" | ID: `none` | Class: `hd-btn hd-btn-primary` | OnClick: `openRegisterWalkInModal()`
  - Button: "📋 Offline Test Booking (Reception)" | ID: `none` | Class: `hd-btn hd-btn-success` | OnClick: `openOfflineBookingModal()`
  - Button: "➕ Add Diagnostic Test" | ID: `none` | Class: `hd-btn hd-btn-primary` | OnClick: `openAddNewTestModal()`
  - Button: "📁 Add Category" | ID: `none` | Class: `hd-btn hd-btn-outline` | OnClick: `openAddNewCategoryModal()`
  - Button: "🔬 Diagnostic Tests Catalog" | ID: `none` | Class: `hd-cat-pill active` | OnClick: `switchDiagSubTab(`
  - Button: "⚡ Live Test Queue & Tokens" | ID: `none` | Class: `hd-cat-pill` | OnClick: `switchDiagSubTab(`
  - Button: "🩸 Sample Collection Desk" | ID: `none` | Class: `hd-cat-pill` | OnClick: `switchDiagSubTab(`
  - ... plus 32 additional interactive buttons
- **Authentication Requirement**: Contextual (Public view with citizen/staff restricted sections)
- **RBAC Requirement**: Multi-role support (Citizen, Staff, Operator, Admin)
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-PAGE-010 — Page: `frontend/pages\parking\parking.html`
- **Module**: Frontend UI
- **Feature**: Interactive Page View (99 Buttons, 3 Forms, 5 Action Links)
- **File**: `frontend/pages\parking\parking.html`
- **Type**: Frontend / HTML & DOM
- **Forms Defined**:
  - Form ID: `slotBookingForm` | OnSubmit: `submitSlotBooking(event)`
  - Form ID: `addLotForm` | OnSubmit: `submitAddLot(event)`
  - Form ID: `editLotForm` | OnSubmit: `submitEditLot(event)`
- **Primary Action Buttons Sample**:
  - Button: "CU
                
                    Sign In" | ID: `userBadgeBtn` | Class: `user-badge-btn` | OnClick: `toggleUserDropdown(event)`
  - Button: "👤 1. Citizen Parking Services" | ID: `tab-btn-citizen` | Class: `layer-tab-btn active` | OnClick: `switchParkingLayer(`
  - Button: "⚡ 2. Staff Operations & Barrier Booth" | ID: `tab-btn-staff` | Class: `layer-tab-btn` | OnClick: `switchParkingLayer(`
  - Button: "⚙️ 3. Admin & ICCC Asset Management" | ID: `tab-btn-admin` | Class: `layer-tab-btn` | OnClick: `switchParkingLayer(`
  - Button: "🅿️ Find Parking" | ID: `none` | Class: `none` | OnClick: `scrollToParking()`
  - Button: "⚙️ Staff Control" | ID: `none` | Class: `secondary-btn` | OnClick: `openParkingStaffPanel()`
  - Button: "🔄 Refresh Audit Stream" | ID: `none` | Class: `btn-secondary` | OnClick: `loadAIParkingAuditTable()`
  - Button: "⚡ Forecast Demand" | ID: `none` | Class: `btn-primary` | OnClick: `runAIParkingForecast()`
  - Button: "Book Slot" | ID: `none` | Class: `none` | OnClick: `bookParking(`
  - Button: "Book Slot" | ID: `none` | Class: `none` | OnClick: `bookParking(`
  - ... plus 89 additional interactive buttons
- **Authentication Requirement**: Contextual (Public view with citizen/staff restricted sections)
- **RBAC Requirement**: Multi-role support (Citizen, Staff, Operator, Admin)
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-PAGE-011 — Page: `frontend/pages\police\police.html`
- **Module**: Frontend UI
- **Feature**: Interactive Page View (12 Buttons, 0 Forms, 0 Action Links)
- **File**: `frontend/pages\police\police.html`
- **Type**: Frontend / HTML & DOM
- **Forms Defined**:
  - No explicit HTML form tags (uses asynchronous button action handlers)
- **Primary Action Buttons Sample**:
  - Button: "👤 1. Citizen Police Services & Public FIR" | ID: `tab-btn-citizen` | Class: `layer-tab-btn active` | OnClick: `switchPoliceLayer(`
  - Button: "⚡ 2. Police Staff Operations & Dispatch" | ID: `tab-btn-staff` | Class: `layer-tab-btn` | OnClick: `switchPoliceLayer(`
  - Button: "⚙️ 3. ICCC Police Admin & Crime Intelligence" | ID: `tab-btn-admin` | Class: `layer-tab-btn` | OnClick: `switchPoliceLayer(`
  - Button: "🚨 View Incidents" | ID: `none` | Class: `none` | OnClick: `scrollToIncidents()`
  - Button: "👮 Police Staff Access" | ID: `none` | Class: `secondary-btn` | OnClick: `switchPoliceLayer(`
  - Button: "Check Status" | ID: `none` | Class: `none` | OnClick: `alert(`
  - Button: "⚡ Log in as Police Staff (POL001)" | ID: `none` | Class: `primary-btn` | OnClick: `promptPoliceStaffLogin()`
  - Button: "📍 Use My Location" | ID: `none` | Class: `none` | OnClick: `getPoliceLocation()`
  - Button: "✓ Resolve / Close" | ID: `none` | Class: `resolve-btn` | OnClick: `resolvePoliceCase()`
  - Button: "💾 Save Police Changes" | ID: `none` | Class: `save-control-btn` | OnClick: `savePoliceIncident()`
  - ... plus 2 additional interactive buttons
- **Authentication Requirement**: Contextual (Public view with citizen/staff restricted sections)
- **RBAC Requirement**: Multi-role support (Citizen, Staff, Operator, Admin)
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-PAGE-012 — Page: `frontend/pages\privacy-policy.html`
- **Module**: Frontend UI
- **Feature**: Interactive Page View (0 Buttons, 0 Forms, 0 Action Links)
- **File**: `frontend/pages\privacy-policy.html`
- **Type**: Frontend / HTML & DOM
- **Forms Defined**:
  - No explicit HTML form tags (uses asynchronous button action handlers)
- **Primary Action Buttons Sample**:
- **Authentication Requirement**: Contextual (Public view with citizen/staff restricted sections)
- **RBAC Requirement**: Multi-role support (Citizen, Staff, Operator, Admin)
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-PAGE-013 — Page: `frontend/pages\terms-and-conditions.html`
- **Module**: Frontend UI
- **Feature**: Interactive Page View (0 Buttons, 0 Forms, 0 Action Links)
- **File**: `frontend/pages\terms-and-conditions.html`
- **Type**: Frontend / HTML & DOM
- **Forms Defined**:
  - No explicit HTML form tags (uses asynchronous button action handlers)
- **Primary Action Buttons Sample**:
- **Authentication Requirement**: Contextual (Public view with citizen/staff restricted sections)
- **RBAC Requirement**: Multi-role support (Citizen, Staff, Operator, Admin)
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-PAGE-014 — Page: `frontend/pages\traffic\traffic.html`
- **Module**: Frontend UI
- **Feature**: Interactive Page View (111 Buttons, 1 Forms, 6 Action Links)
- **File**: `frontend/pages\traffic\traffic.html`
- **Type**: Frontend / HTML & DOM
- **Forms Defined**:
  - Form ID: `trafficStaffLoginForm` | OnSubmit: `handleTrafficStaffLoginSubmit(event)`
- **Primary Action Buttons Sample**:
  - Button: "CU
                
                    Sign In
  " | ID: `userBadgeBtn` | Class: `user-badge-btn` | OnClick: `toggleUserDropdown(event)`
  - Button: "🚗 Citizen Navigation & Parking" | ID: `none` | Class: `btn-primary` | OnClick: `switchLayer(`
  - Button: "👮 Traffic Staff Controls" | ID: `none` | Class: `btn-secondary` | OnClick: `switchLayer(`
  - Button: "🛡️ System Admin" | ID: `none` | Class: `btn-secondary` | OnClick: `switchLayer(`
  - Button: "1. Citizen / Public Layer" | ID: `tab-btn-citizen` | Class: `layer-tab-btn active` | OnClick: `switchLayer(`
  - Button: "2. Traffic Employee / Staff Layer" | ID: `tab-btn-control` | Class: `layer-tab-btn` | OnClick: `switchLayer(`
  - Button: "3. System Admin Layer" | ID: `tab-btn-admin` | Class: `layer-tab-btn` | OnClick: `switchLayer(`
  - Button: "Cancel Selection" | ID: `none` | Class: `btn-secondary btn-sm` | OnClick: `cancelCoordinatePick()`
  - Button: "Prev" | ID: `none` | Class: `vms-btn` | OnClick: `prevVMSBoard()`
  - Button: "Next" | ID: `none` | Class: `vms-btn` | OnClick: `nextVMSBoard()`
  - ... plus 101 additional interactive buttons
- **Authentication Requirement**: Contextual (Public view with citizen/staff restricted sections)
- **RBAC Requirement**: Multi-role support (Citizen, Staff, Operator, Admin)
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-PAGE-015 — Page: `frontend/pages\waste\waste.html`
- **Module**: Frontend UI
- **Feature**: Interactive Page View (47 Buttons, 0 Forms, 0 Action Links)
- **File**: `frontend/pages\waste\waste.html`
- **Type**: Frontend / HTML & DOM
- **Forms Defined**:
  - No explicit HTML form tags (uses asynchronous button action handlers)
- **Primary Action Buttons Sample**:
  - Button: "👤 1. Citizen Services" | ID: `tab-btn-citizen` | Class: `layer-tab-btn active` | OnClick: `switchWasteLayer(`
  - Button: "⚡ 2. Waste Staff Operations" | ID: `tab-btn-staff` | Class: `layer-tab-btn` | OnClick: `switchWasteLayer(`
  - Button: "⚙️ 3. Admin & Assets" | ID: `tab-btn-admin` | Class: `layer-tab-btn` | OnClick: `switchWasteLayer(`
  - Button: "📍 Report Waste" | ID: `none` | Class: `btn green-btn` | OnClick: `openReportModal()`
  - Button: "🚛 Request Pickup" | ID: `none` | Class: `btn outline-btn` | OnClick: `openPickupModal()`
  - Button: "🗑️ Request New Dustbin" | ID: `none` | Class: `btn white-btn` | OnClick: `openCitizenBinRequestModal()`
  - Button: "+ New Request" | ID: `none` | Class: `small-btn` | OnClick: `openCitizenBinRequestModal()`
  - Button: "↻ Refresh" | ID: `none` | Class: `small-btn` | OnClick: `loadCitizenRequests(true)`
  - Button: "🔑 Sign In as Staff (e.g. WST001)" | ID: `none` | Class: `btn green-btn` | OnClick: `SmartCityAuth.showLoginModal(`
  - Button: "+ Add Bin" | ID: `none` | Class: `btn white-btn` | OnClick: `openBinModal()`
  - ... plus 37 additional interactive buttons
- **Authentication Requirement**: Contextual (Public view with citizen/staff restricted sections)
- **RBAC Requirement**: Multi-role support (Citizen, Staff, Operator, Admin)
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

### F-PAGE-016 — Page: `frontend/pages\water\water.html`
- **Module**: Frontend UI
- **Feature**: Interactive Page View (25 Buttons, 6 Forms, 0 Action Links)
- **File**: `frontend/pages\water\water.html`
- **Type**: Frontend / HTML & DOM
- **Forms Defined**:
  - Form ID: `reportForm` | OnSubmit: `via addEventListener`
  - Form ID: `tankerForm` | OnSubmit: `via addEventListener`
  - Form ID: `assignForm` | OnSubmit: `via addEventListener`
  - Form ID: `dispatchTankerForm` | OnSubmit: `via addEventListener`
  - Form ID: `tankForm` | OnSubmit: `via addEventListener`
  - Form ID: `qualityForm` | OnSubmit: `via addEventListener`
- **Primary Action Buttons Sample**:
  - Button: "👤 1. Citizen Water Services" | ID: `tab-btn-citizen` | Class: `layer-tab-btn active` | OnClick: `switchWaterLayer(`
  - Button: "⚡ 2. Water Staff Operations" | ID: `tab-btn-staff` | Class: `layer-tab-btn` | OnClick: `switchWaterLayer(`
  - Button: "⚙️ 3. Water Infrastructure & SCADA" | ID: `tab-btn-admin` | Class: `layer-tab-btn` | OnClick: `switchWaterLayer(`
  - Button: "💦
                    
                    
     " | ID: `none` | Class: `action-card leakage` | OnClick: `openReportModal(`
  - Button: "🚱
                    
                    
     " | ID: `none` | Class: `action-card no-water` | OnClick: `openReportModal(`
  - Button: "🚛
                    
                    
     " | ID: `none` | Class: `action-card tanker` | OnClick: `openTankerModal()`
  - Button: "🧪
                    
                    
     " | ID: `none` | Class: `action-card quality` | OnClick: `openReportModal(`
  - Button: "⚡ Log in as Water Staff (WTR001)" | ID: `none` | Class: `submit-btn` | OnClick: `promptStaffLogin()`
  - Button: "⚡ Log in as Admin / Water Staff" | ID: `none` | Class: `submit-btn` | OnClick: `promptStaffLogin()`
  - Button: "🔄 Refresh Audit Stream" | ID: `none` | Class: `action-btn-sm` | OnClick: `loadAIWaterAuditTable()`
  - ... plus 15 additional interactive buttons
- **Authentication Requirement**: Contextual (Public view with citizen/staff restricted sections)
- **RBAC Requirement**: Multi-role support (Citizen, Staff, Operator, Admin)
- **Current Status**: IMPLEMENTED
- **Test Status**: NOT TESTED

## 8. Database Schema & Operations Inventory (101 Tables)

### F-DB-001 — Table: `ai_chat_messages`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `ai_chat_messages`
- **Current Verified Record Count**: 296 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-002 — Table: `ai_chat_sessions`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `ai_chat_sessions`
- **Current Verified Record Count**: 0 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-003 — Table: `ai_data_sources`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `ai_data_sources`
- **Current Verified Record Count**: 6 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-004 — Table: `ai_feedback`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `ai_feedback`
- **Current Verified Record Count**: 21 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-005 — Table: `ai_jobs`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `ai_jobs`
- **Current Verified Record Count**: 0 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-006 — Table: `ai_model_metrics`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `ai_model_metrics`
- **Current Verified Record Count**: 2 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-007 — Table: `ai_models`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `ai_models`
- **Current Verified Record Count**: 7 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-008 — Table: `ai_predictions`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `ai_predictions`
- **Current Verified Record Count**: 325 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-009 — Table: `ai_reviews`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `ai_reviews`
- **Current Verified Record Count**: 18 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-010 — Table: `ai_tool_logs`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `ai_tool_logs`
- **Current Verified Record Count**: 148 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-011 — Table: `ambulance_green_waves`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `ambulance_green_waves`
- **Current Verified Record Count**: 18 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-012 — Table: `ambulances`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `ambulances`
- **Current Verified Record Count**: 17 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-013 — Table: `analytics_events`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `analytics_events`
- **Current Verified Record Count**: 7 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-014 — Table: `appointments`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `appointments`
- **Current Verified Record Count**: 30 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-015 — Table: `audit_logs`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `audit_logs`
- **Current Verified Record Count**: 240 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-016 — Table: `auth_sessions`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `auth_sessions`
- **Current Verified Record Count**: 0 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-017 — Table: `citizen_feedback`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `citizen_feedback`
- **Current Verified Record Count**: 31 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-018 — Table: `city_atms`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `city_atms`
- **Current Verified Record Count**: 20 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-019 — Table: `city_environmental_sensors`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `city_environmental_sensors`
- **Current Verified Record Count**: 6 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-020 — Table: `city_restaurants`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `city_restaurants`
- **Current Verified Record Count**: 16 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-021 — Table: `cv_detections`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `cv_detections`
- **Current Verified Record Count**: 35 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-022 — Table: `diagnostic_categories`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `diagnostic_categories`
- **Current Verified Record Count**: 4 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-023 — Table: `diagnostic_reports`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `diagnostic_reports`
- **Current Verified Record Count**: 16 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-024 — Table: `diagnostic_tests`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `diagnostic_tests`
- **Current Verified Record Count**: 157 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-025 — Table: `disaster_predictions`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `disaster_predictions`
- **Current Verified Record Count**: 15 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-026 — Table: `doctor_schedules`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `doctor_schedules`
- **Current Verified Record Count**: 30 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-027 — Table: `doctor_slots`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `doctor_slots`
- **Current Verified Record Count**: 10 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-028 — Table: `doctors`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `doctors`
- **Current Verified Record Count**: 32 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-029 — Table: `emergency_departments`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `emergency_departments`
- **Current Verified Record Count**: 15 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-030 — Table: `emergency_incidents`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `emergency_incidents`
- **Current Verified Record Count**: 9 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-031 — Table: `environment_predictions`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `environment_predictions`
- **Current Verified Record Count**: 20 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-032 — Table: `famous_places`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `famous_places`
- **Current Verified Record Count**: 14 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-033 — Table: `grievance_ai_analysis`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `grievance_ai_analysis`
- **Current Verified Record Count**: 0 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-034 — Table: `hospital_bed_categories`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `hospital_bed_categories`
- **Current Verified Record Count**: 57 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-035 — Table: `hospital_beds`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `hospital_beds`
- **Current Verified Record Count**: 1 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-036 — Table: `hospital_departments`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `hospital_departments`
- **Current Verified Record Count**: 34 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-037 — Table: `hospital_invoices`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `hospital_invoices`
- **Current Verified Record Count**: 32 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-038 — Table: `hospital_notifications`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `hospital_notifications`
- **Current Verified Record Count**: 49 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-039 — Table: `hospital_predictions`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `hospital_predictions`
- **Current Verified Record Count**: 17 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-040 — Table: `hospital_staff`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `hospital_staff`
- **Current Verified Record Count**: 11 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-041 — Table: `hospital_ward_beds`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `hospital_ward_beds`
- **Current Verified Record Count**: 16 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-042 — Table: `hospital_wards`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `hospital_wards`
- **Current Verified Record Count**: 22 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-043 — Table: `hospitals`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `hospitals`
- **Current Verified Record Count**: 14 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-044 — Table: `medical_documents`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `medical_documents`
- **Current Verified Record Count**: 0 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-045 — Table: `notifications`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `notifications`
- **Current Verified Record Count**: 206 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-046 — Table: `parking_activity_logs`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `parking_activity_logs`
- **Current Verified Record Count**: 0 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-047 — Table: `parking_anpr_scans`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `parking_anpr_scans`
- **Current Verified Record Count**: 6 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-048 — Table: `parking_bookings`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `parking_bookings`
- **Current Verified Record Count**: 45 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-049 — Table: `parking_entries`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `parking_entries`
- **Current Verified Record Count**: 0 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-050 — Table: `parking_lots`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `parking_lots`
- **Current Verified Record Count**: 6 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-051 — Table: `parking_occupancy_log`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `parking_occupancy_log`
- **Current Verified Record Count**: 0 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-052 — Table: `parking_predictions`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `parking_predictions`
- **Current Verified Record Count**: 68 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-053 — Table: `parking_reports`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `parking_reports`
- **Current Verified Record Count**: 0 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-054 — Table: `parking_slots`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `parking_slots`
- **Current Verified Record Count**: 132 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-055 — Table: `patient_audit_logs`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `patient_audit_logs`
- **Current Verified Record Count**: 33 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-056 — Table: `patient_records`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `patient_records`
- **Current Verified Record Count**: 19 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-057 — Table: `patient_reports`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `patient_reports`
- **Current Verified Record Count**: 6 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-058 — Table: `patients`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `patients`
- **Current Verified Record Count**: 34 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-059 — Table: `pharmacy`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `pharmacy`
- **Current Verified Record Count**: 12 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-060 — Table: `pharmacy_bill_items`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `pharmacy_bill_items`
- **Current Verified Record Count**: 19 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-061 — Table: `pharmacy_bills`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `pharmacy_bills`
- **Current Verified Record Count**: 7 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-062 — Table: `pharmacy_cart`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `pharmacy_cart`
- **Current Verified Record Count**: 9 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-063 — Table: `place_civic_issues`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `place_civic_issues`
- **Current Verified Record Count**: 2 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-064 — Table: `place_favorites`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `place_favorites`
- **Current Verified Record Count**: 0 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-065 — Table: `place_reviews`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `place_reviews`
- **Current Verified Record Count**: 4 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-066 — Table: `police_complaints`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `police_complaints`
- **Current Verified Record Count**: 2 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-067 — Table: `police_stations`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `police_stations`
- **Current Verified Record Count**: 8 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-068 — Table: `police_stats`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `police_stats`
- **Current Verified Record Count**: 6 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-069 — Table: `prescriptions`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `prescriptions`
- **Current Verified Record Count**: 3 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-070 — Table: `service_requests`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `service_requests`
- **Current Verified Record Count**: 71 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-071 — Table: `signal_optimizations`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `signal_optimizations`
- **Current Verified Record Count**: 18 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-072 — Table: `staff`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `staff`
- **Current Verified Record Count**: 24 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-073 — Table: `street_lights`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `street_lights`
- **Current Verified Record Count**: 8 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-074 — Table: `test_bookings`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `test_bookings`
- **Current Verified Record Count**: 53 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-075 — Table: `test_samples`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `test_samples`
- **Current Verified Record Count**: 17 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-076 — Table: `traffic_ai_settings`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `traffic_ai_settings`
- **Current Verified Record Count**: 7 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-077 — Table: `traffic_audit_logs`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `traffic_audit_logs`
- **Current Verified Record Count**: 5495 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-078 — Table: `traffic_cameras`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `traffic_cameras`
- **Current Verified Record Count**: 16 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-079 — Table: `traffic_corridors`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `traffic_corridors`
- **Current Verified Record Count**: 3 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-080 — Table: `traffic_incidents`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `traffic_incidents`
- **Current Verified Record Count**: 19 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-081 — Table: `traffic_junctions`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `traffic_junctions`
- **Current Verified Record Count**: 9 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-082 — Table: `traffic_movement_rules`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `traffic_movement_rules`
- **Current Verified Record Count**: 4 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-083 — Table: `traffic_predictions`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `traffic_predictions`
- **Current Verified Record Count**: 81 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-084 — Table: `traffic_signals`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `traffic_signals`
- **Current Verified Record Count**: 37 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-085 — Table: `traffic_violations`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `traffic_violations`
- **Current Verified Record Count**: 27 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-086 — Table: `users`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `users`
- **Current Verified Record Count**: 5 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-087 — Table: `waste_bin_predictions`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `waste_bin_predictions`
- **Current Verified Record Count**: 17 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-088 — Table: `waste_bin_requests`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `waste_bin_requests`
- **Current Verified Record Count**: 0 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-089 — Table: `waste_bins`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `waste_bins`
- **Current Verified Record Count**: 23 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-090 — Table: `waste_predictions`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `waste_predictions`
- **Current Verified Record Count**: 17 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-091 — Table: `waste_routes`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `waste_routes`
- **Current Verified Record Count**: 4 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-092 — Table: `waste_vehicles`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `waste_vehicles`
- **Current Verified Record Count**: 4 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-093 — Table: `waste_workers`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `waste_workers`
- **Current Verified Record Count**: 5 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-094 — Table: `water_anomalies`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `water_anomalies`
- **Current Verified Record Count**: 23 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-095 — Table: `water_pipelines`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `water_pipelines`
- **Current Verified Record Count**: 6 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-096 — Table: `water_quality_logs`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `water_quality_logs`
- **Current Verified Record Count**: 5 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-097 — Table: `water_reports`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `water_reports`
- **Current Verified Record Count**: 3 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-098 — Table: `water_supply_schedules`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `water_supply_schedules`
- **Current Verified Record Count**: 6 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-099 — Table: `water_tanker_bookings`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `water_tanker_bookings`
- **Current Verified Record Count**: 6 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-100 — Table: `water_tanks`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `water_tanks`
- **Current Verified Record Count**: 5 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

### F-DB-101 — Table: `water_technicians`
- **Module**: Database Persistence
- **Feature**: Relational Storage & Indexing
- **Table Name**: `water_technicians`
- **Current Verified Record Count**: 6 records
- **File**: `backend/database/schema.sql` & MySQL Server
- **Type**: Database / Table Entity
- **Operations Supported**: SELECT, INSERT, UPDATE, DELETE, INDEX SCAN, FOREIGN KEY CONSTRAINTS
- **Current Status**: ACTIVE & SEEDED
- **Test Status**: NOT TESTED

