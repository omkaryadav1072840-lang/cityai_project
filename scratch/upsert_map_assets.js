const pool = require('../backend/config/db').promise();

async function run() {
    try {
        console.log("Altering asset_type enum to include PRESSURE_SENSOR...");
        await pool.query(`ALTER TABLE water_network_assets MODIFY COLUMN asset_type ENUM('TREATMENT_PLANT_STP','TREATMENT_PLANT_WTP','WATER_SOURCE','BOOSTER_PUMP','CONTROL_VALVE','DRAINAGE_OUTLET','NETWORK_JUNCTION','STORAGE_RESERVOIR','DISCHARGE_POINT','CONTROL_TOWER','MOTOR','PRESSURE_SENSOR')`);
        
        console.log("Upserting SNSR-01...");
        await pool.query(`
            INSERT INTO water_network_assets (asset_id, name, asset_type, zone, latitude, longitude, elevation_m, depth_m, status, specifications, last_reading)
            VALUES ('SNSR-01', 'Pressure Sensor (PS-01)', 'PRESSURE_SENSOR', 'Golghar Central', 26.7590, 83.3745, 82.5, 1.8, 'OPERATIONAL', '{"type":"Pressure Sensor","accuracy":"0.05 bar"}', '{"pressure_bar":3.40}')
            ON DUPLICATE KEY UPDATE name='Pressure Sensor (PS-01)', asset_type='PRESSURE_SENSOR', latitude=26.7590, longitude=83.3745, status='OPERATIONAL'
        `);

        console.log("Updating PL-101 to Main Pipeline (M-001)...");
        await pool.query(`
            UPDATE water_pipelines 
            SET name='Main Pipeline (M-001)', diameter_mm=600, material='Ductile Iron', depth_meters=1.80, flow_rate_lps=85.00, pressure_bar=3.40, status='Normal'
            WHERE pipeline_code='PL-101'
        `);

        // Also clean up any lingering TEST-PUMP-% and TEST-DRN-% from test suites to keep database pristine
        const [delResult] = await pool.query(`DELETE FROM water_network_assets WHERE asset_id LIKE 'TEST-%'`);
        console.log(`Cleaned up ${delResult.affectedRows} temporary test assets.`);

        console.log("Assets and M-001 updated successfully!");
    } catch (err) {
        console.error("Migration error:", err);
    } finally {
        process.exit(0);
    }
}

run();
