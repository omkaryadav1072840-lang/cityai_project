# Role Isolation & Workforce Permission Matrix
**Module:** Access Control & Municipal Identity  
**Verification Date:** October 31, 2026  
**Status:** **ENFORCED & VERIFIED**

---

## 1. Staff Role Architecture

The SmartCity AI system enforces five distinct operational roles across civic and municipal operations:

| Role Key | Account Type | Intended Personnel | Operational Scope |
| :--- | :--- | :--- | :--- |
| `bin_staff` | `BIN_STAFF` | Dedicated Smart Bin Operator | Hardware telemetry, sensor calibration, and threshold dispatch for **assigned unit only**. |
| `working_staff` | `WORKING_STAFF` | Field Sanitation Crew & Drivers | Task queue, task acceptance, step-by-step road navigation, and collection proof upload. |
| `control_center` | `CONTROL_CENTER` | ICCC Municipal Dispatchers | GIS map overview, verified area analytics, AI complaint triage, worker recommendation, proof approval. |
| `admin` | `ADMIN` | Chief Municipal Waste Officers | Workforce provisioning, credential resets, role alterations, route/bin allocations, audit logs. |
| `citizen` | `CITIZEN` | Public Residents & Visitors | Public civic complaints, viewing city overview, tracking submitted tickets. |

---

## 2. Frontend Boundary Confinement ("uska bass usak deshbord dikhe")

When a user authenticates with a `BIN_STAFF` identity (e.g., `BIN-GOL-01`), strict perimeter confinement rules are applied in `frontend/auth.js` (`enforceRoleIsolation()`):

1. **Automatic Redirection:** If an active `BIN_STAFF` session attempts to navigate to any page other than `bin_dashboard.html`:
   - `/` or `/index.html` $\rightarrow$ Redirected to `pages/waste/bin_dashboard.html?binCode=BIN-GOL-01`
   - `/pages/waste/waste.html` $\rightarrow$ Redirected to `pages/waste/bin_dashboard.html?binCode=BIN-GOL-01`
   - `/pages/waste/control_center.html` $\rightarrow$ Redirected to `pages/waste/bin_dashboard.html?binCode=BIN-GOL-01`
   - `/pages/waste/worker_dashboard.html` $\rightarrow$ Redirected to `pages/waste/bin_dashboard.html?binCode=BIN-GOL-01`
   - `/pages/water/water.html` $\rightarrow$ Redirected to `pages/waste/bin_dashboard.html?binCode=BIN-GOL-01`
   - `/pages/traffic/traffic.html` $\rightarrow$ Redirected to `pages/waste/bin_dashboard.html?binCode=BIN-GOL-01`
   - `/pages/emergency/emergency.html` $\rightarrow$ Redirected to `pages/waste/bin_dashboard.html?binCode=BIN-GOL-01`
   - `/pages/parking/parking.html` $\rightarrow$ Redirected to `pages/waste/bin_dashboard.html?binCode=BIN-GOL-01`
2. **Minimalist UI Surface:** `bin_dashboard.html` intentionally excludes all global navigation links, breadcrumbs, search bars, and inter-departmental links. The interface contains only the bin's hardware gauges, telemetry cards, AI predictions, and a "🚪 Lock & Sign Out" button.

---

## 3. Comprehensive Backend Access Matrix

| Endpoint | Method | `bin_staff` | `working_staff` | `control_center` | `admin` | `unauthenticated` |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `/api/waste/bin-staff/my-bin` | GET | **200 (Own Bin)** | 403 | 403 | 200 | 401 |
| `/api/waste/bin-staff/trigger-collection` | POST | **200 (Own Bin)** | 403 | 403 | 200 | 401 |
| `/api/waste/bin-staff/ai-prediction` | GET | **200 (Own Bin)** | 403 | 403 | 200 | 401 |
| `/api/waste/iot/telemetry/:binCode/history` | GET | **200 (Own Bin)** | 403 | 200 | 200 | 401 |
| `/api/waste/worker/tasks` | GET | 403 | **200** | 403 | 200 | 401 |
| `/api/waste/worker/tasks/:id/status` | PUT | 403 | **200 (Assigned)** | 403 | 200 | 401 |
| `/api/waste/worker/tasks/:id/submit-proof` | POST | 403 | **200 (Assigned)** | 403 | 200 | 401 |
| `/api/waste/worker/navigation/:id` | GET | 403 | **200** | 403 | 200 | 401 |
| `/api/waste/control-center/map-data` | GET | 403 | 403 | **200** | 200 | 401 |
| `/api/waste/control-center/area-analytics` | GET | 403 | 403 | **200** | 200 | 401 |
| `/api/waste/control-center/complaints` | GET | 403 | 403 | **200** | 200 | 401 |
| `/api/waste/control-center/ai-recommend-worker` | POST | 403 | 403 | **200** | 200 | 401 |
| `/api/waste/control-center/assign-complaint` | POST | 403 | 403 | **200** | 200 | 401 |
| `/api/waste/control-center/verify-proof` | POST | 403 | 403 | **200** | 200 | 401 |
| `/api/waste/admin/staff` | GET | 403 | 403 | 403 | **200** | 401 |
| `/api/waste/admin/staff` | POST | 403 | 403 | 403 | **201** | 401 |
| `/api/waste/admin/staff/:id` | PUT | 403 | 403 | 403 | **200** | 401 |
| `/api/waste/admin/staff/:id/status` | POST | 403 | 403 | 403 | **200** | 401 |
| `/api/waste/admin/staff/:id/reset-password` | POST | 403 | 403 | 403 | **200** | 401 |
| `/api/waste/admin/audit-logs` | GET | 403 | 403 | 403 | **200** | 401 |
| `/api/water/admin/staff` | GET | 403 | 403 | 403 | 403 | 401 |
| `/api/traffic/control-room` | GET | 403 | 403 | 403 | 403 | 401 |

---

## 4. Admin Governance Exclusivity Invariants

The audit verified five non-negotiable security invariants regarding municipal administration:

1. **Account Creation Exclusivity:** Only `super_admin`, `admin`, and `wst-admin` roles can call `POST /api/waste/admin/staff`. Control Center dispatchers receive `HTTP 403 Forbidden` if attempting to provision staff.
2. **Credential Reset Exclusivity:** Only Administrators can call `POST /api/waste/admin/staff/:id/reset-password`. Workers and Control Center staff cannot reset passwords.
3. **Role Elevation Prevention:** Only Administrators can assign or mutate the `role` field. Control Center staff cannot elevate field workers to supervisors.
4. **Suspension/Activation Exclusivity:** Only Administrators can invoke `POST /api/waste/admin/staff/:id/status` to activate or suspend employee accounts.
5. **Route and Bin Reallocation Exclusivity:** Route IDs and smart bin assignment codes can only be remapped via Admin credentials (`PUT /api/waste/admin/staff/:id`). Every change creates an immutable entry in the administrative audit log.

---

## 5. Verification Verdict

**ROLE ISOLATION: PASS**  
The workforce permission matrix strictly enforces least privilege across both frontend browser routing and backend API controllers.

