# SMARTCITY AI — Engineering & Project Guidelines

**Platform**: Gorakhpur Smart City Management Platform (Uttar Pradesh, India)  
**System Architecture**: Integrated Municipal Operations, IoT Telemetry & Citizen Platform  
**Target Environment**: Node.js (Express 5) • MySQL 8.0 • Python 3.13 FastAPI • Leaflet GIS • Socket.IO  
**Standard**: High Reliability, Grounded Telemetry, Non-Destructive Refactoring  

---

## 1. Core Engineering Principles

### 1.1 Non-Destructive Refactoring Rule (The Golden Rule)
- **Inspect Existing Implementation Before Creating New Files**: Never assume a feature, route, or table is missing. Always search the codebase first (`backend/routes/`, `backend/services/`, `frontend/pages/`, database schemas) to find existing implementations.
- **Do Not Duplicate Existing Code**: Creating competing duplicates of components, login screens, API routers, or database utilities is strictly prohibited.
- **Reuse Existing Components, Functions, and APIs**: If an existing component or API endpoint exists, extend or repair it rather than writing a redundant alternate handler.
- **Preserve Existing Functionality**: Working UI buttons, operational Leaflet map layers, active WebSocket channels, and running background daemon loops (traffic signal cycles, ambulance GPS preemption) must remain functional during any refactor.
- **Keep Frontend, Backend, API, and Database Synchronized**: Whenever modifying an endpoint or schema, verify that frontend callers, SQL queries, and documentation remain completely aligned.
- **Follow Existing Project Architecture**: Adhere strictly to the established Express 5 gateway + Python FastAPI ML service + MySQL 8.0 connection pool architecture and the Vanilla CSS design system.

---

## 2. Authentication & Session Architecture

### 2.1 Single Centralized Authentication Architecture
- **One Unified Auth System**: All authentication and session management must flow through `SmartCityAuth` (`frontend/auth.js`).
- **Never Create Isolated Login Forms**: Never build page-specific login forms, custom login handlers, or isolated credential stores in sub-pages.
- **Session Persistence**: JWT tokens are persisted in `localStorage` under `smartcity_auth_token` with authenticated user metadata under `smartcity_auth_user`. All open tabs must synchronize state via the `storage` event.
- **Zero Hardcoded Credentials**: Never hardcode user names, phone numbers, emails, or credentials in production source code.

### 2.2 Departmental Staff Isolation & RBAC
- **Strict Module Scoping**: Departmental staff permissions are strictly confined to their assigned department (`traffic`, `healthcare`, `parking`, `waste`, `water`, `emergency`, `police`).
- **Cross-Department Isolation**: A staff officer accessing a module outside their department operates strictly as a standard Citizen/Visitor unless granted administrative clearance (`role: admin`).
- **Dual Enforcement**: Enforce permissions on both client UI elements (via `SmartCityAuth.canEdit(department)`) and backend API endpoints (via `requireDepartment()` or `requireRole()`).

---

## 3. Data Integrity & Grounded AI Standards

### 3.1 Real-Time & Grounded Data Rule
- **No Fabricated Live Data**: Telemetry for traffic congestion, hospital bed availability, moving ambulances, parking bays, and water reservoir pressure must reflect actual database records or active IoT sensor feeds.
- **Graceful Data Unavailable Fallback**: When sensor telemetry is unreachable or historical baseline data is sparse, return explicit "Data Unavailable" or "Sensor Reconnecting" states rather than inventing random synthetic figures.
- **Tri-State Attribution**: Every predictive response must carry an explicit data provenance tag (`REAL`, `PREDICTED`, `SIMULATED`).

### 3.2 Human-in-the-Loop High-Consequence Controls
- **Never Trigger Autonomous Penalties**: Computer vision detections (ANPR, red-light jumps) must be staged as `AI_FLAGGED` and require an authorized officer's verified signature before issuing an official e-challan.
- **Strict Medical Data Privacy**: Patient clinical dossiers and Ayushman health records must never be exposed publicly. Scanned QR codes return masked summaries to the public and full records only to authorized medical staff.

---

## 4. Code Quality & Standards

### 4.1 Backend (Node.js & Express 5)
- **Standardized API Response Envelope**:
  ```json
  // Success Response
  {
    "success": true,
    "data": ...
  }

  // Error Response
  {
    "success": false,
    "message": "Human readable error description",
    "error": "OPTIONAL_ERROR_CODE"
  }
  ```
- **100% Parameterized Database Queries**: Always use `db.promise().query(sql, [params])` with placeholder parameters (`?`). SQL string concatenation is strictly forbidden.
- **Safe Express Middleware Signatures**: Middleware functions must strictly accept `(req, res, next)`. Do not mount standard utility helper functions onto `app.use()`.
- **Audit Logging**: All state-modifying actions (user registration, status transitions, signal overrides, report dispatch, and clinical edits) must invoke `logAudit()` or `logPatientAudit()`.

### 4.2 Frontend (Vanilla JavaScript & CSS)
- **Vanilla CSS Design System**: Maintain responsive styles within `frontend/index.css` using HSL/CSS custom properties. Avoid introducing arbitrary third-party CSS utility frameworks unless explicitly requested.
- **Accessible UI States**: Every API-driven section must implement the 4 core lifecycle states:
  1. *Loading*: Animated spinner or pulse skeleton.
  2. *Success*: Rendered dynamic content.
  3. *Empty*: Clear, helpful empty state (e.g. "No active grievances found").
  4. *Error*: User-friendly error message with a retry button.
- **Map Synchronization**: All Leaflet and OpenLayers map instances must share the Gorakhpur base coordinates `[26.7606, 83.3732]`, initialize tiles cleanly, and trigger `map.invalidateSize()` after DOM layout transitions.

---

## 5. Safe Development & Refactoring Lifecycle

To ensure non-destructive engineering, every bug fix or feature addition must follow this 6-step lifecycle:

```
[ 1. Inspect ] ──► [ 2. Diagnose ] ──► [ 3. Minimal Safe Edit ]
                                               │
[ 6. Document ] ◄── [ 5. Full Regression ] ◄── [ 4. Unit Test ]
```

1. **Inspect**: Search active database columns, frontend imports, and registered route handlers before writing any code.
2. **Diagnose**: Identify the true root cause and trace dependencies across modules.
3. **Minimal Safe Edit**: Implement the smallest possible change that repairs the defect while preserving backward compatibility.
4. **Unit Verification**: Run specific test scripts targeting the modified module.
5. **Full Regression**: Execute `node scripts/run_all_tests.js` (17 automated test suites) before committing changes.
6. **Document**: Update `PROJECT_STATUS.md`, `PROJECT_MAP.md`, `CHANGELOG.md`, and relevant documentation in `docs/`.
