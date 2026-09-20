/**
 * SmartCity Gorakhpur - Healthcare & Hospital Management Upgrade Migration
 * =========================================================================
 * Sets up relational schema for:
 * - hospital_staff (staff affiliation with hospital and specific hospital roles)
 * - diagnostic_categories (Pathology, Radiology, Cardiology, Other)
 * - diagnostic_tests (test catalog with prep, sample, turnaround, price, queue)
 * - test_bookings (online/offline/doctor-ordered bookings with tokens and QR)
 * - test_samples (sample collection, barcodes, lab processing tracking)
 * - diagnostic_reports (report findings, parameters JSON, signatures, QR verification)
 * - hospital_wards & hospital_ward_beds (ward-wise beds inventory and assignment)
 * - hospital_invoices (hospital billing for consultation, tests, beds, medicines)
 * - hospital_notifications (hospital-scoped alerts)
 * 
 * Also adds hospital affiliation columns to `staff` and appointment tracking columns.
 */

const db = require("../config/db");

async function runHospitalUpgradeMigration() {
    console.log("🚀 Starting Hospital Management & Diagnostic Migration...");
    const p = db.promise();

    try {
        // 1. ALTER existing tables safely
        console.log("Checking columns on existing tables...");
        
        // Add hospital_id and hospital_role to staff table if not exists
        const [staffCols] = await p.query("SHOW COLUMNS FROM staff LIKE 'hospital_id'");
        if (!staffCols.length) {
            await p.query("ALTER TABLE staff ADD COLUMN hospital_id VARCHAR(50) DEFAULT NULL AFTER department");
            console.log("  + Added hospital_id to staff table");
        }
        const [staffRoleCols] = await p.query("SHOW COLUMNS FROM staff LIKE 'hospital_role'");
        if (!staffRoleCols.length) {
            await p.query("ALTER TABLE staff ADD COLUMN hospital_role VARCHAR(50) DEFAULT NULL AFTER hospital_id");
            console.log("  + Added hospital_role to staff table");
        }

        // Add token_number and checkin_status to appointments table if not exists
        const [apptTokenCols] = await p.query("SHOW COLUMNS FROM appointments LIKE 'token_number'");
        if (!apptTokenCols.length) {
            await p.query("ALTER TABLE appointments ADD COLUMN token_number VARCHAR(50) DEFAULT NULL AFTER status");
            console.log("  + Added token_number to appointments table");
        }
        const [apptCheckinCols] = await p.query("SHOW COLUMNS FROM appointments LIKE 'checkin_status'");
        if (!apptCheckinCols.length) {
            await p.query("ALTER TABLE appointments ADD COLUMN checkin_status VARCHAR(50) DEFAULT 'Scheduled' AFTER token_number");
            console.log("  + Added checkin_status to appointments table");
        }
        const [apptDeptCols] = await p.query("SHOW COLUMNS FROM appointments LIKE 'department'");
        if (!apptDeptCols.length) {
            await p.query("ALTER TABLE appointments ADD COLUMN department VARCHAR(100) DEFAULT 'General Medicine' AFTER doctor");
            console.log("  + Added department to appointments table");
        }

        // 2. CREATE hospital_staff TABLE
        console.log("Creating hospital_staff table...");
        await p.query(`
            CREATE TABLE IF NOT EXISTS hospital_staff (
                id INT AUTO_INCREMENT PRIMARY KEY,
                hospital_id VARCHAR(50) NOT NULL,
                staff_id VARCHAR(50) NOT NULL,
                user_id INT DEFAULT NULL,
                name VARCHAR(100) NOT NULL,
                role VARCHAR(50) NOT NULL DEFAULT 'hospital_admin',
                department VARCHAR(100) DEFAULT 'General',
                mobile VARCHAR(20) DEFAULT NULL,
                email VARCHAR(100) DEFAULT NULL,
                status VARCHAR(20) DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY idx_hosp_staff_uniq (hospital_id, staff_id),
                INDEX idx_hosp_staff_hosp (hospital_id),
                INDEX idx_hosp_staff_staff (staff_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 3. CREATE diagnostic_categories TABLE
        console.log("Creating diagnostic_categories table...");
        await p.query(`
            CREATE TABLE IF NOT EXISTS diagnostic_categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                category_id VARCHAR(50) NOT NULL UNIQUE,
                hospital_id VARCHAR(50) DEFAULT NULL,
                name VARCHAR(100) NOT NULL,
                code VARCHAR(50) NOT NULL,
                icon VARCHAR(50) DEFAULT '🔬',
                description TEXT DEFAULT NULL,
                status VARCHAR(20) DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_diag_cat_hosp (hospital_id),
                INDEX idx_diag_cat_code (code)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 4. CREATE diagnostic_tests TABLE
        console.log("Creating diagnostic_tests table...");
        await p.query(`
            CREATE TABLE IF NOT EXISTS diagnostic_tests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                test_id VARCHAR(50) NOT NULL UNIQUE,
                hospital_id VARCHAR(50) NOT NULL,
                category_id VARCHAR(50) NOT NULL,
                category_code VARCHAR(50) DEFAULT 'PATHOLOGY',
                name VARCHAR(150) NOT NULL,
                code VARCHAR(50) NOT NULL,
                icon VARCHAR(50) DEFAULT '🧪',
                short_description VARCHAR(255) DEFAULT NULL,
                full_description TEXT DEFAULT NULL,
                purpose TEXT DEFAULT NULL,
                sample_required VARCHAR(100) DEFAULT 'Blood',
                prep_instructions TEXT DEFAULT NULL,
                fasting_required TINYINT(1) DEFAULT 0,
                estimated_report_time VARCHAR(50) DEFAULT '4 to 6 Hours',
                price DECIMAL(10, 2) DEFAULT 0.00,
                online_booking TINYINT(1) DEFAULT 1,
                offline_booking TINYINT(1) DEFAULT 1,
                home_collection TINYINT(1) DEFAULT 1,
                emergency_available TINYINT(1) DEFAULT 1,
                daily_slots INT DEFAULT 50,
                current_token VARCHAR(20) DEFAULT 'A-001',
                now_serving VARCHAR(20) DEFAULT 'A-001',
                estimated_wait_time VARCHAR(50) DEFAULT '20 Mins',
                laboratory_name VARCHAR(150) DEFAULT 'Central Diagnostic Lab',
                department VARCHAR(100) DEFAULT 'Pathology',
                status VARCHAR(20) DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_diag_test_hosp (hospital_id),
                INDEX idx_diag_test_cat (category_id),
                INDEX idx_diag_test_code (code)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 5. CREATE test_bookings TABLE
        console.log("Creating test_bookings table...");
        await p.query(`
            CREATE TABLE IF NOT EXISTS test_bookings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                booking_id VARCHAR(50) NOT NULL UNIQUE,
                booking_type VARCHAR(20) DEFAULT 'ONLINE',
                hospital_id VARCHAR(50) NOT NULL,
                test_id VARCHAR(50) NOT NULL,
                test_name VARCHAR(150) NOT NULL,
                patient_id VARCHAR(50) NOT NULL,
                patient_name VARCHAR(100) NOT NULL,
                patient_mobile VARCHAR(20) DEFAULT NULL,
                patient_age INT DEFAULT NULL,
                patient_gender VARCHAR(20) DEFAULT NULL,
                doctor_id VARCHAR(50) DEFAULT NULL,
                doctor_name VARCHAR(100) DEFAULT NULL,
                booking_date DATE NOT NULL,
                time_slot VARCHAR(50) NOT NULL,
                token_number VARCHAR(50) NOT NULL,
                amount DECIMAL(10, 2) DEFAULT 0.00,
                payment_method VARCHAR(50) DEFAULT 'Cash',
                payment_status VARCHAR(50) DEFAULT 'Pending',
                collection_type VARCHAR(50) DEFAULT 'Hospital Lab',
                home_address TEXT DEFAULT NULL,
                collection_staff VARCHAR(100) DEFAULT NULL,
                status VARCHAR(50) DEFAULT 'BOOKED',
                qr_token VARCHAR(255) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_tbook_hosp (hospital_id),
                INDEX idx_tbook_pat (patient_id),
                INDEX idx_tbook_test (test_id),
                INDEX idx_tbook_date (booking_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 6. CREATE test_samples TABLE
        console.log("Creating test_samples table...");
        await p.query(`
            CREATE TABLE IF NOT EXISTS test_samples (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sample_id VARCHAR(50) NOT NULL UNIQUE,
                booking_id VARCHAR(50) NOT NULL,
                hospital_id VARCHAR(50) NOT NULL,
                test_id VARCHAR(50) NOT NULL,
                patient_id VARCHAR(50) NOT NULL,
                sample_type VARCHAR(50) NOT NULL,
                collected_by VARCHAR(100) DEFAULT NULL,
                collection_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                storage_condition VARCHAR(100) DEFAULT 'Refrigerated (2-8°C)',
                status VARCHAR(50) DEFAULT 'Sample Collected',
                notes TEXT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_tsample_book (booking_id),
                INDEX idx_tsample_hosp (hospital_id),
                INDEX idx_tsample_pat (patient_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 7. CREATE diagnostic_reports TABLE
        console.log("Creating diagnostic_reports table...");
        await p.query(`
            CREATE TABLE IF NOT EXISTS diagnostic_reports (
                id INT AUTO_INCREMENT PRIMARY KEY,
                report_id VARCHAR(50) NOT NULL UNIQUE,
                booking_id VARCHAR(50) NOT NULL,
                hospital_id VARCHAR(50) NOT NULL,
                test_id VARCHAR(50) NOT NULL,
                patient_id VARCHAR(50) NOT NULL,
                doctor_id VARCHAR(50) DEFAULT NULL,
                technician_id VARCHAR(50) DEFAULT NULL,
                technician_name VARCHAR(100) DEFAULT NULL,
                verified_by VARCHAR(100) DEFAULT NULL,
                collection_date DATE DEFAULT NULL,
                report_date DATE DEFAULT NULL,
                test_parameters_json LONGTEXT DEFAULT NULL,
                remarks TEXT DEFAULT NULL,
                qr_token VARCHAR(255) DEFAULT NULL,
                status VARCHAR(50) DEFAULT 'Report Ready',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_drep_hosp (hospital_id),
                INDEX idx_drep_pat (patient_id),
                INDEX idx_drep_book (booking_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 8. CREATE hospital_wards & hospital_ward_beds TABLES
        console.log("Creating hospital_wards & hospital_ward_beds tables...");
        await p.query(`
            CREATE TABLE IF NOT EXISTS hospital_wards (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ward_id VARCHAR(50) NOT NULL UNIQUE,
                hospital_id VARCHAR(50) NOT NULL,
                ward_name VARCHAR(100) NOT NULL,
                ward_type VARCHAR(50) NOT NULL,
                floor VARCHAR(50) DEFAULT '1st Floor',
                total_beds INT DEFAULT 20,
                occupied_beds INT DEFAULT 0,
                charge_per_day DECIMAL(10, 2) DEFAULT 500.00,
                status VARCHAR(20) DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_ward_hosp (hospital_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await p.query(`
            CREATE TABLE IF NOT EXISTS hospital_ward_beds (
                id INT AUTO_INCREMENT PRIMARY KEY,
                bed_id VARCHAR(50) NOT NULL UNIQUE,
                hospital_id VARCHAR(50) NOT NULL,
                ward_id VARCHAR(50) NOT NULL,
                bed_number VARCHAR(50) NOT NULL,
                bed_type VARCHAR(50) DEFAULT 'General',
                status VARCHAR(50) DEFAULT 'Available',
                patient_id VARCHAR(50) DEFAULT NULL,
                patient_name VARCHAR(100) DEFAULT NULL,
                admission_date DATETIME DEFAULT NULL,
                notes TEXT DEFAULT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_wbed_hosp (hospital_id),
                INDEX idx_wbed_ward (ward_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 9. CREATE hospital_invoices TABLE
        console.log("Creating hospital_invoices table...");
        await p.query(`
            CREATE TABLE IF NOT EXISTS hospital_invoices (
                id INT AUTO_INCREMENT PRIMARY KEY,
                invoice_id VARCHAR(50) NOT NULL UNIQUE,
                hospital_id VARCHAR(50) NOT NULL,
                patient_id VARCHAR(50) NOT NULL,
                patient_name VARCHAR(100) NOT NULL,
                service_type VARCHAR(100) NOT NULL,
                service_reference_id VARCHAR(50) DEFAULT NULL,
                total_amount DECIMAL(10, 2) NOT NULL,
                discount DECIMAL(10, 2) DEFAULT 0.00,
                paid_amount DECIMAL(10, 2) NOT NULL,
                payment_method VARCHAR(50) DEFAULT 'Cash',
                payment_status VARCHAR(50) DEFAULT 'Paid',
                billed_by VARCHAR(100) DEFAULT 'Billing Desk',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_hinv_hosp (hospital_id),
                INDEX idx_hinv_pat (patient_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 10. CREATE hospital_notifications TABLE
        console.log("Creating hospital_notifications table...");
        await p.query(`
            CREATE TABLE IF NOT EXISTS hospital_notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                hospital_id VARCHAR(50) NOT NULL,
                recipient_role VARCHAR(50) DEFAULT 'all',
                title VARCHAR(150) NOT NULL,
                message TEXT NOT NULL,
                category VARCHAR(50) DEFAULT 'general',
                is_read TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_hnotif_hosp (hospital_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // ====================================================================
        // SEEDING CORE DATA
        // ====================================================================
        console.log("Seeding Diagnostic Categories...");
        await p.query(`
            INSERT IGNORE INTO diagnostic_categories (category_id, hospital_id, name, code, icon, description) VALUES
            ('CAT-PATH', NULL, 'Pathology & Blood Tests', 'PATHOLOGY', '🩸', 'Comprehensive hematology, biochemistry, hormonal, and urine analysis.'),
            ('CAT-RAD', NULL, 'Radiology & Imaging', 'RADIOLOGY', '🩻', 'Digital X-Rays, 128-Slice CT Scans, 3T MRI, Ultrasound, and Mammography.'),
            ('CAT-CARD', NULL, 'Cardiology Diagnostics', 'CARDIOLOGY', '❤️', 'Cardiovascular testing including 12-lead ECG, 2D Echo, TMT, and Holter.'),
            ('CAT-OTHER', NULL, 'Endoscopy & Advanced Diagnostics', 'OTHER', '🔬', 'Biopsy, Endoscopy, Pulmonary Function Tests, and specialized pathology.');
        `);

        console.log("Seeding Comprehensive Diagnostic Tests...");
        const tests = [
            // Pathology Tests (AIIMS Gorakhpur HOSP-001)
            ['TEST-CBC-001', 'HOSP-001', 'CAT-PATH', 'PATHOLOGY', 'Complete Blood Count (CBC) with ESR', 'CBC', '🩸', 'Measures red blood cells, white blood cells, platelets, and hemoglobin levels.', 'A complete blood count is used to evaluate your overall health and detect a wide variety of disorders including anemia, infection, and leukemia.', 'Assesses overall blood health, immune system status, and detects hematologic conditions.', 'Blood (EDTA 3ml)', 'No special preparation needed. Drink sufficient water before collection.', 0, '2 to 4 Hours', 280.00, 1, 1, 1, 1, 60, 'A-025', 'A-021', '25 Mins', 'AIIMS Central Pathology Lab', 'Pathology'],
            ['TEST-LFT-001', 'HOSP-001', 'CAT-PATH', 'PATHOLOGY', 'Liver Function Test (LFT Profile)', 'LFT', '🧪', 'Evaluates total protein, albumin, bilirubin, AST, ALT, and alkaline phosphatase.', 'Liver function tests measure specific proteins, enzymes, and substances to assess liver inflammation or damage.', 'Checks for liver infections (hepatitis), monitoring medication effects, and gallbladder issues.', 'Blood (Serum 4ml)', 'Overnight fasting of 8 to 10 hours is recommended for accurate enzyme levels.', 1, '4 to 6 Hours', 650.00, 1, 1, 1, 1, 40, 'B-014', 'B-011', '30 Mins', 'AIIMS Clinical Biochemistry Lab', 'Biochemistry'],
            ['TEST-KFT-001', 'HOSP-001', 'CAT-PATH', 'PATHOLOGY', 'Kidney Function Test (KFT / RFT Profile)', 'KFT', '🧬', 'Measures serum creatinine, blood urea nitrogen (BUN), uric acid, and electrolytes.', 'Kidney function tests assess how well your kidneys are filtering wastes and maintaining fluid balance.', 'Screens for renal insufficiency, hydration balance, and metabolic conditions.', 'Blood (Serum 3ml)', 'Overnight fasting of 8 hours recommended. Avoid heavy meat intake 24h prior.', 1, '4 to 6 Hours', 600.00, 1, 1, 1, 1, 40, 'B-018', 'B-015', '20 Mins', 'AIIMS Clinical Biochemistry Lab', 'Biochemistry'],
            ['TEST-BSF-001', 'HOSP-001', 'CAT-PATH', 'PATHOLOGY', 'Blood Sugar Fasting & PPBS', 'FBS', '🩺', 'Checks blood glucose level after 8-10 hours fasting and post-prandial.', 'Essential test for diagnosing diabetes mellitus and monitoring glycemic control.', 'Monitors blood glucose levels and diabetes management.', 'Blood (Fluoride 2ml)', 'Strict 8-10 hours fasting for Fasting sample. Post-prandial 2 hours after meal.', 1, '1 to 2 Hours', 120.00, 1, 1, 1, 1, 80, 'G-040', 'G-038', '10 Mins', 'AIIMS Central Pathology Lab', 'Pathology'],
            ['TEST-LIP-001', 'HOSP-001', 'CAT-PATH', 'PATHOLOGY', 'Lipid Profile (Cholesterol & Triglycerides)', 'LIPID', '🫀', 'Measures Total Cholesterol, HDL, LDL, VLDL, and Triglycerides.', 'Evaluates cardiac risk factors and lipid metabolism status.', 'Cardiovascular risk stratification and monitoring statin therapy.', 'Blood (Serum 3ml)', 'Fasting of 10-12 hours strictly required. Avoid high fat meal night before.', 1, '4 to 6 Hours', 550.00, 1, 1, 1, 1, 45, 'L-012', 'L-009', '30 Mins', 'AIIMS Clinical Biochemistry Lab', 'Biochemistry'],
            ['TEST-THY-001', 'HOSP-001', 'CAT-PATH', 'PATHOLOGY', 'Thyroid Profile Total (T3, T4, TSH)', 'THYROID', '🦋', 'Measures Triiodothyronine, Thyroxine, and Thyroid Stimulating Hormone.', 'Evaluates thyroid gland activity and metabolic hormone production.', 'Diagnoses hypothyroidism, hyperthyroidism, and guides dosage adjustments.', 'Blood (Serum 3ml)', 'Early morning sample preferred. Take thyroid medications after blood draw.', 0, '6 to 8 Hours', 450.00, 1, 1, 1, 1, 50, 'T-008', 'T-006', '20 Mins', 'AIIMS Endocrinology Lab', 'Endocrinology'],
            ['TEST-HBA-001', 'HOSP-001', 'CAT-PATH', 'PATHOLOGY', 'HbA1c (Glycated Hemoglobin)', 'HBA1C', '📊', 'Provides average blood sugar levels over the past 2 to 3 months.', 'Gold standard for long-term glycemic control evaluation in diabetic individuals.', 'Assesses average 90-day glucose control and diagnostic screening.', 'Blood (EDTA 2ml)', 'No fasting required. Can be done anytime of the day.', 0, '2 to 3 Hours', 400.00, 1, 1, 1, 1, 50, 'H-019', 'H-017', '15 Mins', 'AIIMS Central Pathology Lab', 'Pathology'],
            ['TEST-URI-001', 'HOSP-001', 'CAT-PATH', 'PATHOLOGY', 'Urine Routine & Microscopic Examination', 'URINE_R', '🧪', 'Evaluates physical, chemical, and microscopic properties of urine.', 'Detects urinary tract infections (UTI), kidney disorders, and metabolic diseases.', 'Screens for proteinuria, hematuria, glucosuria, and cellular casts.', 'Urine (Mid-stream 20ml)', 'Collect early morning clean-catch midstream urine in sterile container provided.', 0, '2 to 3 Hours', 150.00, 1, 1, 0, 1, 70, 'U-031', 'U-029', '15 Mins', 'AIIMS Central Pathology Lab', 'Pathology'],

            // Radiology Tests (AIIMS Gorakhpur HOSP-001)
            ['TEST-XRY-001', 'HOSP-001', 'CAT-RAD', 'RADIOLOGY', 'Digital X-Ray Chest PA View', 'XRAY_CHEST', '🩻', 'High-resolution digital radiograph of chest cavity, lungs, and cardiac silhouette.', 'Examines lungs, heart, airways, blood vessels, and the bones of spine and chest.', 'Screens for pneumonia, bronchitis, cardiomegaly, fractures, and pleural effusion.', 'None (Imaging)', 'Remove all metal objects, necklaces, and jewelry before examination.', 0, '1 to 2 Hours', 300.00, 1, 1, 0, 1, 50, 'X-018', 'X-015', '20 Mins', 'AIIMS Digital Radiology Wing', 'Radiology'],
            ['TEST-CT-001', 'HOSP-001', 'CAT-RAD', 'RADIOLOGY', '128-Slice CT Scan Brain / Head', 'CT_BRAIN', '🧠', 'Cross-sectional multi-slice computed tomography of brain parenchyma and skull bones.', 'Fast diagnostic imaging for stroke, trauma, brain hemorrhage, and neurological deficits.', 'Emergency stroke triage, trauma assessment, headache etiology, and tumors.', 'None (Imaging)', '4 hours fasting required if IV contrast is prescribed. Inform regarding kidney disease.', 0, '2 to 4 Hours', 1800.00, 1, 1, 0, 1, 25, 'C-009', 'C-007', '40 Mins', 'AIIMS Advanced Imaging Center', 'Radiology'],
            ['TEST-USG-001', 'HOSP-001', 'CAT-RAD', 'RADIOLOGY', 'Ultrasound Whole Abdomen & Pelvis', 'USG_ABD', '📡', 'Non-invasive high-frequency sound wave sonography of internal abdominal organs.', 'Assesses liver, gallbladder, pancreas, spleen, kidneys, urinary bladder, and pelvic organs.', 'Diagnoses gallstones, kidney stones, fatty liver, cysts, and appendicitis.', 'None (Imaging)', 'Overnight fasting of 6 hours; drink 1 liter water 1 hour prior to keep bladder full.', 1, '2 to 3 Hours', 900.00, 1, 1, 0, 0, 30, 'S-014', 'S-011', '35 Mins', 'AIIMS Ultrasound Diagnostic Suite', 'Radiology'],
            ['TEST-MRI-001', 'HOSP-001', 'CAT-RAD', 'RADIOLOGY', '3T MRI Lumbar Spine / Brain', 'MRI_SPINE', '🧲', 'State-of-the-art 3.0 Tesla magnetic resonance imaging with superior soft tissue detail.', 'Evaluates disc herniation, nerve impingement, spinal stenosis, and bone marrow.', 'Investigates sciatica, radiculopathy, spinal trauma, and spinal canal pathology.', 'None (Imaging)', 'Remove all metal items. Inform staff if you have pacemakers, stents, or cochlear implants.', 0, '4 to 6 Hours', 3500.00, 1, 1, 0, 0, 15, 'M-005', 'M-003', '50 Mins', 'AIIMS Advanced MRI Center', 'Radiology'],

            // Cardiology Tests (AIIMS Gorakhpur HOSP-001)
            ['TEST-ECG-001', 'HOSP-001', 'CAT-CARD', 'CARDIOLOGY', '12-Lead Electrocardiogram (ECG)', 'ECG_12L', '📈', 'Records electrical activity of the heart to detect rhythm disturbances and ischemia.', 'Quick baseline cardiac test for chest pain, palpitations, and pre-operative assessment.', 'Diagnoses myocardial infarction, arrhythmias, conduction blocks, and hypertrophy.', 'None (Electrodes)', 'Wear comfortable two-piece clothing. Avoid oily skin creams on chest.', 0, '30 Mins', 150.00, 1, 1, 1, 1, 100, 'E-042', 'E-039', '10 Mins', 'AIIMS Cardiac Diagnostic Wing', 'Cardiology'],
            ['TEST-ECHO-001', 'HOSP-001', 'CAT-CARD', 'CARDIOLOGY', '2D Echocardiography with Color Doppler', '2D_ECHO', '❤️', 'Ultrasound examination of heart chambers, valves, wall motion, and ejection fraction.', 'Visualizes moving heart structures and calculates functional cardiac performance.', 'Evaluates valvular stenosis, regurgitation, cardiomyopathy, and heart failure.', 'None (Ultrasound)', 'No fasting required. Bring previous ECG and prescription records.', 0, '2 to 3 Hours', 1200.00, 1, 1, 0, 1, 25, 'D-008', 'D-006', '35 Mins', 'AIIMS Cardiology Lab', 'Cardiology'],

            // Tests for BRD Medical College (HOSP-002)
            ['TEST-CBC-002', 'HOSP-002', 'CAT-PATH', 'PATHOLOGY', 'Complete Blood Count (CBC)', 'CBC_BRD', '🩸', 'Essential routine hemogram including Hb, TLC, DLC, Platelets.', 'Standard diagnostic workup for hospital admissions and outpatients.', 'Detects anemia, leukocytosis, thrombocytopenia, and viral fevers.', 'Blood (EDTA 2.5ml)', 'No special prep required.', 0, '3 to 5 Hours', 150.00, 1, 1, 1, 1, 80, 'A-045', 'A-040', '30 Mins', 'BRD Central Diagnostic Lab', 'Pathology'],
            ['TEST-XRY-002', 'HOSP-002', 'CAT-RAD', 'RADIOLOGY', 'Digital X-Ray Chest', 'XRAY_BRD', '🩻', 'Digital radiograph of lungs and thorax.', 'Evaluates pulmonary disease and trauma.', 'Infection, fracture, and cardiomegaly screening.', 'None (Imaging)', 'Remove chest jewelry.', 0, '2 Hours', 150.00, 1, 1, 0, 1, 70, 'X-030', 'X-026', '25 Mins', 'BRD Radiology Wing', 'Radiology'],
            ['TEST-ECG-002', 'HOSP-002', 'CAT-CARD', 'CARDIOLOGY', '12-Lead ECG', 'ECG_BRD', '📈', 'Emergency and OPD cardiac electrical recording.', 'Immediate assessment of cardiac rhythm.', 'Arrhythmia, angina, and infarction detection.', 'None (Electrodes)', 'Rest for 5 minutes prior to recording.', 0, '20 Mins', 80.00, 1, 1, 1, 1, 90, 'E-055', 'E-051', '15 Mins', 'BRD Emergency Cardiology', 'Cardiology']
        ];

        for (const t of tests) {
            await p.query(`
                INSERT INTO diagnostic_tests
                (test_id, hospital_id, category_id, category_code, name, code, icon, short_description, full_description, purpose, sample_required, prep_instructions, fasting_required, estimated_report_time, price, online_booking, offline_booking, home_collection, emergency_available, daily_slots, current_token, now_serving, estimated_wait_time, laboratory_name, department)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    price = VALUES(price),
                    name = VALUES(name),
                    estimated_report_time = VALUES(estimated_report_time),
                    now_serving = VALUES(now_serving),
                    current_token = VALUES(current_token);
            `, t);
        }

        // 11. SEED HOSPITAL WARDS & BEDS
        console.log("Seeding Hospital Wards & Beds for HOSP-001 and HOSP-002...");
        await p.query(`
            INSERT IGNORE INTO hospital_wards (ward_id, hospital_id, ward_name, ward_type, floor, total_beds, occupied_beds, charge_per_day) VALUES
            ('WARD-ICU-01', 'HOSP-001', 'Cardiac & Neuro ICU', 'ICU', '3rd Floor - Block A', 30, 24, 3500.00),
            ('WARD-EMG-01', 'HOSP-001', 'Trauma Emergency Ward', 'Emergency', 'Ground Floor - Trauma Block', 40, 28, 1200.00),
            ('WARD-GEN-01', 'HOSP-001', 'Male General Ward', 'General', '2nd Floor - Block B', 80, 52, 350.00),
            ('WARD-GEN-02', 'HOSP-001', 'Female General Ward', 'General', '2nd Floor - Block C', 80, 48, 350.00),
            ('WARD-PVT-01', 'HOSP-001', 'Executive Private Suites', 'Private', '4th Floor - Tower 1', 25, 16, 2800.00),
            ('WARD-BRD-ICU', 'HOSP-002', 'BRD Critical Care ICU', 'ICU', '2nd Floor - Main Campus', 50, 42, 1000.00),
            ('WARD-BRD-GEN', 'HOSP-002', 'BRD General Ward', 'General', '1st Floor - Block A', 150, 115, 100.00);
        `);

        // Seed some sample ward beds
        const beds = [
            ['BED-ICU-101', 'HOSP-001', 'WARD-ICU-01', 'ICU-101', 'ICU', 'Occupied', 'PAT-5931984821', 'Omkar Yadav', '2026-09-18 10:30:00', 'Cardiac telemetry active'],
            ['BED-ICU-102', 'HOSP-001', 'WARD-ICU-01', 'ICU-102', 'ICU', 'Available', null, null, null, 'Cleaned & sanitized'],
            ['BED-ICU-103', 'HOSP-001', 'WARD-ICU-01', 'ICU-103', 'ICU', 'Reserved', null, null, null, 'Reserved for post-op'],
            ['BED-EMG-201', 'HOSP-001', 'WARD-EMG-01', 'EMG-201', 'Emergency', 'Occupied', 'PAT-1002348', 'Ramesh Kumar', '2026-09-20 02:15:00', 'Accident intake'],
            ['BED-EMG-202', 'HOSP-001', 'WARD-EMG-01', 'EMG-202', 'Emergency', 'Available', null, null, null, 'Oxygen supply verified'],
            ['BED-GEN-301', 'HOSP-001', 'WARD-GEN-01', 'GEN-301', 'General', 'Available', null, null, null, 'Ready for admission'],
            ['BED-GEN-302', 'HOSP-001', 'WARD-GEN-01', 'GEN-302', 'General', 'Occupied', 'PAT-1009941', 'Sunita Devi', '2026-09-19 14:00:00', 'Dengue recovery']
        ];

        for (const b of beds) {
            await p.query(`
                INSERT INTO hospital_ward_beds (bed_id, hospital_id, ward_id, bed_number, bed_type, status, patient_id, patient_name, admission_date, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE status = VALUES(status), patient_id = VALUES(patient_id), patient_name = VALUES(patient_name);
            `, b);
        }

        // 12. SEED HOSPITAL STAFF ACCOUNTS & ROLES
        console.log("Seeding Hospital Staff Affiliations...");
        
        // Link existing STAFF-MED-01 to HOSP-001 as Receptionist
        await p.query(`
            UPDATE staff SET hospital_id = 'HOSP-001', hospital_role = 'receptionist' WHERE staff_id = 'STAFF-MED-01';
        `);

        // Insert / update specialized hospital staff for demo testing
        const hospitalStaffSeeds = [
            // AIIMS Gorakhpur Staff (HOSP-001)
            ['STAFF-HOSP-ADMIN', 'Dr. Alok Verma (Director)', 'admin123', 'Administration', 'staff', 'HOSP-001', 'hospital_admin', 'director@aiims.edu'],
            ['STAFF-HOSP-REC', 'Rohan Mehrotra', 'staff123', 'Reception & Billing', 'staff', 'HOSP-001', 'receptionist', 'rohan.reception@aiims.edu'],
            ['STAFF-HOSP-LAB', 'Sunil Sharma (Senior Tech)', 'staff123', 'Pathology Lab', 'staff', 'HOSP-001', 'lab_technician', 'sunil.lab@aiims.edu'],
            ['STAFF-HOSP-RAD', 'Pooja Gupta', 'staff123', 'Radiology Dept', 'staff', 'HOSP-001', 'radiologist', 'pooja.rad@aiims.edu'],
            ['STAFF-HOSP-NUR', 'Sister Mary Varghese', 'staff123', 'Nursing & Wards', 'staff', 'HOSP-001', 'nurse', 'mary.nursing@aiims.edu'],
            ['STAFF-HOSP-BILL', 'Kavita Singh', 'staff123', 'Accounts & Cashier', 'staff', 'HOSP-001', 'billing', 'kavita.billing@aiims.edu'],
            ['STAFF-HOSP-PHARM', 'Deepak Verma', 'staff123', 'Pharmacy Desk', 'staff', 'HOSP-001', 'pharmacy', 'deepak.pharmacy@aiims.edu'],
            ['STAFF-HOSP-AMB', 'Vikram Singh', 'staff123', 'Ambulance Dispatch', 'staff', 'HOSP-001', 'ambulance', 'vikram.ambulance@aiims.edu'],

            // BRD Medical College Staff (HOSP-002)
            ['STAFF-BRD-ADMIN', 'Dr. S.K. Srivastava', 'admin123', 'Administration', 'staff', 'HOSP-002', 'hospital_admin', 'principal@brdmc.ac.in'],
            ['STAFF-BRD-REC', 'Manoj Shukla', 'staff123', 'OPD Counter', 'staff', 'HOSP-002', 'receptionist', 'manoj.brd@gmail.com'],
            ['STAFF-BRD-LAB', 'Dinesh Chandra', 'staff123', 'Pathology', 'staff', 'HOSP-002', 'lab_technician', 'dinesh.lab@brdmc.ac.in']
        ];

        for (const s of hospitalStaffSeeds) {
            await p.query(`
                INSERT INTO staff (staff_id, name, password, department, role, hospital_id, hospital_role, email)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    hospital_id = VALUES(hospital_id),
                    hospital_role = VALUES(hospital_role);
            `, s);

            // Also mirror in hospital_staff table
            await p.query(`
                INSERT INTO hospital_staff (hospital_id, staff_id, name, role, department, email)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE role = VALUES(role), department = VALUES(department);
            `, [s[5], s[0], s[1], s[6], s[3], s[7]]);
        }

        // 13. SEED INITIAL TEST BOOKINGS & LIVE QUEUE
        console.log("Seeding Test Bookings & Samples...");
        const sampleBookings = [
            ['TB-2026-0101', 'ONLINE', 'HOSP-001', 'TEST-CBC-001', 'Complete Blood Count (CBC) with ESR', 'PAT-5931984821', 'Omkar Yadav', '9876543210', 22, 'Male', 'DOC-101', 'Dr. Anand Verma', '2026-09-20', '09:30 AM', 'A-021', 280.00, 'UPI', 'Paid', 'Hospital Lab', null, null, 'SAMPLE COLLECTED', 'QR-TB-0101'],
            ['TB-2026-0102', 'OFFLINE', 'HOSP-001', 'TEST-LFT-001', 'Liver Function Test (LFT Profile)', 'PAT-1002348', 'Ramesh Kumar', '9415011002', 45, 'Male', 'DOC-101', 'Dr. Anand Verma', '2026-09-20', '10:00 AM', 'B-011', 650.00, 'Cash', 'Paid', 'Hospital Lab', null, null, 'PROCESSING', 'QR-TB-0102'],
            ['TB-2026-0103', 'ONLINE', 'HOSP-001', 'TEST-ECG-001', '12-Lead Electrocardiogram (ECG)', 'PAT-5931984821', 'Omkar Yadav', '9876543210', 22, 'Male', 'DOC-101', 'Dr. Anand Verma', '2026-09-20', '11:00 AM', 'E-039', 150.00, 'UPI', 'Paid', 'Hospital Lab', null, null, 'REPORT READY', 'QR-TB-0103'],
            ['TB-2026-0104', 'ONLINE', 'HOSP-001', 'TEST-CBC-001', 'Complete Blood Count (CBC) with ESR', 'PAT-1009941', 'Sunita Devi', '9415011004', 38, 'Female', null, null, '2026-09-20', '11:30 AM', 'A-022', 280.00, 'Cash', 'Pending', 'Home Sample Collection', 'Flat 402, Gorakhnath Enclave, Gorakhpur', 'Ramesh Kumar (Phlebotomist)', 'BOOKED', 'QR-TB-0104']
        ];

        for (const sb of sampleBookings) {
            await p.query(`
                INSERT INTO test_bookings
                (booking_id, booking_type, hospital_id, test_id, test_name, patient_id, patient_name, patient_mobile, patient_age, patient_gender, doctor_id, doctor_name, booking_date, time_slot, token_number, amount, payment_method, payment_status, collection_type, home_address, collection_staff, status, qr_token)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE status = VALUES(status), payment_status = VALUES(payment_status);
            `, sb);
        }

        // Seed Sample Collection record
        await p.query(`
            INSERT INTO test_samples
            (sample_id, booking_id, hospital_id, test_id, patient_id, sample_type, collected_by, storage_condition, status, notes)
            VALUES
            ('SMP-2026-001', 'TB-2026-0101', 'HOSP-001', 'TEST-CBC-001', 'PAT-5931984821', 'Blood', 'Sunil Sharma (Tech)', 'Refrigerated 4°C', 'Sample Collected', '3ml EDTA whole blood, barcoded'),
            ('SMP-2026-002', 'TB-2026-0102', 'HOSP-001', 'TEST-LFT-001', 'PAT-1002348', 'Blood', 'Sunil Sharma (Tech)', 'Serum Separated', 'Processing', 'Centrifuged at 3000 RPM')
            ON DUPLICATE KEY UPDATE status = VALUES(status);
        `);

        // Seed Diagnostic Report for ECG
        const ecgParams = JSON.stringify([
            { parameter: "Heart Rate", result: "76", unit: "bpm", normal_range: "60 - 100", flag: "Normal" },
            { parameter: "PR Interval", result: "152", unit: "ms", normal_range: "120 - 200", flag: "Normal" },
            { parameter: "QRS Duration", result: "88", unit: "ms", normal_range: "80 - 120", flag: "Normal" },
            { parameter: "QT / QTc", result: "390 / 425", unit: "ms", normal_range: "350 - 450", flag: "Normal" },
            { parameter: "P Axis", result: "54", unit: "deg", normal_range: "0 - 75", flag: "Normal" },
            { parameter: "Rhythm", result: "Normal Sinus Rhythm", unit: "clinical", normal_range: "Sinus", flag: "Normal" }
        ]);

        await p.query(`
            INSERT INTO diagnostic_reports
            (report_id, booking_id, hospital_id, test_id, patient_id, doctor_id, technician_id, technician_name, verified_by, collection_date, report_date, test_parameters_json, remarks, qr_token, status)
            VALUES
            ('RPT-2026-001', 'TB-2026-0103', 'HOSP-001', 'TEST-ECG-001', 'PAT-5931984821', 'DOC-101', 'STAFF-HOSP-LAB', 'Sunil Sharma', 'Dr. Anand Verma, MD DM (Cardiology)', '2026-09-20', '2026-09-20', ?, 'Normal standard 12-lead ECG tracing. No acute ST-T wave changes, no ischemia noted.', 'VERIFY-RPT-2026-001', 'Report Ready')
            ON DUPLICATE KEY UPDATE remarks = VALUES(remarks), status = VALUES(status);
        `, [ecgParams]);

        // Seed sample hospital invoice
        await p.query(`
            INSERT INTO hospital_invoices
            (invoice_id, hospital_id, patient_id, patient_name, service_type, service_reference_id, total_amount, discount, paid_amount, payment_method, payment_status, billed_by)
            VALUES
            ('INV-2026-001', 'HOSP-001', 'PAT-5931984821', 'Omkar Yadav', 'Diagnostic Test', 'TB-2026-0103', 150.00, 0.00, 150.00, 'UPI', 'Paid', 'Kavita Singh (Cashier)'),
            ('INV-2026-002', 'HOSP-001', 'PAT-1002348', 'Ramesh Kumar', 'Consultation & Diagnostics', 'TB-2026-0102', 650.00, 50.00, 600.00, 'Cash', 'Paid', 'Rohan Mehrotra')
            ON DUPLICATE KEY UPDATE paid_amount = VALUES(paid_amount);
        `);

        // Seed initial notifications
        await p.query(`
            INSERT IGNORE INTO hospital_notifications (hospital_id, recipient_role, title, message, category) VALUES
            ('HOSP-001', 'all', 'New Test Booking', 'Patient Omkar Yadav booked CBC with ESR for Today.', 'test_booking'),
            ('HOSP-001', 'doctor', 'New Appointment Scheduled', 'Token #14 scheduled with Dr. Anand Verma at 11:30 AM.', 'appointment'),
            ('HOSP-001', 'lab', 'Sample Ready for Processing', 'Specimen #SMP-2026-002 (LFT) received in Biochemistry Lab.', 'sample'),
            ('HOSP-001', 'nurse', 'Bed Assigned in Trauma ICU', 'Bed ICU-101 assigned to Omkar Yadav.', 'bed');
        `);

        console.log("✅ Hospital Management & Diagnostic Migration executed successfully!");
        return { success: true };
    } catch (err) {
        console.error("❌ Migration error:", err);
        throw err;
    }
}

if (require.main === module) {
    runHospitalUpgradeMigration().then(() => {
        process.exit(0);
    }).catch(err => {
        console.error("Migration failed:", err);
        process.exit(1);
    });
}

module.exports = runHospitalUpgradeMigration;
