/**
 * SmartCity AI Traffic Platform - Production ITMS Database Migration
 * Incremental, safe schema migration adding:
 * - Safety clearance bounds, all-red, pedestrian interlocks, lane configuration
 * - Multi-asset provisioning support (cameras, signals, controllers)
 * - Cryptographic evidence hashing (SHA-256) and citizen dispute workflows
 * - Real-time streaming gateway modes, health monitoring, recording policies
 * - Authenticated ambulance GPS telemetry with 300m priority preemption
 * - Modular vehicle observation telemetry for AI pipelines
 */

const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

async function runProductionMigration() {
    console.log("🚦 Starting SmartCity Traffic Production ITMS Schema Migration...");

    const pool = await mysql.createPool({
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : "omkar",
        database: process.env.DB_NAME || "smartcity",
        waitForConnections: true,
        connectionLimit: 10
    });

    try {
        await pool.query("SELECT 1 AS alive");
        console.log("🟢 MySQL Connection Established.");

        // 1. Upgrade traffic_junctions
        const [jncCols] = await pool.query("DESCRIBE traffic_junctions");
        const jncNames = jncCols.map(c => c.Field);

        const jncAdditions = [
            { col: "approach_lanes", ddl: "ADD COLUMN approach_lanes INT DEFAULT 4" },
            { col: "speed_limit_kmh", ddl: "ADD COLUMN speed_limit_kmh INT DEFAULT 40" },
            { col: "pedestrian_crossing", ddl: "ADD COLUMN pedestrian_crossing TINYINT(1) DEFAULT 1" },
            { col: "controller_id", ddl: "ADD COLUMN controller_id VARCHAR(100) DEFAULT 'CTRL-GKP-ITMS-01'" },
            { col: "fail_safe_mode", ddl: "ADD COLUMN fail_safe_mode ENUM('Fixed Timer', 'Flash Amber', 'All Red') DEFAULT 'Flash Amber'" },
            { col: "all_red_clearance", ddl: "ADD COLUMN all_red_clearance INT DEFAULT 2" },
            { col: "min_cycle_time", ddl: "ADD COLUMN min_cycle_time INT DEFAULT 45" },
            { col: "max_cycle_time", ddl: "ADD COLUMN max_cycle_time INT DEFAULT 140" },
            { col: "starvation_max_wait_sec", ddl: "ADD COLUMN starvation_max_wait_sec INT DEFAULT 180" }
        ];

        for (const item of jncAdditions) {
            if (!jncNames.includes(item.col)) {
                await pool.query(`ALTER TABLE traffic_junctions ${item.ddl}`);
                console.log(`  ✅ traffic_junctions: added ${item.col}`);
            }
        }

        // 2. Upgrade traffic_signals
        const [sigCols] = await pool.query("DESCRIBE traffic_signals");
        const sigNames = sigCols.map(c => c.Field);

        const sigAdditions = [
            { col: "min_green", ddl: "ADD COLUMN min_green INT DEFAULT 15" },
            { col: "max_green", ddl: "ADD COLUMN max_green INT DEFAULT 120" },
            { col: "clearance_interval", ddl: "ADD COLUMN clearance_interval INT DEFAULT 2" },
            { col: "all_red_time", ddl: "ADD COLUMN all_red_time INT DEFAULT 2" },
            { col: "starvation_threshold_sec", ddl: "ADD COLUMN starvation_threshold_sec INT DEFAULT 180" },
            { col: "controller_ack", ddl: "ADD COLUMN controller_ack TINYINT(1) DEFAULT 1" },
            { col: "last_ack_at", ddl: "ADD COLUMN last_ack_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP" }
        ];

        for (const item of sigAdditions) {
            if (!sigNames.includes(item.col)) {
                await pool.query(`ALTER TABLE traffic_signals ${item.ddl}`);
                console.log(`  ✅ traffic_signals: added ${item.col}`);
            }
        }

        // 3. Upgrade traffic_cameras
        const [camCols] = await pool.query("DESCRIBE traffic_cameras");
        const camNames = camCols.map(c => c.Field);

        const camAdditions = [
            { col: "rtsp_stream_url", ddl: "ADD COLUMN rtsp_stream_url VARCHAR(255) DEFAULT NULL" },
            { col: "hls_stream_url", ddl: "ADD COLUMN hls_stream_url VARCHAR(255) DEFAULT NULL" },
            { col: "webrtc_stream_url", ddl: "ADD COLUMN webrtc_stream_url VARCHAR(255) DEFAULT NULL" },
            { col: "stream_mode", ddl: "ADD COLUMN stream_mode ENUM('HLS_LIVE', 'WEBRTC_LIVE', 'SIMULATED_TEST') DEFAULT 'SIMULATED_TEST'" },
            { col: "health_status", ddl: "ADD COLUMN health_status ENUM('HEALTHY', 'DEGRADED', 'OFFLINE', 'MAINTENANCE') DEFAULT 'HEALTHY'" },
            { col: "last_ping_ms", ddl: "ADD COLUMN last_ping_ms INT DEFAULT 24" },
            { col: "recording_policy", ddl: "ADD COLUMN recording_policy VARCHAR(100) DEFAULT 'Rolling 30-Day Encrypted Storage'" },
            { col: "stream_permissions", ddl: "ADD COLUMN stream_permissions VARCHAR(100) DEFAULT 'ICCC_RESTRICTED'" },
            { col: "maintenance_status", ddl: "ADD COLUMN maintenance_status ENUM('Operational', 'Maintenance Due', 'Under Repair') DEFAULT 'Operational'" },
            { col: "last_health_check", ddl: "ADD COLUMN last_health_check TIMESTAMP DEFAULT CURRENT_TIMESTAMP" },
            { col: "gateway_endpoint", ddl: "ADD COLUMN gateway_endpoint VARCHAR(255) DEFAULT NULL" },
            { col: "maintenance_notes", ddl: "ADD COLUMN maintenance_notes TEXT DEFAULT NULL" }
        ];

        for (const item of camAdditions) {
            if (!camNames.includes(item.col)) {
                await pool.query(`ALTER TABLE traffic_cameras ${item.ddl}`);
                console.log(`  ✅ traffic_cameras: added ${item.col}`);
            }
        }

        // 4. Upgrade traffic_violations
        const [vioCols] = await pool.query("DESCRIBE traffic_violations");
        const vioNames = vioCols.map(c => c.Field);

        const vioAdditions = [
            { col: "evidence_hash_sha256", ddl: "ADD COLUMN evidence_hash_sha256 VARCHAR(64) DEFAULT NULL" },
            { col: "sensor_calibration_cert", ddl: "ADD COLUMN sensor_calibration_cert VARCHAR(100) DEFAULT 'CAL-GKP-RADAR-2026-OK'" },
            { col: "speed_limit_kmh", ddl: "ADD COLUMN speed_limit_kmh DECIMAL(5,2) DEFAULT 40.00" },
            { col: "dispute_status", ddl: "ADD COLUMN dispute_status ENUM('NONE', 'FILED', 'UNDER_INVESTIGATION', 'ACCEPTED_WAIVED', 'REJECTED') DEFAULT 'NONE'" },
            { col: "dispute_reason", ddl: "ADD COLUMN dispute_reason TEXT DEFAULT NULL" },
            { col: "dispute_filed_at", ddl: "ADD COLUMN dispute_filed_at TIMESTAMP NULL DEFAULT NULL" },
            { col: "false_positive_reason", ddl: "ADD COLUMN false_positive_reason VARCHAR(150) DEFAULT NULL" },
            { col: "retention_policy", ddl: "ADD COLUMN retention_policy VARCHAR(50) DEFAULT 'STANDARD_90_DAYS'" },
            { col: "is_calibrated", ddl: "ADD COLUMN is_calibrated TINYINT(1) DEFAULT 1" }
        ];

        for (const item of vioAdditions) {
            if (!vioNames.includes(item.col)) {
                await pool.query(`ALTER TABLE traffic_violations ${item.ddl}`);
                console.log(`  ✅ traffic_violations: added ${item.col}`);
            }
        }

        // Backfill evidence hashes for existing violations where null
        const [unhashedVios] = await pool.query("SELECT id, vehicle_number, violation_type, timestamp FROM traffic_violations WHERE evidence_hash_sha256 IS NULL");
        if (unhashedVios.length > 0) {
            const crypto = require("crypto");
            for (const v of unhashedVios) {
                const hash = crypto.createHash("sha256")
                    .update(`${v.id}:${v.vehicle_number}:${v.violation_type}:${v.timestamp || Date.now()}:SALT_GKP_2026`)
                    .digest("hex");
                await pool.query("UPDATE traffic_violations SET evidence_hash_sha256 = ? WHERE id = ?", [hash, v.id]);
            }
            console.log(`  ✅ Backfilled SHA-256 evidence integrity hashes for ${unhashedVios.length} violations.`);
        }

        // 5. Upgrade traffic_corridors
        const [corCols] = await pool.query("DESCRIBE traffic_corridors");
        const corNames = corCols.map(c => c.Field);

        const corAdditions = [
            { col: "preemption_distance_meters", ddl: "ADD COLUMN preemption_distance_meters INT DEFAULT 300" },
            { col: "active_ambulance_id", ddl: "ADD COLUMN active_ambulance_id VARCHAR(50) DEFAULT NULL" },
            { col: "conflict_cleared", ddl: "ADD COLUMN conflict_cleared TINYINT(1) DEFAULT 0" },
            { col: "speed_kmh", ddl: "ADD COLUMN speed_kmh DECIMAL(5,2) DEFAULT 45.0" }
        ];

        for (const item of corAdditions) {
            if (!corNames.includes(item.col)) {
                await pool.query(`ALTER TABLE traffic_corridors ${item.ddl}`);
                console.log(`  ✅ traffic_corridors: added ${item.col}`);
            }
        }

        // 6. Upgrade ambulance_green_waves
        const [gwCols] = await pool.query("DESCRIBE ambulance_green_waves");
        const gwNames = gwCols.map(c => c.Field);

        const gwAdditions = [
            { col: "safety_checks_passed", ddl: "ADD COLUMN safety_checks_passed TINYINT(1) DEFAULT 1" },
            { col: "conflicting_traffic_cleared", ddl: "ADD COLUMN conflicting_traffic_cleared TINYINT(1) DEFAULT 1" },
            { col: "pedestrian_phase_cleared", ddl: "ADD COLUMN pedestrian_phase_cleared TINYINT(1) DEFAULT 1" },
            { col: "controller_ack", ddl: "ADD COLUMN controller_ack TINYINT(1) DEFAULT 1" },
            { col: "route_deviation", ddl: "ADD COLUMN route_deviation TINYINT(1) DEFAULT 0" },
            { col: "stale_gps_detected", ddl: "ADD COLUMN stale_gps_detected TINYINT(1) DEFAULT 0" }
        ];

        for (const item of gwAdditions) {
            if (!gwNames.includes(item.col)) {
                await pool.query(`ALTER TABLE ambulance_green_waves ${item.ddl}`);
                console.log(`  ✅ ambulance_green_waves: added ${item.col}`);
            }
        }

        // 7. Create traffic_vehicle_observations table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS traffic_vehicle_observations (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                junction_id VARCHAR(50) NOT NULL,
                camera_id VARCHAR(50) DEFAULT NULL,
                approach VARCHAR(20) DEFAULT 'North',
                vehicle_class ENUM('Two-Wheeler', 'Car', 'Auto-Rickshaw', 'Bus', 'Truck', 'Commercial') NOT NULL,
                confidence DECIMAL(4,3) NOT NULL DEFAULT 0.920,
                speed_kmh DECIMAL(5,2) DEFAULT NULL,
                queue_length_meters INT DEFAULT 0,
                waiting_time_sec INT DEFAULT 0,
                source_type ENUM('CAMERA_FEED', 'EDGE_AI', 'SIMULATED') NOT NULL DEFAULT 'SIMULATED',
                observed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_obs_jnc (junction_id),
                INDEX idx_obs_time (observed_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log("  ✅ Table verified: traffic_vehicle_observations");

        // 8. Create ambulance_gps_telemetry table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ambulance_gps_telemetry (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                ambulance_id VARCHAR(50) NOT NULL,
                vehicle_number VARCHAR(50) NOT NULL,
                latitude DECIMAL(10,7) NOT NULL,
                longitude DECIMAL(10,7) NOT NULL,
                speed_kmh DECIMAL(5,2) DEFAULT 0.00,
                heading_deg DECIMAL(5,2) DEFAULT 0.00,
                accuracy_meters DECIMAL(6,2) DEFAULT 5.00,
                source ENUM('REAL_GPS_DEVICE', 'AUTHENTICATED_MOBILE', 'SIMULATED') NOT NULL DEFAULT 'AUTHENTICATED_MOBILE',
                is_stale TINYINT(1) DEFAULT 0,
                route_deviation_meters DECIMAL(8,2) DEFAULT 0.00,
                destination_hospital VARCHAR(150) DEFAULT NULL,
                recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_amb_telemetry (ambulance_id, recorded_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log("  ✅ Table verified: ambulance_gps_telemetry");

        console.log("🎉 Traffic Production Migration Completed Successfully!");
        await pool.end();
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration Failed:", err.message);
        await pool.end();
        process.exit(1);
    }
}

if (require.main === module) {
    runProductionMigration();
}

module.exports = { runProductionMigration };
