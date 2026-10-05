const db = require('../config/db');

async function migrateCompleteBedSystem() {
    console.log("==========================================================");
    console.log("MIGRATION: COMPLETE PHYSICAL HOSPITAL BED MANAGEMENT SYSTEM");
    console.log("==========================================================");

    const pool = db.promise();

    // 1. Check & Add columns to hospital_ward_beds
    console.log("\n1. Enhancing `hospital_ward_beds` table schema...");
    const [cols] = await pool.query("DESCRIBE hospital_ward_beds");
    const colNames = cols.map(c => c.Field);

    if (!colNames.includes('building_wing')) {
        await pool.query("ALTER TABLE hospital_ward_beds ADD COLUMN building_wing VARCHAR(100) DEFAULT 'Main Building' AFTER ward_id");
        console.log("   + Added `building_wing` to hospital_ward_beds");
    }

    if (!colNames.includes('charge')) {
        await pool.query("ALTER TABLE hospital_ward_beds ADD COLUMN charge DECIMAL(10,2) DEFAULT 500.00 AFTER bed_category");
        console.log("   + Added `charge` to hospital_ward_beds");
    }

    // 2. Create hospital_bed_admissions table for permanent clinical admission history
    console.log("\n2. Creating `hospital_bed_admissions` table for admission & discharge audit...");
    await pool.query(`
        CREATE TABLE IF NOT EXISTS hospital_bed_admissions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            admission_id VARCHAR(50) UNIQUE NOT NULL,
            hospital_id VARCHAR(50) NOT NULL,
            patient_id VARCHAR(50) NOT NULL,
            patient_name VARCHAR(100) NOT NULL,
            bed_id VARCHAR(50) NOT NULL,
            bed_number VARCHAR(50) NOT NULL,
            ward_id VARCHAR(50) NOT NULL,
            ward_name VARCHAR(100) NOT NULL,
            building_wing VARCHAR(100) DEFAULT 'Main Building',
            floor VARCHAR(50) DEFAULT '1st Floor',
            room_number VARCHAR(50) DEFAULT 'Room-101',
            bed_type VARCHAR(50) DEFAULT 'General',
            bed_category VARCHAR(50) DEFAULT 'General',
            charge_per_day DECIMAL(10,2) DEFAULT 0.00,
            admission_date DATETIME NOT NULL,
            discharge_date DATETIME NULL,
            status ENUM('Admitted', 'Discharged') DEFAULT 'Admitted',
            doctor_id VARCHAR(50) NULL,
            doctor_name VARCHAR(100) NULL,
            diagnosis VARCHAR(255) NULL,
            notes TEXT NULL,
            discharge_summary TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_hosp_patient (hospital_id, patient_id),
            INDEX idx_bed (bed_id),
            INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("   + `hospital_bed_admissions` table ready.");

    // 3. Populate complete physical beds for HOSP-001 according to specification
    console.log("\n3. Provisioning full physical bed structure for HOSP-001 (AIIMS Gorakhpur)...");
    
    // First ensure the 5 standard wards have clean building and floor metadata
    await pool.query(`
        UPDATE hospital_wards SET 
            building_wing = 'Block A', floor = '3rd Floor', charge_per_day = 3500.00, total_beds = 30, ward_type = 'ICU' 
        WHERE ward_id = 'WARD-ICU-01' AND hospital_id = 'HOSP-001'
    `);

    await pool.query(`
        UPDATE hospital_wards SET 
            building_wing = 'Block A', floor = '1st Floor', charge_per_day = 1200.00, total_beds = 40, ward_type = 'Emergency' 
        WHERE ward_id = 'WARD-EMG-01' AND hospital_id = 'HOSP-001'
    `);

    await pool.query(`
        UPDATE hospital_wards SET 
            building_wing = 'Block B', floor = '2nd Floor', charge_per_day = 350.00, total_beds = 80, ward_type = 'General' 
        WHERE ward_id = 'WARD-GEN-01' AND hospital_id = 'HOSP-001'
    `);

    await pool.query(`
        UPDATE hospital_wards SET 
            building_wing = 'Block B', floor = '2nd Floor', charge_per_day = 350.00, total_beds = 80, ward_type = 'General' 
        WHERE ward_id = 'WARD-GEN-02' AND hospital_id = 'HOSP-001'
    `);

    await pool.query(`
        UPDATE hospital_wards SET 
            building_wing = 'Block A', floor = '4th Floor', charge_per_day = 2800.00, total_beds = 25, ward_type = 'Private' 
        WHERE ward_id = 'WARD-PVT-01' AND hospital_id = 'HOSP-001'
    `);

    // Helper to generate full bed array for a ward
    async function provisionWardBeds(hospitalId, wardId, wardName, building, floor, bedType, bedCategory, totalBeds, prefix, startNum, charge) {
        console.log(`   Provisioning ${totalBeds} beds for ${wardName} (${prefix}-${startNum} to ${prefix}-${startNum + totalBeds - 1})...`);
        for (let i = 0; i < totalBeds; i++) {
            const num = startNum + i;
            const bedNumber = `${prefix}-${num}`;
            const bedId = `BED-${hospitalId.replace(/[^A-Za-z0-9]/g, '')}-${prefix}-${num}`;
            const roomNum = `Room-${Math.floor(num / 10) * 10 || num}`;

            // Check if already exists
            const [existing] = await pool.query(
                "SELECT id, status, patient_id FROM hospital_ward_beds WHERE hospital_id = ? AND (bed_id = ? OR (ward_id = ? AND bed_number = ?))",
                [hospitalId, bedId, wardId, bedNumber]
            );

            if (existing.length === 0) {
                // Determine initial demo status (a few occupied / reserved)
                let initialStatus = 'Available';
                let patientId = null;
                let patientName = null;
                let admissionDate = null;

                if (i === 1) {
                    initialStatus = 'Occupied';
                    patientId = 'PAT-DEMO-01';
                    patientName = 'Amitabh Sharma';
                    admissionDate = new Date(Date.now() - 86400000);
                } else if (i === 2) {
                    initialStatus = 'Reserved';
                }

                await pool.query(`
                    INSERT INTO hospital_ward_beds 
                    (bed_id, hospital_id, ward_id, building_wing, floor, room_number, bed_number, bed_type, bed_category, charge, status, patient_id, patient_name, admission_date, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    bedId,
                    hospitalId,
                    wardId,
                    building,
                    floor,
                    roomNum,
                    bedNumber,
                    bedType,
                    bedCategory,
                    charge,
                    initialStatus,
                    patientId,
                    patientName,
                    admissionDate,
                    initialStatus === 'Occupied' ? 'Patient admitted under observation' : 'Sanitized and available'
                ]);
            } else {
                // Update building, floor, charge metadata without overwriting active patient or status
                await pool.query(`
                    UPDATE hospital_ward_beds SET 
                        building_wing = ?, floor = ?, room_number = ?, bed_type = ?, bed_category = ?, charge = ?
                    WHERE id = ?
                `, [building, floor, roomNum, bedType, bedCategory, charge, existing[0].id]);
            }
        }
    }

    // 1. Cardiac & Neuro ICU: 30 beds (ICU-301 to ICU-330)
    await provisionWardBeds('HOSP-001', 'WARD-ICU-01', 'Cardiac & Neuro ICU', 'Block A', '3rd Floor', 'ICU', 'Cardiac & Neuro ICU', 30, 'ICU', 301, 3500.00);

    // 2. Executive Private Suites: 25 beds (PVT-401 to PVT-425)
    await provisionWardBeds('HOSP-001', 'WARD-PVT-01', 'Executive Private Suites', 'Block A', '4th Floor', 'Private', 'Executive Private Suites', 25, 'PVT', 401, 2800.00);

    // 3. Trauma Emergency Ward: 40 beds (EMG-101 to EMG-140)
    await provisionWardBeds('HOSP-001', 'WARD-EMG-01', 'Trauma Emergency Ward', 'Block A', '1st Floor', 'Emergency', 'Trauma Emergency Ward', 40, 'EMG', 101, 1200.00);

    // 4. Male General Ward: 80 beds (GEN-M-201 to GEN-M-280)
    await provisionWardBeds('HOSP-001', 'WARD-GEN-01', 'Male General Ward', 'Block B', '2nd Floor', 'General', 'Male General Ward', 80, 'GEN-M', 201, 350.00);

    // 5. Female General Ward: 80 beds (GEN-F-201 to GEN-F-280)
    await provisionWardBeds('HOSP-001', 'WARD-GEN-02', 'Female General Ward', 'Block B', '2nd Floor', 'General', 'Female General Ward', 80, 'GEN-F', 201, 350.00);

    // 4. Recalculate and synchronize occupied counts for all wards in HOSP-001
    console.log("\n4. Synchronizing ward bed counters...");
    const [wards] = await pool.query("SELECT ward_id FROM hospital_wards WHERE hospital_id = 'HOSP-001'");
    for (const w of wards) {
        await pool.query(`
            UPDATE hospital_wards SET 
                total_beds = (SELECT COUNT(*) FROM hospital_ward_beds WHERE ward_id = ? AND hospital_id = 'HOSP-001' AND status != 'Retired'),
                occupied_beds = (SELECT COUNT(*) FROM hospital_ward_beds WHERE ward_id = ? AND hospital_id = 'HOSP-001' AND status = 'Occupied')
            WHERE ward_id = ? AND hospital_id = 'HOSP-001'
        `, [w.ward_id, w.ward_id, w.ward_id]);
    }

    // 5. Recalculate hospital-level totals in hospitals registry
    console.log("\n5. Recalculating hospital-level totals (total_beds, icu_beds, emergency_beds)...");
    await pool.query(`
        UPDATE hospitals h SET
            total_beds = (SELECT COUNT(*) FROM hospital_ward_beds WHERE hospital_id = h.hospital_id AND status != 'Retired'),
            icu_beds = (SELECT COUNT(*) FROM hospital_ward_beds WHERE hospital_id = h.hospital_id AND (bed_type = 'ICU' OR bed_category LIKE '%ICU%') AND status != 'Retired'),
            emergency_beds = (SELECT COUNT(*) FROM hospital_ward_beds WHERE hospital_id = h.hospital_id AND (bed_type = 'Emergency' OR bed_category LIKE '%Emergency%') AND status != 'Retired')
        WHERE h.hospital_id = 'HOSP-001'
    `);

    // Verify final numbers
    const [hospRow] = await pool.query("SELECT hospital_id, hospital_name, total_beds, icu_beds, emergency_beds FROM hospitals WHERE hospital_id = 'HOSP-001'");
    const [statsRow] = await pool.query(`
        SELECT 
            COUNT(*) AS total,
            SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) AS available,
            SUM(CASE WHEN status = 'Occupied' THEN 1 ELSE 0 END) AS occupied,
            SUM(CASE WHEN status = 'Reserved' THEN 1 ELSE 0 END) AS reserved,
            SUM(CASE WHEN status = 'Maintenance' THEN 1 ELSE 0 END) AS maintenance
        FROM hospital_ward_beds WHERE hospital_id = 'HOSP-001' AND status != 'Retired'
    `);

    console.log("\n==========================================================");
    console.log("HOSP-001 SYNCHRONIZATION SUMMARY:");
    console.log(hospRow[0]);
    console.log("Bed Stats Breakdown:", statsRow[0]);
    console.log("==========================================================");
    console.log("✅ MIGRATION COMPLETED SUCCESSFULLY.");
    process.exit(0);
}

migrateCompleteBedSystem().catch(err => {
    console.error("Migration error:", err);
    process.exit(1);
});
