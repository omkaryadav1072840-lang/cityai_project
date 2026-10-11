const pool = require('../backend/config/db');

async function inspect() {
    try {
        const [tables] = await pool.promise().query("SHOW TABLES LIKE 'patient%'");
        console.log("Patient tables:", tables.map(t => Object.values(t)[0]));

        const [aiTables] = await pool.promise().query("SHOW TABLES LIKE 'ai%'");
        console.log("AI tables:", aiTables.map(t => Object.values(t)[0]));

        const [patients] = await pool.promise().query("SELECT id, patient_id, name, user_id, hospital_id FROM patients LIMIT 5");
        console.log("Patients in DB:", patients);

        const [prescriptions] = await pool.promise().query("SELECT id, patient_id, doctor_name, medications_json FROM prescriptions LIMIT 5");
        console.log("Prescriptions in DB:", prescriptions);

        process.exit(0);
    } catch (err) {
        console.error("Inspection error:", err);
        process.exit(1);
    }
}

inspect();
