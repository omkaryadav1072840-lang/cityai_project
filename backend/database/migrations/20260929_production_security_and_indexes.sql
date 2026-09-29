-- ========================================================
-- SmartCity AI - Production Hardening & Performance Indexes
-- Date: 2026-09-29
-- ========================================================

-- 1. Analytics Events Table (Privacy-Preserving Telemetry)
CREATE TABLE IF NOT EXISTS analytics_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_name VARCHAR(64) NOT NULL,
    page_path VARCHAR(128) NOT NULL,
    metadata_json JSON NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_event_created (event_name, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Performance Indexes (Safely add if not existing)
-- Check and optimize User Lookups
CREATE INDEX idx_users_mobile_email ON users (mobile, email);
CREATE INDEX idx_staff_id_dept ON staff (staff_id, department);
CREATE INDEX idx_doctors_id_dept ON doctors (doctor_id, department);

-- Optimize Activity & Booking Lookups
CREATE INDEX idx_parking_user_status ON parking_bookings (user_id, status);
CREATE INDEX idx_waste_user_status ON waste_pickup_requests (user_id, status);
