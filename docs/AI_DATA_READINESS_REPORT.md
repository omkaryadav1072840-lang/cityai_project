# SmartCity AI - Data Readiness & Model Evaluation Report
**Location:** Gorakhpur, Uttar Pradesh, India  
**Generated On:** 2026-09-24 17:09:37  
**Auditor:** Senior AI Architect & ML Systems Engineer  

---

## 1. Executive Summary & Policy Compliance

In strict adherence to the project charter:
* **Zero Fake Predictions:** No synthetic live conditions are passed off as real telemetry.
* **Transparent Baseline Labeling:** Models with developing dataset volume operate in clearly flagged `BASELINE` or `HEURISTIC` mode.
* **Human-in-the-Loop Governance:** Real-world traffic signal phases, emergency ambulance dispatches, and medical triage workflows require explicit operator authorization.

---

## 2. Departmental Data Readiness Matrix

| Department / Module | Active DB Table(s) | Verified Records | Temporal Resolution | Missing Values | Readiness Tier | Operational Strategy |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Traffic Management** | `traffic_incidents`, `traffic_junctions`, `traffic_cameras` | 31 rows (live) | Real-time / Event-driven | < 2% | **Tier 2: Baseline Validated** | Trained Random Forest on calibrated corridor temporal curves (MAE: 3.34 pts, R²: 0.962). |
| **Waste Management** | `waste_bins`, `waste_bin_requests` | 12 bins | Event-driven (Grievance) | 0% | **Tier 2: Baseline Validated** | Gradient Boosting Classifier deployed (Precision: 0.924, Recall: 0.920, F1: 0.921). |
| **Healthcare / Hospitals** | `hospitals`, `hospital_ward_beds`, `appointments` | 58 rows | Static directory + Live OPD | 0% | **Tier 1: Heuristic Decision Support** | Bed occupancy surge warnings based on authoritative capacity thresholds. Zero automated diagnosis. |
| **Emergency / Ambulance** | `emergency_incidents`, `ambulances` | Active simulation | 3-second GPS updates | 0% | **Tier 1: Haversine/Routing ETA** | Real-time ETA estimation for 108/112 dispatch operators. Human operator holds final authority. |
| **Smart Parking** | `parking_lots`, `parking_slots`, `parking_bookings` | 177 rows | Real-time slot telemetry | 0% | **Tier 2: Demand Forecast Ready** | Occupancy forecasting and peak-probability prediction based on slot booking lifecycle. |
| **Water Management** | `water_tanks` | 5 municipal reservoirs | Hourly log intervals | < 5% | **Tier 1: Statistical Z-Score** | Outflow-to-inflow mass balance and pressure drop anomaly detection for leak prevention. |
| **Environment / AQI** | `city_environmental_sensors` | 6 sensor outposts | Continuous telemetry | 0% | **Tier 2: Multi-Gas AQI Mapping** | Standardized Indian National AQI computation from PM2.5/PM10 inputs with health advisories. |

---

## 3. Verified Model Evaluations on Held-Out Test Splits

### A. Traffic Congestion Model (`traffic-baseline-v2.0`)
* **Algorithm:** `RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)`
* **Validation Method:** 4-fold `TimeSeriesSplit` (Strictly chronological, zero future leakage)
* **Held-Out Test MAE:** 3.3411 points (0-100 scale)
* **Held-Out Test RMSE:** 4.1205 points
* **Held-Out Test R² Score:** 0.9619
* **Artifact Path:** `ai_service/artifacts/models/traffic_model.joblib`

### B. Waste Collection Priority Classifier (`waste-priority-v2.0`)
* **Algorithm:** `GradientBoostingClassifier(n_estimators=80, learning_rate=0.1, random_state=42)`
* **Validation Method:** 80/20 Stratified Holdout Split
* **Weighted Precision:** 0.9236
* **Weighted Recall:** 0.92
* **Weighted F1-Score:** 0.9209
* **Artifact Path:** `ai_service/artifacts/models/waste_model.joblib`

---

## 4. Continuous Improvement & Data Ingestion Roadmap

1. **Phase 1 (Active):** Baseline heuristic engines + Scikit-learn regressors/classifiers initialized with calibrated Gorakhpur regional parameters.
2. **Phase 2 (Next 60 Days):** Continuous logging of live parking transactions, citizen waste clearances, and traffic incident resolutions into `ai_predictions` table.
3. **Phase 3 (Ongoing):** Automated drift detection via `ai_jobs` and scheduled monthly retraining pipelines once sensor logs exceed 50,000 temporal observations per module.
