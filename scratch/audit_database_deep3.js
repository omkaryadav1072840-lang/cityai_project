const db = require('../backend/config/db');

async function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function auditData() {
  console.log('=== APPOINTMENTS SCHEMA ===');
  const apptCols = await query("DESCRIBE appointments");
  console.log(apptCols.map(c => `${c.Field} (${c.Type}, Null: ${c.Null}, Default: ${c.Default})`).join('\n'));

  console.log('\n=== PHARMACY MEDICINES DUPLICATES ===');
  const meds = await query("SELECT id, medicine_name, category, quantity, price, availability FROM pharmacy ORDER BY id ASC");
  console.log(`Pharmacy rows: ${meds.length}`);
  meds.forEach(m => console.log(JSON.stringify(m)));
  
  const medDupes = await query("SELECT medicine_name, COUNT(*) as cnt FROM pharmacy GROUP BY medicine_name HAVING cnt > 1");
  console.log('Duplicate medicine names:', medDupes);

  console.log('\n=== WARD BEDS UNLINKED HOSPITALS ===');
  const wardHosp = await query("SELECT DISTINCT hospital_id FROM hospital_ward_beds");
  console.log('Distinct hospital_ids in hospital_ward_beds:', wardHosp);

  console.log('\n=== BED CATEGORIES UNLINKED HOSPITALS ===');
  const catHosp = await query("SELECT DISTINCT hospital_id FROM hospital_bed_categories");
  console.log('Distinct hospital_ids in hospital_bed_categories:', catHosp);

  console.log('\n=== PATIENTS TABLE ===');
  const patients = await query("SELECT id, patient_id, name, phone, email FROM patients");
  console.log(`Patients count: ${patients.length}`);
  patients.forEach(p => console.log(JSON.stringify(p)));

  const patientDupes = await query("SELECT patient_id, COUNT(*) as cnt FROM patients GROUP BY patient_id HAVING cnt > 1");
  console.log('Duplicate patient_ids:', patientDupes);

  process.exit(0);
}

auditData().catch(e => { console.error(e); process.exit(1); });
