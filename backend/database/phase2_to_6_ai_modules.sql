-- ====================================================================
-- SMARTCITY AI - PHASES 2 TO 6 DATABASE MIGRATION SCRIPT
-- Traffic AI, Signal Optimization, Emergency Wave, CV/ANPR, Grievance AI, Waste AI
-- ====================================================================

-- 1. Signal Optimization Table (Webster-based & coordinated signal adjustments)
CREATE TABLE IF NOT EXISTS signal_optimizations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    junction_id VARCHAR(50) NOT NULL,
    junction_name VARCHAR(100) NULL,
    cycle_length INT NOT NULL,
    green_time INT NOT NULL,
    yellow_time INT DEFAULT 4,
    red_time INT NOT NULL,
    phase VARCHAR(64) NOT NULL,
    traffic_density DECIMAL(6,2) DEFAULT 0,
    vehicle_flow_vph INT DEFAULT 0,
    webster_c0 DECIMAL(6,2) NULL,
    critical_flow_ratio_y DECIMAL(4,3) NULL,
    optimization_reason TEXT NULL,
    confidence DECIMAL(5,4) DEFAULT 0.9000,
    is_simulation TINYINT(1) DEFAULT 1,
    applied_to_hardware TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sig_jnc (junction_id),
    INDEX idx_sig_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Multi-Horizon Traffic Predictions (15m, 30m, 60m)
CREATE TABLE IF NOT EXISTS traffic_predictions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    prediction_id VARCHAR(64) UNIQUE NOT NULL,
    junction_id VARCHAR(50) NOT NULL,
    horizon_minutes INT NOT NULL,
    traffic_level ENUM('LOW', 'MODERATE', 'SEVERE') NOT NULL,
    congestion_score DECIMAL(5,2) NOT NULL,
    predicted_vehicle_count INT NOT NULL,
    estimated_speed_kmh DECIMAL(5,2) NOT NULL,
    confidence DECIMAL(5,4) DEFAULT 0.8800,
    factors JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_trf_pred_jnc (junction_id),
    INDEX idx_trf_pred_horizon (horizon_minutes)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Ambulance Green Wave Corridors (600m Preemption & Restoration)
CREATE TABLE IF NOT EXISTS ambulance_green_waves (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ambulance_id VARCHAR(50) NOT NULL,
    patient_urgency ENUM('NORMAL', 'URGENT', 'CRITICAL') DEFAULT 'CRITICAL',
    current_latitude DECIMAL(10,8) NOT NULL,
    current_longitude DECIMAL(11,8) NOT NULL,
    target_junction_id VARCHAR(50) NOT NULL,
    distance_meters DECIMAL(7,2) NOT NULL,
    corridor_status ENUM('APPROACHING', 'ACTIVE_PREEMPTION', 'CLEARED', 'CANCELLED', 'OVERRIDDEN') DEFAULT 'APPROACHING',
    preemption_green_given_at TIMESTAMP NULL,
    corridor_restored_at TIMESTAMP NULL,
    safety_override TINYINT(1) DEFAULT 0,
    override_by VARCHAR(64) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_amb_corridor (ambulance_id, corridor_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Computer Vision & ANPR Detections
CREATE TABLE IF NOT EXISTS cv_detections (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    detection_id VARCHAR(64) UNIQUE NOT NULL,
    camera_id VARCHAR(50) NOT NULL,
    junction_id VARCHAR(50) NULL,
    event_type ENUM('VEHICLE', 'PLATE', 'POTHOLE', 'ILLEGAL_DUMPING', 'ACCIDENT', 'ILLEGAL_PARKING', 'RED_LIGHT', 'SPEED') NOT NULL,
    class_label VARCHAR(64) NOT NULL,
    confidence DECIMAL(5,4) NOT NULL,
    bounding_box JSON NULL,
    evidence_url VARCHAR(255) NULL,
    metadata_json JSON NULL,
    human_verified TINYINT(1) DEFAULT 0,
    verified_by VARCHAR(64) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_cv_event (event_type),
    INDEX idx_cv_cam (camera_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Citizen Grievance AI Analysis & Deduplication
CREATE TABLE IF NOT EXISTS grievance_ai_analysis (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    service_request_id INT NOT NULL,
    predicted_department VARCHAR(64) NOT NULL,
    predicted_priority ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW') NOT NULL,
    sla_hours INT NOT NULL,
    sla_deadline DATETIME NOT NULL,
    urgency_score DECIMAL(4,3) DEFAULT 0.500,
    is_duplicate TINYINT(1) DEFAULT 0,
    duplicate_of_id INT NULL,
    is_spam TINYINT(1) DEFAULT 0,
    confidence DECIMAL(5,4) DEFAULT 0.9000,
    reasoning TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_grv_req (service_request_id),
    INDEX idx_grv_priority (predicted_priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Smart Waste Ward Forecasting & Bin Predictions
CREATE TABLE IF NOT EXISTS waste_predictions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    prediction_id VARCHAR(64) UNIQUE NOT NULL,
    ward_number VARCHAR(32) NOT NULL,
    predicted_tonnage DECIMAL(8,2) NOT NULL,
    target_date DATE NOT NULL,
    confidence DECIMAL(5,4) DEFAULT 0.8800,
    high_risk_overflow_bins INT DEFAULT 0,
    recommended_trucks INT DEFAULT 2,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_wst_ward (ward_number, target_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS waste_bin_predictions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    bin_id INT NOT NULL,
    bin_code VARCHAR(32) NOT NULL,
    current_fill_level INT NOT NULL,
    hours_to_50pct DECIMAL(5,2) NULL,
    hours_to_75pct DECIMAL(5,2) NULL,
    hours_to_90pct DECIMAL(5,2) NULL,
    hours_to_100pct DECIMAL(5,2) NULL,
    collection_urgency ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'LOW',
    confidence DECIMAL(5,4) DEFAULT 0.9000,
    predicted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_bin_pred (bin_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
