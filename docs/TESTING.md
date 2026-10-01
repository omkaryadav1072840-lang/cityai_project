# SmartCity AI - Testing Strategy & Verification Guide

## 1. Test Automation Architecture

The SmartCity AI platform incorporates automated verification across 4 testing tiers:

```
[ Tier 1: Unit & Domain Model Verification ]
   ↓  (Validates parameter validation, SQL queries, response envelopes)
[ Tier 2: AI Predictor & Tool Grounding Tests ]
   ↓  (Validates 14 allowlisted tools, anti-hallucination, medical guards)
[ Tier 3: Module-by-Module Integration Tests ]
   ↓  (Validates Traffic, Parking, Hospital, Waste, Water, Police, Emergency)
[ Tier 4: End-to-End System & Security Tests ]
      (Validates RBAC, rate limiting, JWT token expiration, socket streams)
```

---

## 2. Test Execution Commands

### 2.1 Consolidated Phase 1, 2 & 3 Verification Suite
Executes the unified verification suite across response envelopes, models, controllers, AI predictors, grounded tools, and frontend assets:

```bash
node scratch/test_phase1_to_3_consolidation.js
```

### 2.2 Master Automated Test Runner
Runs all 17 integration and domain test suites sequentially:

```bash
node scripts/run_all_tests.js
```

### 2.3 Individual Module Test Suites

| Target Module / Feature | Execution Command | Description |
|---|---|---|
| **Phase 1-3 Consolidation** | `node scratch/test_phase1_to_3_consolidation.js` | 17 comprehensive architectural and AI tests |
| **Phases 2 to 6 Suite** | `node scratch/test_phases_2_to_6.js` | Traffic Webster, ambulance preemption, CV |
| **Phases 7 to 11 Suite** | `node scratch/test_phases_7_to_11.js` | Grievance AI, waste, water, hospital, parking |
| **Phases 12 and 13 Suite** | `node scratch/test_phases_12_13.js` | AI explainability, drift monitoring, command center |
| **Master Routes Verification**| `node scratch/test_master_backend_routes.js` | Checks all 467 API route endpoints |
| **Hospital & Doctor Portal** | `node scratch/test_hospital_upgrade.js` | Bed categories, multi-tenant doctor sessions |
| **Security & Compliance** | `node scratch/test_hardening_and_compliance.js` | JWT guards, XSS sanitization, rate limits |

---

## 3. Module Verification Checklist

### 1. Traffic Module
- [x] Junction telemetry retrieval (`/api/traffic/junctions`).
- [x] Adaptive Webster-based signal cycle optimization formula ($C_0 = \frac{1.5L + 5}{1 - Y}$).
- [x] Live ambulance 600m emergency preemption corridor.
- [x] ANPR camera frame processing and e-challan generation.

### 2. Parking Module
- [x] Real-time lot vacancies and occupancy percentages.
- [x] Atomic slot reservation preventing double bookings.
- [x] Vehicle number alphanumeric formatting and time validation.
- [x] QR code entry window validation with 120-minute grace period.

### 3. Hospital Module
- [x] Live bed availability categorized by General, ICU, and Oxygen.
- [x] OPD appointment booking with doctor slot synchronization.
- [x] Strict role-based isolation preventing cross-hospital data leakage.
- [x] Strict non-prescriptive disclaimer preventing clinical diagnosis.

### 4. Waste Module
- [x] Smart bin fill level tracking with overflow risk classification.
- [x] TSP-based collection route optimization for bins $\ge 70\%$ fill.
- [x] Citizen waste pickup requests and staff status transition lifecycle.

### 5. Water Module
- [x] Reservoir level percentage telemetry and pressure monitoring.
- [x] Municipal ward supply schedule broadcasts.
- [x] Citizen pipeline leakage reporting and tanker requests.

### 6. Emergency & SOS Module
- [x] One-touch SOS distress broadcasting with GPS location capture.
- [x] Real-time Socket.IO ambulance fleet movement simulation.
- [x] Green-wave signal preemption corridor dispatch.

### 7. Police & Civic Safety Module
- [x] Police station directory with verified SHO contact details.
- [x] Public e-FIR complaint registration and tracking.
- [x] High-security role-based access control for police staff.

### 8. Reusable Map Module
- [x] Single Leaflet / OpenStreetMap controller (`SmartCityMap`).
- [x] Categorized layer groups with distinct SVG pulse pin markers.
- [x] Free OpenStreetMap tiles without paid third-party API keys.
