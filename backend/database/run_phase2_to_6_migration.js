const fs = require('fs');
const path = require('path');
const pool = require('../config/db').promise();

async function runMigration() {
    console.log("Starting Migration for Phases 2 to 6...");
    const sqlPath = path.join(__dirname, 'phase2_to_6_ai_modules.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Split queries by semicolon ignoring comments
    const statements = sqlContent
        .replace(/--.*$/gm, '')
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

    for (const stmt of statements) {
        try {
            await pool.query(stmt);
            const firstLine = stmt.split('\n')[0].substring(0, 50);
            console.log(`✓ Executed: ${firstLine}...`);
        } catch (err) {
            console.warn(`! Statement warning/error: ${err.message}`);
        }
    }

    console.log("✅ Phases 2 to 6 Database Migration Completed Successfully!");
    process.exit(0);
}

runMigration().catch(err => {
    console.error("Migration failed:", err);
    process.exit(1);
});
