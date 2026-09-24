-- ====================================================================
-- SMART CITY AI - GORAKHPUR SEED DATA
-- Target Database: MySQL 8.0+
-- ====================================================================

USE `smartcity`;

-- 1. SEED HOSPITALS
INSERT IGNORE INTO `hospitals` 
(`hospital_id`, `hospital_name`, `address`, `phone`, `emergency_number`, `email`, `website`, `hospital_type`, `total_beds`, `icu_beds`, `emergency_beds`, `status`, `latitude`, `longitude`) 
VALUES
('HOSP-001', 'AIIMS Gorakhpur', 'Kushmi Forest, Gorakhpur, UP 273008', '0551-2207777', '102', 'contact@aiimsgorakhpur.edu.in', 'https://aiimsgorakhpur.edu.in', 'Autonomous Institute', 750, 120, 50, 'Operational', 26.7329000, 83.4475000),
('HOSP-002', 'BRD Medical College', 'Medical Road, Gorakhpur, UP 273013', '0551-2310150', '108', 'info@brdmc.ac.in', 'https://brdmc.ac.in', 'Government', 900, 150, 80, 'Operational', 26.7884000, 83.3986000),
('HOSP-003', 'Gorakhpur District Hospital (Sadar)', 'Golghar, Gorakhpur, UP 273001', '0551-2334455', '102', 'sadar.hospital.gkp@gov.in', 'https://gorakhpur.nic.in', 'Government', 300, 40, 30, 'Operational', 26.7588000, 83.3731000),
('HOSP-004', 'Fatima Hospital', 'Padri Bazar, Gorakhpur, UP 273014', '0551-2282215', '0551-2282216', 'helpdesk@fatimahospital.org', 'https://fatimahospital.org', 'Private', 350, 60, 25, 'Operational', 26.7820000, 83.3850000);

-- 2. SEED HOSPITAL BED CATEGORIES
INSERT IGNORE INTO `hospital_bed_categories` (`hospital_id`, `category`, `total_beds`, `occupied_beds`) VALUES
('HOSP-001', 'General Ward', 400, 250),
('HOSP-001', 'ICU', 120, 95),
('HOSP-001', 'Emergency Trauma', 50, 32),
('HOSP-001', 'Pediatric ICU', 40, 20),
('HOSP-001', 'Maternity Ward', 80, 50),
('HOSP-001', 'Private Suite', 60, 40),
('HOSP-002', 'General Ward', 550, 420),
('HOSP-002', 'ICU', 150, 130),
('HOSP-002', 'Emergency Trauma', 80, 65),
('HOSP-003', 'General Ward', 200, 140),
('HOSP-003', 'ICU', 40, 28),
('HOSP-004', 'General Ward', 200, 110),
('HOSP-004', 'ICU', 60, 42);

-- 3. SEED HOSPITAL DEPARTMENTS
INSERT IGNORE INTO `hospital_departments` (`hospital_id`, `department_name`, `approx_fee`) VALUES
('HOSP-001', 'Cardiology', 500.00),
('HOSP-001', 'Neurology', 600.00),
('HOSP-001', 'Orthopedics', 400.00),
('HOSP-001', 'General Medicine', 250.00),
('HOSP-001', 'Pediatrics', 300.00),
('HOSP-002', 'Trauma & Emergency', 100.00),
('HOSP-002', 'General Surgery', 150.00),
('HOSP-002', 'Pulmonology', 150.00),
('HOSP-003', 'General OPD', 50.00),
('HOSP-004', 'Obstetrics & Gynecology', 500.00);

-- 4. SEED DOCTORS
INSERT IGNORE INTO `doctors`
(`doctor_id`, `hospital_id`, `name`, `specialization`, `department`, `qualification`, `experience`, `mobile`, `email`, `password`, `consultation_fee`, `status`) 
VALUES
('DOC-101', 'HOSP-001', 'Dr. Anand Verma', 'Cardiologist', 'Cardiology', 'MBBS, MD, DM (Cardio)', '14 Years', '9876543210', 'anand.verma@aiims.edu', 'scrypt$e3759811a711fb812bf0e404774e48ff$45c04c70cc27e4c37cf01d3796e64d9f71508014411fbfbd3008df13f71fa04f7150841bf2ef42830a7358ade507e86c15d92e85cc90715f778433c9da1db4c6', 500.00, 'Active'),
('DOC-102', 'HOSP-001', 'Dr. Priya Singh', 'Neurologist', 'Neurology', 'MBBS, MD, DM (Neuro)', '11 Years', '9876543211', 'priya.singh@aiims.edu', 'scrypt$e3759811a711fb812bf0e404774e48ff$45c04c70cc27e4c37cf01d3796e64d9f71508014411fbfbd3008df13f71fa04f7150841bf2ef42830a7358ade507e86c15d92e85cc90715f778433c9da1db4c6', 600.00, 'Active'),
('DOC-103', 'HOSP-001', 'Dr. Rajesh Mishra', 'Orthopedic Surgeon', 'Orthopedics', 'MBBS, MS (Ortho)', '16 Years', '9876543212', 'rajesh.mishra@aiims.edu', 'scrypt$e3759811a711fb812bf0e404774e48ff$45c04c70cc27e4c37cf01d3796e64d9f71508014411fbfbd3008df13f71fa04f7150841bf2ef42830a7358ade507e86c15d92e85cc90715f778433c9da1db4c6', 400.00, 'Active'),
('DOC-104', 'HOSP-002', 'Dr. Sanjay Gupta', 'General Physician', 'General Medicine', 'MBBS, MD (Medicine)', '18 Years', '9876543213', 'sanjay.gupta@brdmc.ac.in', 'scrypt$e3759811a711fb812bf0e404774e48ff$45c04c70cc27e4c37cf01d3796e64d9f71508014411fbfbd3008df13f71fa04f7150841bf2ef42830a7358ade507e86c15d92e85cc90715f778433c9da1db4c6', 250.00, 'Active'),
('DOC-105', 'HOSP-002', 'Dr. Shalini Tripathi', 'Pediatrician', 'Pediatrics', 'MBBS, DCH, MD', '9 Years', '9876543214', 'shalini.tripathi@brdmc.ac.in', 'scrypt$e3759811a711fb812bf0e404774e48ff$45c04c70cc27e4c37cf01d3796e64d9f71508014411fbfbd3008df13f71fa04f7150841bf2ef42830a7358ade507e86c15d92e85cc90715f778433c9da1db4c6', 200.00, 'Active'),
('DOC-106', 'HOSP-004', 'Dr. Vikramaditya Rao', 'General Surgeon', 'General Surgery', 'MBBS, MS (Gen Surgery)', '12 Years', '9876543215', 'vikram.rao@fatimahospital.org', 'scrypt$e3759811a711fb812bf0e404774e48ff$45c04c70cc27e4c37cf01d3796e64d9f71508014411fbfbd3008df13f71fa04f7150841bf2ef42830a7358ade507e86c15d92e85cc90715f778433c9da1db4c6', 450.00, 'Active');

-- 5. SEED DOCTOR SLOTS (Current & Upcoming dates)
INSERT IGNORE INTO `doctor_slots`
(`id`, `doctor_id`, `slot_date`, `start_time`, `end_time`, `max_patients`, `booked_patients`, `status`)
VALUES
(1, 'DOC-101', CURDATE(), '09:00:00', '11:00:00', 10, 2, 'Available'),
(2, 'DOC-101', CURDATE(), '11:30:00', '13:30:00', 10, 1, 'Available'),
(3, 'DOC-102', CURDATE(), '10:00:00', '12:00:00', 8, 3, 'Available'),
(4, 'DOC-103', CURDATE(), '14:00:00', '17:00:00', 12, 0, 'Available'),
(5, 'DOC-104', CURDATE(), '09:00:00', '12:00:00', 15, 5, 'Available'),
(6, 'DOC-105', CURDATE(), '10:00:00', '13:00:00', 10, 2, 'Available');

-- 6. SEED AMBULANCES
INSERT IGNORE INTO `ambulances`
(`ambulance_id`, `vehicle_number`, `driver_name`, `driver_mobile`, `ambulance_type`, `hospital_name`, `location`, `status`, `latitude`, `longitude`)
VALUES
('AMB-GKP-01', 'UP 53 AG 1101', 'Ramesh Yadav', '9415011001', 'Advanced Cardiac Life Support (ACLS)', 'AIIMS Gorakhpur', 'Golghar Police Station Point', 'Available', 26.7588000, 83.3731000),
('AMB-GKP-02', 'UP 53 AG 1102', 'Santosh Kumar', '9415011002', 'Basic Life Support (BLS)', 'BRD Medical College', 'Medical College Gate No 1', 'Available', 26.7884000, 83.3986000),
('AMB-GKP-03', 'UP 53 AG 1103', 'Mohd. Imran', '9415011003', 'Patient Transport Vehicle (PTV)', 'District Hospital', 'Gorakhpur Railway Station Point', 'Available', 26.7540000, 83.3850000),
('AMB-GKP-04', 'UP 53 AG 1104', 'Amit Tiwari', '9415011004', 'Neonatal Ambulance', 'AIIMS Gorakhpur', 'Mohaddipur Crossing', 'Available', 26.7490000, 83.3950000),
('AMB-GKP-05', 'UP 53 AG 1105', 'Dinesh Prajapati', '9415011005', 'Basic Life Support (BLS)', 'Fatima Hospital', 'Asuran Chauraha', 'Available', 26.7720000, 83.3780000);

-- 7. SEED EMERGENCY DEPARTMENTS
INSERT IGNORE INTO `emergency_departments`
(`hospital_name`, `emergency_number`, `emergency_type`, `available_doctors`, `available_beds`, `ambulances_available`, `status`, `location`)
VALUES
('AIIMS Gorakhpur Trauma Center', '0551-2207799', 'Level 1 Trauma & Cardiac Emergency', 8, 45, 6, 'Active', 'Kushmi Forest Campus'),
('BRD Medical Trauma Center', '108', 'Level 1 Trauma & Infectious Emergency', 12, 60, 8, 'Active', 'Medical Road Campus'),
('District Hospital Emergency Ward', '102', '24x7 General Emergency', 4, 25, 4, 'Active', 'Golghar Town Hall Road');

-- 8. SEED PHARMACY MEDICINES
INSERT IGNORE INTO `pharmacy`
(`medicine_name`, `category`, `quantity`, `price`, `availability`)
VALUES
('Paracetamol 650mg (Dolo 650)', 'Antipyretic', 500, 32.50, 'In Stock'),
('Amoxicillin & Potassium Clavulanate 625mg', 'Antibiotic', 250, 180.00, 'In Stock'),
('Azithromycin 500mg', 'Antibiotic', 300, 115.00, 'In Stock'),
('Pantoprazole 40mg', 'Antacid', 400, 85.00, 'In Stock'),
('Cetirizine 10mg', 'Antiallergic', 600, 28.00, 'In Stock'),
('Metformin 500mg', 'Antidiabetic', 450, 45.00, 'In Stock'),
('Amlodipine 5mg', 'Antihypertensive', 350, 55.00, 'In Stock'),
('ORS Oral Rehydration Salt Sachet', 'Electrolyte', 800, 22.00, 'In Stock'),
('Vitamin C + Zinc Chewable Tablets', 'Immunity Supplement', 400, 65.00, 'In Stock'),
('Betadine Ointment 20g', 'Antiseptic', 180, 72.00, 'In Stock')
ON DUPLICATE KEY UPDATE 
    `quantity` = VALUES(`quantity`),
    `price` = VALUES(`price`),
    `availability` = VALUES(`availability`);

-- 9. SEED DEMO CITIZEN & STAFF (Plain-text passwords will auto-upgrade to scrypt hashes on first login)
INSERT IGNORE INTO `users` (`name`, `mobile`, `email`, `password`)
VALUES ('Demo Citizen', '9876543210', 'citizen@smartcity.gorakhpur.in', 'citizen123');

INSERT IGNORE INTO `staff` (`name`, `staff_id`, `password`, `department`)
VALUES ('Admin Staff', 'STAFF-001', 'admin123', 'admin'),
       ('Hospital Desk Staff', 'STAFF-MED-01', 'staff123', 'hospital');

-- ====================================================================
-- PHASE 3 SEED DATA
-- ====================================================================

-- 10. SEED PARKING LOTS (Gorakhpur City) — uses live DB schema columns
INSERT IGNORE INTO `parking_lots`
(`parking_code`, `name`, `address`, `area`, `total_slots`, `available_slots`, `occupied_slots`, `hourly_rate`, `status`, `latitude`, `longitude`, `vehicle_types`, `cctv_available`, `security_available`, `source_type`, `active`)
VALUES
('PARK-001', 'Railway Station Parking',             'Gorakhpur Junction, Platform 1 Gate',               'Railway Area',  80, 34, 46, 20.00, 'OPEN', 26.7652, 83.3701, 'CAR,BIKE', 1, 1, 'DEMO', 1),
('PARK-002', 'Golghar Parking Complex',              'Golghar Chowk, Civil Lines',                        'Civil Lines',   60, 22, 38, 15.00, 'OPEN', 26.7559, 83.3705, 'CAR,BIKE', 1, 0, 'DEMO', 1),
('PARK-003', 'Medical College Parking',              'BRD Medical College Campus, Medical Road',           'Medical Area',  50,  8, 42, 10.00, 'OPEN', 26.7884, 83.3986, 'CAR,BIKE', 0, 1, 'DEMO', 1),
('PARK-004', 'Ramgarh Taal Parking',                'Ramgarh Taal Lake View Road',                       'Ramgarh Taal', 40, 31,  9, 10.00, 'OPEN', 26.7503, 83.3881, 'CAR,BIKE', 0, 0, 'DEMO', 1),
('PARK-005', 'Deen Dayal Upadhyay Chowk Parking',   'DDU Chowk, Gorakhpur City Centre',                  'City Centre',   35,  0, 35, 20.00, 'FULL', 26.7548, 83.3732, 'CAR,BIKE', 1, 1, 'DEMO', 1),
('PARK-006', 'AIIMS Campus Parking',                'AIIMS Gorakhpur, Kushmi Forest',                    'AIIMS Area',   100, 55, 45, 10.00, 'OPEN', 26.7329, 83.4475, 'CAR,BIKE', 1, 1, 'DEMO', 1);

-- 11. SEED WATER TANKS
INSERT IGNORE INTO `water_tanks`
(`tank_id`, `name`, `zone`, `capacity_liters`, `current_level_percent`, `status`, `next_supply_time`)
VALUES
('TANK-001', 'Tank Alpha — University Zone', 'Gorakhpur University Area', 100000, 78, 'Operational', '06:00 AM – 09:00 AM'),
('TANK-002', 'Tank Beta — Golghar Zone', 'Civil Lines & Golghar', 80000,  54, 'Operational', '06:30 AM – 09:30 AM'),
('TANK-003', 'Tank Gamma — Railway Colony', 'Railway Colony & Rustampur', 120000, 31, 'Maintenance', '04:00 PM – 07:00 PM'),
('TANK-004', 'Tank Delta — Medical Road', 'Medical Road & Basharatpur', 90000,  62, 'Operational', '07:00 AM – 10:00 AM'),
('TANK-005', 'Tank Epsilon — Sahjanwa Zone', 'Sahjanwa & Pipraich Road', 70000,  88, 'Operational', '05:30 AM – 08:30 AM');

-- 12. SEED POLICE STATIONS (Gorakhpur District)
INSERT IGNORE INTO `police_stations`
(`station_id`, `name`, `sho_name`, `phone`, `jurisdiction`, `location`, `latitude`, `longitude`)
VALUES
('PS-001', 'Kotwali Police Station',         'Inspector R.K. Sharma',     '0551-2201100', 'Gorakhpur City Centre, Golghar, Civil Lines', 'Kotwali Road, Gorakhpur',          26.7600, 83.3710),
('PS-002', 'Civil Lines Police Station',     'Inspector A.K. Singh',      '0551-2338400', 'Civil Lines, Padri Bazar, Kunraghat', 'Civil Lines, Gorakhpur',              26.7620, 83.3770),
('PS-003', 'Cantt Police Station',           'Inspector M.P. Verma',      '0551-2340200', 'Cantonment Area, Rapti Nagar, Mohaddipur', 'Cantonment Road, Gorakhpur',      26.7530, 83.3650),
('PS-004', 'Sahjanwa Police Station',        'Inspector S.K. Yadav',      '0551-2782300', 'Sahjanwa, Pipraich, Rural East Gorakhpur', 'Sahjanwa Town, Gorakhpur',        26.7252, 83.4322),
('PS-005', 'Gorakhpur Junction Police Post', 'Inspector D. Tripathi',     '0551-2201999', 'Railway Station Area, Buxipur, Tikonia', 'Gorakhpur Junction, Platform Side', 26.7652, 83.3701),
('PS-006', 'Medical College Outpost',        'Inspector N. Pandey',       '0551-2310100', 'BRD Medical, Rampur Bagh, Shyamnagar', 'Medical College Road, Gorakhpur',   26.7884, 83.3986),
('PS-007', 'Gola Bazar Police Station',      'Inspector V.K. Gupta',      '0551-2450900', 'Gola Bazar, Mohaddipur, Rustampur', 'Gola Bazar, Gorakhpur',               26.7710, 83.3520),
('PS-008', 'AIIMS Campus Security Post',     'Inspector P. Srivastava',   '0551-2207700', 'AIIMS Campus, Kushmi Forest, NH-29', 'AIIMS Gorakhpur, Kushmi Forest',      26.7329, 83.4475);

-- 13. SEED POLICE MONTHLY STATS (Demo Data — Last 6 months)
INSERT IGNORE INTO `police_stats`
(`month_year`, `theft`, `assault`, `traffic_violations`, `domestic`, `cybercrime`, `other`)
VALUES
('Apr 2026', 28, 12, 45, 8, 6, 15),
('May 2026', 31, 15, 52, 10, 9, 18),
('Jun 2026', 24, 11, 61, 7, 12, 14),
('Jul 2026', 35, 18, 58, 11, 14, 20),
('Aug 2026', 29, 13, 66, 9, 11, 17),
('Sep 2026', 22, 10, 49, 6, 8, 13);

-- 14. SEED SAMPLE WATER REPORTS
INSERT IGNORE INTO `water_reports`
(`report_id`, `citizen_name`, `mobile`, `issue_type`, `location`, `description`, `status`)
VALUES
('WR-001', 'Ramesh Sharma',   '9876512340', 'No Supply',     'Railway Colony, Ward 12',       'Water supply has been absent for 3 days in our area.', 'Under Review'),
('WR-002', 'Sunita Devi',     '9988776655', 'Low Pressure',  'Civil Lines, Sector 4',         'Pressure is very low, water not reaching second floor.', 'Open'),
('WR-003', 'Mohd. Aslam',     '8765432198', 'Pipe Leak',     'Gola Bazar Main Road',          'Main pipeline is leaking near Shiv Temple crossing.', 'Resolved');

