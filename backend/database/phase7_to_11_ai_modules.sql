-- ====================================================================
-- SMARTCITY AI - PHASES 7 TO 11 DATABASE MIGRATION SCRIPT
-- Smart Water AI, Healthcare AI, Smart Parking AI, Environment & Disaster AI
-- ====================================================================

-- 1. Smart Water Pipe Burst & Pressure Drop Anomalies
CREATE TABLE IF NOT EXISTS water_anomalies (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    zone VARCHAR(50) NOT NULL,
    pipeline_id VARCHAR(50) NULL,
    inflow_rate_lps DECIMAL(8,2) DEFAULT 0,
    outflow_rate_lps DECIMAL(8,2) DEFAULT 0,
    pressure_bar DECIMAL(5,2) DEFAULT 3.0,
    anomaly_score DECIMAL(5,4) NOT NULL,
    anomaly_type ENUM('PIPE_BURST', 'PRESSURE_DROP', 'UNEXPLAINED_LOSS', 'CONTAMINATION_RISK', 'NORMAL') DEFAULT 'NORMAL',
    severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'LOW',
    recommended_action TEXT NULL,
    status ENUM('OPEN', 'DISPATCHED', 'RESOLVED', 'FALSE_ALARM') DEFAULT 'OPEN',
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_wat_zone (zone),
    INDEX idx_wat_severity (severity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Healthcare Bed Surge & OPD Queue Predictions
CREATE TABLE IF NOT EXISTS hospital_predictions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    hospital_id VARCHAR(50) NOT NULL,
    hospital_name VARCHAR(100) NULL,
    predicted_occupancy_pct DECIMAL(5,2) NOT NULL,
    predicted_icu_occupancy_pct DECIMAL(5,2) NOT NULL,
    surge_risk ENUM('NORMAL', 'ELEVATED', 'CRITICAL_SURGE') DEFAULT 'NORMAL',
    opd_queue_estimated_wait_mins INT DEFAULT 15,
    expected_daily_opd_load INT DEFAULT 200,
    recommended_additional_staff INT DEFAULT 0,
    confidence DECIMAL(5,4) DEFAULT 0.9000,
    predicted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_hosp_pred (hospital_id),
    INDEX idx_hosp_surge (surge_risk)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Smart Parking Multi-Horizon Occupancy & Demand Predictions
CREATE TABLE IF NOT EXISTS parking_predictions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    lot_id INT NOT NULL,
    parking_name VARCHAR(100) NULL,
    horizon_minutes INT NOT NULL,
    predicted_occupied_slots INT NOT NULL,
    predicted_available_slots INT NOT NULL,
    predicted_occupancy_pct DECIMAL(5,2) NOT NULL,
    dynamic_pricing_surge_pct DECIMAL(5,2) DEFAULT 0.00,
    surge_active TINYINT(1) DEFAULT 0,
    confidence DECIMAL(5,4) DEFAULT 0.8900,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_park_lot (lot_id),
    INDEX idx_park_horizon (horizon_minutes)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Environment & AQI Forecasting
CREATE TABLE IF NOT EXISTS environment_predictions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    station_code VARCHAR(50) NOT NULL,
    locality VARCHAR(100) NULL,
    predicted_aqi INT NOT NULL,
    dominant_pollutant VARCHAR(30) DEFAULT 'PM2.5',
    pollution_trend ENUM('IMPROVING', 'STABLE', 'WORSENING') DEFAULT 'STABLE',
    hotspot_flag TINYINT(1) DEFAULT 0,
    health_advisory TEXT NULL,
    confidence DECIMAL(5,4) DEFAULT 0.8800,
    forecast_for TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_env_station (station_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Flood, Disaster & Fire Emergency Predictions
CREATE TABLE IF NOT EXISTS disaster_predictions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    hazard_type ENUM('FLOOD', 'WATERLOGGING', 'HEATWAVE', 'FIRE_SMOKE', 'DRAINAGE_FAILURE') NOT NULL,
    locality VARCHAR(100) NOT NULL,
    risk_level ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL,
    rainfall_mm DECIMAL(6,2) DEFAULT 0,
    drainage_capacity_pct DECIMAL(5,2) DEFAULT 80,
    water_level_meters DECIMAL(5,2) DEFAULT 0,
    historical_flooding_prob DECIMAL(4,3) DEFAULT 0.2,
    recommended_mitigation TEXT NULL,
    confidence DECIMAL(5,4) DEFAULT 0.8700,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_disaster_risk (risk_level),
    INDEX idx_disaster_locality (locality)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
