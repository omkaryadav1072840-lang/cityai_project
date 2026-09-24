const path = require('path');
const db = require(path.join(__dirname, '../backend/config/db'));

db.query("SELECT id, patient_id, user_id, name, mobile, email FROM patients LIMIT 10", (err, pRows) => {
    if (err) console.error(err);
    else console.log("Patients in DB:", pRows);

    db.query("SELECT id, patient_id, doctor_id, appointment_date, appointment_time, status FROM appointments LIMIT 10", (err, aRows) => {
        if (err) console.error(err);
        else console.log("Appointments in DB:", aRows);
        process.exit(0);
    });
});
