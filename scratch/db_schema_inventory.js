const pool = require('../backend/config/db');

async function inspectDatabase() {
    const promisePool = pool.promise();
    try {
        const [tables] = await promisePool.query('SHOW TABLES');
        const dbName = process.env.DB_NAME || "smartcity";
        console.log(`=== DATABASE: ${dbName} ===`);
        console.log(`Total Tables: ${tables.length}`);
        
        const tableList = tables.map(r => Object.values(r)[0]);
        console.log("Tables:", tableList.sort().join(", "));

        const schema = {};
        for (const t of tableList) {
            const [[countRes]] = await promisePool.query(`SELECT COUNT(*) as cnt FROM \`${t}\``);
            const [cols] = await promisePool.query(`DESCRIBE \`${t}\``);
            schema[t] = {
                rows: countRes.cnt,
                columns: cols.map(c => `${c.Field} (${c.Type}${c.Null === 'NO' ? ' NOT NULL' : ''})`)
            };
        }
        
        console.log("\n=== ROW COUNTS PER TABLE ===");
        for (const [t, info] of Object.entries(schema)) {
            console.log(`- ${t}: ${info.rows} rows`);
        }

        process.exit(0);
    } catch (err) {
        console.error("DB Inspection Error:", err);
        process.exit(1);
    }
}

inspectDatabase();
