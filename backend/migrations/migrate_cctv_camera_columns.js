const pool = require('../config/db');

async function migrate() {
    console.log("Migrating traffic_cameras table...");
    try {
        // 1. Modify status to VARCHAR(50) so it accepts honest statuses
        await pool.promise().query(`
            ALTER TABLE traffic_cameras 
            MODIFY COLUMN status VARCHAR(50) DEFAULT 'Configured'
        `);
        console.log("Updated status column to VARCHAR(50).");

        // 2. Add source_type if missing
        const [cols1] = await pool.promise().query("SHOW COLUMNS FROM traffic_cameras LIKE 'source_type'");
        if (cols1.length === 0) {
            await pool.promise().query(`
                ALTER TABLE traffic_cameras 
                ADD COLUMN source_type VARCHAR(50) DEFAULT 'phone_ip' AFTER sensor_type
            `);
            console.log("Added source_type column.");
        }

        // 3. Add playback_type if missing
        const [cols2] = await pool.promise().query("SHOW COLUMNS FROM traffic_cameras LIKE 'playback_type'");
        if (cols2.length === 0) {
            await pool.promise().query(`
                ALTER TABLE traffic_cameras 
                ADD COLUMN playback_type VARCHAR(50) DEFAULT 'auto' AFTER source_type
            `);
            console.log("Added playback_type column.");
        }

        // Print final columns
        const [desc] = await pool.promise().query("DESCRIBE traffic_cameras");
        console.log("Current columns:", desc.map(c => `${c.Field} (${c.Type})`));
        console.log("Migration complete!");
        process.exit(0);
    } catch (err) {
        console.error("Migration error:", err);
        process.exit(1);
    }
}

migrate();
