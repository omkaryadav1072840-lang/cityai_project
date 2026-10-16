# SmartCity AI — Comprehensive Bug & Vulnerability Audit Report

**Audit Date**: October 16, 2026  
**Auditor**: Senior Full-Stack & Security QA Specialist  
**Repository**: `D:\cityai_project - Copy`  

---

## 1. Executive Summary

During our end-to-end repository inspection, static code analysis, and live headless browser CDP audits, we investigated:
1. The intermittent login section failure and the error: `"Unable to connect to staff login server"`.
2. Missing HTML event handlers and onclick bindings.
3. Silent truncation risks in API pagination limits.
4. CORS preflight rejections across local development ports.
5. Missing CCTV camera administration methods on the Traffic GIS console.

All identified defects have been verified, root causes diagnosed with network and code evidence, and repaired.

---

## 2. Detailed Bug Findings & Root Cause Analysis

### BUG-001 (Severity: P0) — "Unable to connect to staff login server" Error
- **Severity**: P0 (High Impact / Authentication Blocker)
- **Component**: `backend/server.js`, `frontend/auth.js`, `frontend/script.js`, `frontend/pages/hospital/hospital_dashboard.js`
- **Reproduction**:
  1. Launch backend on port 5000 (`npm run dev:backend`).
  2. Open any frontend page using VS Code Live Server (`http://127.0.0.1:5500`), Python `http.server` (`port 8000`), or any port other than 3000/5000.
  3. Attempt to log in via Staff Login tab or Doctor Portal.
  4. The UI displays: `"Unable to connect to staff login server."`
- **Root Cause**:
  1. **Dynamic URL Resolution Failure**: In `frontend/auth.js`, `_getApiBase()` checked:
     ```javascript
     return window.location.port === "5000" ? window.location.origin : (window.location.protocol === "file:" ? "http://localhost:5000" : "");
     ```
     When opened on port 5500, `_getApiBase()` returned `""` (empty string). The browser sent `POST http://127.0.0.1:5500/api/staff-login`, which failed with 404/Connection Refused.
  2. **CORS Rejection Failure**: In `backend/server.js`, `defaultAllowedOrigins` only permitted `localhost:3000` and `localhost:5000`. Requests from `http://localhost:5500` or `http://127.0.0.1:5500` resulted in `callback(new Error('CORS policy violation...'))`, triggering an Express unhandled rejection and browser `TypeError: Failed to fetch`.
- **Fix Applied**:
  - `_getApiBase()` in `auth.js`, `BACKEND_URL` in `script.js`, and `API_BASE` in `hospital_dashboard.js`, `superadmin_hospital.js`, and `water.js` now dynamically recognize any local development host (`localhost` or `127.0.0.1`) and automatically route API requests to `http://${loc.hostname}:5000`.
  - In `backend/server.js`, CORS configuration was expanded with `isLocalDevOrigin` regex (`/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/`) and non-production auto-allow, while replacing `callback(new Error(...))` with safe `callback(null, false)`.

---

### BUG-002 (Severity: P1) — Login Section Sometimes Does Not Appear on Click
- **Severity**: P1 (User Experience & Access Blocker)
- **Component**: `frontend/auth.js` (`renderUserHeader` visitor badge)
- **Reproduction**:
  1. Open homepage or departmental page in an unauthenticated / visitor state.
  2. Click the `🔑 Sign In` badge in the navigation bar.
  3. Expectation: The Glassmorphic Login modal appears immediately.
  4. Actual: A tiny dropdown menu (`#scGlobalVisitorDropdown`) toggled open instead of the modal. On small screens or when clipped by overflow, the login section appeared completely unresponsive.
- **Root Cause**:
  In `frontend/auth.js` lines 2884–2900, clicking anywhere on the `Sign In` badge was intercepted by `badge.addEventListener("click", ...)` to toggle the dropdown `display: block/none`. To open the modal, the user had to click a second button inside the dropdown.
- **Fix Applied**:
  Updated the visitor badge click event handler in `frontend/auth.js`: clicking the badge directly triggers `SmartCityAuth.showLoginModal("citizen")` immediately. The dropdown chevron arrow alone (`#scDropdownArrowVisitor`) toggles the navigation menu if explicitly targeted.

---

### BUG-003 (Severity: P1) — Missing CCTV Camera Administration & GIS Relocation Methods
- **Severity**: P1 (Administrative Functionality)
- **Component**: `frontend/pages/traffic/traffic.html`, `frontend/pages/traffic/traffic.js`
- **Reproduction**:
  1. Log in as Traffic Administrator (`TR-ADMIN` or `STAFF-001`).
  2. Open Traffic GIS Admin Console (`frontend/pages/traffic/traffic.html`).
  3. Click "Refresh" on the Registered CCTV Cameras & Telemetry table or click "Add on Map" / "Move CCTV on Map".
  4. Browser console threw: `Uncaught ReferenceError: loadAdminCamerasTable is not defined`, `startAddCameraOnMap is not defined`, `startMoveCameraOnMap is not defined`.
- **Root Cause**:
  The HTML interface defined table `#admin-cameras-tbody` and GIS coordinate action buttons, but the underlying JavaScript implementations were missing in `traffic.js`.
- **Fix Applied**:
  - Implemented `loadAdminCamerasTable()` to query `/api/traffic/cameras` and render active status, model type, coordinates, and action buttons.
  - Implemented `startAddCameraOnMap()` and `startMoveCameraOnMap(presetCamId)` to activate Leaflet coordinate picking and execute `PUT /api/traffic/cameras/:id/location`.
  - Connected `loadAdminCamerasTable()` into `switchLayer('admin')`.

---

### BUG-004 (Severity: P2) — Broken Incident Modal Handler on Traffic Page
- **Severity**: P2 (Event Handler Mismatch)
- **Component**: `frontend/pages/traffic/traffic.html`, `frontend/pages/traffic/traffic.js`
- **Reproduction**:
  1. Click "Report Incident" button in `traffic.html` line 288.
  2. Button called `onclick="openIncidentModal()"`.
  3. Function was named `openReportIncidentModal` in `traffic.js`.
- **Root Cause**: Function naming discrepancy between HTML inline handler and JavaScript declaration.
- **Fix Applied**: Added alias `window.openIncidentModal = openReportIncidentModal;` in `traffic.js`.

---

### BUG-005 (Severity: P2) — Unresolved `openRecordsModal()` in Hospital Module
- **Severity**: P2 (Event Handler Mismatch)
- **Component**: `frontend/pages/hospital/hospital.html`, `frontend/pages/hospital/hospital.js`
- **Reproduction**:
  1. On hospital prescription upload screen or hospital home, click "View All Records".
  2. Triggered `onclick="openRecordsModal()"`.
  3. Function was undefined.
- **Root Cause**: Hospital module implements `openPatientFile(patientId)` for medical records modal (`#patientFileModal`), but inline button called `openRecordsModal`.
- **Fix Applied**: Defined `openRecordsModal(patientId)` mapping directly to `openPatientFile(patientId)` and exported on `window`.

---

### BUG-006 (Severity: P2) — Silent Truncation Risk in Pharmacy API with `all=true`
- **Severity**: P2 (Data Integrity / Completeness)
- **Component**: `backend/routes/pharmacy.routes.js`
- **Reproduction**:
  1. Call `GET /api/pharmacy?all=true` when pharmacy database contains more than 100 medicines.
  2. Response returned exactly 100 records because line 55 enforced `Math.min(100, Math.max(total, 50))`.
  3. Result: Callers expecting the complete catalog suffered silent truncation of remaining items.
- **Root Cause**: Hardcoded `Math.min(100, ...)` clamped total count even when `all=true` was specified.
- **Fix Applied**: Updated limit logic in `backend/routes/pharmacy.routes.js`:
  ```javascript
  const safeLimit = hasExplicitPagination
      ? Math.min(100, Math.max(1, isNaN(limit) ? 20 : limit))
      : (req.query.all === "true" ? Math.max(total, 1) : 50);
  const offset = req.query.all === "true" && !hasExplicitPagination ? 0 : (safePage - 1) * safeLimit;
  ```
  Verified with `scratch/test_pharmacy_frontend_pagination.js` (70 assertions, 100% pass).

---

### BUG-007 (Severity: P0) — `ReferenceError: isStaffUser is not defined` inside `renderUserHeader()` & False "Unable to connect" Catch Block
- **Severity**: P0 (Runtime Exception in Post-Login Pipeline / False Failure State)
- **Component**: `frontend/auth.js` (`renderUserHeader` and form submit catch blocks)
- **Reproduction**:
  1. Open homepage or any page in the browser.
  2. Click "Sign In", enter credentials for Staff (`STAFF-001`, `admin`) or Citizen, and click submit.
  3. The network tab shows `POST /api/staff-login` returning HTTP `200 OK` with valid JWT token.
  4. The UI nevertheless turns red and displays: `"Unable to connect to staff login server."`
- **Root Cause**:
  1. In `frontend/auth.js` line 2821, `renderUserHeader()` checked:
     ```javascript
     if (!isStaffUser && pId) {
     ```
     However, the staff boolean variable was declared on line 2606 as `const isStaffOfficer = isStaff();`. `isStaffUser` was undefined in that scope, causing JavaScript to throw `ReferenceError: isStaffUser is not defined`.
  2. Because `setSession()` calls `renderUserHeader()` synchronously inside the submit handler's `try` block, this reference error bubbled into `catch (_)`.
  3. The catch block blindly assumed any error was a network disconnect and displayed `"Unable to connect to staff login server."`, masking the fact that authentication had succeeded.
  4. Furthermore, post-login redirects used `'/' + targetDashboard`, which on VS Code Live Server (`http://127.0.0.1:5500/frontend/index.html`) redirected to `/pages/...` instead of `/frontend/pages/...`, generating a 404.
- **Fix Applied**:
  - Declared `const isStaffUser = isStaffOfficer;` in `renderUserHeader()`.
  - Implemented dynamic path resolver `_resolveDashboardUrl(target)` preserving `/frontend/` prefix when running on Live Server.
  - Separated network fetch errors from session handling errors in `forms.citizen` and `forms.staff` submit handlers, preventing false failure messages.
  - Added dashboard redirects for staff/officer users who sign in via the default citizen tab.
  - Verified with CDP Edge headless browser tests (`scratch/test_both_logins_cleanly.js` and `scratch/test_navigation.js`).

