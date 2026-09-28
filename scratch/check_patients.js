const pool = require('../backend/config/db');

async function checkPatients() {
    const p = pool.promise();
    const [rows] = await p.query('SELECT id, patient_id, name, mobile, user_id FROM patients LIMIT 10');
    console.table(rows);
    process.exit(0);
}
checkPatients();
