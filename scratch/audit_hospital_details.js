const db = require('../backend/config/db');

async function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function deepAudit() {
  console.log('=== DOCTORS COLUMNS ===');
  const docCols = await query("DESCRIBE doctors");
  console.log(docCols.map(c => c.Field + ' (' + c.Type + ')').join(', '));

  console.log('\n=== DOCTORS DETAILED AUDIT ===');
  const doctors = await query("SELECT * FROM doctors ORDER BY id ASC");
  console.log(`Doctors count: ${doctors.length}`);
  doctors.forEach(d => console.log(`  ID ${d.id} | name: "${d.name}" | spec: "${d.specialization}" | hosp_id: "${d.hospital_id}" | dept: "${d.department}" | avail: "${d.availability_days || d.availability}"`));

  console.log('\n=== DOCTORS LINKED TO HOSPITALS? ===');
  const docHosps = await query("SELECT d.id, d.name, d.hospital_id, h.hospital_name FROM doctors d LEFT JOIN hospitals h ON d.hospital_id = h.hospital_id");
  docHosps.forEach(dh => console.log(`  Doc: "${dh.name}" -> hosp_id: "${dh.hospital_id}" -> hosp_name: "${dh.hospital_name}"`));

  console.log('\n=== APPOINTMENTS DETAILED AUDIT ===');
  const appts = await query("SELECT a.id, a.patient_id, a.hospital_id, h.hospital_name, a.doctor, a.doctor_id, d.name as linked_doctor_name, a.appointment_date, a.appointment_time, a.status FROM appointments a LEFT JOIN hospitals h ON a.hospital_id = h.hospital_id LEFT JOIN doctors d ON a.doctor_id = d.id ORDER BY a.id ASC");
  console.log(`Appointments count: ${appts.length}`);
  appts.forEach(a => console.log(`  ID ${a.id} | pt: "${a.patient_id}" | hosp_id: "${a.hospital_id}" (hosp: "${a.hospital_name}") | doc: "${a.doctor}" (doc_id: ${a.doctor_id}, linked: "${a.linked_doctor_name}") | date: ${a.appointment_date} | time: ${a.appointment_time} | status: ${a.status}`));

  console.log('\n=== AMBULANCES AUDIT ===');
  const ambCols = await query("DESCRIBE ambulances");
  console.log('Ambulance cols:', ambCols.map(c => c.Field).join(', '));
  const amb = await query("SELECT a.*, h.hospital_name FROM ambulances a LEFT JOIN hospitals h ON a.hospital_id = h.hospital_id");
  console.log(`Ambulances count: ${amb.length}`);
  amb.forEach(a => console.log(`  ID ${a.id} | veh: "${a.vehicle_no}" | driver: "${a.driver_name}" | hosp_id: "${a.hospital_id}" (hosp: "${a.hospital_name}") | status: ${a.status}`));

  console.log('\n=== EMERGENCY CASES AUDIT ===');
  const emgCols = await query("DESCRIBE emergency_cases");
  console.log('Emergency cols:', emgCols.map(c => c.Field).join(', '));
  const emg = await query("SELECT e.*, h.hospital_name FROM emergency_cases e LEFT JOIN hospitals h ON e.hospital_id = h.hospital_id LIMIT 10");
  emg.forEach(e => console.log(`  ID ${e.id} | case: "${e.case_id || e.id}" | patient: "${e.patient_name}" | hosp_id: "${e.hospital_id}" (hosp: "${e.hospital_name}") | status: ${e.status}`));

  process.exit(0);
}

deepAudit().catch(e => { console.error(e); process.exit(1); });
