/**
 * SmartCity AI - Water Network Usability & Multi-Point Pipeline Migration
 * 
 * Objectives:
 * 1. Create `water_network_audit_logs` table for tracking pipeline creation,
 *    multi-point vertex editing, asset relocations, route splits, and branching.
 * 2. Ensure `water_pipelines` has `branch_from_id`, `junction_id`, `slope_percent`,
 *    and `invert_level_m` columns for robust multi-point routing and sewage slope validation.
 * 3. Ensure `water_network_assets` supports extensible equipment specs (pump capacity,
 *    motor power, setpoints, sensor units, alarm thresholds).
 * 4. Provide safe, idempotent up() and reversible down() functions.
 */

const pool = require("../config/db").promise();

async function up() {
    console.log("🌊 [UP] Applying Water Network Usability & Multi-Point Routing Migration...\n");

    try {
        // 1. Create water_network_audit_logs table
        console.log("1. Creating water_network_audit_logs table...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS water_network_audit_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                action_type VARCHAR(64) NOT NULL,
                entity_type ENUM('PIPELINE', 'ASSET', 'JUNCTION', 'CORRIDOR') NOT NULL,
                entity_id VARCHAR(100) NOT NULL,
                entity_name VARCHAR(150) NULL,
                changed_by_id VARCHAR(50) DEFAULT 'WTR-ADMIN-01',
                changed_by_name VARCHAR(100) DEFAULT 'Water Admin',
                previous_state JSON NULL,
                new_state JSON NULL,
                impact_summary TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_entity (entity_type, entity_id),
                INDEX idx_action (action_type),
                INDEX idx_created (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log("   ✅ water_network_audit_logs table ready.");

        // 1b. Expand asset_type ENUM on water_network_assets
        console.log("1b. Expanding asset_type ENUM on water_network_assets...");
        await pool.query(`
            ALTER TABLE water_network_assets
            MODIFY COLUMN asset_type ENUM(
                'TREATMENT_PLANT_STP',
                'TREATMENT_PLANT_WTP',
                'WATER_SOURCE',
                'BOOSTER_PUMP',
                'CONTROL_VALVE',
                'DRAINAGE_OUTLET',
                'NETWORK_JUNCTION',
                'STORAGE_RESERVOIR',
                'DISCHARGE_POINT',
                'CONTROL_TOWER',
                'MOTOR',
                'PRESSURE_SENSOR',
                'FLOW_METER',
                'LEAK_DETECTOR'
            ) NOT NULL
        `);
        console.log("   + Expanded asset_type ENUM with FLOW_METER and LEAK_DETECTOR.");
        console.log("2. Verifying columns on water_pipelines...");
        const [pipelineCols] = await pool.query("DESCRIBE water_pipelines");
        const existingPipeCols = pipelineCols.map(c => c.Field);

        if (!existingPipeCols.includes("branch_from_id")) {
            await pool.query("ALTER TABLE water_pipelines ADD COLUMN branch_from_id VARCHAR(50) NULL AFTER pipeline_code");
            console.log("   + Added branch_from_id to water_pipelines");
        }
        if (!existingPipeCols.includes("junction_id")) {
            await pool.query("ALTER TABLE water_pipelines ADD COLUMN junction_id VARCHAR(50) NULL AFTER branch_from_id");
            console.log("   + Added junction_id to water_pipelines");
        }
        if (!existingPipeCols.includes("slope_percent")) {
            await pool.query("ALTER TABLE water_pipelines ADD COLUMN slope_percent DECIMAL(5,2) NULL DEFAULT 0.60 AFTER depth_meters");
            console.log("   + Added slope_percent to water_pipelines");
        }
        if (!existingPipeCols.includes("invert_level_m")) {
            await pool.query("ALTER TABLE water_pipelines ADD COLUMN invert_level_m DECIMAL(6,2) NULL DEFAULT 82.10 AFTER slope_percent");
            console.log("   + Added invert_level_m to water_pipelines");
        }

        // 3. Add columns to water_network_assets safely if missing
        console.log("3. Verifying columns on water_network_assets...");
        const [assetCols] = await pool.query("DESCRIBE water_network_assets");
        const existingAssetCols = assetCols.map(c => c.Field);

        if (!existingAssetCols.includes("pump_capacity_lps")) {
            await pool.query("ALTER TABLE water_network_assets ADD COLUMN pump_capacity_lps DECIMAL(8,2) NULL AFTER elevation_m");
            console.log("   + Added pump_capacity_lps to water_network_assets");
        }
        if (!existingAssetCols.includes("motor_power_kw")) {
            await pool.query("ALTER TABLE water_network_assets ADD COLUMN motor_power_kw DECIMAL(8,2) NULL AFTER pump_capacity_lps");
            console.log("   + Added motor_power_kw to water_network_assets");
        }
        if (!existingAssetCols.includes("pressure_setpoint_bar")) {
            await pool.query("ALTER TABLE water_network_assets ADD COLUMN pressure_setpoint_bar DECIMAL(5,2) NULL DEFAULT 3.40 AFTER motor_power_kw");
            console.log("   + Added pressure_setpoint_bar to water_network_assets");
        }
        if (!existingAssetCols.includes("flow_setpoint_lps")) {
            await pool.query("ALTER TABLE water_network_assets ADD COLUMN flow_setpoint_lps DECIMAL(7,2) NULL DEFAULT 85.00 AFTER pressure_setpoint_bar");
            console.log("   + Added flow_setpoint_lps to water_network_assets");
        }
        if (!existingAssetCols.includes("sensor_units")) {
            await pool.query("ALTER TABLE water_network_assets ADD COLUMN sensor_units VARCHAR(30) NULL DEFAULT 'bar' AFTER flow_setpoint_lps");
            console.log("   + Added sensor_units to water_network_assets");
        }
        if (!existingAssetCols.includes("alarm_min_threshold")) {
            await pool.query("ALTER TABLE water_network_assets ADD COLUMN alarm_min_threshold DECIMAL(6,2) NULL DEFAULT 1.50 AFTER sensor_units");
            console.log("   + Added alarm_min_threshold to water_network_assets");
        }
        if (!existingAssetCols.includes("alarm_max_threshold")) {
            await pool.query("ALTER TABLE water_network_assets ADD COLUMN alarm_max_threshold DECIMAL(6,2) NULL DEFAULT 5.50 AFTER alarm_min_threshold");
            console.log("   + Added alarm_max_threshold to water_network_assets");
        }

        // Seed initial audit log if empty
        const [[countLogs]] = await pool.query("SELECT COUNT(*) as c FROM water_network_audit_logs");
        if (Number(countLogs?.c || 0) === 0) {
            await pool.query(`
                INSERT INTO water_network_audit_logs
                (action_type, entity_type, entity_id, entity_name, changed_by_id, changed_by_name, impact_summary)
                VALUES
                ('BASELINE_INITIALIZED', 'PIPELINE', 'PL-FW-101', 'Golghar Central Potable Feeder', 'WTR-ADMIN-01', 'Er. R.N. Tripathi (Water Admin)', 'Baseline water digital twin network loaded with road alignments.'),
                ('BASELINE_INITIALIZED', 'ASSET', 'PUMP-01', 'Golghar Central Booster Pump Station', 'WTR-ADMIN-01', 'Er. R.N. Tripathi (Water Admin)', 'SCADA booster pump station registered.')
            `);
            console.log("   + Seeded baseline audit records.");
        }

        console.log("\n🎉 Water Network Usability Migration completed successfully!\n");
        return { success: true };
    } catch (err) {
        console.error("🔴 Migration error in up():", err);
        throw err;
    }
}

async function down() {
    console.log("🌊 [DOWN] Rolling back Water Network Usability Migration...\n");
    try {
        await pool.query("DROP TABLE IF EXISTS water_network_audit_logs");
        console.log("   Dropped water_network_audit_logs table.");
        return { success: true };
    } catch (err) {
        console.error("🔴 Migration error in down():", err);
        throw err;
    }
}

if (require.main === module) {
    up().then(() => process.exit(0)).catch(err => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = { up, down };
