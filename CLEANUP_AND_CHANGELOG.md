# SmartCity AI (Gorakhpur) — Cleanup & Master Changelog

**Document Version:** 2.0.0-MASTER  
**Date:** October 19, 2026  
**Repository Root:** `D:\cityai_project - Copy`  

---

## 1. Master Change History

### Pending Working Tree Modifications (Awaiting Commit Approval)
- **`scratch/test_master_backend_routes.js`**: Corrected citizen test login fixture password from obsolete `omkar123` to seeded hash credential `password123`.
- **`scratch/test_waste_module.js`**: Corrected citizen test login fixture password from obsolete `omkar123` to seeded hash credential `password123`.

### Commit `df159cc` (October 19, 2026)
- **`backend/middleware/auth.middleware.js`**: Replaced unbounded `Set` with TTL Map `revokedTokens` (`token -> expMs`). Added 10-minute periodic pruner for expired tokens and 7-day pruning for user session invalidations.
- **`backend/sockets/index.js`**: Enforced `isUserSessionRevoked(decoded.id, decoded.iat)` in Socket.IO handshake middleware to prevent invalidated sessions from connecting.
- **`backend/services/otp_service.js`**: Enforced `email.trim().toLowerCase()` and `submittedOtp.trim()` to eliminate whitespace and casing authentication mismatches.
- **`backend/middleware/security.middleware.js`**: Made HSTS `preload` opt-in via `process.env.HSTS_PRELOAD === 'true'` to protect against permanent browser domain lock-in.
- **`backend/test_phase2_otp_and_auth.js`**: Added Test 10 (Email Normalization) and Test 11 (Token Revocation TTL & Memory Safety).
- **`backend/test_phase3_and_waste_security.js`**: Added Test 11 (Socket.IO Handshake Auth & Session Revocation).

### Commit `df40063` (October 19, 2026)
- Authored comprehensive `SECURITY_FINAL_AUDIT.md`.

### Commit `be98672` (October 19, 2026)
- **`backend/routes/auth.routes.js`**: Removed hardcoded backdoors (`admin123`, `password`, `123456`) and magic identifier `STAFF-001`. Unified credentials error message to mitigate account enumeration.
- **`backend/services/otp_service.js`**: Integrated CSPRNG `crypto.randomInt()`, scrypt salt hashing, atomic consumption `UPDATE ... WHERE id = ? AND used = 0`.
- **`backend/routes/waste.routes.js`**: Fixed BOLA/IDOR on `/api/waste/my-requests`, implemented Haversine 500m proximity filtering, GPS staleness detection (>15m), and privacy-preserving in-memory AI classification.
- **`backend/routes/admin.routes.js`**: Hardened `requireAdmin` to prevent staff in `department: 'admin'` from gaining super-admin privileges.
- **`backend/middleware/security.middleware.js`**: Modernized to `X-XSS-Protection: 0`, added COOP/CORP headers.

---

## 2. Safe Cleanup & File Deletion Policy

- **Policy Enforced:** No file was deleted unless proven 100% unused and verified via static and dynamic grep search across all routes, scripts, templates, and tests.
- **Obsolete Monolithic Server:** `backend/server.backup.js` was previously retired with verified backup. All functionality operates cleanly through modular Express routers.
- **Uncertain Files Preserved:** All scripts in `scratch/` and `docs/` are preserved to maintain complete historical and auditing context.

---

## 3. Rollback Instructions

If rollback is required:
1. **Revert to Pre-Master Audit State:**
   ```bash
   git checkout backup/pre-master-audit-20261019
   ```
2. **Revert to Pre-Phase 7 Checkpoint:**
   ```bash
   git checkout backup/checkpoint-pre-phase7-20261019
   ```
3. **Revert to Initial Pre-Audit Baseline:**
   ```bash
   git checkout backup/pre-audit-verification-20261019
   ```
4. **Clean Staging Database Tables:**
   ```sql
   DROP TABLE IF EXISTS waste_collection_events;
   DROP TABLE IF EXISTS waste_fill_predictions;
   DROP TABLE IF EXISTS waste_collection_routes;
   DROP TABLE IF EXISTS waste_vehicles;
   DROP TABLE IF EXISTS waste_bins;
   DROP TABLE IF EXISTS otp_records;
   ```
