# SmartCity AI (Gorakhpur) — Database Schema & API Architecture Report

**Document Version:** 2.0.0-MASTER  
**Audit Date:** October 19, 2026  
**Auditor Roles:** Database Architect, Senior Backend API Engineer  
**Database Name:** `smartcity` (MySQL 8.0 Engine: InnoDB, Charset: utf8mb4)  

---

## 1. Database Schema Inventory & Integrity Analysis

The platform maintains a normalized relational schema with strict foreign key constraints, composite unique indexes, and audit logging.

### Core Tables & Purpose
1. **`users`:** Citizen user accounts (`id`, `name`, `mobile`, `email`, `password` [scrypt hash], `role`, `created_at`).
2. **`staff`:** Municipal departmental officers (`id`, `staff_id`, `name`, `department`, `role`, `password`, `waste_sub_role`, `assigned_sector`).
3. **`otp_records`:** Cryptographic OTP hashes (`id`, `target_type`, `target_value`, `otp_hash`, `purpose`, `expires_at`, `attempt_count`, `used`, `used_at`, `invalidated_at`).
4. **`service_requests`:** Citizen grievances & service tickets (`id`, `request_code`, `user_id`, `department`, `category`, `priority`, `status`, `created_at`).
5. **`waste_bins`:** Smart dustbins with spatial coordinates (`id`, `bin_code`, `sector`, `bin_type`, `latitude`, `longitude`, `fill_level`, `fill_source`, `status`).
6. **`waste_vehicles`:** Fleet tracking (`id`, `vehicle_code`, `registration_no`, `assigned_sector`, `latitude`, `longitude`, `gps_source`, `location_updated_at`).
7. **`waste_collection_events`:** Verified collection records (`id`, `bin_id`, `collector_staff_id`, `collected_at`, `fill_before`, `fill_after`, `collection_valid`).
8. **`traffic_signals` & `traffic_junctions`:** Traffic light controllers, coordinates, Webster cycle splits, ANPR camera associations.
9. **`parking_lots` & `parking_bookings`:** 6 municipal facilities (132 total capacity), vehicle plate bookings, QR codes.
10. **`hospitals`, `doctors`, `appointments`, `beds`:** Protected clinical care registry, OPD appointment bookings, bed occupancy pools.
11. **`water_assets`, `water_pipelines`, `sewage_network`:** Municipal pipelines, SCADA flow nodes, treatment batch approvals.
12. **`audit_logs`:** System-wide administrative mutation audit log (`id`, `user_id`, `user_name`, `role`, `action`, `module`, `ip_address`, `timestamp`).

---

## 2. API Route Inventory & Security Specifications

| Route Pattern | Method | Security Level | Auth Layer | Rate Limiter |
| :--- | :---: | :---: | :---: | :--- |
| `/api/register` | `POST` | Public | None | `authRateLimiter` (120/min) |
| `/api/login` | `POST` | Public | Credentials verify | `authRateLimiter` (120/min) |
| `/api/staff-login` | `POST` | Public | Staff verify | `authRateLimiter` (120/min) |
| `/api/auth/otp/send` | `POST` | Public | 60s cooldown | `authRateLimiter` (120/min) |
| `/api/auth/otp/verify` | `POST` | Public | Atomic consumption | `authRateLimiter` (120/min) |
| `/api/auth/reset-password` | `POST` | Public | OTP + Session Revoke | `authRateLimiter` (120/min) |
| `/api/auth/logout` | `POST` | Protected | L1 Token Revocation | `globalApiRateLimiter` |
| `/api/waste/bins` | `GET` | Public | 500m Haversine Radius | `globalApiRateLimiter` |
| `/api/waste/requests` | `POST` | Citizen | L2 Role + L3 Ownership | `globalApiRateLimiter` |
| `/api/waste/my-requests` | `GET` | Citizen | L3 Bound to `req.user.id` | `globalApiRateLimiter` |
| `/api/waste/classify-image` | `POST` | Authenticated | Ephemeral In-Memory | `formSubmissionRateLimiter` |
| `/api/traffic/signals/:id` | `PUT` | Staff / Admin | L2 Traffic Dept Guard | `globalApiRateLimiter` |
| `/api/traffic/cameras` | `POST` | Admin | L2 Admin Role Guard | `globalApiRateLimiter` |
| `/api/parking/book` | `POST` | Citizen | Unique Slot Booking | `formSubmissionRateLimiter` |
| `/api/emergency/sos` | `POST` | Public / Citizen | Critical Broadcast | `sosRateLimiter` (10/30s) |
| `/api/admin/users/:id/role` | `PUT` | Super Admin | Database-Verified Role | `globalApiRateLimiter` |

---

## 3. Database Concurrency & Performance Findings

1. **Atomic Invalidation:** High-frequency endpoints (OTP consumption, appointment booking) use database-level atomic updates (`UPDATE ... WHERE id = ? AND used = 0`) to prevent race conditions.
2. **Indexed Queries:** All spatial, lookup, and filtering columns (`latitude, longitude`, `status`, `sector`, `target_value`, `user_id`) maintain B-tree indexes, eliminating full table scans.
3. **Connection Pool Tuning:** `backend/config/db.js` is tuned to `connectionLimit: 25`, `connectTimeout: 10000ms`, `queueLimit: 50`, matching MySQL server `max_connections=151`.
