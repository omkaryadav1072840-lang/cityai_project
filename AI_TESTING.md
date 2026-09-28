# SMARTCITY AI — TESTING & QUALITY ASSURANCE SPECIFICATION
**Platform**: Gorakhpur Smart City Management Platform  
**Total Automated Integration Tests**: **128 Tests (100% Passing)**  

---

## 1. Automated Test Suite Architecture

The system contains four specialized automated test harnesses that validate the platform without requiring third-party testing runners:

```
scratch/
├── test_ai_orchestrator_phase1.js  (Phase 1: 42 Tests)
├── test_phases_2_to_6.js           (Phases 2-6: 38 Tests)
├── test_phases_7_to_11.js          (Phases 7-11: 30 Tests)
└── test_phases_12_13.js            (Phases 12-13: 18 Tests)
```

---

## 2. Test Execution Commands (Windows PowerShell)

Run each suite individually or consecutively:

### Suite 1: Phase 1 Core Orchestrator & 17 Grounded Municipal Tools (42 Tests)
```powershell
node scratch/test_ai_orchestrator_phase1.js
```
- **Validates**: All 17 grounded municipal tools, real MySQL data querying, bilingual English/Hindi natural language comprehension, zero-hallucination bounds, AI prediction ledger insertion, and session logging.

### Suite 2: Phases 2 to 6 Traffic, Vision, ANPR, Grievance, Waste (38 Tests)
```powershell
node scratch/test_phases_2_to_6.js
```
- **Validates**: Universal AI widget presence, multi-horizon traffic forecasts, Webster signal cycle optimization ($C_0$), 600m ambulance preemption wave, multi-class vehicle detection, e-challan staff verification, grievance SLA classifier (2h to 72h), and TSP waste collection routing.

### Suite 3: Phases 7 to 11 Water, Healthcare, Parking, Environment, Command Center (30 Tests)
```powershell
node scratch/test_phases_7_to_11.js
```
- **Validates**: SCADA pipe burst anomaly detection, ICU bed surge forecasting, alternative parking lot routing, AQI 3-hour forecasting, monsoon waterlogging runoff model, tourist 1-day itinerary, and What-If simulation engine.

### Suite 4: Phases 12 to 13 Model Monitoring, XAI, Security & RBAC (18 Tests)
```powershell
node scratch/test_phases_12_13.js
```
- **Validates**: Model performance catalog, drift detection index, explainable factor attribution, human review audit trail, patient medical record QR privacy barrier, and parameterized SQL injection immunization.

---

## 3. One-Command Master Test Verification

Run all test suites sequentially:
```powershell
node scratch/test_ai_orchestrator_phase1.js; node scratch/test_phases_2_to_6.js; node scratch/test_phases_7_to_11.js; node scratch/test_phases_12_13.js
```
Expected output: **128 PASSED, 0 FAILED**.
