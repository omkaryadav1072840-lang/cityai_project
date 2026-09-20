const db = require('../backend/config/db');

async function audit() {
  console.log('=== AUDITING HOSPITALS TABLE ===');
  const [hospitals] = await db.promise().query('SELECT id, hospital_id, hospital_name, address, phone FROM hospitals ORDER BY hospital_name');
  console.log(`Total hospitals: ${hospitals.length}`);
  hospitals.forEach(h => console.log(`[ID: ${h.id}] ${h.hospital_id} - "${h.hospital_name}" - ${h.address}`));

  // Check duplicate hospital names
  const [hospDupes] = await db.promise().query(`
    SELECT LOWER(TRIM(hospital_name)) as norm_name, MAX(hospital_name) as hospital_name, COUNT(*) as cnt, GROUP_CONCAT(hospital_id) as ids, GROUP_CONCAT(id) as db_ids
    FROM hospitals
    GROUP BY LOWER(TRIM(hospital_name))
    HAVING cnt > 1
  `);
  console.log('\nDuplicate Hospitals by Name:');
  console.log(hospDupes);

  console.log('\n=== AUDITING PHARMACY / MEDICINES TABLE ===');
  const [tables] = await db.promise().query("SHOW TABLES LIKE '%pharm%'");
  console.log('Pharmacy tables found:', tables);

  const [pharmacyRows] = await db.promise().query('SELECT id, medicine_name, category, price, quantity FROM pharmacy ORDER BY medicine_name');
  console.log(`Total pharmacy items: ${pharmacyRows.length}`);
  pharmacyRows.forEach(p => console.log(`[ID: ${p.id}] "${p.medicine_name}" - Cat: ${p.category} - Rs ${p.price} - Qty: ${p.quantity}`));

  const [pharmDupes] = await db.promise().query(`
    SELECT LOWER(TRIM(medicine_name)) as norm_name, MAX(medicine_name) as medicine_name, MAX(category) as category, COUNT(*) as cnt, GROUP_CONCAT(id) as db_ids
    FROM pharmacy
    GROUP BY LOWER(TRIM(medicine_name))
    HAVING cnt > 1
  `);
  console.log('\nDuplicate Pharmacy Items by Medicine Name:');
  console.log(pharmDupes);

  console.log('\n=== AUDITING DOCTORS TABLE ===');
  const [docDupes] = await db.promise().query(`
    SELECT LOWER(TRIM(name)) as norm_name, MAX(name) as name, MAX(specialization) as specialization, COUNT(*) as cnt, GROUP_CONCAT(doctor_id) as ids
    FROM doctors
    GROUP BY LOWER(TRIM(name))
    HAVING cnt > 1
  `);
  console.log('Duplicate Doctors:', docDupes);

  process.exit(0);
}

audit().catch(err => {
  console.error(err);
  process.exit(1);
});
