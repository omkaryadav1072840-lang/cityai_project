const path = require('path');
const db = require(path.join(__dirname, '../backend/config/db'));

db.query("SELECT id, name, mobile, email, role, password FROM users LIMIT 10", [], (err, rows) => {
    if (err) {
        console.error("DB error:", err);
    } else {
        console.log("Users in DB:", rows);
    }
    process.exit(0);
});
