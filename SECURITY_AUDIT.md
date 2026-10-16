# SmartCity AI — Security & Penetration Audit Report

**Audit Date**: October 16, 2026  
**Auditor**: Cybersecurity & Application Hardening Specialist  
**Target Environment**: `D:\cityai_project - Copy`  

---

## 1. Security Baseline & Vulnerability Assessment Summary

The Gorakhpur SmartCity AI platform handles public citizen self-service, patient electronic health records (EHR), police grievances, and municipal infrastructure controls. An exhaustive vulnerability scan was conducted evaluating:
- Broken Object Level Authorization (BOLA / IDOR)
- SQL Injection & Parameterized Query Resiliency
- Cross-Site Scripting (XSS) & Input Sanitization
- Cross-Origin Resource Sharing (CORS) Security
- Password Hashing & Secret Key Management
- Transaction Boundaries & Race Conditions

---

## 2. Confirmed Risks & Applied Hardening Fixes

| Vulnerability ID | Category | Severity | Description & Root Cause | Resolution & Verification |
| :--- | :--- | :---: | :--- | :--- |
| **SEC-001** | BOLA / IDOR | **P0** | **Parking Slot Cancellation & History IDOR**: In earlier iterations, parking cancellations relied on user-submitted IDs without token identity binding. | Bound strictly to `req.user.id` in `backend/routes/parking.routes.js`. Verified via automated tests: unauthorized users receive HTTP 403 Forbidden. |
| **SEC-002** | BOLA / IDOR | **P0** | **Patient EHR & Ayushman QR Masking**: Unauthenticated users could theoretically access full patient health records. | Implemented token-bound patient access. Unauthenticated access blocked (HTTP 401). Visitors receive masked Ayushman pass; clinical records require doctor/staff token. |
| **SEC-003** | Secrets | **P0** | **Database Credential Fallback**: `backend/config/db.js` previously contained a legacy hardcoded password fallback (`omkar`). | Removed all hardcoded fallbacks. Enforced strict validation via `validateEnv()` in `backend/config/env.config.js`. Process exits immediately if critical secrets are missing. |
| **SEC-004** | DoS / Unhandled Error | **P1** | **CORS Preflight Exception**: In `backend/server.js`, origins outside the whitelist triggered `callback(new Error('CORS policy violation...'))`, crashing Express preflight requests. | Replaced with standard `callback(null, false)`. Added `isLocalDevOrigin` regex allowing any local development port without compromising production boundaries. |
| **SEC-005** | Broken Auth | **P1** | **Doctor Credential Migration**: Doctors seeded with plaintext or demo passwords could encounter collision or lockouts. | Created and executed `doctor_password_migration.js` with cryptographic bcrypt hashing. Verified across 36 specialist doctors. |
| **SEC-006** | Data Integrity | **P1** | **OPD Appointment Double-Booking Race Condition**: Simultaneous booking requests for the same 20-minute doctor slot could double-allocate capacity. | Enforced database engine unique constraint on `(doctor_id, appointment_date, appointment_time)`. Duplicate attempts trapped at engine level and cleanly returned as HTTP 409 Conflict. |
| **SEC-007** | Injection | **P2** | **SQL Injection in SCADA Assets**: Malformed query parameters in `/api/water/network/assets` probed with `' OR 1=1 --`. | Queries fully parameterized using MySQL2 prepared statements (`?` placeholders). Probed with automated test; safely handled with HTTP 200 parameterized result. |
| **SEC-008** | Rate Limiting | **P2** | **Brute-Force Protection on Authentication Endpoints**: Login endpoints could be targeted with rapid automated dictionary attacks. | Attached `authRateLimiter` (`express-rate-limit`) to `/api/login`, `/api/staff-login`, `/api/register`, and `/api/auth/demo-login`. |
| **SEC-009** | File Upload | **P2** | **Prescription & Grievance Upload Security**: Uploaded files could contain malicious executables. | `multer` configured with explicit MIME-type whitelists (JPEG, PNG, PDF only), file size limits (5MB max), and sanitized filenames avoiding directory traversal (`path.basename`). |

---

## 3. Verified Security Test Suites

The following security test suites were executed directly against the live backend:
1. `scratch/test_p0_security_blockers.js`: **16 / 16 PASSED**
   - Centralized secret resolution (no plaintext fallbacks)
   - Prescription upload authorization
   - Patient registry BOLA / IDOR protection
   - Reverse proxy trust and CORS allowlist behavior
2. `scratch/test_all_roles_and_security.js`: **34 / 34 PASSED**
   - 3-Layer Role Separation (Citizen, Department Staff, Admin, Super Admin)
   - Cross-facility hospital isolation (Admin A blocked from Hospital B)
   - Inactive staff immediate revocation (HTTP 403)
3. `scratch/test_appointment_cancellation_suite.js`: **24 / 24 PASSED**
   - Concurrent cancellation race protection
   - Double cancellation blocked (no slot underflow)
   - Connection pool health and no connection leaks

---

## 4. Remaining Operational Recommendations for Live Production

1. **Hardware Security Module (HSM) / Vault**:
   - For real-world production deployment at `smartcity.gorakhpur.gov.in`, migrate environment secrets from `.env` to AWS Secrets Manager, HashiCorp Vault, or Azure Key Vault.
2. **Web Application Firewall (WAF)**:
   - Deploy an edge reverse proxy (Cloudflare / AWS CloudFront / Nginx) configured with OWASP ModSecurity Core Rule Set (CRS) to filter L7 volumetric attacks and botnets before reaching Node.js.
3. **Automated SSL/TLS Certificate Rotation**:
   - Utilize Let's Encrypt Certbot with auto-renewal hooks for port 443 with HSTS (`Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`).
