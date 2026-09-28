const pool = require('../backend/config/db');

async function checkRecords() {
    const p = pool.promise();
    const [recs] = await p.query('SELECT id, patient_id, doctor_name, diagnosis FROM patient_records');
    const [reps] = await p.query('SELECT id, patient_id, report_type, report_title FROM patient_reports');
    console.log("=== PATIENT RECORDS ===");
    console.table(recs);
    console.log("=== PATIENT REPORTS ===");
    console.table(reps);
    process.exit(0);
}
checkRecords();
