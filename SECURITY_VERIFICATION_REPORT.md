# SmartCity AI (Gorakhpur) – Security Verification Report

**Project Root**: `D:\cityai_project - Copy`  
**Execution Timestamp**: 2026-10-24T19:29:00+05:30  
**Audit Phase**: Phase 2 – Full Runtime, Integration & Production Readiness  
**Lead Auditor**: Application Security & Software Architecture Review  

---

## 1. Executive Summary

A comprehensive application security audit and penetration-style verification was performed on **SmartCity AI – Gorakhpur**. Testing encompassed authentication mechanics, role-based access control (RBAC), multi-tenant data isolation, injection vulnerabilities, Broken Object Level Authorization (BOLA/IDOR), sensitive document upload controls, and network security headers.

### High-Level Security Posture
- **Zero Critical (P0) or High (P1) Vulnerabilities Unresolved**: All authentication bypasses, IDOR vectors, and secret leaks were validated as fully closed.
- **Strict Role-Based Access Control**: 11 distinct account types enforce boundary separation across departments and facilities.
- **Secrets Cleanliness**: Scanned repository for private keys, AWS tokens, GitHub tokens, and hardcoded database credentials. Result: **0 secret leaks detected**.

---

## 2. Authentication & RBAC Role Enforcement Matrix

The platform implements a **Three-Layer Authorization Architecture**:
1. **Layer 1: Citizen & Guest Services** (Public views, personal grievance creation, OPD appointments).
2. **Layer 2: Staff Operations & Field Desks** (Department-scoped operational tools; e.g. Waste staff, Traffic officers, Nurses, Receptionists, Doctors).
3. **Layer 3: Department Admin & Super Admin Command** (GIS planner, staff provisioning, facility licensing, system-wide metrics).

### Negative Access Testing Matrix

| Account Type Tested | Target Endpoint | Action Attempted | Expected Status | Actual Status | Result |
|:---|:---|:---|:---:|:---:|:---:|
| **Unauthenticated** | `POST /api/prescriptions/upload` | Upload clinical Rx | 401 Unauthorized | 401 Unauthorized | ✅ PASS |
| **Unauthenticated** | `POST /api/water/sectors` | Create municipal sector | 401 Unauthorized | 401 Unauthorized | ✅ PASS |
| **Citizen** | `GET /api/admin/system/metrics` | View ICCC metrics | 403 Forbidden | 403 Forbidden | ✅ PASS |
| **Citizen** | `GET /api/patients/:otherId` | View other citizen's EHR | 403 Forbidden | 403 Forbidden | ✅ PASS |
| **Citizen** | `POST /api/traffic/override` | Manual traffic signal switch | 403 Forbidden | 403 Forbidden | ✅ PASS |
| **Traffic Staff (TR-VERMA)** | `POST /api/requests/:id/resolve` (Waste) | Resolve waste grievance | 403 Forbidden | 403 Forbidden | ✅ PASS |
| **Traffic Officer (Mohaddipur)** | `POST /api/traffic/override` (Golghar) | Override other junction | 403 Forbidden | 403 Forbidden | ✅ PASS |
| **Hospital Staff (HOSP-001)** | `GET /api/hospitals/HOSP-002/appointments`| View rival hospital queue | 403 Forbidden | 403 Forbidden | ✅ PASS |
| **Hospital Admin A (HOSP-001)**| `POST /api/hospitals/HOSP-002/staff` | Provision staff in Hosp B | 403 Forbidden | 403 Forbidden | ✅ PASS |
| **Deactivated Staff** | `POST /api/staff-login` | Authenticate inactive user | 403 Forbidden | 403 Forbidden | ✅ PASS |
| **Invalid Password** | `POST /api/staff-login` | Brute-force attempt | 401 Unauthorized | 401 Unauthorized | ✅ PASS |

---

## 3. Vulnerability Verification & Defense-in-Depth

### 3.1 Broken Object Level Authorization (BOLA / IDOR)
- **Attack Vector**: Changing `:patientId` in URL or request body to view or modify other patients' medical records.
- **Verification**: Tested against `GET /api/patients/:patientId` and `PUT /api/patients/:patientId`.
- **Enforcement**: In `patient.routes.js`, if `req.user.role === 'citizen'`, the server verifies `req.user.id === patient.user_id` or `req.user.mobile === patient.mobile`. Cross-account requests are aborted with HTTP 403 Forbidden.

### 3.2 SQL Injection (SQLi)
- **Audit Findings**: Backend uses parameterized SQL queries exclusively via `mysql2/promise` (`db.promise().query(sql, [param1, param2])`).
- **Input Sanitization**: Global Express middleware `inputSanitizer` in `backend/middleware/validation.middleware.js` strips malicious SQL control characters and script tags from request bodies and query parameters.
- **Result**: Zero raw string concatenations found in SQL statements.

### 3.3 Cross-Site Scripting (XSS) & Clickjacking
- **Headers Verified**:
  - `X-Content-Type-Options: nosniff` (Active)
  - `X-Frame-Options: SAMEORIGIN` (Active)
  - `X-XSS-Protection: 1; mode=block` (Active)
  - `Referrer-Policy: strict-origin-when-cross-origin` (Active)
  - `Permissions-Policy: geolocation=(self), camera=(), microphone=(), payment=()` (Active)
- **Result**: Clickjacking and MIME-sniffing fully defended.

### 3.4 Rate Limiting & DoS Protection
- **Global Rate Limiter**: `globalApiRateLimiter` applies sliding-window request throttling across all `/api/` routes.
- **Auth Rate Limiter**: Maximum 20 requests per minute on `/api/login`, `/api/staff-login`, and `/api/auth/otp/*`.
- **SOS Rate Limiter**: Maximum 10 emergency broadcasts per 30 seconds to prevent alert floods.
- **Result**: Brute-force credential stuffing and denial-of-service attempts are throttled with HTTP 429 Too Many Requests and `Retry-After` headers.

### 3.5 Confidential Document Guard
- **Upload Guard**: `/uploads/prescriptions` and `/uploads/reports` are guarded by JWT middleware. Direct unauthenticated access to confidential patient clinical files returns HTTP 401 Unauthorized.
- **File Validation**: `multer` file filters enforce whitelisted MIME types (`image/jpeg`, `image/png`, `application/pdf`) and maximum file size limits (10MB).

### 3.6 Automated Secret Scan Results
- **Scanner**: `scratch/scan_secrets.js`
- **Patterns**: Private keys, AWS tokens, GitHub tokens, Google API keys, Stripe keys, Slack tokens.
- **Total Findings**: **0 leaks detected across all files and directories**.

---

## 4. Test Suite Evidence

- `scratch/test_all_roles_and_security.js`: **34 / 34 PASSED (100%)**
- `scratch/test_p0_security_blockers.js`: **16 / 16 PASSED (100%)**
- `backend/test_traffic_jurisdiction_and_ai.js`: **19 / 19 PASSED (100%)**
- `scratch/test_hardening_and_compliance.js`: **18 / 18 PASSED (100%)**
- `scratch/verify_all_modules_rbac.js`: **PASSED (100%)**
