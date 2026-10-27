# SmartCity AI — Systematic Bug Fix & Quality Verification Report

**Project**: SmartCity AI  
**Repository Path**: `D:\cityai_project - Copy`  
**Active Working Branch**: `fix/iterative-bug-repair-20261027`  
**Base Commit (Checkpoint)**: `1b552e9` (`checkpoint/pre-cleanup-20261027`)  
**Fix Commit**: `d699435` (`fix(security-parking): patch traffic override header spoofing, enforce admin token RBAC, and handle parking booking rollback`)  
**Date**: October 27, 2026  
**Author**: Senior Software Engineer, QA Automation Engineer & Security Reviewer  

---

## 1. Executive Summary & Baseline

A systematic, iterative bug-fixing and security audit was performed across the SmartCity AI platform (Node.js, Express, MySQL, Python/FastAPI, Socket.IO, and AI layers). 

### Baseline Test Execution Results:
- **Canonical Node.js Test Suite (`node scripts/run_all_tests.js`)**:
  - Initial Run: **25 / 25 suites passed** (100% pass rate, exit code 0).
  - Final Verification Run: **25 / 25 suites passed** (100% pass rate, exit code 0).
- **Python / FastAPI Test Suite (`python -m pytest ai_service/tests`)**:
  - Initial Run: **13 / 13 passed** (exit code 0).
  - Final Verification Run: **13 / 13 passed** (exit code 0).
- **Environment & Running Services**:
  - Host OS: Windows 11
  - Node.js runtime: v20+ with active `npm run dev` service running on port 5000 (MySQL backend connected).
  - FastAPI / Python: v3.13.14 with Uvicorn.
  - Active background processes preserved without disruption.

---

## 2. Issues Discovered & Categorized

| Bug ID | Module | Severity | Summary | Status |
| :--- | :--- | :--- | :--- | :--- |
| **BUG-SEC-001** | Traffic / Auth | **P0 (Critical)** | Traffic Signal Override Header Spoofing via `x-user-role` without JWT token | **Fixed & Verified** |
| **BUG-SEC-002** | Traffic / Auth | **P1 (High)** | Insecure Fallback to Client Headers in `requireAdminRole` and `checkJunctionAuthority` | **Fixed & Verified** |
| **BUG-PARK-001** | Parking | **P2 (Medium)** | Non-atomic Booking Persistence & Slot Deduction Leak upon Insert Failure | **Fixed & Verified** |
| **BUG-TEST-001** | Parking QA | **P3 (Low)** | Invalid Non-RTO License Plate Format in Multi-Lot Booking Automated Test | **Fixed & Verified** |
| **HOSP-SEC-001** | Hospital / EHR | **P1 (Protected)** | Potential Patient Record Disclosure across Tenants (`GET /api/patients`) | **Protected (Documented below, awaits approval)** |
| **HOSP-QA-001** | Hospital / Clinical | **P2 (Protected)** | Edge-case Clinical Scenario Failures (#10 slot overlap, #27 multi-drug titration) | **Protected (Documented below, awaits approval)** |

---

## 3. Bug Details, Root Causes & Fixes Applied

### 3.1 BUG-SEC-001: Traffic Signal Override Header Spoofing
- **Module**: `backend/routes/traffic.routes.js`
- **Severity**: **P0 (Critical Security)**
- **File & Line**: `backend/routes/traffic.routes.js:906-928` (`handleJunctionOverride`)
- **Evidence / Reproduction**:
  `scratch/verify_security_and_rbac.js` identified that sending an unauthenticated request to `POST /api/traffic/junctions/1/override` with header `x-user-role: admin` allowed signal phase overrides without a valid bearer token.
- **Root Cause**:
  `handleJunctionOverride` was registered on route `POST /api/traffic/junctions/:id/override` and `router.all(...)` without explicitly enforcing `if (!req.user || !req.user.id)` before evaluating role logic.
- **Fix Applied**:
  Enforced strict JWT verification check at line 908:
  ```javascript
  if (!req.user || !req.user.id) {
      return res.status(401).json({
          success: false,
          error: "Authentication required: A valid JWT Bearer token is strictly required for traffic signal overrides."
      });
  }
  ```
- **Verification**:
  Unauthenticated and header-spoofed calls now receive HTTP 401 Unauthorized. Authentic JWT admin tokens successfully authorize overrides.

---

### 3.2 BUG-SEC-002: Insecure Role Header Fallback in Traffic RBAC
- **Module**: `backend/routes/traffic.routes.js`
- **Severity**: **P1 (High Security)**
- **File & Line**: `backend/routes/traffic.routes.js:95, 113` (`requireAdminRole`, `checkJunctionAuthority`)
- **Evidence / Reproduction**:
  Inspection showed `req.headers["x-user-role"]` and `req.headers["x-staff-id"]` were used as fallbacks if token properties were missing, enabling potential client-side header spoofing.
- **Root Cause**:
  Legacy development fallback code allowed `x-user-role` and `x-staff-id` HTTP request headers to be evaluated.
- **Fix Applied**:
  Removed client-header fallbacks. Only validated JWT token payloads (`req.user?.role`, `req.staffUser?.role`, `req.user?.staffId`, `req.staffUser?.staffId`) are evaluated.
- **Verification**:
  `node backend/test_traffic_jurisdiction_and_ai.js` (19/19 checks passed) and `node backend/test_all_traffic_enhancements.js` (25/25 checks passed).

---

### 3.3 BUG-PARK-001: Non-Atomic Parking Booking Persistence
- **Module**: `backend/routes/parking.routes.js`
- **Severity**: **P2 (Data Integrity / Concurrency)**
- **File & Line**: `backend/routes/parking.routes.js:705-738` (`POST /api/parking/book`)
- **Evidence / Reproduction**:
  `db.query("UPDATE parking_lots SET available_slots = available_slots - 1 ...")` immediately returned HTTP 201 to the user before the subsequent `INSERT INTO parking_bookings` finished. If the `INSERT` query failed (e.g., duplicate booking ID or constraint violation), the slot was left deducted without a booking record.
- **Root Cause**:
  Asynchronous nesting issue: HTTP 201 response was dispatched outside the `INSERT INTO parking_bookings` callback, with no compensating rollback query if the insertion failed.
- **Fix Applied**:
  - Moved the success response inside the insertion callback.
  - Added compensatory rollback query on insert error to restore `available_slots = available_slots + 1` and `occupied_slots = GREATEST(occupied_slots - 1, 0)`:
    ```javascript
    if (bookErr) {
        console.error("Booking record error:", bookErr);
        db.query(
            `UPDATE parking_lots 
             SET available_slots = available_slots + 1, 
                 occupied_slots = GREATEST(occupied_slots - 1, 0),
                 status = CASE WHEN status = 'FULL' THEN 'OPEN' ELSE status END
             WHERE ${clause}`,
            [value]
        );
        return res.status(500).json({ success: false, message: "Failed to persist parking booking." });
    }
    ```
- **Verification**:
  `node backend/test_ambulance_and_parking_integration.js` passed (18/18 checks).

---

### 3.4 BUG-TEST-001: Invalid License Plate Format in Automated Booking Suite
- **Module**: `scratch/test_all_lots_booking.js`
- **Severity**: **P3 (Test Reliability)**
- **File & Line**: `scratch/test_all_lots_booking.js:32`
- **Evidence / Reproduction**:
  Running `node scratch/test_all_lots_booking.js` resulted in `400 Bad Request` across all 6 parking lots: `INVALID_VEHICLE_NUMBER`.
- **Root Cause**:
  Test suite provided `"UP-53-AUDIT-01"`. The backend validation regex enforces valid Indian motor vehicle registration numbers (`/^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{1,4}$/`), where the series cannot exceed 3 letters.
- **Fix Applied**:
  Updated test mock vehicle number to RTO-compliant `"UP-53-AD-1001"`.
- **Verification**:
  `node scratch/test_all_lots_booking.js` successfully booked and cleaned up slots across all 6 parking facilities:
  - `PARK-001`: Passed
  - `PARK-002`: Passed
  - `PARK-003`: Passed
  - `PARK-004`: Passed
  - `PARK-005`: Passed
  - `PARK-006`: Passed

---

## 4. Protected Hospital Module Observations (Safety Rule 4 Compliance)

In strict accordance with **Critical Safety Rule 4**, no hospital or clinical files were modified. The following findings are documented for user review and explicit authorization:

1. **HOSP-SEC-001 (Patient Privacy Scope)**:
   - Endpoint: `GET /api/patients` in `backend/routes/hospital.routes.js`.
   - Behavior: A citizen-level token can retrieve the global list of patients.
   - Recommended Action: Restrict `GET /api/patients` to hospital staff/doctor roles or filter strictly by `req.user.id` for citizen roles.
   - Status: **Awaiting explicit user authorization prior to modification.**

2. **HOSP-QA-001 (Clinical Edge Scenarios #10 and #27)**:
   - File: `scratch/verify_all_clinical_scenarios.js`.
   - Behavior: 30 of 32 clinical scenarios pass; Scenario #10 (booking overlapping appointment) and Scenario #27 (multiple simultaneous prescription adjustments) encounter edge validation.
   - Status: **Awaiting explicit user authorization prior to modification.**

---

## 5. Security & Protected-File Verification

- **Protected Files Integrity**:
  A git diff verification against the base checkpoint confirmed **0 modifications** to protected hospital frontend pages, hospital backend controllers/routes (`hospital.routes.js`, `hospital_config.routes.js`, `doctor.routes.js`), clinical care assistants, or clinical ML models.
- **Secrets & Credentials**:
  No API keys, database credentials, or JWT signing secrets were committed, altered, or logged.

---

## 6. Git Status and Rollback Instructions

### Current Status:
- Branch: `fix/iterative-bug-repair-20261027`
- HEAD Commit: `d699435`
- Working Tree: Clean (tracked files). Untracked test output assets preserved.

### Files Modified & Committed:
1. `backend/routes/traffic.routes.js`
2. `backend/routes/parking.routes.js`
3. `scratch/test_all_lots_booking.js`

### Rollback Instructions:
To revert these fixes and return to the pre-repair checkpoint without losing any other work:
```powershell
# To return to the checkpoint branch:
git checkout chore/safe-evidence-cleanup

# Or to inspect the exact diff made in this repair cycle:
git diff 1b552e9..d699435
```
