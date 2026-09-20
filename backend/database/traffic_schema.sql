-- ====================================================================
-- SMARTCITY AI TRAFFIC MANAGEMENT PLATFORM - GORAKHPUR SCHEMA
-- ====================================================================

USE `smartcity`;

-- 1. TRAFFIC JUNCTIONS
CREATE TABLE IF NOT EXISTS `traffic_junctions` (
    `id` VARCHAR(50) PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL,
    `zone` VARCHAR(100) NOT NULL,
    `landmark` VARCHAR(200) NOT NULL,
    `latitude` DECIMAL(10, 7) NOT NULL,
    `longitude` DECIMAL(10, 7) NOT NULL,
    `status` ENUM('Operational', 'Heavy Congestion', 'Maintenance', 'Emergency Priority', 'Offline') DEFAULT 'Operational',
    `mode` ENUM('AI Adaptive', 'Fixed Timer', 'Manual Override', 'Emergency Corridor') DEFAULT 'AI Adaptive',
    `cycle_time` INT DEFAULT 120,
    `active_phase` VARCHAR(50) DEFAULT 'North-South Green',
    `congestion_level` INT DEFAULT 35,
    `avg_speed_kmh` DECIMAL(5, 2) DEFAULT 28.5,
    `assigned_officer_id` VARCHAR(50) DEFAULT NULL,
    `assigned_officer_name` VARCHAR(100) DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. TRAFFIC SIGNALS (Per Approach)
CREATE TABLE IF NOT EXISTS `traffic_signals` (
    `id` VARCHAR(50) PRIMARY KEY,
    `junction_id` VARCHAR(50) NOT NULL,
    `approach` ENUM('North', 'South', 'East', 'West') NOT NULL,
    `street_name` VARCHAR(150) NOT NULL,
    `green_time` INT DEFAULT 45,
    `yellow_time` INT DEFAULT 4,
    `red_time` INT DEFAULT 71,
    `current_color` ENUM('Green', 'Yellow', 'Red') DEFAULT 'Red',
    `countdown` INT DEFAULT 30,
    `pedestrian_walk` TINYINT(1) DEFAULT 0,
    `override_color` ENUM('None', 'Force Green', 'Force Red', 'Flash Amber') DEFAULT 'None',
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`junction_id`) REFERENCES `traffic_junctions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. CCTV CAMERAS AT JUNCTIONS
CREATE TABLE IF NOT EXISTS `traffic_cameras` (
    `id` VARCHAR(50) PRIMARY KEY,
    `junction_id` VARCHAR(50) NOT NULL,
    `camera_name` VARCHAR(150) NOT NULL,
    `direction` VARCHAR(50) NOT NULL,
    `stream_url` VARCHAR(255) NOT NULL,
    `resolution` VARCHAR(30) DEFAULT '1080p FHD',
    `fps` INT DEFAULT 30,
    `status` ENUM('Online', 'Degraded', 'Offline') DEFAULT 'Online',
    `is_simulated` TINYINT(1) DEFAULT 1,
    `sensor_type` VARCHAR(100) DEFAULT 'AI Optical Vision + Radar Speed',
    `vehicles_per_min` INT DEFAULT 42,
    `avg_speed` DECIMAL(5, 2) DEFAULT 32.0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`junction_id`) REFERENCES `traffic_junctions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. TRAFFIC MOVEMENT RULES
CREATE TABLE IF NOT EXISTS `traffic_movement_rules` (
    `id` VARCHAR(50) PRIMARY KEY,
    `junction_id` VARCHAR(50) NOT NULL,
    `rule_type` ENUM('One-Way Restriction', 'Heavy Vehicle Curfew', 'Free Left Turn', 'Reversible Center Lane', 'Speed Limit Enforced') NOT NULL,
    `title` VARCHAR(150) NOT NULL,
    `description` TEXT NOT NULL,
    `start_time` VARCHAR(10) DEFAULT '08:00',
    `end_time` VARCHAR(10) DEFAULT '20:00',
    `is_active` TINYINT(1) DEFAULT 1,
    `penalty_amount` DECIMAL(8, 2) DEFAULT 1000.00,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`junction_id`) REFERENCES `traffic_junctions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. TRAFFIC INCIDENTS (Citizen & Automated Reports)
CREATE TABLE IF NOT EXISTS `traffic_incidents` (
    `id` VARCHAR(50) PRIMARY KEY,
    `citizen_id` INT DEFAULT NULL,
    `reporter_name` VARCHAR(100) DEFAULT 'Anonymous Citizen',
    `reporter_phone` VARCHAR(20) DEFAULT NULL,
    `junction_id` VARCHAR(50) DEFAULT NULL,
    `incident_type` ENUM('Accident', 'Severe Congestion', 'Waterlogging', 'Road Damage / Pothole', 'Vehicle Breakdown', 'Traffic Signal Failure', 'Illegal Parking Obstruction') NOT NULL,
    `location_name` VARCHAR(200) NOT NULL,
    `latitude` DECIMAL(10, 7) NOT NULL,
    `longitude` DECIMAL(10, 7) NOT NULL,
    `description` TEXT NOT NULL,
    `severity` ENUM('Low', 'Moderate', 'High', 'Critical') DEFAULT 'Moderate',
    `status` ENUM('Submitted', 'Verified', 'Officer Dispatched', 'Resolved', 'Rejected') DEFAULT 'Submitted',
    `photo_url` VARCHAR(255) DEFAULT NULL,
    `assigned_officer` VARCHAR(100) DEFAULT NULL,
    `resolution_notes` TEXT DEFAULT NULL,
    `reported_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `resolved_at` TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. EMERGENCY GREEN CORRIDORS
CREATE TABLE IF NOT EXISTS `traffic_corridors` (
    `id` VARCHAR(50) PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL,
    `origin` VARCHAR(150) NOT NULL,
    `destination` VARCHAR(150) NOT NULL,
    `emergency_type` ENUM('Ambulance', 'Fire Engine', 'Police Convoy', 'VIP Protocol') DEFAULT 'Ambulance',
    `status` ENUM('Standby', 'Active', 'Completed', 'Cancelled') DEFAULT 'Standby',
    `junction_sequence` TEXT NOT NULL,
    `estimated_travel_min` INT DEFAULT 8,
    `triggered_by` VARCHAR(100) DEFAULT 'Command Center',
    `activated_at` TIMESTAMP NULL DEFAULT NULL,
    `cleared_at` TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. AUDIT LOGS
CREATE TABLE IF NOT EXISTS `traffic_audit_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` VARCHAR(50) DEFAULT 'SYSTEM',
    `user_name` VARCHAR(100) NOT NULL,
    `role` VARCHAR(50) NOT NULL,
    `action` VARCHAR(100) NOT NULL,
    `target` VARCHAR(150) NOT NULL,
    `details` TEXT NOT NULL,
    `ip_address` VARCHAR(50) DEFAULT '127.0.0.1',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. AI PLATFORM SETTINGS
CREATE TABLE IF NOT EXISTS `traffic_ai_settings` (
    `setting_key` VARCHAR(100) PRIMARY KEY,
    `setting_value` TEXT NOT NULL,
    `category` VARCHAR(50) DEFAULT 'AI_VISION',
    `description` VARCHAR(255) NOT NULL,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
