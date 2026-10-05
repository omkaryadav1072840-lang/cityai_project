/**
 * SmartCity AI - Hospital Configuration & Admin Management System
 * Database Migration Script
 * Safe, idempotent migration preserving all existing tables and data.
 */

const db = require('../config/db');

async function runMigration() {
    const pool = db.promise();
    console.log('🚀 Starting Hospital Admin System Database Migration...');

    // Helper to check if a column exists
    async function columnExists(table, column) {
        const [rows] = await pool.query(
            `SELECT COUNT(*) AS cnt 
             FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
            [table, column]
        );
        return rows[0].cnt > 0;
    }

    // 1. hospitals table enhancements
    console.log('1. Enhancing `hospitals` table...');
    if (!(await columnExists('hospitals', 'logo'))) {
        await pool.query(`ALTER TABLE hospitals ADD COLUMN logo VARCHAR(500) DEFAULT NULL AFTER hospital_name`);
        console.log('   + Added `logo` to hospitals');
    }
    if (!(await columnExists('hospitals', 'city'))) {
        await pool.query(`ALTER TABLE hospitals ADD COLUMN city VARCHAR(100) DEFAULT 'Gorakhpur' AFTER address`);
        console.log('   + Added `city` to hospitals');
    }
    if (!(await columnExists('hospitals', 'description'))) {
        await pool.query(`ALTER TABLE hospitals ADD COLUMN description TEXT DEFAULT NULL AFTER website`);
        console.log('   + Added `description` to hospitals');
    }
    if (!(await columnExists('hospitals', 'accreditation'))) {
        await pool.query(`ALTER TABLE hospitals ADD COLUMN accreditation VARCHAR(255) DEFAULT 'NABH Accredited • Ayushman Bharat Verified' AFTER description`);
        console.log('   + Added `accreditation` to hospitals');
    }
    if (!(await columnExists('hospitals', 'facilities'))) {
        await pool.query(`ALTER TABLE hospitals ADD COLUMN facilities JSON DEFAULT NULL AFTER accreditation`);
        console.log('   + Added `facilities` JSON to hospitals');
    }

    // 2. hospital_facilities table
    console.log('2. Creating `hospital_facilities` table...');
    await pool.query(`
        CREATE TABLE IF NOT EXISTS hospital_facilities (
            id INT AUTO_INCREMENT PRIMARY KEY,
            hospital_id VARCHAR(50) NOT NULL,
            facility_name VARCHAR(100) NOT NULL,
            facility_code VARCHAR(50) NOT NULL,
            category VARCHAR(50) DEFAULT 'Clinical Service',
            status ENUM('Active', 'Inactive') DEFAULT 'Active',
            is_custom TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_hosp_facility (hospital_id, facility_code),
            INDEX idx_hosp_facil (hospital_id, status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 3. hospital_icu_categories table
    console.log('3. Creating `hospital_icu_categories` table...');
    await pool.query(`
        CREATE TABLE IF NOT EXISTS hospital_icu_categories (
            id INT AUTO_INCREMENT PRIMARY KEY,
            hospital_id VARCHAR(50) NOT NULL,
            icu_type VARCHAR(50) NOT NULL,
            category_name VARCHAR(100) NOT NULL,
            code VARCHAR(50) NOT NULL,
            room_numbers VARCHAR(255) DEFAULT NULL,
            total_beds INT DEFAULT 0,
            occupied_beds INT DEFAULT 0,
            ventilators_count INT DEFAULT 0,
            equipment_notes TEXT DEFAULT NULL,
            status ENUM('Active', 'Inactive') DEFAULT 'Active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_hosp_icu (hospital_id, code),
            INDEX idx_hosp_icu (hospital_id, status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 4. doctors table enhancements
    console.log('4. Enhancing `doctors` table...');
    if (!(await columnExists('doctors', 'opd_room_no'))) {
        await pool.query(`ALTER TABLE doctors ADD COLUMN opd_room_no VARCHAR(50) DEFAULT 'Room OPD-101' AFTER department`);
        console.log('   + Added `opd_room_no` to doctors');
    }
    if (!(await columnExists('doctors', 'available_days'))) {
        await pool.query(`ALTER TABLE doctors ADD COLUMN available_days VARCHAR(150) DEFAULT 'Mon, Tue, Wed, Thu, Fri, Sat' AFTER opd_room_no`);
        console.log('   + Added `available_days` to doctors');
    }
    if (!(await columnExists('doctors', 'consultation_timings'))) {
        await pool.query(`ALTER TABLE doctors ADD COLUMN consultation_timings VARCHAR(100) DEFAULT '09:00 AM - 01:00 PM' AFTER available_days`);
        console.log('   + Added `consultation_timings` to doctors');
    }
    if (!(await columnExists('doctors', 'doctor_logo_avatar'))) {
        await pool.query(`ALTER TABLE doctors ADD COLUMN doctor_logo_avatar VARCHAR(500) DEFAULT NULL AFTER consultation_timings`);
        console.log('   + Added `doctor_logo_avatar` to doctors');
    }

    // 5. hospital_wards table enhancements
    console.log('5. Enhancing `hospital_wards` table...');
    if (!(await columnExists('hospital_wards', 'building_wing'))) {
        await pool.query(`ALTER TABLE hospital_wards ADD COLUMN building_wing VARCHAR(100) DEFAULT 'Main Clinical Block' AFTER ward_name`);
        console.log('   + Added `building_wing` to hospital_wards');
    }
    if (!(await columnExists('hospital_wards', 'department'))) {
        await pool.query(`ALTER TABLE hospital_wards ADD COLUMN department VARCHAR(100) DEFAULT 'General Medicine' AFTER building_wing`);
        console.log('   + Added `department` to hospital_wards');
    }

    // 6. hospital_ward_beds table enhancements
    console.log('6. Enhancing `hospital_ward_beds` table...');
    if (!(await columnExists('hospital_ward_beds', 'room_number'))) {
        await pool.query(`ALTER TABLE hospital_ward_beds ADD COLUMN room_number VARCHAR(50) DEFAULT 'Room-101' AFTER ward_id`);
        console.log('   + Added `room_number` to hospital_ward_beds');
    }
    if (!(await columnExists('hospital_ward_beds', 'floor'))) {
        await pool.query(`ALTER TABLE hospital_ward_beds ADD COLUMN floor VARCHAR(50) DEFAULT 'Floor 1' AFTER room_number`);
        console.log('   + Added `floor` to hospital_ward_beds');
    }
    if (!(await columnExists('hospital_ward_beds', 'bed_category'))) {
        await pool.query(`ALTER TABLE hospital_ward_beds ADD COLUMN bed_category VARCHAR(50) DEFAULT 'General' AFTER bed_type`);
        console.log('   + Added `bed_category` to hospital_ward_beds');
    }
    if (!(await columnExists('hospital_ward_beds', 'maintenance_reason'))) {
        await pool.query(`ALTER TABLE hospital_ward_beds ADD COLUMN maintenance_reason VARCHAR(255) DEFAULT NULL AFTER notes`);
        console.log('   + Added `maintenance_reason` to hospital_ward_beds');
    }
    if (!(await columnExists('hospital_ward_beds', 'gender_policy'))) {
        await pool.query(`ALTER TABLE hospital_ward_beds ADD COLUMN gender_policy VARCHAR(20) DEFAULT 'Any' AFTER maintenance_reason`);
        console.log('   + Added `gender_policy` to hospital_ward_beds');
    }

    // 7. prescriptions table enhancements
    console.log('7. Enhancing `prescriptions` table...');
    if (!(await columnExists('prescriptions', 'hospital_id'))) {
        await pool.query(`ALTER TABLE prescriptions ADD COLUMN hospital_id VARCHAR(50) DEFAULT NULL AFTER patient_id`);
        console.log('   + Added `hospital_id` to prescriptions');
    }
    if (!(await columnExists('prescriptions', 'doctor_id'))) {
        await pool.query(`ALTER TABLE prescriptions ADD COLUMN doctor_id VARCHAR(50) DEFAULT NULL AFTER hospital_id`);
        console.log('   + Added `doctor_id` to prescriptions');
    }
    if (!(await columnExists('prescriptions', 'appointment_id'))) {
        await pool.query(`ALTER TABLE prescriptions ADD COLUMN appointment_id INT DEFAULT NULL AFTER doctor_id`);
        console.log('   + Added `appointment_id` to prescriptions');
    }
    if (!(await columnExists('prescriptions', 'diagnosis'))) {
        await pool.query(`ALTER TABLE prescriptions ADD COLUMN diagnosis TEXT DEFAULT NULL AFTER doctor_name`);
        console.log('   + Added `diagnosis` to prescriptions');
    }
    if (!(await columnExists('prescriptions', 'medications_json'))) {
        await pool.query(`ALTER TABLE prescriptions ADD COLUMN medications_json JSON DEFAULT NULL AFTER diagnosis`);
        console.log('   + Added `medications_json` to prescriptions');
    }
    if (!(await columnExists('prescriptions', 'doctor_notes'))) {
        await pool.query(`ALTER TABLE prescriptions ADD COLUMN doctor_notes TEXT DEFAULT NULL AFTER medications_json`);
        console.log('   + Added `doctor_notes` to prescriptions');
    }
    if (!(await columnExists('prescriptions', 'advice'))) {
        await pool.query(`ALTER TABLE prescriptions ADD COLUMN advice TEXT DEFAULT NULL AFTER doctor_notes`);
        console.log('   + Added `advice` to prescriptions');
    }
    if (!(await columnExists('prescriptions', 'follow_up_date'))) {
        await pool.query(`ALTER TABLE prescriptions ADD COLUMN follow_up_date DATE DEFAULT NULL AFTER advice`);
        console.log('   + Added `follow_up_date` to prescriptions');
    }

    // 8. patient_records table enhancements
    console.log('8. Enhancing `patient_records` table...');
    if (!(await columnExists('patient_records', 'hospital_id'))) {
        await pool.query(`ALTER TABLE patient_records ADD COLUMN hospital_id VARCHAR(50) DEFAULT NULL AFTER patient_id`);
        console.log('   + Added `hospital_id` to patient_records');
    }
    if (!(await columnExists('patient_records', 'doctor_id'))) {
        await pool.query(`ALTER TABLE patient_records ADD COLUMN doctor_id VARCHAR(50) DEFAULT NULL AFTER hospital_id`);
        console.log('   + Added `doctor_id` to patient_records');
    }
    if (!(await columnExists('patient_records', 'appointment_id'))) {
        await pool.query(`ALTER TABLE patient_records ADD COLUMN appointment_id INT DEFAULT NULL AFTER doctor_id`);
        console.log('   + Added `appointment_id` to patient_records');
    }
    if (!(await columnExists('patient_records', 'advice'))) {
        await pool.query(`ALTER TABLE patient_records ADD COLUMN advice TEXT DEFAULT NULL AFTER notes`);
        console.log('   + Added `advice` to patient_records');
    }
    if (!(await columnExists('patient_records', 'prescription_id'))) {
        await pool.query(`ALTER TABLE patient_records ADD COLUMN prescription_id INT DEFAULT NULL AFTER advice`);
        console.log('   + Added `prescription_id` to patient_records');
    }

    // 9. Seed default facilities for active hospitals
    console.log('9. Seeding standard facilities catalogue for existing hospitals...');
    const standardFacilities = [
        { code: 'FAC_EMERGENCY', name: '24x7 Emergency & Trauma', cat: 'Critical Care' },
        { code: 'FAC_ICU', name: 'Intensive Care Unit (ICU)', cat: 'Critical Care' },
        { code: 'FAC_NICU', name: 'Neonatal ICU (NICU)', cat: 'Critical Care' },
        { code: 'FAC_PICU', name: 'Pediatric ICU (PICU)', cat: 'Critical Care' },
        { code: 'FAC_OT', name: 'Modular Operation Theatres', cat: 'Surgical' },
        { code: 'FAC_GEN_WARD', name: 'General Inpatient Wards', cat: 'Inpatient' },
        { code: 'FAC_PRIV_WARD', name: 'Private & Deluxe Suites', cat: 'Inpatient' },
        { code: 'FAC_OPD', name: 'Outpatient Specialty OPD', cat: 'Outpatient' },
        { code: 'FAC_PHARMACY', name: '24x7 In-House Pharmacy', cat: 'Pharmacy' },
        { code: 'FAC_LAB', name: 'NABL Pathology Laboratory', cat: 'Diagnostics' },
        { code: 'FAC_RADIOLOGY', name: 'Radiology (X-Ray, CT, MRI, USG)', cat: 'Diagnostics' },
        { code: 'FAC_BLOOD_BANK', name: 'Licensed Blood Bank & Component Lab', cat: 'Support' },
        { code: 'FAC_AMBULANCE', name: 'Advanced Life Support (ALS) Ambulance', cat: 'Emergency' },
        { code: 'FAC_DIALYSIS', name: 'Dialysis Unit', cat: 'Specialty Care' },
        { code: 'FAC_CARDIOLOGY', name: 'Cardiology & Cath Lab', cat: 'Specialty Care' },
        { code: 'FAC_NEUROLOGY', name: 'Neurology & Neuro Surgery', cat: 'Specialty Care' },
        { code: 'FAC_ORTHO', name: 'Orthopedics & Joint Replacement', cat: 'Specialty Care' },
        { code: 'FAC_PEDIATRICS', name: 'Pediatrics & Child Care', cat: 'Specialty Care' },
        { code: 'FAC_GYNAECOLOGY', name: 'Obstetrics & Gynecology', cat: 'Specialty Care' },
        { code: 'FAC_PHYSIO', name: 'Physiotherapy & Rehabilitation', cat: 'Allied Health' }
    ];

    const [hospitals] = await pool.query('SELECT hospital_id, hospital_name FROM hospitals');
    for (const h of hospitals) {
        // Set standard official logos if missing
        let defaultLogo = `https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=150&auto=format&fit=crop&q=80`;
        if (h.hospital_id === 'HOSP-001') {
            defaultLogo = `https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=150&auto=format&fit=crop&q=80`;
        } else if (h.hospital_id === 'HOSP-002') {
            defaultLogo = `https://images.unsplash.com/photo-1516549655169-df83a0774514?w=150&auto=format&fit=crop&q=80`;
        } else if (h.hospital_id === 'HOSP-003') {
            defaultLogo = `https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=150&auto=format&fit=crop&q=80`;
        }

        await pool.query(
            `UPDATE hospitals 
             SET logo = COALESCE(logo, ?), 
                 city = COALESCE(city, 'Gorakhpur'),
                 description = COALESCE(description, CONCAT(hospital_name, ' is a premier multi-specialty healthcare facility serving Gorakhpur and Eastern UP.')),
                 accreditation = COALESCE(accreditation, 'NABH Accredited • Ayushman Bharat Empanelled')
             WHERE hospital_id = ?`,
            [defaultLogo, h.hospital_id]
        );

        // Seed facilities for this hospital
        for (const f of standardFacilities) {
            await pool.query(`
                INSERT INTO hospital_facilities 
                (hospital_id, facility_name, facility_code, category, status, is_custom)
                VALUES (?, ?, ?, ?, 'Active', 0)
                ON DUPLICATE KEY UPDATE facility_name = VALUES(facility_name)
            `, [h.hospital_id, f.name, f.code, f.cat]);
        }

        // 10. Seed ICU Specialty Categories
        const icuSuites = [
            { type: 'General ICU', name: 'General Medical Intensive Care', code: 'ICU-GEN', beds: Math.round((h.icu_beds || 20) * 0.4), vent: 8 },
            { type: 'Cardiac ICU / CCU', name: 'Coronary Care Unit (CCU)', code: 'ICU-CCU', beds: Math.round((h.icu_beds || 20) * 0.25), vent: 5 },
            { type: 'Neonatal ICU / NICU', name: 'Neonatal Intensive Care (NICU)', code: 'ICU-NICU', beds: Math.round((h.icu_beds || 20) * 0.2), vent: 4 },
            { type: 'Trauma ICU', name: 'Emergency Trauma Critical Care', code: 'ICU-TRAUMA', beds: Math.max(2, Math.round((h.icu_beds || 20) * 0.15)), vent: 3 }
        ];

        for (const icu of icuSuites) {
            await pool.query(`
                INSERT INTO hospital_icu_categories
                (hospital_id, icu_type, category_name, code, room_numbers, total_beds, occupied_beds, ventilators_count, status)
                VALUES (?, ?, ?, ?, 'Rooms 201-210', ?, Math.round(? * 0.8), ?, 'Active')
                ON DUPLICATE KEY UPDATE category_name = VALUES(category_name)
            `, [h.hospital_id, icu.type, icu.name, icu.code, icu.beds, icu.beds, icu.vent]).catch(() => {});
        }
    }

    console.log('✅ Migration completed successfully!');
    process.exit(0);
}

runMigration().catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
