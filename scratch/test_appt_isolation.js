const path = require('path');
const db = require(path.join(__dirname, '../backend/config/db'));

function testAppts(uid, mobile, label) {
    return new Promise(resolve => {
        let sql = `
            SELECT a.id, a.patient_id, p.name AS patient_name, p.mobile
            FROM appointments a
            LEFT JOIN patients p ON a.patient_id = p.patient_id
            WHERE (p.user_id = ? OR (p.mobile = ? AND ? IS NOT NULL))
        `;
        db.query(sql, [uid, mobile, mobile], (err, rows) => {
            console.log(`${label} (id=${uid}, mobile=${mobile}) appointments count:`, rows ? rows.length : err);
            resolve();
        });
    });
}

async function run() {
    await testAppts(1, '6306880179', 'Omkar');
    await testAppts(2, '9876543210', 'Demo Citizen');
    await testAppts(999, '9999999999', 'New Unknown Citizen');
    process.exit(0);
}

run();
