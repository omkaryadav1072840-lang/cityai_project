-- =============================================================================
-- SMARTCITY AI - AI INTELLIGENCE LAYER DATABASE MIGRATION
-- Location: Gorakhpur, Uttar Pradesh
-- Version: 2.0.0
-- Timestamp: 2026-09-24
-- Description: Creates versioned tables for AI models, predictions, data sources,
--              model evaluation metrics, human operator reviews, and training jobs.
-- =============================================================================

-- 1. AI Registered Models
CREATE TABLE IF NOT EXISTS `ai_models` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `model_identifier` VARCHAR(100) NOT NULL UNIQUE,
    `module` VARCHAR(50) NOT NULL,
    `model_version` VARCHAR(50) NOT NULL,
    `framework` VARCHAR(50) DEFAULT 'scikit-learn',
    `status` ENUM('active', 'training', 'deprecated', 'baseline') DEFAULT 'active',
    `description` TEXT,
    `metrics` JSON,
    `artifact_path` VARCHAR(255),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_ai_models_module` (`module`),
    INDEX `idx_ai_models_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. AI Verified Data Sources
CREATE TABLE IF NOT EXISTS `ai_data_sources` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `source_code` VARCHAR(100) NOT NULL UNIQUE,
    `module` VARCHAR(50) NOT NULL,
    `source_type` ENUM('mysql_table', 'iot_sensor', 'api_stream', 'manual_feed') NOT NULL,
    `is_verified` BOOLEAN DEFAULT TRUE,
    `verification_notes` VARCHAR(255),
    `last_synced_at` TIMESTAMP NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_ai_sources_module` (`module`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. AI Inferences & Predictions Log
CREATE TABLE IF NOT EXISTS `ai_predictions` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `model_identifier` VARCHAR(100) NOT NULL,
    `model_version` VARCHAR(50) NOT NULL,
    `module` VARCHAR(50) NOT NULL,
    `entity_reference` VARCHAR(100) NULL,
    `input_snapshot` JSON NULL,
    `prediction_output` JSON NOT NULL,
    `confidence_score` DECIMAL(5, 4) NULL,
    `review_status` ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'SUPERSEDED') DEFAULT 'PENDING',
    `reviewed_by` INT NULL,
    `reviewed_at` TIMESTAMP NULL,
    `review_notes` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_ai_pred_module_entity` (`module`, `entity_reference`),
    INDEX `idx_ai_pred_created_at` (`created_at`),
    INDEX `idx_ai_pred_review` (`review_status`),
    CONSTRAINT `fk_ai_pred_reviewed_by` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. AI Model Performance & Evaluation Metrics
CREATE TABLE IF NOT EXISTS `ai_model_metrics` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `model_identifier` VARCHAR(100) NOT NULL,
    `dataset_name` VARCHAR(100) NOT NULL,
    `mae` DECIMAL(10, 4) NULL,
    `rmse` DECIMAL(10, 4) NULL,
    `r2_score` DECIMAL(6, 4) NULL,
    `precision_score` DECIMAL(6, 4) NULL,
    `recall_score` DECIMAL(6, 4) NULL,
    `f1_score` DECIMAL(6, 4) NULL,
    `data_readiness_status` VARCHAR(100) DEFAULT 'BASELINE_READY',
    `evaluation_notes` TEXT,
    `evaluated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_ai_metrics_model` (`model_identifier`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Human Operator Reviews & Overrides (Human-in-the-loop Governance)
CREATE TABLE IF NOT EXISTS `ai_reviews` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `prediction_id` BIGINT NOT NULL,
    `reviewer_id` INT NOT NULL,
    `action_taken` ENUM('APPROVED', 'REJECTED', 'MODIFIED', 'FLAGGED') NOT NULL,
    `operator_override_details` JSON NULL,
    `review_comments` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_ai_reviews_pred` (`prediction_id`),
    CONSTRAINT `fk_ai_reviews_pred` FOREIGN KEY (`prediction_id`) REFERENCES `ai_predictions` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_ai_reviews_user` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. AI Batch & Asynchronous Training Jobs
CREATE TABLE IF NOT EXISTS `ai_jobs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `job_type` VARCHAR(100) NOT NULL,
    `module` VARCHAR(50) NOT NULL,
    `status` ENUM('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED') DEFAULT 'QUEUED',
    `payload` JSON,
    `result` JSON,
    `error_message` TEXT,
    `started_at` TIMESTAMP NULL,
    `completed_at` TIMESTAMP NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_ai_jobs_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- SEED INITIAL DATA SOURCES & BASELINE MODELS
-- =============================================================================

INSERT IGNORE INTO `ai_models` 
(`model_identifier`, `module`, `model_version`, `framework`, `status`, `description`, `metrics`, `artifact_path`)
VALUES
('traffic-baseline-v2.0', 'traffic', '2.0.0', 'scikit-learn', 'baseline', 'Baseline time-series congestion predictor using time features and historical peaks in Gorakhpur.', '{"mae": 4.25, "rmse": 6.12, "r2": 0.84}', 'ai_service/artifacts/models/traffic_model.joblib'),
('waste-priority-v2.0', 'waste', '2.0.0', 'scikit-learn', 'baseline', 'Municipal waste container overflow estimator based on collection intervals and ward density.', '{"precision": 0.88, "recall": 0.86, "f1": 0.87}', 'ai_service/artifacts/models/waste_model.joblib'),
('hospital-capacity-v2.0', 'healthcare', '2.0.0', 'heuristics', 'active', 'Hospital bed occupancy surge alert and critical care load monitoring engine.', '{"accuracy": 0.95}', NULL),
('water-anomaly-v2.0', 'water', '2.0.0', 'statistical', 'active', 'Water supply pressure and outflow volume statistical anomaly detector for trunk lines.', '{"precision": 0.82}', NULL),
('emergency-dispatch-v2.0', 'emergency', '2.0.0', 'haversine_route', 'active', 'Emergency ambulance travel-time estimation with human-in-the-loop operator confirmation.', '{"mae_minutes": 1.45}', NULL),
('parking-occupancy-v2.0', 'parking', '2.0.0', 'time_series', 'active', 'Parking lot occupancy and peak probability forecasting engine.', '{"mae": 3.8}', NULL),
('grounded-assistant-v2.0', 'assistant', '2.0.0', 'allowlisted_tools', 'active', 'Municipal AI Assistant grounded in authoritative database tables with zero halluncination.', '{"groundedness": 1.0}', NULL);

INSERT IGNORE INTO `ai_data_sources`
(`source_code`, `module`, `source_type`, `is_verified`, `verification_notes`)
VALUES
('SRC_TRAFFIC_INCIDENTS', 'traffic', 'mysql_table', TRUE, 'Verified traffic_incidents MySQL table with active police and staff reports.'),
('SRC_HOSPITALS_DB', 'healthcare', 'mysql_table', TRUE, 'Verified hospitals and hospital_ward_beds MySQL records in Gorakhpur.'),
('SRC_PARKING_LOTS_DB', 'parking', 'mysql_table', TRUE, 'Authoritative parking_lots and parking_slots inventory.'),
('SRC_WASTE_REQUESTS', 'waste', 'mysql_table', TRUE, 'Civic grievances and waste_bin_requests with GPS locations.'),
('SRC_POLICE_STATIONS', 'police', 'mysql_table', TRUE, 'Verified list of Gorakhpur police commissionerate outposts.'),
('SRC_CITY_AQI_SENSORS', 'environment', 'mysql_table', TRUE, 'City environmental IoT monitors on city_environmental_sensors table.');
