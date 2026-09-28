const pool = require('../backend/config/db');

async function describeTables() {
    const p = pool.promise();
    const [cols1] = await p.query('DESCRIBE patient_reports');
    console.log("=== patient_reports COLUMNS ===");
    console.table(cols1);

    const [cols2] = await p.query('DESCRIBE patient_records');
    console.log("=== patient_records COLUMNS ===");
    console.table(cols2);

    const [reps] = await p.query('SELECT * FROM patient_reports');
    console.log("=== patient_reports ROWS ===");
    console.table(reps);

    const [recs] = await p.query('SELECT * FROM patient_records');
    console.log("=== patient_records ROWS ===");
    console.table(recs);

    process.exit(0);
}
describeTables();
