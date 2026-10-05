const db = require('../backend/config/db');

db.query("SELECT id, doctor_id, name, specialization, hospital_id, email FROM doctors WHERE id < 98 ORDER BY id ASC", (err, rows) => {
  if (err) console.error(err);
  else {
    console.log(`Doctors id < 98: ${rows.length}`);
    rows.forEach(r => console.log(`[${r.id}] ${r.doctor_id} | ${r.name} | ${r.specialization} | hosp: ${r.hospital_id} | ${r.email}`));
  }
  process.exit(0);
});
