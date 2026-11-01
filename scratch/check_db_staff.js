const db = require("../backend/config/db");
db.query(
    "SELECT id, staff_id, name, role, department FROM staff WHERE staff_id LIKE '%BIN%' OR department = 'waste' OR role LIKE '%bin%'",
    (err, rows) => {
        if (err) {
            console.error("DB error:", err.message);
        } else {
            console.log("Matching staff rows in DB:", rows);
        }
        process.exit(0);
    }
);

