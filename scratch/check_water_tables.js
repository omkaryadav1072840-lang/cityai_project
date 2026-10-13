const pool = require('../backend/config/db').promise();

async function check() {
    const [tables] = await pool.query("SHOW TABLES LIKE '%water%'");
    console.log("Water tables:", tables.map(t => Object.values(t)[0]));
    const [sewageTables] = await pool.query("SHOW TABLES LIKE '%sewage%'");
    console.log("Sewage tables:", sewageTables.map(t => Object.values(t)[0]));
    process.exit(0);
}
check().catch(e => { console.error(e); process.exit(1); });
