const db = require('../backend/config/db');

async function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function deepAudit2() {
  console.log('=== DOCTORS SCHEMA & ALL ROWS ===');
  const docCols = await query("DESCRIBE doctors");
  console.log('Doctors columns:', docCols.map(c => `${c.Field} (${c.Type})`).join(', '));
  const doctors = await query("SELECT * FROM doctors");
  console.log(`Doctors count: ${doctors.length}`);
  doctors.forEach(d => console.log(JSON.stringify(d)));

  console.log('\n=== HOSPITALS ALL ROWS ===');
  const hospitals = await query("SELECT id, hospital_id, hospital_name, hospital_type, address, phone FROM hospitals");
  hospitals.forEach(h => console.log(JSON.stringify(h)));

  console.log('\n=== APPOINTMENTS WITH NULL OR UNLINKED HOSPITALS/DOCTORS ===');
  const unlinkedAppts = await query("SELECT id, patient_id, hospital_id, doctor, doctor_id FROM appointments WHERE hospital_id IS NULL OR doctor_id IS NULL");
  console.log(`Unlinked appts count: ${unlinkedAppts.length}`);
  unlinkedAppts.forEach(a => console.log(JSON.stringify(a)));

  console.log('\n=== CHECK AMBULANCES TABLE ===');
  const amb = await query("SELECT id, ambulance_id, vehicle_number, driver_name, hospital_name, destination_hospital_id, status FROM ambulances");
  amb.forEach(a => console.log(JSON.stringify(a)));

  console.log('\n=== CHECK HOSPITAL_BEDS VS HOSPITALS ===');
  const hBeds = await query("SELECT hb.id, hb.hospital_name, h.hospital_id, h.hospital_name as linked_name FROM hospital_beds hb LEFT JOIN hospitals h ON hb.hospital_name = h.hospital_name");
  hBeds.forEach(b => console.log(`HB ID ${b.id}: "${b.hospital_name}" -> matched hospital: "${b.linked_name}" (${b.hospital_id})`));

  console.log('\n=== CHECK EMERGENCY CASES ===');
  const emgCols = await query("DESCRIBE emergency_cases");
  console.log('Emergency cols:', emgCols.map(c => `${c.Field} (${c.Type})`).join(', '));
  const emg = await query("SELECT id, patient_name, hospital_id, status FROM emergency_cases");
  emg.forEach(e => console.log(JSON.stringify(e)));

  process.exit(0);
}

deepAudit2().catch(e => { console.error(e); process.exit(1); });
