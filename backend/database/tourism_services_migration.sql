-- ====================================================================
-- SMART CITY AI - GORAKHPUR: HOSPITALS, ATMS & RESTAURANTS MIGRATION
-- Adds 8+ hospitals, city_atms, and city_restaurants tables & seed data
-- ====================================================================

USE `smartcity`;

-- 1. EXPAND HOSPITALS DIRECTORY (Insert prominent Gorakhpur hospitals)
INSERT INTO `hospitals` 
(`hospital_id`, `hospital_name`, `address`, `phone`, `emergency_number`, `email`, `website`, `hospital_type`, `total_beds`, `icu_beds`, `emergency_beds`, `status`, `latitude`, `longitude`)
VALUES
('HOSP-GKP-010', 'Guru Shri Gorakshnath Hospital', 'Gorakhnath Mandir Complex, Gorakhnath Road, Gorakhpur', '0551-2255455', '0551-2255456', 'info@gorakshnathhospital.org', 'https://gorakshnathhospital.org', 'Charitable / Super Speciality', 350, 45, 30, 'Operational', 26.7915000, 83.3562000),
('HOSP-GKP-011', 'City Hospital & Trauma Centre', 'Near Bank Road, Golghar, Gorakhpur', '0551-2334455', '0551-2334456', 'care@cityhospitalgkp.com', 'https://cityhospitalgkp.com', 'Private Multi-Speciality', 120, 20, 15, 'Operational', 26.7628000, 83.3705000),
('HOSP-GKP-012', 'Heritage Hospital', 'Mohaddipur Four Lane, Gorakhpur', '0551-2201122', '0551-2201123', 'contact@heritagegkp.com', 'https://heritagegkp.com', 'Super Speciality', 180, 28, 20, 'Operational', 26.7532000, 83.3985000),
('HOSP-GKP-013', 'Rana Hospital & Laparoscopy Centre', 'Medical College Road, Basharatpur, Gorakhpur', '0551-2283399', '0551-2283390', 'ranahospital@gmail.com', 'https://ranahospitalgkp.com', 'Private Surgical', 90, 15, 10, 'Operational', 26.7865000, 83.3892000),
('HOSP-GKP-014', 'Shahi Global Hospital', 'Asuran Chowk, Medical Road, Gorakhpur', '0551-2205566', '0551-2205567', 'shahiglobal@gmail.com', 'https://shahiglobalhospital.com', 'Multi-Speciality & Cardiac', 150, 25, 18, 'Operational', 26.7842000, 83.3812000),
('HOSP-GKP-015', 'Lifeline Hospital & Heart Centre', 'Near Air Force Station, Kunraghat, Gorakhpur', '0551-2271188', '0551-2271189', 'lifelinegkp@gmail.com', 'https://lifelinehospitalgkp.com', 'Cardiac & Critical Care', 110, 22, 14, 'Operational', 26.7445000, 83.4285000),
('HOSP-GKP-016', 'Pulse Hospital & Advanced Critical Care', 'Taramandal Road, Near Ramgarh Taal, Gorakhpur', '0551-2234001', '0551-2234002', 'pulsehospital@gmail.com', 'https://pulsehospitalgkp.com', 'Critical Care & Trauma', 130, 24, 16, 'Operational', 26.7385000, 83.4112000),
('HOSP-GKP-017', 'Anandeshwar Hospital', 'Padri Bazar Road, Jungle Dhusan, Gorakhpur', '0551-2290077', '0551-2290078', 'anandeshwar@gmail.com', 'https://anandeshwarhospital.com', 'General & Maternity', 85, 12, 10, 'Operational', 26.7795000, 83.4082000)
ON DUPLICATE KEY UPDATE 
 `hospital_name` = VALUES(`hospital_name`),
 `address` = VALUES(`address`),
 `phone` = VALUES(`phone`),
 `emergency_number` = VALUES(`emergency_number`),
 `status` = VALUES(`status`),
 `latitude` = VALUES(`latitude`),
 `longitude` = VALUES(`longitude`);

-- 2. VERIFIED ATMS TABLE
CREATE TABLE IF NOT EXISTS `city_atms` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL,
    `bank_name` VARCHAR(100) NOT NULL,
    `address` VARCHAR(255) NOT NULL,
    `locality` VARCHAR(100) DEFAULT 'Gorakhpur',
    `latitude` DECIMAL(10, 7) NOT NULL,
    `longitude` DECIMAL(10, 7) NOT NULL,
    `is_24_7` TINYINT(1) DEFAULT 1,
    `has_cash` TINYINT(1) DEFAULT 1,
    `status` VARCHAR(50) DEFAULT 'Operational',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_atm_loc` (`locality`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed verified ATMs near tourist destinations
INSERT INTO `city_atms` (`name`, `bank_name`, `address`, `locality`, `latitude`, `longitude`, `is_24_7`, `has_cash`, `status`)
VALUES
('State Bank of India ATM - Ramgarh Taal', 'State Bank of India', 'Near Nauka Vihar Gate, Ramgarh Taal Road, Gorakhpur', 'Taramandal', 26.7419000, 83.4182000, 1, 1, 'Operational'),
('HDFC Bank ATM - Taramandal', 'HDFC Bank', 'Opposite Planetarium, Taramandal Road, Gorakhpur', 'Taramandal', 26.7372000, 83.4151000, 1, 1, 'Operational'),
('Punjab National Bank ATM - Gorakhnath', 'Punjab National Bank', 'Near Main Temple Gate, Gorakhnath Road, Gorakhpur', 'Gorakhnath', 26.7892000, 83.3560000, 1, 1, 'Operational'),
('Bank of Baroda ATM - Gorakhnath', 'Bank of Baroda', 'Opposite Police Chauki, Gorakhnath, Gorakhpur', 'Gorakhnath', 26.7885000, 83.3575000, 1, 1, 'Operational'),
('State Bank of India ATM - Golghar', 'State Bank of India', 'Main Crossing, Golghar, Gorakhpur', 'Golghar', 26.7645000, 83.3698000, 1, 1, 'Operational'),
('ICICI Bank 24x7 ATM - Golghar', 'ICICI Bank', 'Near Bal Vihar, Golghar, Gorakhpur', 'Golghar', 26.7629000, 83.3725000, 1, 1, 'Operational'),
('Canara Bank ATM - Railway Station', 'Canara Bank', 'Platform 1 Exit, Gorakhpur Junction, Gorakhpur', 'Railway Area', 26.7591000, 83.3742000, 1, 1, 'Operational'),
('State Bank of India ATM - Kunraghat', 'State Bank of India', 'Near AIIMS Campus, Kunraghat, Gorakhpur', 'Kunraghat', 26.7452000, 83.4241000, 1, 1, 'Operational'),
('Axis Bank ATM - Asuran', 'Axis Bank', 'Medical College Road, Asuran Chowk, Gorakhpur', 'Asuran', 26.7831000, 83.3789000, 1, 1, 'Operational'),
('Central Bank of India ATM - Gita Press', 'Central Bank of India', 'Gita Press Road, Lal Diggi, Gorakhpur', 'Lal Diggi', 26.7638000, 83.3592000, 1, 1, 'Operational')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 3. VERIFIED RESTAURANTS & FOOD OUTLETS TABLE
CREATE TABLE IF NOT EXISTS `city_restaurants` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL,
    `cuisine` VARCHAR(150) NOT NULL,
    `address` VARCHAR(255) NOT NULL,
    `locality` VARCHAR(100) DEFAULT 'Gorakhpur',
    `latitude` DECIMAL(10, 7) NOT NULL,
    `longitude` DECIMAL(10, 7) NOT NULL,
    `rating` DECIMAL(2, 1) DEFAULT 4.3,
    `opening_hours` VARCHAR(100) DEFAULT '10:00 AM - 11:00 PM',
    `avg_cost` VARCHAR(50) DEFAULT '₹300 for two',
    `image_url` VARCHAR(500) DEFAULT NULL,
    `status` VARCHAR(50) DEFAULT 'Open',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_rest_loc` (`locality`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed verified restaurants and eateries around tourist attractions
INSERT INTO `city_restaurants` (`name`, `cuisine`, `address`, `locality`, `latitude`, `longitude`, `rating`, `opening_hours`, `avg_cost`, `image_url`, `status`)
VALUES
('Lake View Waterfront Café & Restaurant', 'North Indian, Continental & Beverages', 'Nauka Vihar Promenade, Ramgarh Taal, Gorakhpur', 'Taramandal', 26.7435000, 83.4188000, 4.6, '11:00 AM - 11:00 PM', '₹500 for two', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80', 'Open'),
('Nautanki Gali Street Food & Dine', 'Multi-Cuisine, Street Delicacies & Chaat', 'Near Buddha Museum, Taramandal Road, Gorakhpur', 'Taramandal', 26.7368000, 83.4158000, 4.5, '12:00 PM - 11:00 PM', '₹400 for two', 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80', 'Open'),
('Sagar Ratna Vegetarian Restaurant', 'South Indian, North Indian & Thalis', 'Park Road, Golghar, Gorakhpur', 'Golghar', 26.7641000, 83.3702000, 4.4, '10:30 AM - 10:30 PM', '₹450 for two', 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80', 'Open'),
('Bobis Restaurant & Bakery', 'North Indian, Mughlai & Bakery Delights', 'Cinema Road, Golghar, Gorakhpur', 'Golghar', 26.7618000, 83.3685000, 4.3, '10:00 AM - 11:00 PM', '₹500 for two', 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=600&q=80', 'Open'),
('Royal Durbar Heritage Restaurant', 'Awadhi, Mughlai & Tandoor', 'Medical College Road, Mohaddipur, Gorakhpur', 'Mohaddipur', 26.7542000, 83.3968000, 4.5, '12:00 PM - 11:00 PM', '₹600 for two', 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=600&q=80', 'Open'),
('Choudhary Sweet House & Pure Veg', 'Traditional Eastern UP Sweets, Kachori & Thali', 'Near Gorakhpur Junction, Station Road, Gorakhpur', 'Railway Area', 26.7589000, 83.3751000, 4.4, '07:00 AM - 10:30 PM', '₹250 for two', 'https://images.unsplash.com/photo-1505253716362-afaea1d3d1fa?auto=format&fit=crop&w=600&q=80', 'Open'),
('Gorakhnath Pure Veg Bhojanalaya', 'Traditional Sattvic Indian & Thalis', 'Temple Outer Gate, Gorakhnath, Gorakhpur', 'Gorakhnath', 26.7898000, 83.3568000, 4.5, '08:00 AM - 10:00 PM', '₹200 for two', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80', 'Open'),
('Cinnamon Fine Dining & Lounge', 'Pan-Asian, Indian & Continental', 'Asuran Medical Road, Gorakhpur', 'Asuran', 26.7848000, 83.3825000, 4.4, '12:00 PM - 11:00 PM', '₹700 for two', 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=600&q=80', 'Open')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
