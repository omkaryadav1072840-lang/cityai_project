const path = require('path');
const db = require(path.join(__dirname, '../backend/config/db'));

db.query("SELECT id, request_code, user_id, citizen_name, citizen_mobile, department, category, status FROM service_requests LIMIT 10", (err, rows) => {
    if (err) console.error(err);
    else console.log("Service requests in DB:", rows);
    process.exit(0);
});
