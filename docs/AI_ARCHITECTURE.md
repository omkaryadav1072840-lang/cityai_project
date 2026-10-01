# SmartCity AI - Grounded AI Architecture (Gorakhpur)

## 1. Architectural Philosophy: Anti-Hallucination Grounding

The SmartCity AI platform enforces a strict anti-hallucination policy. Large Language Models and statistical predictors are never permitted to synthesize or invent civic information, hospital beds, parking spaces, ticket fees, or emergency contacts.

```
Citizen / Staff Query
        ↓
[ Natural Language Intent Classifier ] (Hindi + English)
        ↓
[ Allowlisted Tool Selection ] (Strict Schema Validation)
        ↓
[ Trusted Data Execution ] (MySQL 8.0 Parameterized Queries)
        ↓
[ Factual Response Synthesizer ] (Non-Prescriptive Formatting)
        ↓
Grounded UI Response + Action Chips
```

---

## 2. Directory Layout

```
backend/ai/
├── chatbot/
│   └── chatbot_engine.js           # Bilingual Natural Language Classifier & Response Synthesizer
├── tools/
│   └── smartcity_tools.js          # Master allowlisted MySQL tool execution registry (14 tools)
├── models/
│   └── index.js                    # AI Models Catalog & Prediction Logging Ledger
├── predictions/
│   ├── traffic/
│   │   └── traffic_predictor.js    # Multi-horizon traffic & congestion prediction (FastAPI + Fallback)
│   ├── parking/
│   │   └── parking_predictor.js    # Time-series parking occupancy forecasting
│   ├── hospital/
│   │   └── hospital_predictor.js   # Operational bed surge & OPD queue forecasting
│   ├── waste/
│   │   └── waste_predictor.js      # Smart bin fill regression & overflow alert model
│   └── aqi/
│       └── aqi_predictor.js        # Multi-pollutant AQI forecasting & CPCB health advisories
├── recommendations/
│   ├── hospital_recommender.js     # Non-prescriptive hospital & emergency facility selector
│   └── parking_recommender.js      # Multi-criteria explainable parking recommendation engine
├── tourist/
│   └── tourist_guide.js            # Grounded Gorakhpur landmarks & 1-day itinerary engine
└── index.js                        # Unified facade exporting all AI capabilities
```

---

## 3. Allowlisted Grounded Tools (14 Bounded Capabilities)

All 14 tools query live MySQL tables using parameterized queries (`?`):

| Tool Name | Target Tables | Primary Parameters | Grounded Return Fields |
|---|---|---|---|
| `find_hospitals` | `hospitals`, `hospital_bed_categories` | `location`, `emergency` | Name, address, emergency phone, available beds, ICU |
| `find_available_beds` | `hospital_bed_categories`, `hospitals` | `hospital_id`, `bed_type` | Hospital name, bed category, vacancies, total beds |
| `find_doctors` | `doctors`, `hospitals` | `specialty`, `hospital`, `name` | Doctor name, specialty, hospital name, OPD timing |
| `find_parking` | `parking_lots` | `locality`, `vehicle_type` | Lot name, vacancies, hourly fee, coordinates |
| `get_parking_availability`| `parking_lots` | `lot_code`, `lot_id` | Lot code, occupancy count, vacancies, hourly tariff |
| `get_traffic_status` | `traffic_junctions`, `traffic_signals` | `junction_id` | Junction name, congestion level, speed km/h, phase |
| `get_nearby_services` | `hospitals`, `police_stations`, `parking_lots` | `category`, `location` | Nearest hospitals, police stations, parking lots |
| `get_emergency_services` | Verified State Registry | None | 112, 108, 102, 1090, 1077, 1800-180-2728, active fleet |
| `get_police_stations` | `police_stations` | `area`, `location` | Station name, address, SHO name, phone, emergency 112 |
| `get_waste_status` | `waste_bins` | `location`, `ward` | Bin code, location, fill %, status (OK/OVERFLOW) |
| `get_water_status` | `water_tanks`, `water_supply_schedules`| `ward`, `tank_id` | Reservoir fill level %, status, supply timings |
| `get_tourist_places` | `famous_places` | `category` | Verified landmark, address, opening hours, entry fee |
| `get_route_information` | Dynamic Arterial Grid | `origin`, `destination` | Distance km, estimated time, recommended corridor |
| `get_user_bookings` | `parking_bookings`, `appointments` | `user_id`, `mobile` | Authenticated citizen bookings, appointments, status |

---

## 4. Machine Learning & Predictive Pipelines

### 4.1 Traffic Prediction
- **Bridge**: `ai_service_client.js` queries Python FastAPI (`http://localhost:8000/predict/traffic`).
- **Fallback**: Webster-based statistical estimation grounded in `traffic_junctions` and `traffic_incidents`.
- **Classification Output**: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
- **Telemetry**: Predicted congestion percentage, expected speed in km/h, confidence score.

### 4.2 Explainable Parking Recommendation
- **Formula**:
  $$\text{Score} = (S_{\text{slots}} \times 0.4) + (S_{\text{dist}} \times 0.3) + (S_{\text{price}} \times 0.2) + (S_{\text{occupancy}} \times 0.1)$$
- **Explainability**: Every recommendation includes human-readable reasons (e.g., *"Closest to destination (~6 mins walk) with ample vacancies (34 slots)"*).

### 4.3 Hospital Recommender (Medical Safety Guard)
- **Constraint**: The AI must **NEVER** diagnose patients or prescribe treatment.
- **Criteria**: Matches user requirements against distance, required department, ICU availability, and trauma readiness.
- **Mandatory Disclaimer**: Every response contains: *"Non-prescriptive municipal healthcare guidance. In case of acute cardiac or neurological emergency, immediately dial 108. DO NOT use this AI recommendation as medical advice."*

### 4.4 Air Quality Index (AQI) Predictor
- **Telemetry**: Measures actual sensor values (PM2.5, PM10, Temperature, Humidity) and computes 3-hour forecasts with diurnal traffic stagnation multipliers.
- **Data Integrity**: Explicitly separates `REAL_SENSOR_MEASUREMENT` from `ML_STATISTICAL_FORECAST`.

### 4.5 Gorakhpur Tourist AI Guide
- **Landmarks**: Ramgarh Tal, Gorakhnath Temple, Gita Press, Railway Museum, Shaheed Ashfaq Ullah Khan Zoo, Kushmi Forest, Golghar.
- **Itinerary Engine**: Generates realistic 1-day tours broken into Morning, Mid-Day, Lunch/Afternoon, and Sunset/Evening with verified transit times and parking locations.
