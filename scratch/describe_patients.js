const path = require('path');
const db = require(path.join(__dirname, '../backend/config/db'));

db.query("DESCRIBE patients", (err, cols) => {
    if (err) console.error(err);
    else console.log("Patients columns:", cols.map(c => c.Field));
    db.query("SELECT id, patient_id, user_id, name, mobile FROM patients LIMIT 10", (err, rows) => {
        if (err) console.error(err);
        else console.log("Patients rows:", rows);
        process.exit(0);
    });
});
