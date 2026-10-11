const pool = require('../backend/config/db');

async function inspectUsers() {
    try {
        const [users] = await pool.promise().query(
            "SELECT id, name, email, mobile, role FROM users LIMIT 10"
        );
        console.log("Users:", users);

        const [patients] = await pool.promise().query(
            "SELECT id, user_id, patient_id, name, mobile, emergency_info FROM patients LIMIT 10"
        );
        console.log("Patients:", patients);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
inspectUsers();
