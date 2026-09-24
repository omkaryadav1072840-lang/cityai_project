const path = require('path');
const { hashPassword } = require(path.join(__dirname, '../backend/middleware/auth.middleware'));
const db = require(path.join(__dirname, '../backend/config/db'));

const newHash = hashPassword('password123');
db.query("UPDATE users SET password = ? WHERE mobile = '6306880179'", [newHash], (err, res) => {
    if (err) {
        console.error("Error updating password:", err);
    } else {
        console.log("Successfully updated password for 6306880179 to password123! Rows affected:", res.affectedRows);
    }
    process.exit(0);
});
