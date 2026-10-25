# SmartCity AI (Gorakhpur) — Prioritized Production Roadmap

**Document Version:** 2.0.0-MASTER  
**Date:** October 19, 2026  
**Repository Root:** `D:\cityai_project - Copy`  

---

## 1. Prioritization Framework

Tasks are ranked by operational risk and architectural impact:
- **P0 / Critical:** Production blockers required before exposing any public traffic.
- **P1 / High:** Architectural scaling and security requirements for clustered multi-node environments.
- **P2 / Medium:** Hardware integrations and background operational telemetry.
- **P3 / Low:** Optimization, UI polish, and progressive enhancements.

---

## 2. Roadmap Item Registry

### Priority 0: Critical Production Blockers (Pre-Launch Mandatory)

| ID | Title | Description | Target Component | Effort |
| :--- | :--- | :--- | :--- | :---: |
| **ROAD-01** | **Shared Redis Cache Integration** | Connect Redis cluster for distributed session invalidation (`isUserSessionRevoked`), token blacklist, and sliding-window rate limiting across multiple backend instances. | `backend/middleware/auth.middleware.js`, `security.middleware.js` | 2 Days |
| **ROAD-02** | **Production Transactional SMTP** | Provision AWS SES or Postmark with dedicated sending IPs, SPF, DKIM, and DMARC DNS records to support municipal OTP volume (~100,000 citizens). | `backend/services/otp_service.js` | 1 Day |
| **ROAD-03** | **Edge WAF & TLS Termination** | Configure Cloudflare or AWS ALB with TLS 1.3, OWASP ModSecurity Core Rule Set, and DDoS rate protection. | Edge Reverse Proxy / Infrastructure | 1 Day |

---

### Priority 1: High Priority (Staging & Fleet Integration)

| ID | Title | Description | Target Component | Effort |
| :--- | :--- | :--- | :--- | :---: |
| **ROAD-04** | **Hardware IoT MQTT Telemetry Broker** | Deploy an authenticated MQTT/NTRIP gateway translating physical garbage compactor telematics into vehicle tracking database updates. | `ai_service/`, `backend/routes/waste.routes.js` | 4 Days |
| **ROAD-05** | **Automated DB Snapshot & Point-in-Time Recovery** | Configure automated hourly binary log archiving and automated daily RDS snapshots with tested restoration runbooks. | MySQL Infrastructure | 2 Days |
| **ROAD-06** | **Prometheus & Grafana Observability** | Export Express metrics (response time, status codes, pool latency) and Python inference latencies to Prometheus. | `backend/server.js`, `ai_service/app/main.py` | 2 Days |

---

### Priority 2: Medium Priority (Model & Maintenance Enhancements)

| ID | Title | Description | Target Component | Effort |
| :--- | :--- | :--- | :--- | :---: |
| **ROAD-07** | **Continuous Online Model Retraining** | Automate weekly scikit-learn retraining pipelines for traffic congestion and waste generation using newly accumulated telemetry. | `ai_service/training/` | 3 Days |
| **ROAD-08** | **Capacitor CLI DevDependency Upgrade** | Schedule non-breaking upgrade of `@capacitor/cli` and `xcode` generator in mobile build pipeline. | Root `package.json` | 1 Day |
| **ROAD-09** | **Multi-Language Localization (Hindi & Bhojpuri)** | Provide localized strings across citizen grievance forms and emergency notifications. | `frontend/pages/` | 3 Days |

---

### Priority 3: Low Priority (Progressive Enhancements)

| ID | Title | Description | Target Component | Effort |
| :--- | :--- | :--- | :--- | :---: |
| **ROAD-10** | **Offline PWA Caching** | Enhance Service Worker (`frontend/sw.js`) to cache civic maps for offline viewing during connectivity loss. | `frontend/sw.js` | 2 Days |
| **ROAD-11** | **3D Digital Twin GLTF Asset Expansion** | Integrate additional 3D architectural models for Gorakhpur landmarks in the Three.js water and civic explorer. | `frontend/assets/models/` | 4 Days |
