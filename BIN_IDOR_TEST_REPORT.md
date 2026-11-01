# Smart Dustbin IDOR & Object Authorization Security Report
**Module:** Waste Management Subsystem – Smart Dustbin Telemetry  
**Testing Date:** October 31, 2026  
**Status:** **DEFENDED & VERIFIED**

---

## 1. Attack Surface Overview

The Smart Dustbin subsystem exposes IoT sensor feeds, time-to-full predictions, historical telemetry logs, and evacuation dispatch triggers. A field operator is assigned to exactly **one** municipal dustbin unit (e.g., `BIN-GOL-01`). 

An Insecure Direct Object Reference (IDOR / BOLA) flaw would occur if an operator assigned to `BIN-GOL-01` could view, manipulate, or dispatch collection requests for other city bins (e.g., `BIN-CMK-02`, `BIN-RLY-03`, `BIN-MED-05`) by altering request identifiers.

The audit subjected the system to an adversarial multi-vector IDOR battery.

---

## 2. Multi-Vector Adversarial Attack Results

All adversarial tests below were conducted using an active session token authenticated as **`BIN-GOL-01`** (Operator: Kailash Nath, Ward 14).

### Vector 1: Query Parameter Tampering
- **Attack Payload:** `GET /api/waste/bin-staff/my-bin?binCode=BIN-CMK-02`
- **Alternate Variant:** `GET /api/waste/bin-staff/my-bin?bin=BIN-CMK-02`
- **Objective:** Force server to return sensor telemetry for City Market Bin instead of assigned Golghar Bin.
- **Backend Defense:** `waste_workforce.routes.js` verifies `binCode` against `req.user.assigned_bin_code`. If a query parameter is provided that differs from the token assignment, the server aborts the request.
- **HTTP Response:** `403 Forbidden` (`{"success": false, "message": "Access denied: Unauthorized access to unit 'BIN-CMK-02'. You are restricted to your assigned bin."}`)
- **Verdict:** **PASS (Blocked)**

### Vector 2: Request Body Tampering (Collection Request Hijack)
- **Attack Payload:**
  ```json
  POST /api/waste/bin-staff/trigger-collection
  Headers: Authorization: Bearer <BIN-GOL-01 Token>
  Body: {
    "binCode": "BIN-CMK-02",
    "fillPercentage": 95,
    "weightKg": 150.0,
    "reason": "Adversarial trigger for unassigned bin"
  }
  ```
- **Objective:** Trick the Control Center into dispatching an emergency compactor to an unassigned unit.
- **Backend Defense:** `waste_workforce.routes.js` validates that `req.body.binCode` strictly matches `req.user.assigned_bin_code`. Mismatches trigger an explicit security violation error.
- **HTTP Response:** `403 Forbidden` (`{"success": false, "message": "IDOR Violation: You cannot trigger collection for bin 'BIN-CMK-02'."}`)
- **Verdict:** **PASS (Blocked)**

### Vector 3: URL Path Parameter Tampering (Historical Telemetry)
- **Attack Payload:** `GET /api/waste/iot/telemetry/BIN-MED-05/history`
- **Objective:** Harvest ultrasonic depth logs and footfall timestamps from Medical College Unit.
- **Backend Defense:** `waste_workforce.routes.js` inspects `req.params.binCode`. For non-admin callers with `bin_staff` role, `:binCode` must strictly equal `assigned_bin_code`.
- **HTTP Response:** `403 Forbidden` (`{"success": false, "message": "Access denied: You are only permitted to inspect telemetry for your assigned bin 'BIN-GOL-01'."}`)
- **Verdict:** **PASS (Blocked)**

### Vector 4: Alternate Identifier Formats & Casing Bypass
- **Attack Variant A (Lowercase):** `GET /api/waste/bin-staff/my-bin?binCode=bin-cmk-02` $\rightarrow$ **HTTP 403 Forbidden**
- **Attack Variant B (URL Encoded):** `GET /api/waste/bin-staff/my-bin?binCode=BIN%2DCMK%2D02` $\rightarrow$ **HTTP 403 Forbidden**
- **Attack Variant C (Header Tampering):** Passing `X-Target-Bin: BIN-CMK-02` $\rightarrow$ Ignored; token claims strictly authoritative.
- **Verdict:** **PASS (Blocked)**

### Vector 5: Cross-Bin Terminal Access
- **Attack Payload:** `GET /api/waste/dustbin-terminal/BIN-MED-05`
- **Objective:** Access terminal view of another bin.
- **Backend Defense:** `waste.routes.js` validates authorization headers for `bin_staff` sessions.
- **HTTP Response:** `403 Forbidden` (`{"success": false, "message": "Access denied: You are not authorized to view terminal for bin 'BIN-MED-05'."}`)
- **Verdict:** **PASS (Blocked)**

### Vector 6: Legitimate Authorized Access
- **Payload:** `GET /api/waste/bin-staff/my-bin`
- **HTTP Response:** `200 OK`
- **Data Returned:**
  - `bin_code`: `"BIN-GOL-01"`
  - `location`: `"Golghar Market Square, Ward 14"`
  - `current_fill_percentage`: `78`
  - `current_weight_kg`: `114.2`
  - `active_collection_request`: `null`
- **Verdict:** **PASS (Authorized)**

---

## 3. Database-Backed vs. Client-Side Authorization

| Layer | Implementation Mechanism | Vulnerability Addressed |
| :--- | :--- | :--- |
| **Frontend UI Guard** | `bin_dashboard.js` resets `assignedBinCode` to `user.assigned_bin_code`, ignoring URL parameters | Prevents casual operator navigation to unassigned bins via address bar tampering |
| **Controller Guard** | `waste_workforce.routes.js` compares `req.user.assigned_bin_code` against all query, body, and path parameters | Prevents curl, Postman, and script-based API IDOR attacks |
| **Database Pool Guard** | `waste_bins` and `inMemoryStaff` maintain 1-to-1 foreign key mapping between staff badges and hardware bin units | Prevents unauthorized bin creation or rogue re-assignment |

---

## 4. Summary Table of Tested Endpoints

| Endpoint Tested | Parameter Method | Attacker Role | Target Object | HTTP Status | Security Verdict |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `/api/waste/bin-staff/my-bin` | Query (`?binCode=`) | `BIN-GOL-01` | `BIN-CMK-02` | **403** | **PASS: IDOR Defended** |
| `/api/waste/bin-staff/trigger-collection` | Body (`binCode`) | `BIN-GOL-01` | `BIN-CMK-02` | **403** | **PASS: IDOR Defended** |
| `/api/waste/bin-staff/ai-prediction` | Query (`?binCode=`) | `BIN-GOL-01` | `BIN-RLY-03` | **403** | **PASS: IDOR Defended** |
| `/api/waste/iot/telemetry/:binCode/history` | Path (`:binCode`) | `BIN-GOL-01` | `BIN-MED-05` | **403** | **PASS: IDOR Defended** |
| `/api/waste/dustbin-terminal/:binCode` | Path (`:binCode`) | `BIN-GOL-01` | `BIN-MED-05` | **403** | **PASS: IDOR Defended** |
| `/api/waste/bin-staff/my-bin` | Default (None) | `BIN-GOL-01` | `BIN-GOL-01` | **200** | **PASS: Authorized Access** |

---

## 5. Audit Conclusion

The SmartCity AI Dustbin subsystem is **fully hardened against Insecure Direct Object Reference vulnerabilities**. Object ownership is cryptographically bound into the authenticated session token and validated server-side on every request.

