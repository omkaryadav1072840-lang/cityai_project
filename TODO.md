# SMARTCITY AI — Project Task Tracker & Future Roadmap

This document tracks genuinely pending tasks, production monitoring priorities, and future roadmap enhancements for the Gorakhpur SmartCity AI platform. Completed milestones have been archived to [CHANGELOG.md](file:///d:/cityai_project%20-%20Copy/CHANGELOG.md).

---

## 1. Active Production Monitoring Tasks

- [ ] **WebSocket High-Concurrency Load Testing**:
  - Benchmark Socket.IO server performance under sustained simulated loads (> 1,000 concurrent browser clients).
  - Verify room cleanup and memory leak prevention during rapid connect/disconnect cycles.
- [ ] **Continuous 24-Hour SLA Escalation Ticker Monitoring**:
  - Run continuous verification of `backend/services/sla_engine.js` over 24-hour operational cycles.
  - Verify automated priority escalation and SMS/notification triggers for overdue civic grievances.
- [ ] **Ambulance GPS Telemetry Resource Profiling**:
  - Profile CPU and memory consumption of the 6-ambulance GPS simulation loop during long multi-day server runtimes.

---

## 2. Hardware & Government Integrations

- [ ] **Hardware Camera RTSP Gateway**:
  - Build an RTSP-to-WebRTC / HLS streaming proxy to ingest live video feeds from physical roadside IP cameras at Golghar Chowk and Asuran Chowk.
  - Replace emulated camera stream loops with live optical CCTV video feeds.
- [ ] **DigiLocker Direct OAuth 2.0 Integration**:
  - Implement direct citizen authentication via National DigiLocker API for instant verification of Aadhaar and vehicle driving licenses.
  - Link verified ABHA health ID credentials into `patients(abha_id)`.
- [ ] **Physical Barrier Gate Relay Controller**:
  - Implement an MQTT / HTTP gateway client to trigger physical servo barrier gates (ESP32/Arduino relays) at multi-level parking exits upon QR validation.

---

## 3. Production Deployment & Mobile Hardening

- [ ] **Production Reverse Proxy & Automated SSL**:
  - Configure production Nginx reverse proxy with automated Let's Encrypt SSL renewal for domain `smartcity.gorakhpur.gov.in`.
  - Enforce strict HTTP Strict Transport Security (HSTS) with preloading.
- [ ] **Progressive Web App (PWA) Offline Manifest**:
  - Implement Service Worker caching for offline viewing of 24/7 civic emergency helplines.
  - Allow offline access to downloaded Ayushman Patient QR passes.

---

## 4. Advanced AI & Model Retraining

- [ ] **Automated Model Retraining Pipelines**:
  - Activate automated monthly retraining jobs via `ai_jobs` table once real sensor logs exceed 50,000 temporal observations.
  - Implement automated concept drift alerts notifying municipal administrators when prediction accuracy drops below 88%.
- [ ] **Multilingual Audio Tour Narration**:
  - Add Bhojpuri and Hindi text-to-speech (TTS) audio narration for Gorakhnath Temple, Ramgarh Tal, and Planetarium exhibits.
