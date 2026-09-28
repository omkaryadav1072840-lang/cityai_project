-- ====================================================================
-- SMARTCITY AI - PHASE 1: AI ORCHESTRATION & PREDICTION LEDGER MIGRATION
-- Enhances ai_predictions and adds ai_tool_logs, ai_feedback, and chat tables.
-- ====================================================================

-- 1. Upgrade `ai_predictions` ledger safely with IF NOT EXISTS logic
DELIMITER $$
DROP PROCEDURE IF EXISTS upgrade_ai_predictions_table$$
CREATE PROCEDURE upgrade_ai_predictions_table()
BEGIN
    -- prediction_id
    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_predictions' AND COLUMN_NAME = 'prediction_id') THEN
        ALTER TABLE `ai_predictions` ADD COLUMN `prediction_id` VARCHAR(64) NULL AFTER `id`;
    END IF;

    -- model_name
    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_predictions' AND COLUMN_NAME = 'model_name') THEN
        ALTER TABLE `ai_predictions` ADD COLUMN `model_name` VARCHAR(100) NULL AFTER `prediction_id`;
    END IF;

    -- input_data
    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_predictions' AND COLUMN_NAME = 'input_data') THEN
        ALTER TABLE `ai_predictions` ADD COLUMN `input_data` JSON NULL AFTER `model_version`;
    END IF;

    -- output_data
    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_predictions' AND COLUMN_NAME = 'output_data') THEN
        ALTER TABLE `ai_predictions` ADD COLUMN `output_data` JSON NULL AFTER `input_data`;
    END IF;

    -- reason
    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_predictions' AND COLUMN_NAME = 'reason') THEN
        ALTER TABLE `ai_predictions` ADD COLUMN `reason` TEXT NULL AFTER `confidence_score`;
    END IF;

    -- location
    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_predictions' AND COLUMN_NAME = 'location') THEN
        ALTER TABLE `ai_predictions` ADD COLUMN `location` VARCHAR(150) NULL AFTER `reason`;
    END IF;

    -- user_id
    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_predictions' AND COLUMN_NAME = 'user_id') THEN
        ALTER TABLE `ai_predictions` ADD COLUMN `user_id` VARCHAR(64) NULL AFTER `location`;
    END IF;

    -- staff_id
    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_predictions' AND COLUMN_NAME = 'staff_id') THEN
        ALTER TABLE `ai_predictions` ADD COLUMN `staff_id` VARCHAR(64) NULL AFTER `user_id`;
    END IF;

    -- actual_result
    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_predictions' AND COLUMN_NAME = 'actual_result') THEN
        ALTER TABLE `ai_predictions` ADD COLUMN `actual_result` JSON NULL AFTER `staff_id`;
    END IF;

    -- was_correct
    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_predictions' AND COLUMN_NAME = 'was_correct') THEN
        ALTER TABLE `ai_predictions` ADD COLUMN `was_correct` TINYINT(1) NULL AFTER `actual_result`;
    END IF;

    -- human_override
    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_predictions' AND COLUMN_NAME = 'human_override') THEN
        ALTER TABLE `ai_predictions` ADD COLUMN `human_override` TINYINT(1) DEFAULT 0 AFTER `was_correct`;
    END IF;

    -- override_reason
    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_predictions' AND COLUMN_NAME = 'override_reason') THEN
        ALTER TABLE `ai_predictions` ADD COLUMN `override_reason` TEXT NULL AFTER `human_override`;
    END IF;

    -- data_source
    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_predictions' AND COLUMN_NAME = 'data_source') THEN
        ALTER TABLE `ai_predictions` ADD COLUMN `data_source` ENUM('REAL', 'SIMULATED', 'PREDICTED') DEFAULT 'PREDICTED' AFTER `override_reason`;
    END IF;

    -- processing_time
    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_predictions' AND COLUMN_NAME = 'processing_time') THEN
        ALTER TABLE `ai_predictions` ADD COLUMN `processing_time` INT DEFAULT 0 AFTER `data_source`;
    END IF;

    -- status
    IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_predictions' AND COLUMN_NAME = 'status') THEN
        ALTER TABLE `ai_predictions` ADD COLUMN `status` VARCHAR(50) DEFAULT 'COMPLETED' AFTER `processing_time`;
    END IF;

    -- Backfill prediction_id and model_name for any historical records
    UPDATE `ai_predictions` 
    SET `prediction_id` = CONCAT('PRED-', id, '-', SUBSTRING(MD5(id), 1, 6)) 
    WHERE `prediction_id` IS NULL;

    UPDATE `ai_predictions` 
    SET `model_name` = `model_identifier` 
    WHERE `model_name` IS NULL AND `model_identifier` IS NOT NULL;

    UPDATE `ai_predictions` 
    SET `input_data` = `input_snapshot` 
    WHERE `input_data` IS NULL AND `input_snapshot` IS NOT NULL;

    UPDATE `ai_predictions` 
    SET `output_data` = `prediction_output` 
    WHERE `output_data` IS NULL AND `prediction_output` IS NOT NULL;

    -- Add performance indexes if not already present
    IF NOT EXISTS (SELECT * FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_predictions' AND INDEX_NAME = 'idx_pred_id') THEN
        ALTER TABLE `ai_predictions` ADD UNIQUE INDEX `idx_pred_id` (`prediction_id`);
    END IF;

    IF NOT EXISTS (SELECT * FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_predictions' AND INDEX_NAME = 'idx_pred_model_name') THEN
        ALTER TABLE `ai_predictions` ADD INDEX `idx_pred_model_name` (`model_name`);
    END IF;

    IF NOT EXISTS (SELECT * FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_predictions' AND INDEX_NAME = 'idx_pred_location') THEN
        ALTER TABLE `ai_predictions` ADD INDEX `idx_pred_location` (`location`);
    END IF;
END$$
DELIMITER ;

CALL upgrade_ai_predictions_table();
DROP PROCEDURE IF EXISTS upgrade_ai_predictions_table;

-- 2. Create `ai_tool_logs` for tracking Grounded Tool Calling executions
CREATE TABLE IF NOT EXISTS `ai_tool_logs` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `tool_call_id` VARCHAR(64) NOT NULL UNIQUE,
    `session_id` VARCHAR(64) NULL,
    `user_id` VARCHAR(64) NULL,
    `tool_name` VARCHAR(100) NOT NULL,
    `parameters` JSON NULL,
    `result_summary` JSON NULL,
    `latency_ms` INT DEFAULT 0,
    `success` TINYINT(1) DEFAULT 1,
    `error_message` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_tool_name` (`tool_name`),
    INDEX `idx_tool_session` (`session_id`),
    INDEX `idx_tool_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Create `ai_feedback` for storing actual outcomes, drift, and accuracy metrics
CREATE TABLE IF NOT EXISTS `ai_feedback` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `prediction_id` VARCHAR(64) NOT NULL,
    `module` VARCHAR(50) NOT NULL,
    `model_name` VARCHAR(100) NOT NULL,
    `predicted_value` VARCHAR(255) NULL,
    `actual_value` VARCHAR(255) NULL,
    `accuracy_score` DECIMAL(5,4) NULL,
    `feedback_type` ENUM('AUTOMATED_OBSERVATION', 'STAFF_REVIEW', 'CITIZEN_RATING') DEFAULT 'STAFF_REVIEW',
    `submitted_by` VARCHAR(64) NULL,
    `comments` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_fb_pred_id` (`prediction_id`),
    INDEX `idx_fb_module` (`module`),
    INDEX `idx_fb_model` (`model_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Create `ai_chat_sessions` & `ai_chat_messages`
CREATE TABLE IF NOT EXISTS `ai_chat_sessions` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `session_id` VARCHAR(64) NOT NULL UNIQUE,
    `user_id` VARCHAR(64) NULL,
    `language` VARCHAR(20) DEFAULT 'bilingual',
    `channel` VARCHAR(50) DEFAULT 'web_floating_widget',
    `metadata` JSON NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_chat_session_user` (`user_id`),
    INDEX `idx_chat_session_date` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ai_chat_messages` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `session_id` VARCHAR(64) NOT NULL,
    `sender` ENUM('user', 'assistant', 'system') NOT NULL,
    `message` TEXT NOT NULL,
    `intent` VARCHAR(100) NULL,
    `tool_called` VARCHAR(100) NULL,
    `data_source` ENUM('REAL', 'SIMULATED', 'PREDICTED') DEFAULT 'REAL',
    `confidence_score` DECIMAL(5,4) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_msg_session` (`session_id`),
    INDEX `idx_msg_intent` (`intent`),
    INDEX `idx_msg_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
