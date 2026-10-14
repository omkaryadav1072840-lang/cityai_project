/**
 * SmartCity AI Traffic Platform - Role Assignment & GIS Migration
 * Adds assigned_junction columns to staff table and syncs junction officer rosters.
 */

const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function runMigration() {
    console.log("🚦 Starting Traffic Role Assignment & GIS Migration...");

    const pool = await mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'omkar',
        database: process.env.DB_NAME || 'smartcity',
        waitForConnections: true,
        connectionLimit: 10
    });

    try {
        // 1. Add assigned_junction_id and assigned_junction_name to staff table
        const [staffCols] = await pool.query("DESCRIBE staff");
        const colNames = staffCols.map(c => c.Field);

        if (!colNames.includes("assigned_junction_id")) {
            await pool.query("ALTER TABLE staff ADD COLUMN assigned_junction_id VARCHAR(50) DEFAULT NULL AFTER department");
            console.log("✅ Added assigned_junction_id column to staff table.");
        } else {
            console.log("ℹ️ staff already has assigned_junction_id column.");
        }

        if (!colNames.includes("assigned_junction_name")) {
            await pool.query("ALTER TABLE staff ADD COLUMN assigned_junction_name VARCHAR(150) DEFAULT NULL AFTER assigned_junction_id");
            console.log("✅ Added assigned_junction_name column to staff table.");
        } else {
            console.log("ℹ️ staff already has assigned_junction_name column.");
        }

        // 2. Synchronize Staff Accounts & Assigned Junctions
        await pool.query(`
            UPDATE staff 
            SET assigned_junction_id = 'JNC-02', 
                assigned_junction_name = 'Mohaddipur Junction' 
            WHERE staff_id IN ('TR-PANDEY', 'TRF001') OR name LIKE '%Amit Pandey%'
        `);
        console.log("✅ Assigned Sub-Insp. Amit Pandey & TRF001 to Mohaddipur Junction (JNC-02).");

        await pool.query(`
            UPDATE staff 
            SET assigned_junction_id = 'JNC-01', 
                assigned_junction_name = 'Golghar Central Crossing' 
            WHERE staff_id = 'TR-VERMA' OR name LIKE '%R.K. Verma%'
        `);
        console.log("✅ Assigned Insp. R.K. Verma to Golghar Central Crossing (JNC-01).");

        await pool.query(`
            UPDATE staff 
            SET assigned_junction_id = NULL, 
                assigned_junction_name = 'All Citywide Junctions (Full Admin)' 
            WHERE staff_id = 'TR-ADMIN' OR role = 'admin'
        `);
        console.log("✅ Configured ICCC Traffic Admin with full citywide access.");

        // 3. Synchronize traffic_junctions assigned officers
        await pool.query(`
            UPDATE traffic_junctions 
            SET assigned_officer_id = 'TR-PANDEY', 
                assigned_officer_name = 'Sub-Insp. Amit Pandey' 
            WHERE id IN ('JNC-02', 'JNC-09')
        `);

        await pool.query(`
            UPDATE traffic_junctions 
            SET assigned_officer_id = 'TR-VERMA', 
                assigned_officer_name = 'Insp. R.K. Verma' 
            WHERE id = 'JNC-01'
        `);
        console.log("✅ Synchronized assigned officers on traffic_junctions table.");

        // 4. Ensure cameras exist for JNC-02 (Mohaddipur)
        const [mCams] = await pool.query("SELECT COUNT(*) as count FROM traffic_cameras WHERE junction_id = 'JNC-02'");
        if (mCams[0].count === 0) {
            await pool.query(`
                INSERT INTO traffic_cameras 
                (id, junction_id, camera_name, direction, stream_url, vehicles_per_min, avg_speed, status)
                VALUES 
                ('CAM-02-E', 'JNC-02', 'Mohaddipur East - Deoria Highway Cam', 'East', 'https://stream.smartcity.gorakhpur.gov.in/cam-02-e.m3u8', 78, 12.8, 'Online'),
                ('CAM-02-N', 'JNC-02', 'Mohaddipur North - Cantt Approach Cam', 'North', 'https://stream.smartcity.gorakhpur.gov.in/cam-02-n.m3u8', 42, 22.0, 'Online'),
                ('CAM-02-W', 'JNC-02', 'Mohaddipur West - University Road Cam', 'West', 'https://stream.smartcity.gorakhpur.gov.in/cam-02-w.m3u8', 65, 16.4, 'Online')
            `);
            console.log("✅ Seeded 3 CCTV cameras for Mohaddipur Junction (JNC-02).");
        } else {
            console.log(`ℹ️ Mohaddipur Junction has ${mCams[0].count} CCTV cameras active.`);
        }

        console.log("🎉 Traffic Role Assignment & GIS Migration Completed Successfully!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration error:", err);
        process.exit(1);
    }
}

if (require.main === module) {
    runMigration();
}

module.exports = { runMigration };
