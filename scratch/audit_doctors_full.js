const db = require('../backend/config/db');

async function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function auditDoctors() {
  const doctors = await query("SELECT * FROM doctors ORDER BY id ASC");
  console.log(`Total doctors: ${doctors.length}`);
  doctors.forEach(d => console.log(JSON.stringify(d)));

  // Check which doctors have invalid or null hospital_id
  const unlinked = await query("SELECT d.* FROM doctors d LEFT JOIN hospitals h ON d.hospital_id = h.hospital_id WHERE h.hospital_id IS NULL");
  console.log('\nDoctors with unlinked or unknown hospital_id:', unlinked.length);
  unlinked.forEach(u => console.log(`Doctor ID ${u.id}: "${u.name}", hosp_id: "${u.hospital_id}"`));

  process.exit(0);
}

auditDoctors().catch(e => { console.error(e); process.exit(1); });
