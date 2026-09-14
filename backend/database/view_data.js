/**
 * SmartCity AI - Interactive Database Viewer CLI
 * Usage:
 *   node database/view_data.js               -> shows all tables & row counts
 *   node database/view_data.js <table_name>  -> shows all rows in that table (e.g. node database/view_data.js parking_lots)
 */

const pool = require("../config/db");

const tableName = process.argv[2];

async function viewDatabase() {
    try {
        if (!tableName) {
            console.log("\n=======================================================");
            console.log("             SMARTCITY DATABASE OVERVIEW");
            console.log("=======================================================");

            const [tables] = await pool.promise().query("SHOW TABLES;");
            const tableList = tables.map(t => Object.values(t)[0]);

            const summary = [];
            for (const tbl of tableList) {
                try {
                    const [countRows] = await pool.promise().query(`SELECT COUNT(*) as count FROM \`${tbl}\`;`);
                    summary.push({ "Table Name": tbl, "Total Records": countRows[0].count });
                } catch (e) {
                    summary.push({ "Table Name": tbl, "Total Records": "N/A" });
                }
            }

            console.table(summary);
            console.log("\n💡 TIP: To view records of any specific table, run:");
            console.log("   node database/view_data.js <table_name>\n");
            console.log("Examples:");
            console.log("   node database/view_data.js users");
            console.log("   node database/view_data.js parking_lots");
            console.log("   node database/view_data.js hospitals");
            console.log("   node database/view_data.js water_tanks\n");
        } else {
            console.log(`\n🔍 Fetching records from table: \x1b[36m${tableName}\x1b[0m...`);
            const [rows] = await pool.promise().query(`SELECT * FROM \`${tableName}\` LIMIT 50;`);

            if (rows.length === 0) {
                console.log(`ℹ️ Table '${tableName}' is currently empty (0 rows).`);
            } else {
                console.log(`✅ Found ${rows.length} record(s):\n`);
                console.table(rows);
            }
        }
    } catch (err) {
        console.error("\n❌ Database error:", err.message);
    } finally {
        await pool.promise().end();
        process.exit(0);
    }
}

viewDatabase();
