const fs = require('fs');
const path = require('path');
const mysql = require('../backend/node_modules/mysql2/promise');
require('../backend/node_modules/dotenv').config({ path: path.join(__dirname, '../backend/.env') });

async function consolidate() {
    console.log("Starting schema consolidation for all 78 database tables...");
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'omkar',
        database: process.env.DB_NAME || 'smartcity'
    });

    const [tableRows] = await connection.query("SHOW TABLES;");
    const tables = tableRows.map(r => Object.values(r)[0]).sort();
    console.log(`Found ${tables.length} tables in live database.`);

    const existingSchemaPath = path.join(__dirname, '../backend/database/schema.sql');
    let existingSql = fs.readFileSync(existingSchemaPath, 'utf8');

    // Find existing table names in schema.sql
    const existingTableMatches = [...existingSql.matchAll(/CREATE TABLE IF NOT EXISTS `?([a-zA-Z0-9_]+)`?/gi)].map(m => m[1]);
    const existingSet = new Set(existingTableMatches);

    const missingTables = tables.filter(t => !existingSet.has(t));
    console.log(`Tables to append to schema.sql (${missingTables.length}):`, missingTables);

    let appendSql = "\n\n-- ====================================================================\n";
    appendSql += "-- EXTENDED MUNICIPAL SUBSYSTEMS & REAL-TIME MODULE TABLES\n";
    appendSql += "-- (Consolidated from migrations: traffic, hospital management, diagnostics,\n";
    appendSql += "--  famous places, tourism, parking slots, sensors, and audit ledgers)\n";
    appendSql += "-- ====================================================================\n\n";

    for (const tbl of missingTables) {
        const [[createRow]] = await connection.query(`SHOW CREATE TABLE \`${tbl}\`;`);
        let createTableStmt = createRow['Create Table'];
        
        // Transform `CREATE TABLE` to `CREATE TABLE IF NOT EXISTS`
        createTableStmt = createTableStmt.replace(/^CREATE TABLE `/i, 'CREATE TABLE IF NOT EXISTS `');
        // Remove transient AUTO_INCREMENT=... counts
        createTableStmt = createTableStmt.replace(/ AUTO_INCREMENT=\d+/i, '');

        appendSql += `-- Table: ${tbl}\n`;
        appendSql += `${createTableStmt};\n\n`;
    }

    fs.appendFileSync(existingSchemaPath, appendSql, 'utf8');
    console.log(`✅ Successfully appended all ${missingTables.length} missing tables to backend/database/schema.sql!`);

    // Verify
    const updatedSql = fs.readFileSync(existingSchemaPath, 'utf8');
    const updatedMatches = [...updatedSql.matchAll(/CREATE TABLE IF NOT EXISTS `?([a-zA-Z0-9_]+)`?/gi)].map(m => m[1]);
    console.log(`Verification: Total tables defined in schema.sql is now ${updatedMatches.length} / ${tables.length}.`);

    await connection.end();
}

consolidate().catch(e => {
    console.error("Consolidation error:", e);
    process.exit(1);
});
