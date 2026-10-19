/**
 * SmartCity AI — Security Hardening Migration
 * ============================================
 * Additive, reversible migration for:
 *  1. otp_records table (email/phone OTP storage with hashes only)
 *  2. waste_staff_roles column (fine-grained waste sub-roles)
 *  3. waste_bins table enhancements (spatial columns + sensor data)
 *  4. waste_vehicles table (vehicle tracking with GPS)
 *  5. waste_collection_events table (validated collection records)
 *  6. waste_staff table (waste-specific staff with sub-roles)
 *
 * Safe to run multiple times (IF NOT EXISTS / IGNORE guards).
 * All changes are additive — no drops, no renames.
 * Run with: node backend/database/migrations/security_hardening_migration.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const mysql = require("mysql2/promise");

async function runMigration() {
    const pool = await mysql.createPool({
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || "smartcity",
        port: parseInt(process.env.DB_PORT || "3306", 10),
        waitForConnections: true,
        connectionLimit: 3
    });

    const conn = await pool.getConnection();
    console.log("[Migration] Connected to database:", process.env.DB_NAME);

    try {
        await conn.beginTransaction();

        // ================================================
        // 1. OTP Records Table
        // ================================================
        console.log("[Migration] Creating otp_records table...");
        await conn.query(`
            CREATE TABLE IF NOT EXISTS otp_records (
                id             BIGINT AUTO_INCREMENT PRIMARY KEY,
                target_type    VARCHAR(20)  NOT NULL COMMENT 'email or phone',
                target_value   VARCHAR(255) NOT NULL COMMENT 'email address or phone number',
                otp_hash       VARCHAR(255) NOT NULL COMMENT 'scrypt hash of OTP — plaintext never stored',
                purpose        VARCHAR(50)  NOT NULL COMMENT 'verification, login, reset, phone_otp',
                expires_at     DATETIME     NOT NULL,
                attempt_count  TINYINT      NOT NULL DEFAULT 0,
                used           TINYINT(1)   NOT NULL DEFAULT 0,
                used_at        DATETIME     DEFAULT NULL,
                invalidated_at DATETIME     DEFAULT NULL,
                created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_otp_lookup (target_type, target_value, purpose, used, expires_at),
                INDEX idx_otp_cleanup (expires_at, used)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
              COMMENT 'Stores only OTP hashes. Plaintext OTPs are never persisted.'
        `);
        console.log("[Migration] ✅ otp_records table ready.");

        // ================================================
        // 2. Waste Staff Sub-Roles Enhancement
        // ================================================
        console.log("[Migration] Adding waste staff sub-role columns...");
        // Safe additive columns
        const wasteSubRoleCols = [
            "ALTER TABLE staff ADD COLUMN IF NOT EXISTS waste_sub_role VARCHAR(50) DEFAULT NULL COMMENT 'waste_collector | waste_office | bin_field_staff'",
            "ALTER TABLE staff ADD COLUMN IF NOT EXISTS assigned_sector VARCHAR(100) DEFAULT NULL COMMENT 'assigned sector/ward for waste/bin staff'",
            "ALTER TABLE staff ADD COLUMN IF NOT EXISTS assigned_route_id INT DEFAULT NULL COMMENT 'assigned collection route ID'",
            "ALTER TABLE staff ADD COLUMN IF NOT EXISTS assigned_vehicle_id INT DEFAULT NULL COMMENT 'assigned waste vehicle ID'"
        ];
        for (const col of wasteSubRoleCols) {
            try { await conn.query(col); } catch (e) { /* column already exists */ }
        }
        console.log("[Migration] ✅ Staff waste sub-role columns ready.");

        // ================================================
        // 3. Waste Bins Enhanced Table
        // ================================================
        console.log("[Migration] Creating/enhancing waste_bins table...");
        await conn.query(`
            CREATE TABLE IF NOT EXISTS waste_bins (
                id               INT AUTO_INCREMENT PRIMARY KEY,
                bin_code         VARCHAR(50)  NOT NULL UNIQUE COMMENT 'Unique bin identifier e.g. BIN-GKP-0042',
                sector           VARCHAR(100) NOT NULL COMMENT 'Ward or sector name',
                bin_type         ENUM('wet','dry','mixed','hazardous','ewaste') NOT NULL DEFAULT 'mixed',
                latitude         DECIMAL(10,7) NOT NULL,
                longitude        DECIMAL(10,7) NOT NULL,
                address          VARCHAR(255) DEFAULT NULL,
                status           ENUM('operational','damaged','missing','overflow','maintenance') NOT NULL DEFAULT 'operational',
                capacity_litres  INT NOT NULL DEFAULT 240,
                fill_level       TINYINT NOT NULL DEFAULT 0 COMMENT 'Percentage 0-100',
                fill_source      ENUM('manual','sensor','predicted','demo') NOT NULL DEFAULT 'demo'
                                 COMMENT 'Always labeled — never claim sensor if only manual/demo',
                last_inspected_at  DATETIME DEFAULT NULL,
                last_collected_at  DATETIME DEFAULT NULL,
                last_sensor_at     DATETIME DEFAULT NULL COMMENT 'NULL = no real sensor reading',
                collection_due_at  DATETIME DEFAULT NULL,
                overflow_count     INT NOT NULL DEFAULT 0,
                is_public          TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = show on public map',
                notes              TEXT DEFAULT NULL,
                created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_bin_sector (sector),
                INDEX idx_bin_status (status),
                INDEX idx_bin_latlong (latitude, longitude),
                INDEX idx_bin_fill (fill_level, status),
                INDEX idx_bin_due (collection_due_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log("[Migration] ✅ waste_bins table ready.");

        // ================================================
        // 4. Waste Vehicles Table
        // ================================================
        console.log("[Migration] Creating waste_vehicles table...");
        await conn.query(`
            CREATE TABLE IF NOT EXISTS waste_vehicles (
                id               INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_code     VARCHAR(50) NOT NULL UNIQUE,
                registration_no  VARCHAR(30) NOT NULL,
                vehicle_type     VARCHAR(50) NOT NULL DEFAULT 'compactor',
                capacity_tonnes  DECIMAL(5,2) DEFAULT 5.00,
                assigned_sector  VARCHAR(100) DEFAULT NULL,
                assigned_route_id INT DEFAULT NULL,
                driver_staff_id  INT DEFAULT NULL,
                status           ENUM('available','on_route','maintenance','breakdown','inactive')
                                 NOT NULL DEFAULT 'available',
                latitude         DECIMAL(10,7) DEFAULT NULL,
                longitude        DECIMAL(10,7) DEFAULT NULL,
                location_updated_at DATETIME DEFAULT NULL,
                gps_source       ENUM('real','simulated','manual','none') NOT NULL DEFAULT 'none'
                                 COMMENT 'Always labeled — never claim real GPS if simulated',
                speed_kmh        DECIMAL(5,2) DEFAULT NULL,
                fuel_percent     TINYINT DEFAULT NULL,
                eta_next_bin     DATETIME DEFAULT NULL,
                created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_vehicle_status (status),
                INDEX idx_vehicle_sector (assigned_sector)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log("[Migration] ✅ waste_vehicles table ready.");

        // ================================================
        // 5. Waste Collection Events (Validated Records)
        // ================================================
        console.log("[Migration] Creating waste_collection_events table...");
        await conn.query(`
            CREATE TABLE IF NOT EXISTS waste_collection_events (
                id              BIGINT AUTO_INCREMENT PRIMARY KEY,
                bin_id          INT NOT NULL,
                bin_code        VARCHAR(50) NOT NULL,
                vehicle_id      INT DEFAULT NULL,
                vehicle_code    VARCHAR(50) DEFAULT NULL,
                collector_staff_id INT NOT NULL,
                collected_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                fill_before     TINYINT DEFAULT NULL COMMENT 'Fill level % before collection',
                fill_after      TINYINT DEFAULT NULL COMMENT 'Fill level % after (expected ~0)',
                collection_valid TINYINT(1) NOT NULL DEFAULT 0
                                 COMMENT '1 = validated server-side, not just button click',
                event_type      ENUM('collected','failed','inaccessible','overflow_reported',
                                     'breakdown_reported','emergency_reported')
                                 NOT NULL DEFAULT 'collected',
                location_lat    DECIMAL(10,7) DEFAULT NULL COMMENT 'Collector location at event time',
                location_lng    DECIMAL(10,7) DEFAULT NULL,
                notes           TEXT DEFAULT NULL,
                proof_image_url VARCHAR(500) DEFAULT NULL,
                created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uk_bin_collector_time (bin_id, collector_staff_id, collected_at),
                INDEX idx_coll_bin (bin_id),
                INDEX idx_coll_time (collected_at),
                INDEX idx_coll_staff (collector_staff_id),
                FOREIGN KEY (bin_id) REFERENCES waste_bins(id) ON DELETE RESTRICT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log("[Migration] ✅ waste_collection_events table ready.");

        // ================================================
        // 6. Waste Collection Routes
        // ================================================
        console.log("[Migration] Creating waste_collection_routes table...");
        await conn.query(`
            CREATE TABLE IF NOT EXISTS waste_collection_routes (
                id              INT AUTO_INCREMENT PRIMARY KEY,
                route_code      VARCHAR(50) NOT NULL UNIQUE,
                route_name      VARCHAR(150) NOT NULL,
                sector          VARCHAR(100) NOT NULL,
                assigned_vehicle_id INT DEFAULT NULL,
                assigned_staff_id   INT DEFAULT NULL,
                schedule_days   VARCHAR(50) DEFAULT 'Mon,Wed,Fri' COMMENT 'Comma-separated days',
                schedule_time   VARCHAR(20) DEFAULT '06:00',
                status          ENUM('active','suspended','completed','draft') NOT NULL DEFAULT 'active',
                waypoints       JSON DEFAULT NULL COMMENT 'Array of {lat,lng,bin_id} objects',
                estimated_duration_min INT DEFAULT NULL,
                created_by      INT DEFAULT NULL,
                created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_route_sector (sector),
                INDEX idx_route_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log("[Migration] ✅ waste_collection_routes table ready.");

        // ================================================
        // 7. Waste Bin Fill-Level Predictions
        // ================================================
        console.log("[Migration] Creating waste_fill_predictions table...");
        await conn.query(`
            CREATE TABLE IF NOT EXISTS waste_fill_predictions (
                id              BIGINT AUTO_INCREMENT PRIMARY KEY,
                bin_id          INT NOT NULL,
                bin_code        VARCHAR(50) NOT NULL,
                model_version   VARCHAR(50) NOT NULL DEFAULT 'rule-based-v1',
                predicted_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                input_timestamp DATETIME NOT NULL COMMENT 'When the input data was recorded',
                data_freshness  VARCHAR(50) DEFAULT NULL COMMENT 'e.g. real-time, 1h stale, demo',
                predicted_fill_pct  TINYINT DEFAULT NULL,
                predicted_full_at   DATETIME DEFAULT NULL COMMENT 'NULL = insufficient data',
                confidence          DECIMAL(5,2) DEFAULT NULL COMMENT '0-100%, NULL = not calibrated',
                is_simulated    TINYINT(1) NOT NULL DEFAULT 1
                                COMMENT '1 = simulated/rule-based, 0 = trained ML model',
                factors_json    JSON DEFAULT NULL COMMENT 'Explanatory factors for prediction',
                INDEX idx_pred_bin (bin_id),
                INDEX idx_pred_time (predicted_at),
                FOREIGN KEY (bin_id) REFERENCES waste_bins(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log("[Migration] ✅ waste_fill_predictions table ready.");

        // ================================================
        // 8. Seed demo waste bins (Gorakhpur wards)
        // ================================================
        console.log("[Migration] Seeding demo waste bins...");
        const [existingBins] = await conn.query("SELECT COUNT(*) AS cnt FROM waste_bins");
        if (existingBins[0].cnt === 0) {
            const demoBins = [
                ["BIN-GKP-001", "Ward 12 - Golghar", "mixed",  26.7615, 83.3698, "Near Golghar Market", "demo"],
                ["BIN-GKP-002", "Ward 12 - Golghar", "dry",    26.7620, 83.3710, "Golghar Bus Stand",   "demo"],
                ["BIN-GKP-003", "Ward 18 - Mohaddipur", "wet", 26.7550, 83.3800, "Mohaddipur Market",   "demo"],
                ["BIN-GKP-004", "Ward 18 - Mohaddipur", "mixed",26.7545, 83.3790, "Near School Rd",     "demo"],
                ["BIN-GKP-005", "Ward 4 - Asuran", "mixed",    26.7480, 83.3650, "Asuran Chowk",        "demo"],
                ["BIN-GKP-006", "Ward 9 - Medical Zone", "mixed",26.7510, 83.3680,"BRD Medical Rd",     "demo"],
                ["BIN-GKP-007", "Ward 22 - Dharamshala", "dry", 26.7580, 83.3740,"Dharamshala Bazar",   "demo"],
                ["BIN-GKP-008", "Ward 1 - Civil Lines", "mixed",26.7530, 83.3600, "Civil Lines Rd",     "demo"],
                ["BIN-GKP-009", "Ward 3 - Railway Colony", "dry",26.7670,83.3760,"Near Railway Station", "demo"],
                ["BIN-GKP-010", "Ward 6 - Padrauna Rd", "wet", 26.7700, 83.3590, "Padrauna Rd Market",  "demo"],
                ["BIN-GKP-011", "Ward 7 - Gorakhpur Univ", "dry",26.7635,83.3720,"Univ Gate No 2",      "demo"],
                ["BIN-GKP-012", "Ward 15 - Transport Nagar","mixed",26.7320,83.3620,"Transport Nagar",   "demo"],
                ["BIN-GKP-013", "Ward 16 - GIDA Sector", "dry", 26.7150, 83.2850, "GIDA Main Rd",       "demo"],
                ["BIN-GKP-014", "Ward 20 - Ramgarh Taal", "wet",26.7400, 83.3500, "Ramgarh Lake Front",  "demo"],
                ["BIN-GKP-015", "Ward 11 - Purani Bazar", "mixed",26.7590,83.3730,"Purani Bazar Junction","demo"],
                ["BIN-GKP-016", "Ward 2 - Daudpur", "mixed",   26.7560, 83.3520, "Daudpur Market",      "demo"],
                ["BIN-GKP-017", "Ward 8 - Sahjanwa Rd", "wet",  26.7460, 83.3810, "Sahjanwa Rd",        "demo"],
                ["BIN-GKP-018", "Ward 14 - Humayunpur", "dry",  26.7500, 83.3850, "Humayunpur Colony",  "demo"]
            ];

            // Random fill levels for demo
            for (const bin of demoBins) {
                const fillLevel = Math.floor(Math.random() * 85) + 5;
                const status = fillLevel > 80 ? "overflow" : "operational";
                await conn.query(`
                    INSERT IGNORE INTO waste_bins
                    (bin_code, sector, bin_type, latitude, longitude, address, fill_source, fill_level, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [...bin, fillLevel, status]);
            }
            console.log("[Migration] ✅ Seeded 18 demo waste bins.");
        } else {
            console.log("[Migration] Waste bins already exist — skipping seed.");
        }

        // ================================================
        // 9. Seed demo waste vehicles
        // ================================================
        const [existingVehicles] = await conn.query("SELECT COUNT(*) AS cnt FROM waste_vehicles");
        if (existingVehicles[0].cnt === 0) {
            const demoVehicles = [
                ["VEH-GKP-001", "UP53-CG-0001", "compactor", 5.0, "Ward 12 - Golghar", "simulated"],
                ["VEH-GKP-002", "UP53-CG-0002", "auto_tipper", 2.5, "Ward 18 - Mohaddipur", "simulated"],
                ["VEH-GKP-003", "UP53-CG-0003", "compactor", 5.0, "Ward 4 - Asuran", "simulated"],
                ["VEH-GKP-004", "UP53-CG-0004", "tractor_trolley", 8.0, "Ward 9 - Medical Zone", "simulated"],
                ["VEH-GKP-005", "UP53-CG-0005", "compactor", 5.0, "Ward 22 - Dharamshala", "simulated"]
            ];
            for (const v of demoVehicles) {
                await conn.query(`
                    INSERT IGNORE INTO waste_vehicles
                    (vehicle_code, registration_no, vehicle_type, capacity_tonnes, assigned_sector, gps_source)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, v);
            }
            console.log("[Migration] ✅ Seeded 5 demo waste vehicles.");
        }

        // ================================================
        // 10. Enhance waste_bin_requests with missing columns
        // ================================================
        const enhanceCols = [
            "ALTER TABLE waste_bin_requests ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL",
            "ALTER TABLE waste_bin_requests ADD COLUMN IF NOT EXISTS internal_remarks TEXT DEFAULT NULL",
            "ALTER TABLE waste_bin_requests ADD COLUMN IF NOT EXISTS scheduled_date DATE DEFAULT NULL",
            "ALTER TABLE waste_bin_requests ADD COLUMN IF NOT EXISTS assigned_staff_id INT DEFAULT NULL",
            "ALTER TABLE waste_bin_requests ADD COLUMN IF NOT EXISTS assigned_staff_name VARCHAR(150) DEFAULT NULL",
            "ALTER TABLE waste_bin_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
        ];
        for (const col of enhanceCols) {
            try { await conn.query(col); } catch (e) { /* already exists */ }
        }
        console.log("[Migration] ✅ waste_bin_requests enhanced.");

        await conn.commit();
        console.log("\n[Migration] ✅ All migrations committed successfully.");
    } catch (err) {
        await conn.rollback();
        console.error("[Migration] ❌ ROLLBACK due to error:", err.message);
        throw err;
    } finally {
        conn.release();
        await pool.end();
    }
}

runMigration().then(() => {
    console.log("[Migration] Done.");
    process.exit(0);
}).catch(err => {
    console.error("[Migration] Fatal error:", err);
    process.exit(1);
});
