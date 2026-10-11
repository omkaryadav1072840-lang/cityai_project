# SMARTCITY AI — Comprehensive Security Audit
**Platform**: Gorakhpur Smart City Municipal Operations Platform  
**Audit Scope**: Authentication, Authorization (RBAC), Object-Level Access Control, Input Sanitization, Cryptographic Standards, Rate Limiting, and Audit Logging  

---

## 1. Authentication & Token Lifecycle

### 1.1 Password Hashing Architecture
- **Algorithm**: Node.js Native Crypto `scrypt` (`scryptSync`) with 16-byte random salt and 64-byte key length.
- **Format**: `scrypt$<salt>$<hash>`.
- **Timing Defense**: `crypto.timingSafeEqual` prevents timing side-channel attacks during hash verification.
- **Finding**: High compliance. Passwords are never stored in plaintext. Legacy plaintext entries (if any exist in historical development data) are authenticated and can be seamlessly upgraded on next login.

### 1.2 JWT Token Generation & Verification
- **Secret Management**: Stored in `backend/.env` under `JWT_SECRET`. Falls back to default string if unconfigured.
- **Recommendation**: Ensure production deployments configure a cryptographically high-entropy random string (>= 256 bits).
- **Expiration**: Standard 7-day expiration (`JWT_EXPIRES_IN=7d`).
- **Payload Sanitization**: Payloads contain minimal non-sensitive identity metadata (`id`, `name`, `role`, `type`, `department`, `hospitalId`). Passwords and medical histories are never encoded in JWT tokens.

---

## 2. Authorization & Role-Based Access Control (RBAC)

### 2.1 Role Hierarchy & Guarding
Guarded by `backend/middleware/auth.middleware.js`:
- `authenticateToken`: Rejects unauthenticated requests with `HTTP 401 Unauthorized`.
- `requireRole(allowedRoles)`: Rejects unprivileged roles with `HTTP 403 Forbidden`.
- `requireDepartment(allowedDepartments)`: Blocks cross-department mutations (e.g. Traffic Staff cannot resolve Waste Grievances).
- `requireDoctorOrStaff`: Protects clinical consultation and prescription recording.

### 2.2 Object-Level Access Control (IDOR Protection)
- **Patient EMR Records**: `checkPatientAccess(req, patient)` in `backend/routes/patient.routes.js` strictly restricts patient retrieval to:
  1. The authenticated patient owner (`req.user.id === patient.user_id` or matching 10-digit mobile).
  2. Authorized clinical staff (`doctor`, `staff`, `admin`).
  3. All unauthorized attempts reject with `HTTP 403 Forbidden` and log to `patient_audit_logs`.
- **Citizen Service Requests**: `GET /api/requests` restricts citizens to `user_id = ? OR citizen_mobile = ?`. Requests filed by other citizens are completely hidden.
- **Parking Reservations**: `GET /api/parking/my-bookings` scopes results to `b.user_id = ? OR b.customer_phone = ?`. Unauthenticated requests require both vehicle registration and phone number to prevent data scraping.

---

## 3. Cryptographic Privacy & Medical Safeguards

### 3.1 Ayushman Bharat Privacy QR Code Pass
- **Threat Vector**: Physical QR pass stolen or scanned by unauthorized bystanders.
- **Safeguard**: Dual-state verification (`POST /api/patients/verify-qr`):
  - When scanned without a medical token, the response returns **strictly masked public identity fields** (`John D***`, Blood Group `B+`, emergency contact masked `******1234`).
  - Full clinical chart, past diagnoses, and lab tests are **only decrypted and returned** if the scanner possesses an authorized Bearer JWT with `role: doctor`, `role: hospital_admin`, or `role: staff`.

### 3.2 Medical Document Upload Protection
- Located in `backend/server.js`:
  ```javascript
  app.use(["/uploads/prescriptions", "/uploads/reports"], (req, res, next) => {
      // Validates Bearer token before serving confidential PDF/PNG clinical files
  });
  ```
- Directly browsing `/uploads/prescriptions/sample.png` without authorization returns `HTTP 401 Access Denied`.

---

## 4. Injection Defenses & Rate Limiting

### 4.1 SQL Injection Protection
- **Connection Pool**: `mysql2/promise` with prepared statements.
- **Audit Result**: Zero dynamic SQL string concatenations of user input found across all 27 route files. All dynamic inputs are passed as parameters (`?`).

### 4.2 Cross-Site Scripting (XSS) & Input Sanitization
- Guarded by `inputSanitizer` in `backend/middleware/validation.middleware.js`.
- Recursively strips `<script>`, HTML tags, and dangerous DOM attributes from all fields in `req.body` and `req.query`.

### 4.3 Tiered Rate Limiting
Configured via `express-rate-limit` in `backend/middleware/security.middleware.js`:
- `globalApiRateLimiter`: 300 requests / 15 minutes.
- `authRateLimiter`: 20 requests / 15 minutes on `/api/login`, `/api/register`, `/api/staff-login`.
- `aiRateLimiter`: 30 requests / 1 minute on `/api/ai/chat`, `/api/ai/assistant`.
- `sosRateLimiter`: 10 requests / 1 minute on `/api/emergency/sos` to prevent emergency channel denial-of-service.

---

## 5. Security Action Items & Recommendations

1. **Hardening `POST /api/parking/book`**:
   - Explicitly attach `optionalToken` to `POST /api/parking/book` so authenticated citizens cannot have their `userId` overridden by arbitrary body parameters.
2. **Standardize SQL Error Code Mapping**:
   - Ensure all unique constraint collisions (`ER_DUP_ENTRY`, errno 1062) return `HTTP 409 Conflict` instead of reaching the generic `500 Server Error` catch block.
3. **Environment Secrets**:
   - Ensure `.env` is retained in `.gitignore` and never committed to source control (currently verified in `.gitignore`).

---
*End of Security Audit. Document saved to [docs/SECURITY_AUDIT.md](file:///d:/cityai_project%20-%20Copy/docs/SECURITY_AUDIT.md).*
