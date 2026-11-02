/**
 * SmartCity AI Traffic Platform - Rollback Migration for Traffic Production Schema
 * Safely removes added columns and new tables without disturbing baseline data.
 */

const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

async function runRollback() {
    console.log("⚠️ Starting Rollback of Traffic Production Schema Migration...");

    const pool = await mysql.createPool({
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : "omkar",
        database: process.env.DB_NAME || "smartcity",
        waitForConnections: true,
        connectionLimit: 10
    });

    try {
        const dropCols = async (table, cols) => {
            const [existing] = await pool.query(`DESCRIBE ${table}`);
            const names = existing.map(c => c.Field);
            for (const col of cols) {
                if (names.includes(col)) {
                    await pool.query(`ALTER TABLE ${table} DROP COLUMN ${col}`);
                    console.log(`  🔻 Dropped ${table}.${col}`);
                }
            }
        };

        // 1. Rollback traffic_junctions
        await dropCols("traffic_junctions", [
            "approach_lanes", "speed_limit_kmh", "pedestrian_crossing", "controller_id",
            "fail_safe_mode", "all_red_clearance", "min_cycle_time", "max_cycle_time", "starvation_max_wait_sec"
        ]);

        // 2. Rollback traffic_signals
        await dropCols("traffic_signals", [
            "min_green", "max_green", "clearance_interval", "all_red_time",
            "starvation_threshold_sec", "controller_ack", "last_ack_at"
        ]);

        // 3. Rollback traffic_cameras
        await dropCols("traffic_cameras", [
            "rtsp_stream_url", "hls_stream_url", "webrtc_stream_url", "stream_mode",
            "health_status", "last_ping_ms", "recording_policy", "stream_permissions",
            "maintenance_status", "last_health_check", "gateway_endpoint", "maintenance_notes"
        ]);

        // 4. Rollback traffic_violations
        await dropCols("traffic_violations", [
            "evidence_hash_sha256", "sensor_calibration_cert", "speed_limit_kmh",
            "dispute_status", "dispute_reason", "dispute_filed_at", "false_positive_reason",
            "retention_policy", "is_calibrated"
        ]);

        // 5. Rollback traffic_corridors
        await dropCols("traffic_corridors", [
            "preemption_distance_meters", "active_ambulance_id", "conflict_cleared", "speed_kmh"
        ]);

        // 6. Rollback ambulance_green_waves
        await dropCols("ambulance_green_waves", [
            "safety_checks_passed", "conflicting_traffic_cleared", "pedestrian_phase_cleared",
            "controller_ack", "route_deviation", "stale_gps_detected"
        ]);

        // 7. Drop optional new tables
        await pool.query("DROP TABLE IF EXISTS traffic_vehicle_observations");
        console.log("  🔻 Dropped traffic_vehicle_observations");
        await pool.query("DROP TABLE IF EXISTS ambulance_gps_telemetry");
        console.log("  🔻 Dropped ambulance_gps_telemetry");

        console.log("✅ Rollback Completed Successfully.");
        await pool.end();
        process.exit(0);
    } catch (err) {
        console.error("❌ Rollback Failed:", err.message);
        await pool.end();
        process.exit(1);
    }
}

if (require.main === module) {
    runRollback();
}

module.exports = { runRollback };

