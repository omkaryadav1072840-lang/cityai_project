const db = require('./config/db');

async function checkHospitalAdmins() {
    try {
        const [rows] = await db.promise().query('SELECT staff_id, name, role, hospital_id, hospital_role FROM staff WHERE hospital_role = "hospital_admin" OR role = "hospital_admin"');
        console.log('Hospital admins:', rows.map(r => ({staff_id: r.staff_id, name: r.name, role: r.role, hospital_id: r.hospital_id, hospital_role: r.hospital_role})));
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}

checkHospitalAdmins();