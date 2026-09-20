const pool = require('../backend/config/db');

async function run() {
  const p = pool.promise();
  const [wards] = await p.query('SELECT * FROM hospital_wards');
  console.log('=== HOSPITAL WARDS ===');
  console.log(wards);

  const [categories] = await p.query("SELECT * FROM hospital_bed_categories WHERE hospital_id = 'HOSP-002'");
  console.log('=== HOSP-002 (BRD) BED CATEGORIES ===');
  console.log(categories);

  const [brdDoc] = await p.query("SELECT * FROM doctors WHERE hospital_id = 'HOSP-002'");
  console.log('=== HOSP-002 (BRD) DOCTORS ===');
  console.log(brdDoc);

  const [hosp] = await p.query("SELECT id, hospital_id, hospital_name, total_beds, icu_beds, emergency_beds, doctors_count FROM hospitals WHERE hospital_id = 'HOSP-002'");
  console.log('=== HOSP-002 (BRD) HOSPITAL ROW ===');
  console.log(hosp);

  process.exit(0);
}

run();
