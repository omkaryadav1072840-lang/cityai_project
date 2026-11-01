# BLOOD BANK & EMERGENCY BLOOD MANAGEMENT SYSTEM: IMPLEMENTATION AUDIT
**SmartCity AI – Gorakhpur Municipal Healthcare Ecosystem**
*Date: 2026-10-31*
*Author: Senior Full-Stack Engineer, Database Architect & Security Engineer*

---

## 1. Executive Summary & Audit Scope
This audit document establishes the comprehensive technical baseline for replacing the legacy "Upload Prescription" card (`frontend/pages/hospital/hospital.html`) with a production-grade **Blood Bank & Emergency Blood Management System**. The implementation covers:
- Citizen blood availability discovery (across all 8 blood groups & standard components).
- Emergency blood request lifecycle with strict status progression, concurrency-safe reservations, and audit logging.
- Voluntary donor registration and consent lifecycle.
- Hospital blood bank staff inventory management and dispatch control.
- Hospital administrative oversight, wastage & expiry analytics, and audit logs.

Strict preservation of all existing hospital appointments, pharmacy ordering, billing, bed management, teleconsultation, and doctor workflows is guaranteed.

---

## 2. Files Inspected

### 2.1 Frontend Files Inspected
1. `frontend/pages/hospital/hospital.html`:
   - Contains the target card to replace: lines 912–933:
     `<!-- 12. UPLOAD PRESCRIPTION -->`
     `<div class="service-card" data-service-cat="pharmacy" onclick="openPrescriptionUpload()">`
   - Notice that Card 11 (`Jan Aushadhi Pharmacy`, lines 885–910) contains a secondary action button `<span>📤 Upload Rx</span>` (`onclick="openPrescriptionUpload()"`), and the full prescription modal (`#prescriptionModal`, lines 2423–2549) remains completely functional and untouched.
   - Services overview grid container: `.services-grid` under `#services-section`.
2. `frontend/pages/hospital/hospital.css`:
   - Defines `.service-card`, `.service-card-header`, `.service-icon-wrap`, `.service-status-chip`, `.service-card-body`, `.service-card-footer`, and `.dual-action-row`.
   - Grid layout responds smoothly to desktop, tablet, and mobile breakpoints (`grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`).
3. `frontend/pages/hospital/hospital_dashboard.html` & `hospital_dashboard.js`:
   - Contains hospital staff & admin interface for bed management, admissions, pharmacy stock, and doctor schedules.
4. `frontend/pages/hospital/doctor_dashboard.html` & `doctor_dashboard.js`:
   - Manages doctor appointments, patient consultation notes, and prescriptions.
5. `frontend/auth.js`:
   - Manages citizen and staff JWT storage (`smartcity_token`, `smartcity_user`), token renewal, logout events, and authorization headers.
6. `frontend/sw.js`:
   - Service Worker managing asset caching with Stale-While-Revalidate.

### 2.2 Backend Files Inspected
1. `backend/server.js`:
   - Express 4.x server, mounts modular route handlers: `app.use(hospitalRoutes)`, `app.use(pharmacyRoutes)`, `app.use(emergencyRoutes)`, `app.use(ambulanceRoutes)`, etc.
2. `backend/routes/hospital.routes.js`:
   - **PROTECTED INVARIANT FILE**: Contains core hospital beds, OPD queues, and hospital metadata. Must remain 100% untouched.
   - Hospital authorization helper: `verifyHospitalStaffAccess(req, hospitalId, allowedRoles)`.
3. `backend/controllers/hospital.controller.js`:
   - **PROTECTED INVARIANT FILE**: Core hospital business logic. Must remain 100% untouched.
4. `backend/routes/patient.routes.js` & `backend/routes/pharmacy.routes.js`:
   - Patient registration, prescription filing, pharmacy fulfillment.
5. `backend/middleware/auth.middleware.js`:
   - `authenticateToken`, `requireRole`, `requireDepartment`, `optionalToken`, token blacklist (`revoked_tokens`).
6. `backend/services/audit_logger.js`:
   - Centralized `logAudit(req, entry)` logging user actions to MySQL `audit_logs` with memory fallback.
7. `backend/sockets/index.js`:
   - Real-time event broadcasting (`getIO()`) over WebSocket rooms.
8. `backend/config/db.js`:
   - MySQL2 connection pool (`mysql.createPool`) with `.promise()` support and health check.
9. `backend/database/schema.sql` & `backend/migrations/`:
   - Inspected tables: `hospitals`, `hospital_departments`, `patients`, `staff`, `users`, `audit_logs`.

---

## 3. Existing Reusable Components & Conventions

| Domain | Existing Component / Utility | Usage for Blood Bank |
|---|---|---|
| **Database Pool** | `backend/config/db.js` (`pool.promise()`) | Reused for all transactional queries with `getConnection()`. |
| **Auth & RBAC** | `backend/middleware/auth.middleware.js` | `authenticateToken`, `requireRole(["citizen", "staff", "admin"])`, `optionalToken`. |
| **Data Scoping** | Hospital Staff Scoping Pattern | Staff can only view/manage inventory of their assigned `hospital_id`. Superadmin has global access. |
| **Auditing** | `backend/services/audit_logger.js` | Logs all stock adjustments, status transitions, reservations, and donor verifications. |
| **Realtime** | `backend/sockets/index.js` (`getIO()`) | Emits updates on `blood-bank-updates` channel and user-specific rooms. |
| **Frontend Styling** | `hospital.css` & `ui_components.css` | Glassmorphic cards, `.service-status-chip`, `.dual-action-row`, standard color palettes. |
| **Frontend Auth** | `frontend/auth.js` | Retrieves active JWT, validates expiry, and sets `Authorization: Bearer <token>`. |

---

## 4. Current State vs. Missing Functionality

### 4.1 What Exists Now
- In `frontend/pages/hospital/hospital.html`, Card 12 is a static link to prescription upload (`openPrescriptionUpload()`), which duplicates Card 11's secondary upload button.
- `patients` and `users` tables have a simple `blood_group` VARCHAR field.
- No blood bank tables, no inventory tracking, no emergency request workflow, and no donor registry exist in the database or API.

### 4.2 What Is Missing (To Implement)
1. **Frontend Entry Card (Phase 2):**
   - Replace Card 12 with "Blood Bank & Donation" card:
     - Badge: `BLOOD BANK`
     - Medical blood-drop icon: `🩸`
     - Primary button: `Find Blood` (navigates to citizen blood bank view).
     - Secondary button: `Become a Donor` (opens donor registration modal/form).
2. **Citizen Blood Bank Dashboard (Phase 3, 4, 5):**
   - Live availability view with real MySQL inventory across 8 groups (A+, A-, B+, B-, AB+, AB-, O+, O-) and standard components (PRBC, Platelets, FFP, Whole Blood).
   - Real-time stock status based strictly on verified, non-expired, non-quarantined units.
   - Emergency Blood Request Form with multi-priority handling, duplicate prevention, and patient privacy notices.
   - Citizen Request Tracker with real-time status progression (`SUBMITTED` -> `UNDER_REVIEW` -> `VERIFIED` -> `APPROVED` -> `RESERVED` -> `READY_FOR_COLLECTION` -> `FULFILLED`).
   - Voluntary Donor Registration with consent capture, interval checks, and confidential contact protection.
3. **Blood Bank Staff & Admin Dashboard (Phase 6):**
   - Unit-level inventory ledger (unit identifier, blood group, component, collection date, expiry date, screening status, storage location).
   - Request fulfillment workflow with transactional reservation (`SELECT ... FOR UPDATE`).
   - Expiry management & alerts (prevents reserving expired or quarantined units).
   - Administrative reporting & statistics (stock summary, wastage analysis, donation trends).
4. **Database Entities & Migrations (Phase 7):**
   - `blood_bank_hospitals` / hospital linkage.
   - `blood_inventory_units`
   - `blood_inventory_movements`
   - `blood_requests`
   - `blood_request_status_history`
   - `blood_stock_reservations`
   - `blood_donors`
   - `blood_donor_consents`
   - `blood_bank_audit_logs`
5. **Backend APIs & Routing (Phase 9 & 10):**
   - Dedicated route file `backend/routes/blood_bank.routes.js` mounted at `/api/hospital/blood-bank` in `backend/server.js`.
   - Strict hospital-level RBAC and citizen ownership verification.
6. **Concurrency & Transaction Safety (Phase 8):**
   - MySQL InnoDB transactions with `SELECT ... FOR UPDATE` and conditional row updates.
   - Idempotency key handling to prevent duplicate submissions.

---

## 5. Protected Invariant Files (DO NOT MODIFY)
The following existing hospital backend files must remain 100% untouched:
- `backend/routes/hospital.routes.js`
- `backend/controllers/hospital.controller.js`

All new Blood Bank routes will live in `backend/routes/blood_bank.routes.js` and mount cleanly via `backend/server.js`.

---

## 6. Migration and Rollback Strategy

### 6.1 Database Migration
- File: `backend/migrations/blood_bank_migration.js`
- Executed via Node.js with safe `CREATE TABLE IF NOT EXISTS`, indexing, and fallback in-memory seed data.
- Seeds initial verified hospital blood bank departments (AIIMS Gorakhpur, BRD Medical College, District Hospital) with verified baseline inventory.

### 6.2 Rollback Strategy
- Database: All new tables are prefixed with `blood_` and do not drop or alter existing hospital tables. A rollback script `DROP TABLE IF EXISTS blood_stock_reservations, blood_inventory_movements, blood_inventory_units, blood_request_status_history, blood_requests, blood_donor_consents, blood_donors, blood_bank_audit_logs;` completely reverses the schema without impacting existing records.
- Backend: Removing `app.use(bloodBankRoutes);` in `backend/server.js` unmounts the module cleanly.
- Frontend: Card 12 markup can be restored to the legacy upload prescription snippet in under 1 minute.
