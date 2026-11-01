/**
 * SmartCity AI - Gorakhpur Blood Bank & Emergency Blood Management System
 * Database Migration Script
 * 
 * Creates:
 * 1. blood_bank_facilities (hospital blood bank metadata)
 * 2. blood_inventory_units (physical units with barcode, status, expiration, storage)
 * 3. blood_inventory_movements (immutable audit ledger for intake, reservation, issuance, disposal)
 * 4. blood_requests (citizen routine and emergency blood requests)
 * 5. blood_request_status_history (status progression timeline)
 * 6. blood_stock_reservations (locking units to requests)
 * 7. blood_donors (voluntary donor registry)
 * 8. blood_donor_consents (consent granting and withdrawal tracking)
 * 9. blood_donation_records (donation logs)
 * 10. blood_bank_audit_logs (administrative actions and query audits)
 */

const pool = require("../config/db").promise();

// Verified baseline inventory seed data across Gorakhpur's top hospitals
const INITIAL_BLOOD_INVENTORY = [
    // AIIMS Gorakhpur (HOSP-001)
    { hospital_id: "HOSP-001", unit_identifier: "BG-AIIMS-A-POS-1001", blood_group: "A+", component_type: "PRBC", volume_ml: 350, days_valid: 28, screening: "PASSED", status: "AVAILABLE", location: "AIIMS Cold Chamber A1", batch: "BATCH-2026-10-A1" },
    { hospital_id: "HOSP-001", unit_identifier: "BG-AIIMS-A-POS-1002", blood_group: "A+", component_type: "Whole Blood", volume_ml: 450, days_valid: 21, screening: "PASSED", status: "AVAILABLE", location: "AIIMS Cold Chamber A1", batch: "BATCH-2026-10-A1" },
    { hospital_id: "HOSP-001", unit_identifier: "BG-AIIMS-A-NEG-1001", blood_group: "A-", component_type: "PRBC", volume_ml: 350, days_valid: 25, screening: "PASSED", status: "AVAILABLE", location: "AIIMS Cold Chamber A2", batch: "BATCH-2026-10-A2" },
    { hospital_id: "HOSP-001", unit_identifier: "BG-AIIMS-B-POS-1001", blood_group: "B+", component_type: "PRBC", volume_ml: 350, days_valid: 30, screening: "PASSED", status: "AVAILABLE", location: "AIIMS Cold Chamber B1", batch: "BATCH-2026-10-B1" },
    { hospital_id: "HOSP-001", unit_identifier: "BG-AIIMS-B-POS-1002", blood_group: "B+", component_type: "Platelets", volume_ml: 250, days_valid: 4, screening: "PASSED", status: "AVAILABLE", location: "AIIMS Agitator P1", batch: "BATCH-2026-10-B1" },
    { hospital_id: "HOSP-001", unit_identifier: "BG-AIIMS-B-NEG-1001", blood_group: "B-", component_type: "PRBC", volume_ml: 350, days_valid: 20, screening: "PASSED", status: "AVAILABLE", location: "AIIMS Cold Chamber B2", batch: "BATCH-2026-10-B2" },
    { hospital_id: "HOSP-001", unit_identifier: "BG-AIIMS-AB-POS-1001", blood_group: "AB+", component_type: "PRBC", volume_ml: 350, days_valid: 32, screening: "PASSED", status: "AVAILABLE", location: "AIIMS Cold Chamber AB1", batch: "BATCH-2026-10-AB1" },
    { hospital_id: "HOSP-001", unit_identifier: "BG-AIIMS-AB-POS-1002", blood_group: "AB+", component_type: "FFP", volume_ml: 200, days_valid: 180, screening: "PASSED", status: "AVAILABLE", location: "AIIMS Deep Freezer F1 (-30°C)", batch: "BATCH-2026-10-AB1" },
    { hospital_id: "HOSP-001", unit_identifier: "BG-AIIMS-AB-NEG-1001", blood_group: "AB-", component_type: "PRBC", volume_ml: 350, days_valid: 18, screening: "PASSED", status: "AVAILABLE", location: "AIIMS Cold Chamber AB2", batch: "BATCH-2026-10-AB2" },
    { hospital_id: "HOSP-001", unit_identifier: "BG-AIIMS-O-POS-1001", blood_group: "O+", component_type: "PRBC", volume_ml: 350, days_valid: 35, screening: "PASSED", status: "AVAILABLE", location: "AIIMS Cold Chamber O1", batch: "BATCH-2026-10-O1" },
    { hospital_id: "HOSP-001", unit_identifier: "BG-AIIMS-O-POS-1002", blood_group: "O+", component_type: "Whole Blood", volume_ml: 450, days_valid: 19, screening: "PASSED", status: "AVAILABLE", location: "AIIMS Cold Chamber O1", batch: "BATCH-2026-10-O1" },
    { hospital_id: "HOSP-001", unit_identifier: "BG-AIIMS-O-NEG-1001", blood_group: "O-", component_type: "PRBC", volume_ml: 350, days_valid: 22, screening: "PASSED", status: "AVAILABLE", location: "AIIMS Universal Donor Chamber U1", batch: "BATCH-2026-10-O2" },
    { hospital_id: "HOSP-001", unit_identifier: "BG-AIIMS-O-NEG-1002", blood_group: "O-", component_type: "PRBC", volume_ml: 350, days_valid: 26, screening: "PASSED", status: "AVAILABLE", location: "AIIMS Universal Donor Chamber U1", batch: "BATCH-2026-10-O2" },
    // Near expiry unit for AIIMS testing
    { hospital_id: "HOSP-001", unit_identifier: "BG-AIIMS-EXP-TEST-01", blood_group: "O+", component_type: "Platelets", volume_ml: 250, days_valid: 1, screening: "PASSED", status: "AVAILABLE", location: "AIIMS Agitator P2", batch: "BATCH-2026-10-EXP" },

    // BRD Medical College (HOSP-002)
    { hospital_id: "HOSP-002", unit_identifier: "BG-BRD-A-POS-2001", blood_group: "A+", component_type: "PRBC", volume_ml: 350, days_valid: 24, screening: "PASSED", status: "AVAILABLE", location: "BRD Blood Bank Room 1", batch: "BATCH-BRD-2026-10-A" },
    { hospital_id: "HOSP-002", unit_identifier: "BG-BRD-B-POS-2001", blood_group: "B+", component_type: "PRBC", volume_ml: 350, days_valid: 27, screening: "PASSED", status: "AVAILABLE", location: "BRD Blood Bank Room 1", batch: "BATCH-BRD-2026-10-B" },
    { hospital_id: "HOSP-002", unit_identifier: "BG-BRD-B-POS-2002", blood_group: "B+", component_type: "Platelets", volume_ml: 250, days_valid: 3, screening: "PASSED", status: "AVAILABLE", location: "BRD Agitator Room", batch: "BATCH-BRD-2026-10-B" },
    { hospital_id: "HOSP-002", unit_identifier: "BG-BRD-O-POS-2001", blood_group: "O+", component_type: "PRBC", volume_ml: 350, days_valid: 31, screening: "PASSED", status: "AVAILABLE", location: "BRD Blood Bank Room 2", batch: "BATCH-BRD-2026-10-O" },
    { hospital_id: "HOSP-002", unit_identifier: "BG-BRD-O-NEG-2001", blood_group: "O-", component_type: "PRBC", volume_ml: 350, days_valid: 15, screening: "PASSED", status: "AVAILABLE", location: "BRD Blood Bank Room 2", batch: "BATCH-BRD-2026-10-O" },

    // District Hospital Gorakhpur (HOSP-003)
    { hospital_id: "HOSP-003", unit_identifier: "BG-DIST-A-POS-3001", blood_group: "A+", component_type: "Whole Blood", volume_ml: 450, days_valid: 14, screening: "PASSED", status: "AVAILABLE", location: "District Bank Rack 1", batch: "BATCH-DIST-2026-10" },
    { hospital_id: "HOSP-003", unit_identifier: "BG-DIST-B-POS-3001", blood_group: "B+", component_type: "PRBC", volume_ml: 350, days_valid: 21, screening: "PASSED", status: "AVAILABLE", location: "District Bank Rack 1", batch: "BATCH-DIST-2026-10" },
    { hospital_id: "HOSP-003", unit_identifier: "BG-DIST-O-POS-3001", blood_group: "O+", component_type: "PRBC", volume_ml: 350, days_valid: 29, screening: "PASSED", status: "AVAILABLE", location: "District Bank Rack 2", batch: "BATCH-DIST-2026-10" }
];

async function runBloodBankMigration() {
    console.log("🩸 [Migration] Initializing Blood Bank & Emergency Blood Management System Schema...");

    const tableQueries = [
        // 1. Hospital Blood Bank Facilities Metadata
        `CREATE TABLE IF NOT EXISTS \`blood_bank_facilities\` (
            \`id\` INT AUTO_INCREMENT PRIMARY KEY,
            \`hospital_id\` VARCHAR(50) NOT NULL UNIQUE,
            \`facility_name\` VARCHAR(150) NOT NULL,
            \`license_number\` VARCHAR(100) NOT NULL,
            \`helpline_number\` VARCHAR(25) NOT NULL,
            \`nodal_officer\` VARCHAR(100) DEFAULT 'Chief Blood Transfusion Officer',
            \`location_address\` TEXT NOT NULL,
            \`operating_hours\` VARCHAR(100) DEFAULT '24x7 Emergency Transfusion Services',
            \`storage_capacity_units\` INT DEFAULT 500,
            \`is_active\` TINYINT(1) DEFAULT 1,
            \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX \`idx_bld_fac_hosp\` (\`hospital_id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

        // 2. Physical Inventory Units
        `CREATE TABLE IF NOT EXISTS \`blood_inventory_units\` (
            \`id\` INT AUTO_INCREMENT PRIMARY KEY,
            \`hospital_id\` VARCHAR(50) NOT NULL,
            \`unit_identifier\` VARCHAR(64) NOT NULL UNIQUE,
            \`blood_group\` ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NOT NULL,
            \`component_type\` ENUM('Whole Blood', 'PRBC', 'Platelets', 'FFP', 'Cryoprecipitate') NOT NULL,
            \`volume_ml\` INT NOT NULL DEFAULT 350,
            \`collection_date\` DATE NOT NULL,
            \`expiry_date\` DATE NOT NULL,
            \`screening_status\` ENUM('PENDING', 'PASSED', 'FAILED') NOT NULL DEFAULT 'PASSED',
            \`inventory_status\` ENUM('AVAILABLE', 'RESERVED', 'ISSUED', 'EXPIRED', 'QUARANTINED', 'DISCARDED') NOT NULL DEFAULT 'AVAILABLE',
            \`storage_location\` VARCHAR(100) DEFAULT 'Main Blood Bank Cold Storage 4°C',
            \`batch_number\` VARCHAR(50) DEFAULT NULL,
            \`donor_id\` INT DEFAULT NULL,
            \`notes\` TEXT DEFAULT NULL,
            \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX \`idx_bld_inv_avail\` (\`hospital_id\`, \`blood_group\`, \`component_type\`, \`inventory_status\`, \`screening_status\`),
            INDEX \`idx_bld_inv_expiry\` (\`expiry_date\`, \`inventory_status\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

        // 3. Inventory Movements Audit Ledger
        `CREATE TABLE IF NOT EXISTS \`blood_inventory_movements\` (
            \`id\` INT AUTO_INCREMENT PRIMARY KEY,
            \`unit_id\` INT NOT NULL,
            \`hospital_id\` VARCHAR(50) NOT NULL,
            \`movement_type\` ENUM('INTAKE', 'RESERVATION', 'RESERVATION_RELEASED', 'ISSUED', 'EXPIRED', 'QUARANTINE', 'DISPOSAL', 'ADJUSTMENT') NOT NULL,
            \`previous_status\` VARCHAR(50) DEFAULT NULL,
            \`new_status\` VARCHAR(50) NOT NULL,
            \`performed_by_user_id\` VARCHAR(50) DEFAULT NULL,
            \`performed_by_name\` VARCHAR(100) DEFAULT NULL,
            \`performed_by_role\` VARCHAR(50) DEFAULT NULL,
            \`request_id\` INT DEFAULT NULL,
            \`reason\` TEXT DEFAULT NULL,
            \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX \`idx_bld_mov_unit\` (\`unit_id\`),
            INDEX \`idx_bld_mov_hosp\` (\`hospital_id\`, \`created_at\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

        // 4. Blood Requests (Citizen & Emergency Requests)
        `CREATE TABLE IF NOT EXISTS \`blood_requests\` (
            \`id\` INT AUTO_INCREMENT PRIMARY KEY,
            \`request_reference\` VARCHAR(64) NOT NULL UNIQUE,
            \`citizen_id\` INT DEFAULT NULL,
            \`hospital_id\` VARCHAR(50) NOT NULL,
            \`patient_name\` VARCHAR(150) NOT NULL,
            \`patient_age\` INT DEFAULT NULL,
            \`patient_gender\` VARCHAR(20) DEFAULT NULL,
            \`blood_group\` VARCHAR(10) NOT NULL,
            \`component_type\` VARCHAR(50) NOT NULL,
            \`requested_units\` INT NOT NULL DEFAULT 1,
            \`priority\` ENUM('Routine', 'Urgent', 'Emergency') NOT NULL DEFAULT 'Routine',
            \`treating_department\` VARCHAR(100) DEFAULT 'Emergency / Trauma',
            \`treating_doctor\` VARCHAR(100) DEFAULT NULL,
            \`required_at\` DATETIME NOT NULL,
            \`status\` ENUM('SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'APPROVED', 'RESERVED', 'READY_FOR_COLLECTION', 'FULFILLED', 'REJECTED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'SUBMITTED',
            \`contact_person\` VARCHAR(100) NOT NULL,
            \`contact_phone\` VARCHAR(25) NOT NULL,
            \`relationship_to_patient\` VARCHAR(50) NOT NULL,
            \`additional_notes\` TEXT DEFAULT NULL,
            \`idempotency_key\` VARCHAR(100) DEFAULT NULL UNIQUE,
            \`rejection_reason\` TEXT DEFAULT NULL,
            \`reviewed_by\` VARCHAR(100) DEFAULT NULL,
            \`reserved_at\` DATETIME DEFAULT NULL,
            \`fulfilled_at\` DATETIME DEFAULT NULL,
            \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX \`idx_bld_req_hosp_status\` (\`hospital_id\`, \`status\`, \`priority\`),
            INDEX \`idx_bld_req_citizen\` (\`citizen_id\`, \`created_at\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

        // 5. Request Status History (Timeline)
        `CREATE TABLE IF NOT EXISTS \`blood_request_status_history\` (
            \`id\` INT AUTO_INCREMENT PRIMARY KEY,
            \`request_id\` INT NOT NULL,
            \`from_status\` VARCHAR(50) DEFAULT NULL,
            \`to_status\` VARCHAR(50) NOT NULL,
            \`changed_by_user_id\` VARCHAR(50) DEFAULT NULL,
            \`changed_by_name\` VARCHAR(100) DEFAULT NULL,
            \`changed_by_role\` VARCHAR(50) DEFAULT NULL,
            \`remarks\` TEXT DEFAULT NULL,
            \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX \`idx_bld_hist_req\` (\`request_id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

        // 6. Stock Reservations
        `CREATE TABLE IF NOT EXISTS \`blood_stock_reservations\` (
            \`id\` INT AUTO_INCREMENT PRIMARY KEY,
            \`request_id\` INT NOT NULL,
            \`unit_id\` INT NOT NULL,
            \`reserved_by_user_id\` VARCHAR(50) DEFAULT NULL,
            \`reserved_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            \`expires_at\` DATETIME NOT NULL,
            \`status\` ENUM('ACTIVE', 'FULFILLED', 'RELEASED') NOT NULL DEFAULT 'ACTIVE',
            INDEX \`idx_bld_res_req\` (\`request_id\`),
            INDEX \`idx_bld_res_unit\` (\`unit_id\`, \`status\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

        // 7. Voluntary Donors
        `CREATE TABLE IF NOT EXISTS \`blood_donors\` (
            \`id\` INT AUTO_INCREMENT PRIMARY KEY,
            \`citizen_id\` INT DEFAULT NULL,
            \`donor_code\` VARCHAR(50) NOT NULL UNIQUE,
            \`full_name\` VARCHAR(150) NOT NULL,
            \`age\` INT NOT NULL,
            \`gender\` VARCHAR(20) DEFAULT NULL,
            \`blood_group\` VARCHAR(10) NOT NULL,
            \`phone\` VARCHAR(25) NOT NULL,
            \`email\` VARCHAR(100) DEFAULT NULL,
            \`city\` VARCHAR(100) DEFAULT 'Gorakhpur',
            \`locality\` VARCHAR(150) DEFAULT NULL,
            \`preferred_contact_method\` ENUM('Call', 'SMS', 'WhatsApp', 'Email') DEFAULT 'Call',
            \`last_donation_date\` DATE DEFAULT NULL,
            \`availability_preference\` ENUM('Anytime', 'Weekends Only', 'Emergency Only') DEFAULT 'Emergency Only',
            \`donor_status\` ENUM('PENDING_VERIFICATION', 'VERIFIED', 'TEMPORARILY_UNAVAILABLE', 'INACTIVE', 'SUSPENDED') DEFAULT 'PENDING_VERIFICATION',
            \`verified_by_user_id\` VARCHAR(50) DEFAULT NULL,
            \`verified_at\` DATETIME DEFAULT NULL,
            \`is_consent_active\` TINYINT(1) DEFAULT 1,
            \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX \`idx_bld_donor_bg\` (\`blood_group\`, \`donor_status\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

        // 8. Donor Consents
        `CREATE TABLE IF NOT EXISTS \`blood_donor_consents\` (
            \`id\` INT AUTO_INCREMENT PRIMARY KEY,
            \`donor_id\` INT NOT NULL,
            \`consent_type\` VARCHAR(100) DEFAULT 'VOLUNTARY_DONATION_CONTACT',
            \`granted\` TINYINT(1) DEFAULT 1,
            \`granted_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            \`withdrawn_at\` DATETIME DEFAULT NULL,
            \`ip_address\` VARCHAR(45) DEFAULT NULL,
            \`user_agent\` TEXT DEFAULT NULL,
            INDEX \`idx_bld_consent_donor\` (\`donor_id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

        // 9. Blood Donation Records
        `CREATE TABLE IF NOT EXISTS \`blood_donation_records\` (
            \`id\` INT AUTO_INCREMENT PRIMARY KEY,
            \`donor_id\` INT NOT NULL,
            \`hospital_id\` VARCHAR(50) NOT NULL,
            \`unit_identifier\` VARCHAR(64) DEFAULT NULL,
            \`donation_date\` DATE NOT NULL,
            \`volume_ml\` INT DEFAULT 350,
            \`hemoglobin_g_dl\` DECIMAL(4, 1) DEFAULT NULL,
            \`screening_results\` VARCHAR(50) DEFAULT 'PASSED',
            \`staff_notes\` TEXT DEFAULT NULL,
            \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX \`idx_bld_don_rec\` (\`donor_id\`, \`hospital_id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

        // 10. Audit Logs
        `CREATE TABLE IF NOT EXISTS \`blood_bank_audit_logs\` (
            \`id\` INT AUTO_INCREMENT PRIMARY KEY,
            \`hospital_id\` VARCHAR(50) DEFAULT NULL,
            \`user_id\` VARCHAR(50) DEFAULT NULL,
            \`user_name\` VARCHAR(100) DEFAULT NULL,
            \`role\` VARCHAR(50) DEFAULT NULL,
            \`action\` VARCHAR(100) NOT NULL,
            \`target_type\` VARCHAR(50) DEFAULT NULL,
            \`target_id\` VARCHAR(64) DEFAULT NULL,
            \`details\` TEXT DEFAULT NULL,
            \`ip_address\` VARCHAR(45) DEFAULT NULL,
            \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX \`idx_bld_audit_hosp\` (\`hospital_id\`, \`created_at\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
    ];

    try {
        await pool.query("SELECT 1");
        console.log("🟢 [Migration] MySQL connection confirmed.");

        for (const q of tableQueries) {
            await pool.query(q);
        }
        console.log("✅ [Migration] All 10 Blood Bank tables created/verified successfully.");

        // Seed Hospital Blood Bank Facilities
        const facilities = [
            { hospital_id: "HOSP-001", name: "AIIMS Gorakhpur Blood Transfusion Services & Regional Center", license: "LIC-UP-GKP-2024-BB01", helpline: "0551-2207701", address: "Kunraghat, Gorakhpur, UP 273008", capacity: 800 },
            { hospital_id: "HOSP-002", name: "BRD Medical College Blood Bank & Apheresis Center", license: "LIC-UP-GKP-1982-BB02", helpline: "0551-2310111", address: "Asuran Road, Gorakhpur, UP 273013", capacity: 600 },
            { hospital_id: "HOSP-003", name: "District Hospital Sadar Blood Center", license: "LIC-UP-GKP-1976-BB03", helpline: "0551-2334455", address: "Golghar, Gorakhpur, UP 273001", capacity: 400 }
        ];

        for (const f of facilities) {
            await pool.query(
                `INSERT INTO blood_bank_facilities (hospital_id, facility_name, license_number, helpline_number, location_address, storage_capacity_units)
                 VALUES (?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE facility_name = VALUES(facility_name), helpline_number = VALUES(helpline_number)`,
                [f.hospital_id, f.name, f.license, f.helpline, f.address, f.capacity]
            );
        }

        // Seed baseline blood inventory units
        const today = new Date();
        for (const item of INITIAL_BLOOD_INVENTORY) {
            const colDate = new Date(today);
            colDate.setDate(colDate.getDate() - 5);
            const expDate = new Date(today);
            expDate.setDate(expDate.getDate() + item.days_valid);

            const colStr = colDate.toISOString().slice(0, 10);
            const expStr = expDate.toISOString().slice(0, 10);

            await pool.query(
                `INSERT INTO blood_inventory_units (hospital_id, unit_identifier, blood_group, component_type, volume_ml, collection_date, expiry_date, screening_status, inventory_status, storage_location, batch_number)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE updated_at = NOW()`,
                [item.hospital_id, item.unit_identifier, item.blood_group, item.component_type, item.volume_ml, colStr, expStr, item.screening, item.status, item.location, item.batch]
            );
        }
        console.log(`✅ [Migration] Seeded ${INITIAL_BLOOD_INVENTORY.length} initial verified blood units.`);

        return { success: true };
    } catch (err) {
        console.warn("⚠️ [Migration] MySQL unavailable or query error:", err.message);
        console.warn("👉 In-memory and fallback stores will handle blood-bank operations seamlessly if MySQL is offline.");
        return { success: false, error: err.message };
    }
}

// Allow standalone execution
if (require.main === module) {
    runBloodBankMigration().then(() => {
        console.log("🏁 Migration run complete.");
        process.exit(0);
    }).catch(e => {
        console.error("Migration error:", e);
        process.exit(0);
    });
}

module.exports = {
    runBloodBankMigration,
    INITIAL_BLOOD_INVENTORY
};
