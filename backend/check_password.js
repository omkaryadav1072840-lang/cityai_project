const db = require('./config/db');

async function checkPassword() {
    try {
        const [rows] = await db.promise().query('SELECT staff_id, password FROM staff WHERE staff_id = "STAFF-HOSP-ADMIN"');
        console.log('Staff:', rows);
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}

checkPassword();