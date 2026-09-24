const path = require('path');
const { hashPassword, verifyPassword } = require(path.join(__dirname, '../backend/middleware/auth.middleware'));
const db = require(path.join(__dirname, '../backend/config/db'));

db.query("SELECT id, name, mobile, email, password FROM users WHERE mobile IN ('6306880179', '9876543210')", (err, rows) => {
    if (err) return console.error(err);
    rows.forEach(u => {
        console.log(u.mobile, 'testing password123:', verifyPassword('password123', u.password));
        console.log(u.mobile, 'testing citizen123:', verifyPassword('citizen123', u.password));
    });
    process.exit(0);
});
