# SMARTCITY AI — LIVE DEMONSTRATION SCRIPT & WALKTHROUGH
**Platform**: Gorakhpur Smart City Management Platform  
**Target Audience**: City Administrators, Municipal Commissioners, Academic Evaluators  

---

## Demo Walkthrough Scenarios

### Scenario 1: Citizen Bilingual Querying via Floating AI Assistant
1. **Action**: Open [frontend/index.html](file:///d:/cityai_project%20-%20Copy/frontend/index.html) in your browser.
2. **Observe**: Click the floating blue AI Assistant badge in the bottom-right corner.
3. **Prompt (Hindi/English)**:
   > *"Golghar ke paas parking aur ICU beds kaha available hain?"*
4. **Result**: The assistant queries `find_parking` and `find_hospital_beds` in real-time, displaying:
   - Golghar Multi-Level Parking available slots (₹30/hr)
   - AIIMS Gorakhpur ICU bed capacity
   - An audited badge showing **`DATA SOURCE: REAL`**.

---

### Scenario 2: Emergency Ambulance 600m Green Wave Preemption
1. **API Trigger**:
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:5000/api/traffic/ambulance-preemption" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"ambulance_id":"AMB-01","latitude":26.7608,"longitude":83.3730,"junction_id":"JNC-GOLGHAR-01"}'
   ```
2. **Result**:
   - Preemption automatically engages.
   - Traffic lights on the approaching arterial corridor force a green preemption wave.
   - Status transition logged to `ambulance_green_waves` ledger.

---

### Scenario 3: Computer Vision Violation Staging & Officer Approval
1. **AI Staging**: CV detects vehicle `UP-53-AK-9921` running a red light. Violation status is set to `AI_FLAGGED`.
2. **Officer Review**: Traffic officer opens verification interface:
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:5000/api/cv/violations/1/verify" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"decision":"APPROVE","staff_username":"officer_singh","notes":"Clear red light violation caught on optical sensor"}'
   ```
3. **Result**: Violation transitions to `VERIFIED_CHALLAN_REFERRED`, issuing a ₹1,000 fine under the Motor Vehicles Act with full officer attribution.

---

### Scenario 4: Smart Water Pipe Burst Detection in Central Golghar
1. **Telemetry Ingestion**: Inflow = 450 lps, Outflow = 320 lps (28.8% loss), Pressure = 1.4 bar.
2. **AI Action**: `water_ai_service.js` flags a `CRITICAL` anomaly:
   - Suspicion score: `0.94`
   - Automated mitigation: Emergency throttle on feeder valve `#V-01` and team dispatch.

---

### Scenario 5: Executive AI Command Center & What-If Simulation
1. **Action**: Access the executive simulation endpoint:
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:5000/api/admin/what-if-simulation" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"scenario_type":"ROAD_CLOSURE","parameter_value":"Golghar Chowk Main Axis"}'
   ```
2. **Result**:
   - The engine projects a diversion of 850 vehicles/hr to Mohaddipur and Asuran axes.
   - Adjacent corridor delay is projected at `+16 minutes`.
   - Results are explicitly marked with `data_source: "SIMULATED"` to prevent confusion with live street closures.
