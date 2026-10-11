const pool = require('../backend/config/db');

async function inspectPrescriptions() {
    try {
        const [rows] = await pool.promise().query(
            "SELECT id, patient_id, doctor_name, diagnosis, medications_json, advice, prescription_file FROM prescriptions WHERE patient_id IN ('SC-2026-318028', 'PAT-5931984821', 'PAT-VERIFY-5695')"
        );
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
inspectPrescriptions();
