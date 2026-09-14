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
