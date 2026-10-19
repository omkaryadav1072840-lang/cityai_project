# SmartCity AI (Gorakhpur) — Phase 7 Production-Readiness & Security Verification Audit

**Document Version:** 2.1.0-PHASE7-READINESS  
**Date of Audit Execution:** October 19, 2026  
**Auditor Roles:** Senior Application Security Engineer, Backend Engineer, Database Security Specialist, Release-Readiness Auditor  
**Repository Root:** `D:\cityai_project - Copy`  
**Active Working Branch:** `security-phase7-readiness`  
**Pre-Phase 7 Checkpoint Branch:** `backup/checkpoint-pre-phase7-20261019` (`df40063`)  
**Pre-Audit Verified Backup:** `backup/pre-audit-verification-20261019` (`77fcb5a`)  
**Baseline Git Reference:** `main` (`65cd1e0` — Protected baseline)  

---

## 1. Executive Summary & Audit Scope

This document provides an independent, evidence-backed security audit and production-readiness evaluation for the **SmartCity AI – Gorakhpur** municipal operations platform. All prior claims, architectural assertions, and test outcomes were verified against the actual implementation source code, active Node.js processes, MySQL 8.0 database engine, and runtime environments.

### Final Release Gate Decision
> [!CAUTION]
> ### FINAL VERDICT: **DO NOT RELEASE TO LIVE PUBLIC PRODUCTION**
> **STATUS: CONDITIONALLY APPROVED FOR CONTROLLED STAGING ONLY**
> 
> While all 105 automated unit and integration tests are passing and the application codebase has been significantly hardened against OWASP Top 10 vulnerabilities, the application **must NOT be exposed directly to public municipal traffic** on `smartcity.gorakhpur.gov.in` until 4 critical infrastructure-level operational blockers are addressed:
> 1. **Distributed State Store (Redis):** In-memory token blacklists, user session invalidation maps, and sliding-window rate limiters reside in single-process memory. In a multi-instance or clustered deployment behind a load balancer, session revocations and rate limiting are not shared across nodes.
> 2. **Transactional Production Email Service:** Production email delivery currently relies on dev-mode console fallbacks or free-tier Gmail/Brevo quotas (300–500 emails/day), which cannot support municipal-scale OTP delivery.
> 3. **Hardware Telematics / IoT Ingestion Pipeline:** Vehicle tracking currently utilizes REST polling and simulated coordinates rather than an authenticated MQTT/NTRIP IoT broker for physical garbage compactor fleets.
> 4. **Edge TLS & Web Application Firewall (WAF):** The Node.js application must sit behind an edge reverse proxy (Cloudflare/Nginx/AWS ALB) with TLS 1.3 termination, OWASP ModSecurity Core Rule Set, and DNSSEC.

---

## 2. Verified Facts vs. Unverified / Inaccurate Claims

A rigorous audit revealed several discrepancies between previous documentation/claims and the actual implementation:

| Domain | Prior Report Claim | Actual Source Code Reality | Remediation / Finding |
| :--- | :--- | :--- | :--- |
| **Rate Limiting** | Claimed `express-rate-limit` package was installed and configured. | `package.json` does NOT include `express-rate-limit`. Rate limiting was implemented via a custom in-memory sliding-window Map in `backend/middleware/security.middleware.js`. | Verified the custom limiter works as a single-instance sliding window, but process restarts flush all counters. Documented horizontal scaling requirements. |
| **Token Blacklist Memory Management** | Claimed tokens were revoked server-side. | `revokedTokens` was an unbounded `Set` and `userRevocationTime` was an unbounded `Map`. Neither had TTL expiration or pruning, leading to slow memory leakage over long uptimes. | **FIXED:** Replaced `Set` with a TTL Map storing `token -> expMs`. Added automatic 10-minute pruning for expired entries and pruned session records older than 7 days (`JWT_EXPIRES_IN`). |
| **Socket.IO Session Revocation** | Claimed full 3-layer authorization across Socket.IO. | `backend/sockets/index.js` checked `isTokenRevoked(token)`, but did NOT check `isUserSessionRevoked(decoded.id, decoded.iat)`. A user resetting their password could maintain or open Socket.IO connections with their pre-reset JWT. | **FIXED:** Imported `isUserSessionRevoked` into `backend/sockets/index.js` and added session-invalidation validation during the connection handshake. |
| **OTP Email Normalization** | Claimed robust account enumeration and verification protection. | `sendEmailOtp` and `verifyEmailOtp` queried `otp_records` without applying `.trim().toLowerCase()`. Submitting `Citizen@Gorakhpur.gov.in` and verifying as `citizen@gorakhpur.gov.in` caused lookup failures. | **FIXED:** Enforced `cleanEmail = email.trim().toLowerCase()` and `cleanOtp = submittedOtp.trim()` across all OTP routines. |
| **HSTS Preload Policy** | Claimed production HSTS compliance. | `security.middleware.js` unconditionally injected `preload` when in production. Without an audited, permanently HTTPS-only domain, `preload` risks irreversible browser lockout for non-HTTPS subdomains. | **FIXED:** Made `preload` opt-in via `process.env.HSTS_PRELOAD === 'true'`. Default production HSTS retains `max-age=31536000; includeSubDomains`. |
| **Dependency Security (`npm audit`)** | Report cited 3 moderate vulnerabilities in root package. | Root vulnerabilities stem solely from `@capacitor/cli` devDependencies (`uuid < 11.1.1` in `xcode` package). Backend runtime has **0 vulnerabilities**. | Verified `backend/` runtime has 0 vulnerabilities. Retained Capacitor version to avoid breaking Android build lockfiles. |

---

## 3. Test Reproduction Log & Execution Results

All test suites were executed sequentially on the local development environment using Node.js v20.18.0 and MySQL 8.0 on Windows.

```bash
# Reproduction Commands:
node backend/test_phase2_otp_and_auth.js
node backend/test_phase3_and_waste_security.js
node backend/test_all_traffic_enhancements.js
node backend/test_enhanced_traffic.js
node backend/test_ambulance_and_parking_integration.js
node backend/test_staff_auth_and_camera_congestion.js
node backend/test_traffic_jurisdiction_and_ai.js
```

### Complete Verification Results Table

| # | Test Suite | Scope & Verification Type | Tests Run | Result | Exit Code | Mocked vs. Real Environment |
| :-: | :--- | :--- | :-: | :-: | :-: | :--- |
| 1 | `backend/test_phase2_otp_and_auth.js` | CSPRNG, Scrypt Hash, Cooldown, Lockout, Backdoor Elimination, Session Invalidation, Enumeration, Atomic Consumption, Email Normalization, Token Revocation TTL | 11 | **11 / 11 PASS** | `0` | Real MySQL connection pool & real crypto operations |
| 2 | `backend/test_phase3_and_waste_security.js` | L1 Revocation, L2 RBAC, L2 Dept Isolation, L3 IDOR, Waste TSP, Forecasting, 500m Haversine, GPS Staleness, AI Classification, L3 Request Access, Socket.IO Handshake Auth | 11 | **11 / 11 PASS** | `0` | Real MySQL queries, real JWT verification, real Haversine calculations |
| 3 | `backend/test_all_traffic_enhancements.js` | Traffic Signals, ANPR Metadata, E-Challan, Webster Timings, Green Wave Preemption, VMS Broadcasts | 25 | **25 / 25 PASS** | `0` | Real MySQL pool, mock ambulance simulator transit trigger |
| 4 | `backend/test_enhanced_traffic.js` | Signal CRUD, CCTV Dynamic CRUD, AI Violation Review, Junction Config | 13 | **13 / 13 PASS** | `0` | Real Express route handler execution against database |
| 5 | `backend/test_ambulance_and_parking_integration.js` | Live Ambulance Telemetry, Critical Corridor Preemption, Real-Time Parking Spot Sync (132 spots across 6 facilities) | 18 | **18 / 18 PASS** | `0` | Real MySQL parking lot aggregation & ambulance transit routes |
| 6 | `backend/test_staff_auth_and_camera_congestion.js` | Traffic Staff Role Enforcement, Camera Congestion Recalculation, Anonymous/Citizen Blocks | 8 | **8 / 8 PASS** | `0` | Real HTTP server requests with role-gated endpoints |
| 7 | `backend/test_traffic_jurisdiction_and_ai.js` | Mohaddipur Junction Jurisdiction, CCTV Provisioning Admin Guards, Map Relocation Restrictions | 19 | **19 / 19 PASS** | `0` | Real role & department enforcement against DB |
| | **TOTAL** | **Comprehensive Full-Platform Test Suite** | **105** | **105 / 105 PASS** | `0` | **100% Passed (0 Failed, 0 Skipped)** |

---

## 4. Remaining Security Findings (Ranked by Severity)

### CRITICAL SEVERITY (Production Blockers)
*None remaining in application code. All code-level backdoors, IDORs, and atomic double-spends are remediated.*

---

### HIGH SEVERITY (Architectural & Infrastructure Prerequisites)

#### FINDING-H01: Single-Process In-Memory State Loss (Rate Limits & Token Revocation)
- **Affected Components:** `backend/middleware/auth.middleware.js`, `backend/middleware/security.middleware.js`
- **Impact:** Token blacklists, user session invalidation timestamps, and sliding-window IP rate limits are stored in Node.js process memory.
  1. Restarting the Node.js process clears all rate-limit counters and revoked token records.
  2. Running multiple backend instances behind an ALB/Nginx results in state fragmentation (revoking a token on Node 1 does not invalidate it on Node 2).
- **Remediation Requirement:** For multi-instance production clustering, integrate a shared Redis cache (`ioredis` + `rate-limit-redis`). In single-instance staging, document that restarts flush active revocation entries.

#### FINDING-H02: Unprovisioned Production Transactional SMTP
- **Affected Component:** `backend/services/otp_service.js`
- **Impact:** The system currently relies on dev-mode console logging (`[OTP-DEV-ONLY]`) when SMTP credentials are absent, or on personal Gmail/Brevo free tiers. Gmail SMTP allows a maximum of 500 emails/day; Brevo free allows 300 emails/day. In a municipal deployment of 100,000+ citizens, email quotas will be exhausted within hours, locking citizens out.
- **Remediation Requirement:** Provision a commercial transactional email relay (AWS SES or Postmark) with dedicated sending IPs, SPF, DKIM, and DMARC alignment.

---

### MEDIUM SEVERITY (Operational & Hardware Dependencies)

#### FINDING-M01: Vehicle GPS Provenance Dependent on API Ingestion
- **Affected Component:** `backend/routes/waste.routes.js` (`PUT /api/waste/vehicles/:id/location`)
- **Impact:** GPS telemetry provenance is tracked and staleness (>15 minutes) is flagged, but real-world garbage compactor telematics transmit via hardware cellular/NTRIP units using MQTT or raw UDP packets.
- **Remediation Requirement:** Implement an authenticated IoT broker / gateway service translating raw telematics into authenticated REST or internal Socket.IO feeds.

#### FINDING-M02: Capacitor CLI Moderate Vulnerability in DevDependencies
- **Affected Component:** Root `package.json` (`@capacitor/cli` -> `xcode` -> `uuid < 11.1.1`)
- **Impact:** Buffer bounds check vulnerability in UUID v3/v5/v6 parsing within the iOS `xcode` project generator.
- **Assessment:** Zero runtime impact on backend server security. Remediation via `npm audit fix --force` would downgrade Capacitor from 8.5.3 to 8.4.3, introducing breaking changes to mobile build scripts. Deferred to scheduled mobile build pipeline updates.

---

### LOW SEVERITY (Hardening Refinements)

#### FINDING-L01: Ephemeral JWT Secret Warning in Local Development
- **Affected Component:** `backend/config/env.config.js`
- **Impact:** If `JWT_SECRET` is unset in non-production, the application falls back to an ephemeral key with a console warning. While `validateEnv()` strictly crashes in `NODE_ENV === 'production'`, developers running dev servers must ensure test credentials are not reused.
- **Remediation Requirement:** Keep `.env.example` strictly documented and ensure deployment CI/CD injects high-entropy secrets (>= 32 characters).

---

## 5. Summary of Code Modifications Made

The following minimal, high-impact fixes were applied directly to the working tree on branch `security-phase7-readiness`:

1. **`backend/middleware/auth.middleware.js`**:
   - Replaced unbounded `Set` with TTL Map `revokedTokens` (`token -> expMs`).
   - Added automatic 10-minute pruning for expired tokens and session invalidation records older than 7 days.
   - Preserved all export signatures (`revokeToken`, `isTokenRevoked`, `revokeAllUserSessions`, `isUserSessionRevoked`).
2. **`backend/sockets/index.js`**:
   - Imported `isUserSessionRevoked` from `auth.middleware`.
   - Added verification during Socket.IO handshake to immediately reject connections from sessions invalidated by password resets.
3. **`backend/services/otp_service.js`**:
   - Added email normalization (`cleanEmail = email.trim().toLowerCase()`) in `sendEmailOtp` and `verifyEmailOtp`.
   - Added OTP whitespace trimming (`cleanOtp = submittedOtp.trim()`) passed to `verifyOtpHash`.
4. **`backend/middleware/security.middleware.js`**:
   - Conditioned HSTS `preload` on `process.env.HSTS_PRELOAD === 'true'` to avoid permanent browser lock-in on unconfirmed domains.
5. **`backend/test_phase2_otp_and_auth.js`**:
   - Added Test 10: Email Normalization & Casing/Whitespace Resilience.
   - Added Test 11: Token Revocation TTL & Memory Safety.
6. **`backend/test_phase3_and_waste_security.js`**:
   - Added Test 11: Socket.IO Handshake Authentication & Revocation Check.

---

## 6. Hospital Module Zero-Touch Preservation Evidence

As mandated by safety constraints, the hospital and clinical modules were protected from all alterations:
- **Git Baseline Verification:**
  ```bash
  git diff main -- "backend/routes/hospital*.js" "backend/routes/clinical*.js" "frontend/pages/hospital*"
  ```
- **Result:** Output was completely empty (**0 files changed, 0 additions, 0 deletions**).
- All OPD appointment booking, bed inventory, doctor scheduling, Ayushman QR masking, and clinical assistant routes remain 100% identical to the pre-audit baseline.

---

## 7. Production Deployment Configuration Checklist

Below is the verified production deployment blueprint. Configuration examples contain placeholders only:

```ini
# =========================================================
# PRODUCTION ENVIRONMENT CONFIGURATION TEMPLATE (.env)
# =========================================================

# 1. Environment & Network
NODE_ENV=production
PORT=5000
TRUST_PROXY=1 # Set to 1 for AWS ALB / Cloudflare / Nginx reverse proxy

# 2. Cryptographic Secrets (Must be >= 32 characters, high entropy)
JWT_SECRET=REPLACE_WITH_HIGH_ENTROPY_RANDOM_STRING_AT_LEAST_32_BYTES_HEX
JWT_EXPIRES_IN=7d

# 3. Database Credentials (Dedicated least-privilege user)
DB_HOST=10.0.1.15
DB_PORT=3306
DB_USER=smartcity_app
DB_PASSWORD=REPLACE_WITH_STRONG_DATABASE_PASSWORD
DB_NAME=smartcity
DB_CONNECTION_LIMIT=25

# 4. Transactional SMTP Relay (AWS SES or Postmark)
SMTP_HOST=email-smtp.ap-south-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=REPLACE_WITH_SES_SMTP_USERNAME
SMTP_PASS=REPLACE_WITH_SES_SMTP_PASSWORD
SMTP_FROM_NAME="SmartCity AI Gorakhpur"
SMTP_FROM_ADDR=noreply@smartcity.gorakhpur.gov.in

# 5. Security & Domain Controls
CORS_ORIGINS=https://smartcity.gorakhpur.gov.in,https://admin.smartcity.gorakhpur.gov.in
HSTS_PRELOAD=false # Set to true only after 30+ days of verified HTTPS stability
DISABLE_RATE_LIMIT=false
```

### Production Infrastructure Deployment Architecture

```
[ Citizen / Staff Browser ]
          │ (HTTPS :443 with TLS 1.3)
          ▼
[ Cloudflare / AWS CloudFront WAF ]
          │ (DDoS Protection, Bot Mitigation, OWASP CRS)
          ▼
[ Nginx Reverse Proxy / Load Balancer ]
          │ (HSTS, SSL Offloading, Proxy Headers)
          ├──────────────────────────┐
          ▼                          ▼
 [ Node.js Backend 1 ]     [ Node.js Backend 2 ]
          │                          │
          ├──────────► [ Redis ] ◄───┤ (Shared Sessions & Rate Limiting)
          │                          │
          └──────────► [ MySQL ] ◄───┘ (Master Connection Pool)
```

---

## 8. Rollback & Recovery Procedures

If an operational rollback is required on the server:

1. **Code Rollback:**
   ```bash
   # Switch back to the verified pre-phase7 checkpoint
   git checkout backup/checkpoint-pre-phase7-20261019
   # Or switch to the pre-audit clean baseline
   git checkout backup/pre-audit-verification-20261019
   ```
2. **Database Rollback:**
   - Database migrations in `backend/database/migrations/security_hardening_migration.js` are strictly additive (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`).
   - If tables need to be retired in a staging environment:
     ```sql
     DROP TABLE IF EXISTS waste_collection_events;
     DROP TABLE IF EXISTS waste_fill_predictions;
     DROP TABLE IF EXISTS waste_collection_routes;
     DROP TABLE IF EXISTS waste_vehicles;
     DROP TABLE IF EXISTS waste_bins;
     DROP TABLE IF EXISTS otp_records;
     ```
3. **Process Restart:**
   ```bash
   pm2 restart smartcity-backend
   ```

---

## 9. Final Auditor Sign-Off

- **Tests Executed:** 105 Automated Tests across 7 Test Suites
- **Tests Passed:** 105 (100% Pass Rate)
- **Hospital Integrity:** 100% Baseline Maintained
- **Vulnerabilities Fixed:** Backdoors, IDORs, Race Conditions, Memory Leaks, Sockets Revocation, Email Normalization
- **Release Readiness:** Staging Ready. Public Production Blocked pending Redis and Transactional Email provisioning.

*Report Prepared by Senior Application Security Engineer & Release-Readiness Audit Specialist.*
