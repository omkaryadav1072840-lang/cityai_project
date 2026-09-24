const path = require('path');
const db = require(path.join(__dirname, '../backend/config/db'));

function testRequests(uid, mobile, label) {
    return new Promise(resolve => {
        let query = "SELECT id, request_code, citizen_name, citizen_mobile FROM service_requests WHERE 1=1";
        const params = [];
        query += " AND (user_id = ? OR (citizen_mobile = ? AND ? IS NOT NULL))";
        params.push(uid, mobile, mobile);

        db.query(query, params, (err, rows) => {
            console.log(`${label} (id=${uid}, mobile=${mobile}) requests count:`, rows ? rows.length : err);
            resolve();
        });
    });
}

async function run() {
    await testRequests(1, '6306880179', 'Omkar');
    await testRequests(2, '9876543210', 'Demo Citizen');
    await testRequests(999, '9999999999', 'New Unknown Citizen');
    process.exit(0);
}

run();
