# SmartCity AI (Gorakhpur) — Comprehensive Security Audit Report

**Document Version:** 3.0.0-MASTER  
**Audit Date:** October 19, 2026  
**Auditor Roles:** Senior Application Security Engineer, Penetration Tester, Database Security Specialist  
**Repository Root:** `D:\cityai_project - Copy`  

---

## 1. Vulnerability Findings Register & Remediation Summary

| Vulnerability ID | Category | Severity | Description | Remediation Applied | Test Verification |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **VULN-001** | Broken Auth | **CRITICAL** (9.8) | Hardcoded password bypasses (`admin123`, `password`, `123456`) in `/api/login` and `/api/staff-login`. | Completely removed backdoor conditions. Strict `bcrypt`/`scrypt` password verification enforced. | `test_phase2_otp_and_auth.js` (Test 6) — PASS |
| **VULN-002** | Privilege Escalation | **HIGH** (8.8) | Magic identifier `STAFF-001` granted automatic `super_admin` role. | Removed magic identifier check. Staff roles derived strictly from database records. | `test_phase2_otp_and_auth.js` — PASS |
| **VULN-003** | Insecure Cryptography | **HIGH** (7.5) | OTP generation used non-cryptographic `Math.random()`. | Replaced with CSPRNG `crypto.randomInt(100000, 1000000)`. | `test_phase2_otp_and_auth.js` (Test 1) — PASS |
| **VULN-004** | BOLA / IDOR | **HIGH** (8.5) | `GET /api/waste/my-requests` accepted query `userId`; `/api/waste/requests/:id` lacked ownership verification. | Bound queries strictly to verified JWT `req.user.id`. Layer 3 object ownership check enforced. | `test_phase3_and_waste_security.js` (Tests 4 & 10) — PASS |
| **VULN-005** | Concurrency / TOCTOU | **HIGH** (7.4) | Concurrent OTP replay allowed double-spending before update committed. | Enforced atomic engine update `UPDATE otp_records SET used = 1 WHERE id = ? AND used = 0`. | `test_phase2_otp_and_auth.js` (Test 9) — PASS |
| **VULN-006** | Session Persistence | **MEDIUM** (6.8) | Password reset did not invalidate existing active JWT tokens. | Added `revokeAllUserSessions(userId)` and `isUserSessionRevoked(decoded.id, decoded.iat)`. | `test_phase2_otp_and_auth.js` (Test 7) — PASS |
| **VULN-007** | Obsolete Headers | **LOW** (3.5) | `X-XSS-Protection: 1; mode=block` caused client-side leak vulnerabilities in modern browsers. | Modernized to `X-XSS-Protection: 0`, added COOP and CORP policies. | `security.middleware.js` — PASS |
| **VULN-008** | Account Enumeration | **LOW** (4.3) | Discrepancy between "Staff ID not found" and "Invalid credentials". | Unified all auth failure responses to identical generic credentials error. | `test_phase2_otp_and_auth.js` (Test 8) — PASS |
| **VULN-009** | Memory Leak / DoS | **MEDIUM** (5.5) | Unbounded Set for revoked tokens and Map for user revocations had no TTL pruning. | Upgraded to TTL Map with 10-minute periodic pruner and 7-day session record expiration. | `test_phase2_otp_and_auth.js` (Test 11) — PASS |
| **VULN-010** | WebSocket Auth Bypass | **HIGH** (7.8) | Socket.IO handshake did not verify whether a user's session was invalidated post-reset. | Added `isUserSessionRevoked` check into `io.use()` handshake middleware. | `test_phase3_and_waste_security.js` (Test 11) — PASS |

---

## 2. Negative Authorization Test Matrix

| Attempted Attack / Bypass Vector | Targeted Route | Expected Outcome | Actual Result | Verification |
| :--- | :--- | :---: | :---: | :---: |
| Visitor attempting to create a Waste Bin | `POST /api/waste/bins` | `401 Unauthorized` | `401` | **PASS** |
| Citizen attempting to create a Waste Bin | `POST /api/waste/bins` | `403 Forbidden` | `403` | **PASS** |
| Traffic Staff attempting to modify Waste ticket | `PUT /api/waste/requests/:id/status` | `403 Forbidden` | `403` | **PASS** |
| Citizen inspecting another citizen's private request | `GET /api/waste/requests/:id` | `403 Forbidden` | `403` | **PASS** |
| Staff attempting to relocate traffic junction on GIS map | `PUT /api/traffic/junctions/:id/relocate`| `403 Forbidden` | `403` | **PASS** |
| Citizen attempting to trigger traffic override | `POST /api/traffic/override` | `403 Forbidden` | `403` | **PASS** |
| Revoked token connecting to Socket.IO | Socket.IO Handshake | Connection Refused | Handshake Error | **PASS** |
| Post-reset token connecting to Socket.IO | Socket.IO Handshake | Connection Refused | Handshake Error | **PASS** |

---

## 3. Residual Risks & Infrastructure Recommendations

1. **Shared Redis State Store:** In-memory rate limiting and token revocation must be backed by Redis before multi-instance horizontal scaling.
2. **Production Transactional SMTP:** Provision AWS SES or Postmark with SPF/DKIM DNS records.
3. **Edge WAF & TLS:** Terminate TLS 1.3 at Cloudflare/Nginx with HSTS and OWASP ModSecurity Core Rule Set.
