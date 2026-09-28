# SMARTCITY AI — REGISTERED MODELS & ML CATALOG
**Platform**: Gorakhpur Smart City Management Platform  
**Version**: 2.5.0 Enterprise  

---

## 1. Registered Models Catalog (`ai_models`)

The platform registers, tracks, and benchmarks all predictive engines within the `ai_models` database table:

| Model Identifier | Target Domain | Framework / Architecture | Version | Default Status | Baseline Accuracy | Avg Latency |
|---|---|---|---|---|---|---|
| `traffic-baseline-v2.0` | Traffic Flow & Density | Gradient Boosted Regressor | `2.0.0` | `active` | 92.4% | 28 ms |
| `optical-vision-v2.0` | CV Vehicle & Queue Telemetry | OpenCV Haar / YOLOv8 Tensor | `2.0.0` | `active` | 94.1% | 62 ms |
| `anpr-plate-ocr-v2.0` | Number Plate Recognition | Tesseract OCR + Pattern Filter | `2.0.0` | `active` | 91.8% | 85 ms |
| `waste-priority-v2.0` | Smart Bin Overflow Prediction | Linear & Polynomial Regression | `2.0.0` | `active` | 89.5% | 18 ms |
| `water-anomaly-v2.0` | SCADA Hydraulic Anomaly | Isolation Forest Heuristic | `2.0.0` | `active` | 91.2% | 15 ms |
| `hospital-capacity-v2.0`| Bed Surge & OPD Queuing | Exponential Smoothing / ARIMA | `2.0.0` | `active` | 93.8% | 22 ms |
| `emergency-dispatch-v2.0`| Ambulance Corridor Routing | Dijkstra / A* Routing Engine | `2.0.0` | `active` | 95.0% | 34 ms |
| `parking-occupancy-v2.0` | Multi-Horizon Slot Forecast | Multi-Variate Inflow Regressor | `2.0.0` | `active` | 90.6% | 19 ms |
| `grievance-nlp-v2.0` | Multilingual Civic Grievances | FastText / TF-IDF + Keyword Rule | `2.0.0` | `active` | 92.0% | 24 ms |

---

## 2. Model Input & Output Signatures

### 2.1 Traffic Congestion Predictor (`traffic-baseline-v2.0`)
- **Inputs**:
  - `junction_id` (string): e.g., `"JNC-GOLGHAR-01"`
  - `hour` (int 0-23): Hour of day
  - `aqi` (float): Environmental AQI proxy
  - `active_incidents` (int): Number of ongoing road incidents
- **Outputs**:
  - `congestion_level` (string): `"LOW"`, `"MODERATE"`, `"HIGH"`, `"SEVERE"`
  - `predicted_vehicle_count` (int)
  - `confidence` (float): 0.0 - 1.0

### 2.2 Grievance NLP Router (`grievance-nlp-v2.0`)
- **Inputs**:
  - `description` (string): Bilingual complaint text (e.g. *"Near Golghar electric transformer wire is hanging down spark ho raha h"*)
  - `locality` (string): Gorakhpur locality
- **Outputs**:
  - `category` (string): `"ELECTRICITY_HAZARD"`, `"WATER_SEWAGE"`, `"ROADS_POTHOLES"`, `"SOLID_WASTE"`
  - `severity` (string): `"CRITICAL"`, `"HIGH"`, `"MEDIUM"`, `"LOW"`
  - `sla_hours` (int): 2h (Critical), 6h (High), 24h (Medium), 72h (Low)
  - `assigned_department` (string): e.g. `"Electricity Department (UPPCL)"`

### 2.3 Water Anomaly Engine (`water-anomaly-v2.0`)
- **Inputs**:
  - `zone` (string): e.g. `"Zone 1 - Central Golghar"`
  - `inflow_rate_lps` (float): Liters per second pumped into zone
  - `outflow_rate_lps` (float): Liters per second metered at connections
  - `pressure_bar` (float): SCADA line pressure in bar
- **Outputs**:
  - `anomaly_type` (string): `"NORMAL"`, `"PIPE_BURST"`, `"PRESSURE_DROP"`, `"UNEXPLAINED_LOSS"`
  - `anomaly_score` (float): 0.0 - 1.0
  - `recommended_action` (string): Specific valve isolation / acoustic inspection guidance

---

## 3. Fallback Intent Engine & Resilience

When external LLM APIs (e.g., Gemini) are unavailable due to network timeout or absence of `GEMINI_API_KEY`, the platform falls back to the deterministic **Local Intent Engine** embedded directly within `ai_orchestrator.js`. This guarantees that emergency services, hospital beds, parking checks, and municipal reporting remain operational with **zero downtime**.
