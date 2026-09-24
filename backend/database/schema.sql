-- ====================================================================
-- SMART CITY AI - MASTER DATABASE SCHEMA
-- Target Database: MySQL 8.0+
-- Encoding: UTF8MB4
-- ====================================================================

CREATE DATABASE IF NOT EXISTS `smartcity`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `smartcity`;

-- ====================================================================
-- 1. CITIZEN & STAFF AUTHENTICATION
-- ====================================================================

CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `mobile` VARCHAR(20) NOT NULL UNIQUE,
    `email` VARCHAR(100) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `role` VARCHAR(20) DEFAULT 'citizen',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `staff` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `staff_id` VARCHAR(50) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `department` VARCHAR(100) DEFAULT 'General',
    `role` VARCHAR(20) DEFAULT 'staff',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ====================================================================
-- 2. PATIENTS & MEDICAL RECORDS
-- ====================================================================

CREATE TABLE IF NOT EXISTS `patients` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `patient_id` VARCHAR(50) NOT NULL UNIQUE,
    `name` VARCHAR(100) NOT NULL,
    `age` INT DEFAULT NULL,
    `gender` VARCHAR(20) DEFAULT NULL,
    `mobile` VARCHAR(20) DEFAULT NULL,
    `blood_group` VARCHAR(10) DEFAULT NULL,
    `address` TEXT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_patient_id` (`patient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `patient_records` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `patient_id` VARCHAR(50) NOT NULL,
    `doctor_name` VARCHAR(100) DEFAULT NULL,
    `diagnosis` TEXT DEFAULT NULL,
    `symptoms` TEXT DEFAULT NULL,
    `treatment` TEXT DEFAULT NULL,
    `notes` TEXT DEFAULT NULL,
    `record_date` DATE DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_records_patient` (`patient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `patient_reports` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `patient_id` VARCHAR(50) NOT NULL,
    `title` VARCHAR(150) NOT NULL,
    `report_type` VARCHAR(50) DEFAULT NULL,
    `doctor_name` VARCHAR(100) DEFAULT NULL,
    `hospital_name` VARCHAR(150) DEFAULT NULL,
    `status` VARCHAR(50) DEFAULT 'Ready',
    `file_path` VARCHAR(255) DEFAULT NULL,
    `report_date` DATE DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_reports_patient` (`patient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `prescriptions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `patient_id` VARCHAR(50) NOT NULL,
    `doctor_name` VARCHAR(100) DEFAULT NULL,
    `original_file_name` VARCHAR(255) DEFAULT NULL,
    `stored_file_name` VARCHAR(255) DEFAULT NULL,
    `prescription_file` VARCHAR(255) DEFAULT NULL,
    `file_path` VARCHAR(255) DEFAULT NULL,
    `file_type` VARCHAR(50) DEFAULT NULL,
    `file_size` INT DEFAULT NULL,
    `uploaded_by` VARCHAR(50) DEFAULT 'Patient',
    `status` VARCHAR(50) DEFAULT 'Uploaded',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_presc_patient` (`patient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ====================================================================
-- 3. HOSPITALS, DEPARTMENTS & BED INVENTORY
-- ====================================================================

CREATE TABLE IF NOT EXISTS `hospitals` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `hospital_id` VARCHAR(50) NOT NULL UNIQUE,
    `hospital_name` VARCHAR(150) NOT NULL,
    `address` TEXT DEFAULT NULL,
    `phone` VARCHAR(20) DEFAULT NULL,
    `emergency_number` VARCHAR(20) DEFAULT NULL,
    `email` VARCHAR(100) DEFAULT NULL,
    `website` VARCHAR(150) DEFAULT NULL,
    `hospital_type` VARCHAR(50) DEFAULT 'Public',
    `total_beds` INT DEFAULT 0,
    `icu_beds` INT DEFAULT 0,
    `emergency_beds` INT DEFAULT 0,
    `status` VARCHAR(50) DEFAULT 'Operational',
    `latitude` DECIMAL(10, 7) DEFAULT 26.7606,
    `longitude` DECIMAL(10, 7) DEFAULT 83.3732,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_hosp_id` (`hospital_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `hospital_departments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `hospital_id` VARCHAR(50) NOT NULL,
    `department_name` VARCHAR(100) NOT NULL,
    `approx_fee` DECIMAL(10, 2) DEFAULT 0.00,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_dept_hosp` (`hospital_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `hospital_bed_categories` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `hospital_id` VARCHAR(50) NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `total_beds` INT DEFAULT 0,
    `occupied_beds` INT DEFAULT 0,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_bed_cat_hosp` (`hospital_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `hospital_beds` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `hospital_name` VARCHAR(150) NOT NULL,
    `general_beds` INT DEFAULT 0,
    `icu_beds` INT DEFAULT 0,
    `emergency_beds` INT DEFAULT 0,
    `private_beds` INT DEFAULT 0,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ====================================================================
-- 4. DOCTORS, SLOTS & APPOINTMENTS
-- ====================================================================

CREATE TABLE IF NOT EXISTS `doctors` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `doctor_id` VARCHAR(50) NOT NULL UNIQUE,
    `hospital_id` VARCHAR(50) DEFAULT NULL,
    `name` VARCHAR(100) NOT NULL,
    `specialization` VARCHAR(100) DEFAULT NULL,
    `department` VARCHAR(100) DEFAULT NULL,
    `qualification` VARCHAR(100) DEFAULT NULL,
    `experience` VARCHAR(50) DEFAULT NULL,
    `mobile` VARCHAR(20) DEFAULT NULL,
    `email` VARCHAR(100) DEFAULT NULL,
    `password` VARCHAR(255) DEFAULT NULL,
    `consultation_fee` DECIMAL(10, 2) DEFAULT 0.00,
    `status` VARCHAR(50) DEFAULT 'Active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_doctor_id` (`doctor_id`),
    INDEX `idx_doctor_hosp` (`hospital_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `doctor_slots` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `doctor_id` VARCHAR(50) NOT NULL,
    `slot_date` DATE NOT NULL,
    `start_time` TIME NOT NULL,
    `end_time` TIME NOT NULL,
    `max_patients` INT DEFAULT 10,
    `booked_patients` INT DEFAULT 0,
    `status` VARCHAR(50) DEFAULT 'Available',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_slot_doc` (`doctor_id`, `slot_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `doctor_schedules` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `doctor_id` VARCHAR(50) NOT NULL,
    `day_of_week` VARCHAR(20) DEFAULT NULL,
    `start_time` TIME DEFAULT NULL,
    `end_time` TIME DEFAULT NULL,
    `max_tokens` INT DEFAULT 20,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_sched_doc` (`doctor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `appointments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `patient_id` VARCHAR(50) NOT NULL,
    `hospital_id` VARCHAR(50) DEFAULT NULL,
    `doctor_id` VARCHAR(50) DEFAULT NULL,
    `doctor` VARCHAR(100) DEFAULT NULL,
    `slot_id` INT DEFAULT NULL,
    `appointment_date` DATE NOT NULL,
    `appointment_time` VARCHAR(50) NOT NULL,
    `status` VARCHAR(50) DEFAULT 'Confirmed',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_appt_patient` (`patient_id`),
    INDEX `idx_appt_doc_date` (`doctor_id`, `appointment_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ====================================================================
-- 5. AMBULANCES & EMERGENCY DEPARTMENTS
-- ====================================================================

CREATE TABLE IF NOT EXISTS `ambulances` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `ambulance_id` VARCHAR(50) NOT NULL UNIQUE,
    `vehicle_number` VARCHAR(50) NOT NULL,
    `driver_name` VARCHAR(100) DEFAULT NULL,
    `driver_mobile` VARCHAR(20) DEFAULT NULL,
    `ambulance_type` VARCHAR(50) DEFAULT 'Basic Life Support (BLS)',
    `hospital_name` VARCHAR(150) DEFAULT NULL,
    `location` VARCHAR(150) DEFAULT 'Gorakhpur City',
    `status` VARCHAR(50) DEFAULT 'Available',
    `latitude` DECIMAL(10, 7) DEFAULT 26.7606,
    `longitude` DECIMAL(10, 7) DEFAULT 83.3732,
    `patient_name` VARCHAR(100) DEFAULT NULL,
    `patient_mobile` VARCHAR(20) DEFAULT NULL,
    `patient_lat` DECIMAL(10, 7) DEFAULT NULL,
    `patient_lng` DECIMAL(10, 7) DEFAULT NULL,
    `patient_address` TEXT DEFAULT NULL,
    `destination_hospital_id` VARCHAR(50) DEFAULT NULL,
    `destination_hospital_name` VARCHAR(150) DEFAULT NULL,
    `assigned_at` DATETIME DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_amb_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `emergency_departments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `hospital_name` VARCHAR(150) NOT NULL,
    `emergency_number` VARCHAR(20) NOT NULL,
    `emergency_type` VARCHAR(100) DEFAULT 'Trauma & Emergency',
    `available_doctors` INT DEFAULT 0,
    `available_beds` INT DEFAULT 0,
    `ambulances_available` INT DEFAULT 0,
    `status` VARCHAR(50) DEFAULT 'Active',
    `location` VARCHAR(150) DEFAULT 'Gorakhpur',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ====================================================================
-- 6. PHARMACY CATALOG, CART & BILLING
-- ====================================================================

CREATE TABLE IF NOT EXISTS `pharmacy` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `medicine_name` VARCHAR(150) NOT NULL,
    `category` VARCHAR(100) DEFAULT 'General',
    `quantity` INT DEFAULT 0,
    `price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `availability` VARCHAR(50) DEFAULT 'In Stock',
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_med_name` (`medicine_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `pharmacy_cart` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `patient_id` VARCHAR(50) NOT NULL,
    `medicine_id` INT NOT NULL,
    `medicine_name` VARCHAR(150) NOT NULL,
    `quantity` INT NOT NULL DEFAULT 1,
    `price` DECIMAL(10, 2) NOT NULL,
    `total` DECIMAL(10, 2) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_cart_patient` (`patient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `pharmacy_bills` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `bill_number` VARCHAR(50) NOT NULL UNIQUE,
    `patient_id` VARCHAR(50) NOT NULL,
    `subtotal` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `discount` DECIMAL(10, 2) DEFAULT 0.00,
    `final_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `payment_status` VARCHAR(50) DEFAULT 'Pending',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_bill_patient` (`patient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `pharmacy_bill_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `bill_id` INT NOT NULL,
    `medicine_id` INT NOT NULL,
    `medicine_name` VARCHAR(150) NOT NULL,
    `quantity` INT NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `total` DECIMAL(10, 2) NOT NULL,
    INDEX `idx_item_bill` (`bill_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ====================================================================
-- 7. WASTE MANAGEMENT
-- ====================================================================

CREATE TABLE IF NOT EXISTS `waste_bin_requests` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `request_code` VARCHAR(50) NOT NULL UNIQUE,
    `user_id` VARCHAR(50) DEFAULT NULL,
    `citizen_name` VARCHAR(100) NOT NULL,
    `reason` TEXT DEFAULT NULL,
    `waste_type` VARCHAR(50) DEFAULT 'Solid Waste',
    `location` VARCHAR(255) DEFAULT NULL,
    `latitude` DECIMAL(10, 7) DEFAULT NULL,
    `longitude` DECIMAL(10, 7) DEFAULT NULL,
    `status` VARCHAR(50) DEFAULT 'Pending',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_waste_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ====================================================================
-- 8. EXTENDED FOUNDATION TABLES (Phase 3 Forward Compatibility)
-- ====================================================================

CREATE TABLE IF NOT EXISTS `parking_lots` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `lot_id` VARCHAR(50) NOT NULL UNIQUE,
    `name` VARCHAR(150) NOT NULL,
    `location` VARCHAR(255) NOT NULL,
    `total_spots` INT DEFAULT 50,
    `available_spots` INT DEFAULT 50,
    `hourly_rate` DECIMAL(10, 2) DEFAULT 20.00,
    `status` VARCHAR(50) DEFAULT 'Open',
    `latitude` DECIMAL(10, 7) DEFAULT 26.7606,
    `longitude` DECIMAL(10, 7) DEFAULT 83.3732,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `parking_bookings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `booking_id` VARCHAR(50) NOT NULL UNIQUE,
    `lot_id` VARCHAR(50) NOT NULL,
    `user_id` VARCHAR(50) NOT NULL,
    `vehicle_number` VARCHAR(50) NOT NULL,
    `slot_number` VARCHAR(20) DEFAULT NULL,
    `start_time` DATETIME NOT NULL,
    `duration_hours` INT DEFAULT 2,
    `total_amount` DECIMAL(10, 2) DEFAULT 40.00,
    `status` VARCHAR(50) DEFAULT 'Active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `water_tanks` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tank_id` VARCHAR(50) NOT NULL UNIQUE,
    `name` VARCHAR(150) NOT NULL,
    `zone` VARCHAR(100) NOT NULL,
    `capacity_liters` INT DEFAULT 100000,
    `current_level_percent` INT DEFAULT 80,
    `status` VARCHAR(50) DEFAULT 'Operational',
    `next_supply_time` VARCHAR(50) DEFAULT '06:00 AM - 09:00 AM',
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `water_tanker_bookings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `booking_id` VARCHAR(50) NOT NULL UNIQUE,
    `user_id` VARCHAR(50) NOT NULL,
    `citizen_name` VARCHAR(100) NOT NULL,
    `mobile` VARCHAR(20) NOT NULL,
    `delivery_address` TEXT NOT NULL,
    `capacity` VARCHAR(50) DEFAULT '5000 Litres',
    `booking_date` DATE NOT NULL,
    `status` VARCHAR(50) DEFAULT 'Pending',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `police_stations` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `station_id` VARCHAR(50) NOT NULL UNIQUE,
    `name` VARCHAR(150) NOT NULL,
    `sho_name` VARCHAR(100) DEFAULT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `jurisdiction` VARCHAR(255) DEFAULT NULL,
    `location` VARCHAR(255) DEFAULT NULL,
    `latitude` DECIMAL(10, 7) DEFAULT 26.7606,
    `longitude` DECIMAL(10, 7) DEFAULT 83.3732,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `police_complaints` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `complaint_id` VARCHAR(50) NOT NULL UNIQUE,
    `user_id` VARCHAR(50) DEFAULT NULL,
    `citizen_name` VARCHAR(100) NOT NULL,
    `mobile` VARCHAR(20) NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `subject` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `status` VARCHAR(50) DEFAULT 'Under Review',
    `station_id` VARCHAR(50) DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ====================================================================
-- 9. WATER SUPPLY REPORTS (Citizen Complaints)
-- ====================================================================

CREATE TABLE IF NOT EXISTS `water_reports` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `report_id` VARCHAR(50) NOT NULL UNIQUE,
    `user_id` VARCHAR(50) DEFAULT NULL,
    `citizen_name` VARCHAR(100) NOT NULL,
    `mobile` VARCHAR(20) NOT NULL,
    `issue_type` VARCHAR(100) NOT NULL COMMENT 'e.g. No Supply, Low Pressure, Contamination, Pipe Leak',
    `location` VARCHAR(255) NOT NULL,
    `description` TEXT DEFAULT NULL,
    `status` VARCHAR(50) DEFAULT 'Open',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_report_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ====================================================================
-- 10. POLICE MONTHLY CRIME STATISTICS
-- ====================================================================

CREATE TABLE IF NOT EXISTS `police_stats` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `month_year` VARCHAR(20) NOT NULL UNIQUE COMMENT 'Format: Mon YYYY e.g. Apr 2026',
    `theft` INT DEFAULT 0,
    `assault` INT DEFAULT 0,
    `traffic_violations` INT DEFAULT 0,
    `domestic` INT DEFAULT 0,
    `cybercrime` INT DEFAULT 0,
    `other` INT DEFAULT 0,
    `total` INT GENERATED ALWAYS AS (`theft` + `assault` + `traffic_violations` + `domestic` + `cybercrime` + `other`) STORED,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ====================================================================
-- EXTENDED MUNICIPAL SUBSYSTEMS & REAL-TIME MODULE TABLES
-- (Consolidated from migrations: traffic, hospital management, diagnostics,
--  famous places, tourism, parking slots, sensors, and audit ledgers)
-- ====================================================================

-- Table: audit_logs
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `user_name` varchar(150) DEFAULT NULL,
  `role` varchar(50) DEFAULT NULL,
  `department` varchar(50) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `module` varchar(50) NOT NULL,
  `record_id` varchar(100) DEFAULT NULL,
  `ip_address` varchar(50) DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_module` (`module`),
  KEY `idx_audit_dept` (`department`),
  KEY `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: auth_sessions
CREATE TABLE IF NOT EXISTS `auth_sessions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `token_hash` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` int NOT NULL,
  `staff_department` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `revoked_at` datetime DEFAULT NULL,
  `ip_address` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_hash` (`token_hash`),
  KEY `idx_auth_sessions_user` (`user_type`,`user_id`),
  KEY `idx_auth_sessions_expiry` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: citizen_feedback
CREATE TABLE IF NOT EXISTS `citizen_feedback` (
  `id` int NOT NULL AUTO_INCREMENT,
  `request_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `citizen_name` varchar(150) DEFAULT NULL,
  `department` varchar(50) NOT NULL,
  `rating` int NOT NULL,
  `comments` text,
  `staff_id` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_feedback_dept` (`department`),
  KEY `idx_feedback_req` (`request_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: city_atms
CREATE TABLE IF NOT EXISTS `city_atms` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `bank_name` varchar(100) NOT NULL,
  `address` varchar(255) NOT NULL,
  `locality` varchar(100) DEFAULT 'Gorakhpur',
  `latitude` decimal(10,7) NOT NULL,
  `longitude` decimal(10,7) NOT NULL,
  `is_24_7` tinyint(1) DEFAULT '1',
  `has_cash` tinyint(1) DEFAULT '1',
  `status` varchar(50) DEFAULT 'Operational',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_atm_loc` (`locality`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: city_environmental_sensors
CREATE TABLE IF NOT EXISTS `city_environmental_sensors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sensor_code` varchar(50) NOT NULL,
  `location` varchar(255) NOT NULL,
  `zone` varchar(100) NOT NULL,
  `latitude` decimal(10,7) NOT NULL,
  `longitude` decimal(10,7) NOT NULL,
  `aqi` int NOT NULL,
  `pm25` decimal(6,2) NOT NULL,
  `pm10` decimal(6,2) NOT NULL,
  `temp_c` decimal(5,2) NOT NULL,
  `humidity_pct` decimal(5,2) NOT NULL,
  `co_ppm` decimal(5,2) NOT NULL,
  `status` enum('Active','Maintenance','Offline') DEFAULT 'Active',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sensor_code` (`sensor_code`),
  KEY `idx_sensor_code` (`sensor_code`),
  KEY `idx_sensor_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: city_restaurants
CREATE TABLE IF NOT EXISTS `city_restaurants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `cuisine` varchar(150) NOT NULL,
  `address` varchar(255) NOT NULL,
  `locality` varchar(100) DEFAULT 'Gorakhpur',
  `latitude` decimal(10,7) NOT NULL,
  `longitude` decimal(10,7) NOT NULL,
  `rating` decimal(2,1) DEFAULT '4.3',
  `opening_hours` varchar(100) DEFAULT '10:00 AM - 11:00 PM',
  `avg_cost` varchar(50) DEFAULT '₹300 for two',
  `image_url` varchar(500) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'Open',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rest_loc` (`locality`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: diagnostic_categories
CREATE TABLE IF NOT EXISTS `diagnostic_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `hospital_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `icon` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 0xF09F94AC,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'Active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `category_id` (`category_id`),
  KEY `idx_diag_cat_hosp` (`hospital_id`),
  KEY `idx_diag_cat_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: diagnostic_reports
CREATE TABLE IF NOT EXISTS `diagnostic_reports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `report_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `booking_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `hospital_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `test_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `patient_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `doctor_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `technician_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `technician_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `verified_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `collection_date` date DEFAULT NULL,
  `report_date` date DEFAULT NULL,
  `test_parameters_json` longtext COLLATE utf8mb4_unicode_ci,
  `remarks` text COLLATE utf8mb4_unicode_ci,
  `qr_token` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Report Ready',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `report_id` (`report_id`),
  KEY `idx_drep_hosp` (`hospital_id`),
  KEY `idx_drep_pat` (`patient_id`),
  KEY `idx_drep_book` (`booking_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: diagnostic_tests
CREATE TABLE IF NOT EXISTS `diagnostic_tests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `test_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `hospital_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'PATHOLOGY',
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `icon` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 0xF09FA7AA,
  `short_description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `full_description` text COLLATE utf8mb4_unicode_ci,
  `purpose` text COLLATE utf8mb4_unicode_ci,
  `sample_required` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'Blood',
  `prep_instructions` text COLLATE utf8mb4_unicode_ci,
  `fasting_required` tinyint(1) DEFAULT '0',
  `estimated_report_time` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '4 to 6 Hours',
  `price` decimal(10,2) DEFAULT '0.00',
  `online_booking` tinyint(1) DEFAULT '1',
  `offline_booking` tinyint(1) DEFAULT '1',
  `home_collection` tinyint(1) DEFAULT '1',
  `emergency_available` tinyint(1) DEFAULT '1',
  `daily_slots` int DEFAULT '50',
  `current_token` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'A-001',
  `now_serving` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'A-001',
  `estimated_wait_time` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '20 Mins',
  `laboratory_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT 'Central Diagnostic Lab',
  `department` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'Pathology',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'Active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `test_id` (`test_id`),
  KEY `idx_diag_test_hosp` (`hospital_id`),
  KEY `idx_diag_test_cat` (`category_id`),
  KEY `idx_diag_test_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: emergency_incidents
CREATE TABLE IF NOT EXISTS `emergency_incidents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `incident_code` varchar(50) NOT NULL,
  `type` varchar(50) NOT NULL,
  `location` varchar(255) NOT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `description` text,
  `caller_name` varchar(100) DEFAULT NULL,
  `caller_mobile` varchar(20) DEFAULT NULL,
  `priority` varchar(20) DEFAULT 'HIGH',
  `status` varchar(50) DEFAULT 'ACTIVE',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `incident_code` (`incident_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: famous_places
CREATE TABLE IF NOT EXISTS `famous_places` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `slug` varchar(150) NOT NULL,
  `category` enum('Religious','Historical','Cultural','Nature','Educational','Family & Recreation','Heritage') NOT NULL DEFAULT 'Heritage',
  `short_description` varchar(300) NOT NULL,
  `description` text NOT NULL,
  `address` varchar(255) NOT NULL,
  `locality` varchar(100) DEFAULT 'Gorakhpur',
  `latitude` decimal(10,7) NOT NULL,
  `longitude` decimal(10,7) NOT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `gallery_json` json DEFAULT NULL,
  `opening_time` varchar(100) DEFAULT 'Information unavailable',
  `closing_time` varchar(100) DEFAULT 'Information unavailable',
  `entry_fee` varchar(150) DEFAULT 'Please verify before visiting',
  `best_time_to_visit` varchar(150) DEFAULT 'October to March',
  `source_url` varchar(255) DEFAULT 'Gorakhpur Smart City & Tourism Department',
  `verification_status` varchar(50) DEFAULT 'Verified',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_places_cat` (`category`),
  KEY `idx_places_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: hospital_invoices
CREATE TABLE IF NOT EXISTS `hospital_invoices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `invoice_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `hospital_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `patient_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `patient_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `service_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `service_reference_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `discount` decimal(10,2) DEFAULT '0.00',
  `paid_amount` decimal(10,2) NOT NULL,
  `payment_method` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Cash',
  `payment_status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Paid',
  `billed_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'Billing Desk',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoice_id` (`invoice_id`),
  KEY `idx_hinv_hosp` (`hospital_id`),
  KEY `idx_hinv_pat` (`patient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: hospital_notifications
CREATE TABLE IF NOT EXISTS `hospital_notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hospital_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `recipient_role` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'all',
  `title` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'general',
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_hnotif_hosp` (`hospital_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: hospital_staff
CREATE TABLE IF NOT EXISTS `hospital_staff` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hospital_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `staff_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` int DEFAULT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'hospital_admin',
  `department` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'General',
  `mobile` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'Active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_hosp_staff_uniq` (`hospital_id`,`staff_id`),
  KEY `idx_hosp_staff_hosp` (`hospital_id`),
  KEY `idx_hosp_staff_staff` (`staff_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: hospital_ward_beds
CREATE TABLE IF NOT EXISTS `hospital_ward_beds` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bed_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `hospital_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ward_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `bed_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `bed_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'General',
  `status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Available',
  `patient_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `patient_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `admission_date` datetime DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `bed_id` (`bed_id`),
  KEY `idx_wbed_hosp` (`hospital_id`),
  KEY `idx_wbed_ward` (`ward_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: hospital_wards
CREATE TABLE IF NOT EXISTS `hospital_wards` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ward_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `hospital_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ward_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ward_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `floor` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '1st Floor',
  `total_beds` int DEFAULT '20',
  `occupied_beds` int DEFAULT '0',
  `charge_per_day` decimal(10,2) DEFAULT '500.00',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'Active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ward_id` (`ward_id`),
  KEY `idx_ward_hosp` (`hospital_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: medical_documents
CREATE TABLE IF NOT EXISTS `medical_documents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `document_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `uploaded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_medical_documents_patient_id` (`patient_id`),
  CONSTRAINT `fk_medical_documents_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: notifications
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `role` varchar(50) DEFAULT NULL,
  `department` varchar(50) DEFAULT NULL,
  `type` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `module` varchar(50) NOT NULL,
  `reference_id` varchar(100) DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notif_user_read` (`user_id`,`is_read`),
  KEY `idx_notif_dept_read` (`department`,`is_read`),
  KEY `idx_notif_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: parking_activity_logs
CREATE TABLE IF NOT EXISTS `parking_activity_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `staff_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `parking_id` int DEFAULT NULL,
  `old_value` text COLLATE utf8mb4_unicode_ci,
  `new_value` text COLLATE utf8mb4_unicode_ci,
  `ip_address` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_activity_parking` (`parking_id`),
  KEY `idx_activity_staff` (`staff_id`),
  KEY `idx_activity_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: parking_anpr_scans
CREATE TABLE IF NOT EXISTS `parking_anpr_scans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `scan_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `plate_number` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `lot_id` int NOT NULL,
  `lot_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gate_type` enum('ENTRY','EXIT') COLLATE utf8mb4_unicode_ci DEFAULT 'ENTRY',
  `confidence_percent` int DEFAULT '98',
  `action_taken` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT 'BARRIER_OPENED',
  `scanned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `scan_id` (`scan_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: parking_entries
CREATE TABLE IF NOT EXISTS `parking_entries` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `parking_id` int NOT NULL,
  `vehicle_number` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `vehicle_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'CAR',
  `entry_time` datetime NOT NULL,
  `exit_time` datetime DEFAULT NULL,
  `recorded_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MANUAL_STAFF',
  `fee_amount` decimal(10,2) DEFAULT NULL,
  `payment_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_entries_parking` (`parking_id`),
  KEY `idx_entries_vehicle` (`vehicle_number`),
  KEY `idx_entries_status` (`status`),
  CONSTRAINT `fk_entries_parking` FOREIGN KEY (`parking_id`) REFERENCES `parking_lots` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: parking_occupancy_log
CREATE TABLE IF NOT EXISTS `parking_occupancy_log` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `parking_id` int NOT NULL,
  `source` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `updated_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `previous_available` int DEFAULT NULL,
  `new_available` int DEFAULT NULL,
  `previous_status` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `new_status` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_occlog_parking` (`parking_id`),
  KEY `idx_occlog_created` (`created_at`),
  CONSTRAINT `fk_occlog_parking` FOREIGN KEY (`parking_id`) REFERENCES `parking_lots` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: parking_reports
CREATE TABLE IF NOT EXISTS `parking_reports` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `parking_id` int DEFAULT NULL,
  `citizen_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `issue_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'OPEN',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_reports_parking` (`parking_id`),
  KEY `idx_reports_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: parking_slots
CREATE TABLE IF NOT EXISTS `parking_slots` (
  `id` int NOT NULL AUTO_INCREMENT,
  `lot_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slot_number` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slot_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'car',
  `floor` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Ground Floor',
  `status` enum('Available','Booked','Occupied','Maintenance') COLLATE utf8mb4_unicode_ci DEFAULT 'Available',
  `current_booking_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_updated` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_lot_slot` (`lot_id`,`slot_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: patient_audit_logs
CREATE TABLE IF NOT EXISTS `patient_audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `patient_id` varchar(50) NOT NULL,
  `action` varchar(50) NOT NULL,
  `performed_by_id` int DEFAULT NULL,
  `performed_by_name` varchar(100) DEFAULT NULL,
  `role` varchar(30) DEFAULT NULL,
  `details` text,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_patient` (`patient_id`),
  KEY `idx_audit_action` (`action`),
  KEY `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: place_civic_issues
CREATE TABLE IF NOT EXISTS `place_civic_issues` (
  `id` int NOT NULL AUTO_INCREMENT,
  `issue_code` varchar(50) NOT NULL,
  `place_id` int NOT NULL,
  `place_name` varchar(150) NOT NULL,
  `user_id` int DEFAULT NULL,
  `citizen_name` varchar(100) NOT NULL,
  `citizen_mobile` varchar(20) NOT NULL,
  `category` varchar(100) NOT NULL,
  `description` text NOT NULL,
  `photo_url` varchar(500) DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'Submitted',
  `admin_remarks` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `issue_code` (`issue_code`),
  KEY `idx_issue_place` (`place_id`),
  KEY `idx_issue_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: place_favorites
CREATE TABLE IF NOT EXISTS `place_favorites` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `place_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_user_place_fav` (`user_id`,`place_id`),
  KEY `idx_fav_user` (`user_id`),
  KEY `fk_fav_place` (`place_id`),
  CONSTRAINT `fk_fav_place` FOREIGN KEY (`place_id`) REFERENCES `famous_places` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: place_reviews
CREATE TABLE IF NOT EXISTS `place_reviews` (
  `id` int NOT NULL AUTO_INCREMENT,
  `place_id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `user_name` varchar(100) NOT NULL,
  `rating` tinyint(1) NOT NULL DEFAULT '5',
  `review_text` text NOT NULL,
  `status` varchar(30) DEFAULT 'Active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_review_place` (`place_id`),
  CONSTRAINT `fk_review_place` FOREIGN KEY (`place_id`) REFERENCES `famous_places` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: service_requests
CREATE TABLE IF NOT EXISTS `service_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `request_code` varchar(50) NOT NULL,
  `user_id` int DEFAULT NULL,
  `citizen_name` varchar(150) DEFAULT NULL,
  `citizen_mobile` varchar(50) DEFAULT NULL,
  `department` varchar(50) NOT NULL,
  `category` varchar(100) NOT NULL,
  `description` text NOT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `priority` enum('LOW','MEDIUM','HIGH','CRITICAL') DEFAULT 'MEDIUM',
  `status` enum('Submitted','Acknowledged','Assigned','In Progress','Resolved','Rejected','Escalated') DEFAULT 'Submitted',
  `assigned_staff_id` int DEFAULT NULL,
  `assigned_staff_name` varchar(150) DEFAULT NULL,
  `sla_deadline` datetime DEFAULT NULL,
  `resolved_at` datetime DEFAULT NULL,
  `resolution_notes` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `waste_type` varchar(80) DEFAULT NULL,
  `assigned_worker_id` int DEFAULT NULL,
  `assigned_worker_name` varchar(150) DEFAULT NULL,
  `assigned_vehicle_id` int DEFAULT NULL,
  `assigned_vehicle_number` varchar(50) DEFAULT NULL,
  `assigned_route_id` int DEFAULT NULL,
  `evidence_image` varchar(255) DEFAULT NULL,
  `internal_remarks` text,
  `collection_date` varchar(50) DEFAULT NULL,
  `collection_time` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `request_code` (`request_code`),
  KEY `idx_req_dept_status` (`department`,`status`),
  KEY `idx_req_assigned` (`assigned_staff_id`,`status`),
  KEY `idx_req_priority` (`priority`),
  KEY `idx_req_sla` (`status`,`sla_deadline`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: street_lights
CREATE TABLE IF NOT EXISTS `street_lights` (
  `id` int NOT NULL AUTO_INCREMENT,
  `light_code` varchar(50) NOT NULL,
  `name` varchar(150) NOT NULL,
  `location` varchar(255) NOT NULL,
  `latitude` decimal(10,7) NOT NULL,
  `longitude` decimal(10,7) NOT NULL,
  `status` enum('ON','OFF','FAULT','UNKNOWN') DEFAULT 'ON',
  `brightness` int DEFAULT '100',
  `fault_type` varchar(100) DEFAULT NULL,
  `department` varchar(50) DEFAULT 'street_lights',
  `last_seen` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `light_code` (`light_code`),
  KEY `idx_light_status` (`status`),
  KEY `idx_light_dept` (`department`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: test_bookings
CREATE TABLE IF NOT EXISTS `test_bookings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `booking_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'ONLINE',
  `hospital_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `test_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `test_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `patient_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `patient_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `patient_mobile` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `patient_age` int DEFAULT NULL,
  `patient_gender` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `doctor_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `doctor_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `booking_date` date NOT NULL,
  `time_slot` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(10,2) DEFAULT '0.00',
  `payment_method` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Cash',
  `payment_status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Pending',
  `collection_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Hospital Lab',
  `home_address` text COLLATE utf8mb4_unicode_ci,
  `collection_staff` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'BOOKED',
  `qr_token` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `booking_id` (`booking_id`),
  KEY `idx_tbook_hosp` (`hospital_id`),
  KEY `idx_tbook_pat` (`patient_id`),
  KEY `idx_tbook_test` (`test_id`),
  KEY `idx_tbook_date` (`booking_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: test_samples
CREATE TABLE IF NOT EXISTS `test_samples` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sample_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `booking_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `hospital_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `test_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `patient_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sample_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `collected_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `collection_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `storage_condition` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'Refrigerated (2-8°C)',
  `status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Sample Collected',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sample_id` (`sample_id`),
  KEY `idx_tsample_book` (`booking_id`),
  KEY `idx_tsample_hosp` (`hospital_id`),
  KEY `idx_tsample_pat` (`patient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: traffic_ai_settings
CREATE TABLE IF NOT EXISTS `traffic_ai_settings` (
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text NOT NULL,
  `category` varchar(50) DEFAULT 'AI_VISION',
  `description` varchar(255) NOT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: traffic_audit_logs
CREATE TABLE IF NOT EXISTS `traffic_audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(50) DEFAULT 'SYSTEM',
  `user_name` varchar(100) NOT NULL,
  `role` varchar(50) NOT NULL,
  `action` varchar(100) NOT NULL,
  `target` varchar(150) NOT NULL,
  `details` text NOT NULL,
  `ip_address` varchar(50) DEFAULT '127.0.0.1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: traffic_cameras
CREATE TABLE IF NOT EXISTS `traffic_cameras` (
  `id` varchar(50) NOT NULL,
  `junction_id` varchar(50) NOT NULL,
  `camera_name` varchar(150) NOT NULL,
  `direction` varchar(50) NOT NULL,
  `stream_url` varchar(255) NOT NULL,
  `resolution` varchar(30) DEFAULT '1080p FHD',
  `fps` int DEFAULT '30',
  `status` varchar(50) DEFAULT 'Configured',
  `is_simulated` tinyint(1) DEFAULT '1',
  `sensor_type` varchar(100) DEFAULT 'AI Optical Vision + Radar Speed',
  `source_type` varchar(50) DEFAULT 'phone_ip',
  `playback_type` varchar(50) DEFAULT 'auto',
  `vehicles_per_min` int DEFAULT '42',
  `avg_speed` decimal(5,2) DEFAULT '32.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `location` varchar(255) DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `department` varchar(50) DEFAULT 'traffic',
  `created_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `junction_id` (`junction_id`),
  CONSTRAINT `traffic_cameras_ibfk_1` FOREIGN KEY (`junction_id`) REFERENCES `traffic_junctions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: traffic_corridors
CREATE TABLE IF NOT EXISTS `traffic_corridors` (
  `id` varchar(50) NOT NULL,
  `name` varchar(150) NOT NULL,
  `origin` varchar(150) NOT NULL,
  `destination` varchar(150) NOT NULL,
  `emergency_type` enum('Ambulance','Fire Engine','Police Convoy','VIP Protocol') DEFAULT 'Ambulance',
  `status` enum('Standby','Active','Completed','Cancelled') DEFAULT 'Standby',
  `junction_sequence` text NOT NULL,
  `estimated_travel_min` int DEFAULT '8',
  `triggered_by` varchar(100) DEFAULT 'Command Center',
  `activated_at` timestamp NULL DEFAULT NULL,
  `cleared_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: traffic_incidents
CREATE TABLE IF NOT EXISTS `traffic_incidents` (
  `id` varchar(50) NOT NULL,
  `citizen_id` int DEFAULT NULL,
  `reporter_name` varchar(100) DEFAULT 'Anonymous Citizen',
  `reporter_phone` varchar(20) DEFAULT NULL,
  `junction_id` varchar(50) DEFAULT NULL,
  `incident_type` enum('Accident','Severe Congestion','Waterlogging','Road Damage / Pothole','Vehicle Breakdown','Traffic Signal Failure','Illegal Parking Obstruction') NOT NULL,
  `location_name` varchar(200) NOT NULL,
  `latitude` decimal(10,7) NOT NULL,
  `longitude` decimal(10,7) NOT NULL,
  `description` text NOT NULL,
  `severity` enum('Low','Moderate','High','Critical') DEFAULT 'Moderate',
  `status` enum('Submitted','Verified','Officer Dispatched','Resolved','Rejected') DEFAULT 'Submitted',
  `photo_url` varchar(255) DEFAULT NULL,
  `assigned_officer` varchar(100) DEFAULT NULL,
  `resolution_notes` text,
  `reported_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: traffic_junctions
CREATE TABLE IF NOT EXISTS `traffic_junctions` (
  `id` varchar(50) NOT NULL,
  `name` varchar(150) NOT NULL,
  `zone` varchar(100) NOT NULL,
  `landmark` varchar(200) NOT NULL,
  `latitude` decimal(10,7) NOT NULL,
  `longitude` decimal(10,7) NOT NULL,
  `status` enum('Operational','Heavy Congestion','Maintenance','Emergency Priority','Offline') DEFAULT 'Operational',
  `mode` enum('AI Adaptive','Fixed Timer','Manual Override','Emergency Corridor') DEFAULT 'AI Adaptive',
  `cycle_time` int DEFAULT '120',
  `active_phase` varchar(50) DEFAULT 'North-South Green',
  `congestion_level` int DEFAULT '35',
  `avg_speed_kmh` decimal(5,2) DEFAULT '28.50',
  `assigned_officer_id` varchar(50) DEFAULT NULL,
  `assigned_officer_name` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: traffic_movement_rules
CREATE TABLE IF NOT EXISTS `traffic_movement_rules` (
  `id` varchar(50) NOT NULL,
  `junction_id` varchar(50) NOT NULL,
  `rule_type` enum('One-Way Restriction','Heavy Vehicle Curfew','Free Left Turn','Reversible Center Lane','Speed Limit Enforced') NOT NULL,
  `title` varchar(150) NOT NULL,
  `description` text NOT NULL,
  `start_time` varchar(10) DEFAULT '08:00',
  `end_time` varchar(10) DEFAULT '20:00',
  `is_active` tinyint(1) DEFAULT '1',
  `penalty_amount` decimal(8,2) DEFAULT '1000.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `junction_id` (`junction_id`),
  CONSTRAINT `traffic_movement_rules_ibfk_1` FOREIGN KEY (`junction_id`) REFERENCES `traffic_junctions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: traffic_signals
CREATE TABLE IF NOT EXISTS `traffic_signals` (
  `id` varchar(50) NOT NULL,
  `junction_id` varchar(50) NOT NULL,
  `approach` enum('North','South','East','West') NOT NULL,
  `street_name` varchar(150) NOT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `signal_type` varchar(50) DEFAULT 'Standard 3-Phase',
  `status` enum('Active','Maintenance','Offline') DEFAULT 'Active',
  `green_time` int DEFAULT '45',
  `yellow_time` int DEFAULT '4',
  `red_time` int DEFAULT '71',
  `current_color` enum('Green','Yellow','Red') DEFAULT 'Red',
  `countdown` int DEFAULT '30',
  `pedestrian_walk` tinyint(1) DEFAULT '0',
  `override_color` enum('None','Force Green','Force Red','Flash Amber') DEFAULT 'None',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `name` varchar(150) DEFAULT NULL,
  `mode` varchar(50) DEFAULT 'AUTO',
  `department` varchar(50) DEFAULT 'traffic',
  PRIMARY KEY (`id`),
  KEY `junction_id` (`junction_id`),
  CONSTRAINT `traffic_signals_ibfk_1` FOREIGN KEY (`junction_id`) REFERENCES `traffic_junctions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: traffic_violations
CREATE TABLE IF NOT EXISTS `traffic_violations` (
  `id` varchar(50) NOT NULL,
  `junction_id` varchar(50) NOT NULL,
  `camera_id` varchar(50) DEFAULT NULL,
  `violation_type` varchar(100) NOT NULL,
  `vehicle_number` varchar(30) DEFAULT 'UP-53-XX-0000',
  `vehicle_type` varchar(50) DEFAULT 'Two-Wheeler',
  `speed_kmh` decimal(5,2) DEFAULT NULL,
  `evidence_image_url` varchar(255) DEFAULT NULL,
  `confidence_score` decimal(4,2) DEFAULT '0.92',
  `status` enum('AI_FLAGGED','UNDER_REVIEW','VERIFIED_CHALLAN_REFERRED','DISMISSED','PAID_SETTLED') DEFAULT 'AI_FLAGGED',
  `reviewed_by` varchar(100) DEFAULT NULL,
  `fine_amount` decimal(8,2) DEFAULT '1000.00',
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `notes` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: waste_bins
CREATE TABLE IF NOT EXISTS `waste_bins` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bin_code` varchar(50) NOT NULL,
  `name` varchar(150) NOT NULL,
  `location` varchar(255) NOT NULL,
  `latitude` decimal(10,7) NOT NULL,
  `longitude` decimal(10,7) NOT NULL,
  `capacity_liters` int DEFAULT '500',
  `bin_type` varchar(60) DEFAULT 'Mixed Waste',
  `fill_level` int DEFAULT '0',
  `status` enum('Empty','Normal','Nearly Full','Full','Overflowing','Under Maintenance','Inactive') DEFAULT 'Normal',
  `collection_schedule` varchar(100) DEFAULT 'Daily 07:00 AM',
  `route_id` int DEFAULT NULL,
  `last_emptied_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `bin_code` (`bin_code`),
  KEY `idx_bin_code` (`bin_code`),
  KEY `idx_bin_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: waste_routes
CREATE TABLE IF NOT EXISTS `waste_routes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `route_code` varchar(50) NOT NULL,
  `route_name` varchar(150) NOT NULL,
  `area` varchar(150) NOT NULL,
  `schedule` varchar(100) DEFAULT 'Daily 06:00 AM - 11:00 AM',
  `assigned_vehicle_id` int DEFAULT NULL,
  `status` enum('Active','Scheduled','In Progress','Completed','Suspended') DEFAULT 'Active',
  `waypoints_json` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `route_code` (`route_code`),
  KEY `idx_route_code` (`route_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: waste_vehicles
CREATE TABLE IF NOT EXISTS `waste_vehicles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `vehicle_number` varchar(50) NOT NULL,
  `vehicle_type` varchar(60) DEFAULT 'Hydraulic Compactor',
  `capacity_tons` decimal(5,2) DEFAULT '5.00',
  `driver_name` varchar(100) NOT NULL,
  `driver_phone` varchar(30) NOT NULL,
  `status` enum('Available','On Route','Maintenance','Inactive') DEFAULT 'Available',
  `current_route_id` int DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT '26.7606000',
  `longitude` decimal(10,7) DEFAULT '83.3732000',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `vehicle_number` (`vehicle_number`),
  KEY `idx_vehicle_num` (`vehicle_number`),
  KEY `idx_vehicle_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: waste_workers
CREATE TABLE IF NOT EXISTS `waste_workers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `worker_code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `phone` varchar(30) NOT NULL,
  `role` varchar(60) DEFAULT 'Sanitation Worker',
  `status` enum('Active','On Duty','On Leave','Inactive') DEFAULT 'Active',
  `assigned_vehicle_id` int DEFAULT NULL,
  `assigned_route_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `worker_code` (`worker_code`),
  KEY `idx_worker_code` (`worker_code`),
  KEY `idx_worker_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: water_pipelines
CREATE TABLE IF NOT EXISTS `water_pipelines` (
  `id` int NOT NULL AUTO_INCREMENT,
  `pipeline_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `zone` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pressure_bar` decimal(4,2) DEFAULT '2.80',
  `flow_rate_lps` decimal(6,2) DEFAULT '45.00',
  `status` enum('Normal','High Pressure','Low Pressure','Leakage Detected','Under Maintenance') COLLATE utf8mb4_unicode_ci DEFAULT 'Normal',
  `last_inspection` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pipeline_code` (`pipeline_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: water_quality_logs
CREATE TABLE IF NOT EXISTS `water_quality_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `zone` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ph` decimal(3,1) DEFAULT '7.2',
  `tds` int DEFAULT '280',
  `turbidity` decimal(4,2) DEFAULT '1.50',
  `chlorine` decimal(4,2) DEFAULT '0.50',
  `status` enum('Safe','Moderate','Unsafe') COLLATE utf8mb4_unicode_ci DEFAULT 'Safe',
  `tested_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'Municipal Jal Board Lab',
  `tested_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: water_supply_schedules
CREATE TABLE IF NOT EXISTS `water_supply_schedules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `zone` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `supply_time` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `duration` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT '2 Hours',
  `pressure` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Normal (2.8 bar)',
  `status` enum('Active','Scheduled','Delayed','Suspended') COLLATE utf8mb4_unicode_ci DEFAULT 'Active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: water_technicians
CREATE TABLE IF NOT EXISTS `water_technicians` (
  `id` int NOT NULL AUTO_INCREMENT,
  `emp_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('Plumber','Pipeline Engineer','Tanker Driver','Pump Operator','Quality Analyst') COLLATE utf8mb4_unicode_ci DEFAULT 'Plumber',
  `zone` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('Available','On Duty','Assigned','On Leave') COLLATE utf8mb4_unicode_ci DEFAULT 'Available',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `emp_code` (`emp_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

