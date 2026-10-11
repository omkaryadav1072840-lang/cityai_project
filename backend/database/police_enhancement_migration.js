/**
 * SmartCity AI - Police Enhancement Tables Migration
 * Adds tables for SOS alerts, Mission Shakti Safe Rides, Tenant Verifications, and Stolen Vehicle/Property Hotlist.
 */

const pool = require("../config/db").promise();

async function runPoliceMigration() {
    console.log("👮 Running Police Enhancement Database Migration...");

    try {
        // 1. SOS Alerts Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS police_sos_alerts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                alert_id VARCHAR(50) UNIQUE NOT NULL,
                citizen_name VARCHAR(150) NOT NULL,
                mobile VARCHAR(20) NOT NULL,
                latitude DECIMAL(10, 7) NOT NULL,
                longitude DECIMAL(10, 7) NOT NULL,
                nearest_station_id VARCHAR(50) DEFAULT NULL,
                nearest_station_name VARCHAR(150) DEFAULT NULL,
                distance_km DECIMAL(6, 2) DEFAULT NULL,
                alert_type VARCHAR(50) DEFAULT 'EMERGENCY_SOS',
                battery_level INT DEFAULT 100,
                is_silent BOOLEAN DEFAULT FALSE,
                status VARCHAR(50) DEFAULT 'DISPATCHED',
                dispatched_unit VARCHAR(50) DEFAULT 'PRV-0241',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log("  ✅ Table police_sos_alerts ready");

        // 2. Safe Rides (Mission Shakti) Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS police_safe_rides (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ride_id VARCHAR(50) UNIQUE NOT NULL,
                citizen_name VARCHAR(150) NOT NULL,
                mobile VARCHAR(20) NOT NULL,
                origin VARCHAR(255) NOT NULL,
                destination VARCHAR(255) NOT NULL,
                emergency_contact VARCHAR(20) NOT NULL,
                vehicle_details VARCHAR(100) DEFAULT NULL,
                eta_minutes INT DEFAULT 30,
                status VARCHAR(50) DEFAULT 'ACTIVE',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log("  ✅ Table police_safe_rides ready");

        // 3. Police Verifications (Tenant / Domestic Help) Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS police_verifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                verification_id VARCHAR(50) UNIQUE NOT NULL,
                applicant_name VARCHAR(150) NOT NULL,
                applicant_mobile VARCHAR(20) NOT NULL,
                candidate_name VARCHAR(150) NOT NULL,
                candidate_type ENUM('Tenant', 'Domestic Help', 'Driver', 'Security Guard') DEFAULT 'Tenant',
                candidate_aadhar VARCHAR(20) NOT NULL,
                candidate_mobile VARCHAR(20) DEFAULT NULL,
                address TEXT NOT NULL,
                station_id VARCHAR(50) DEFAULT 'PS-001',
                status VARCHAR(50) DEFAULT 'PENDING_VERIFICATION',
                remarks VARCHAR(255) DEFAULT 'Application submitted for beat officer field verification',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log("  ✅ Table police_verifications ready");

        // 4. Stolen Vehicle & Property Hotlist Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS police_hotlist (
                id INT AUTO_INCREMENT PRIMARY KEY,
                item_type ENUM('VEHICLE', 'MOBILE', 'FIREARM', 'VALUABLE') NOT NULL,
                identifier VARCHAR(100) UNIQUE NOT NULL, -- Reg plate or IMEI
                make_model VARCHAR(150) NOT NULL,
                fir_number VARCHAR(100) NOT NULL,
                station_id VARCHAR(50) NOT NULL,
                incident_date DATE NOT NULL,
                status VARCHAR(50) DEFAULT 'WANTED_STOLEN',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log("  ✅ Table police_hotlist ready");

        // 5. Seed sample hotlist records if empty
        const [existingHotlist] = await pool.query("SELECT COUNT(*) as count FROM police_hotlist");
        if (existingHotlist[0].count === 0) {
            await pool.query(`
                INSERT INTO police_hotlist (item_type, identifier, make_model, fir_number, station_id, incident_date, status)
                VALUES
                ('VEHICLE', 'UP53BL8940', 'Hero Splendor Plus (Black/Red)', 'FIR-2026/0891-KOT', 'PS-001', '2026-09-12', 'WANTED_STOLEN'),
                ('VEHICLE', 'UP53CR4120', 'Honda Activa 6G (Matte Grey)', 'FIR-2026/0944-CAN', 'PS-003', '2026-09-18', 'WANTED_STOLEN'),
                ('VEHICLE', 'UP53AW5511', 'Bajaj Pulsar 150 (Blue)', 'FIR-2026/1020-CIV', 'PS-002', '2026-09-25', 'WANTED_STOLEN'),
                ('VEHICLE', 'UP53DK9090', 'Maruti Suzuki Swift (White)', 'FIR-2026/1105-MED', 'PS-006', '2026-10-02', 'WANTED_STOLEN'),
                ('MOBILE', '864209048123456', 'Samsung Galaxy S23 (Green)', 'FIR-2026/1110-KOT', 'PS-001', '2026-10-03', 'LOST_BLOCKED'),
                ('MOBILE', '359128092837491', 'Apple iPhone 14 (Midnight)', 'FIR-2026/1142-CAN', 'PS-003', '2026-10-05', 'LOST_BLOCKED');
            `);
            console.log("  ✅ Seeded sample stolen vehicles and mobile hotlist records");
        }

        console.log("🎉 Police Enhancement Migration Completed Successfully!");
        return true;
    } catch (err) {
        console.error("❌ Migration failed:", err.message);
        throw err;
    }
}

if (require.main === module) {
    runPoliceMigration()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = runPoliceMigration;
