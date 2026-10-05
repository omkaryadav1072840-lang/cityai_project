const db = require('../backend/config/db');

async function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function audit() {
  console.log('=== DATABASE AUDIT FOR HOSPITAL SYSTEM ===');
  
  // 1. Tables list
  const tables = await query("SHOW TABLES");
  const tableNames = tables.map(r => Object.values(r)[0]);
  console.log('All Tables:', tableNames.filter(t => t.includes('hosp') || t.includes('doc') || t.includes('bed') || t.includes('appoint') || t.includes('pharm') || t.includes('patient') || t.includes('user') || t.includes('ambul') || t.includes('emerg')));

  // 2. Hospitals table audit
  console.log('\n--- HOSPITALS TABLE ---');
  const hospitals = await query("SELECT id, hospital_id, hospital_name, phone, address FROM hospitals ORDER BY id ASC");
  console.log(`Total hospitals: ${hospitals.length}`);
  hospitals.forEach(h => console.log(`[ID ${h.id}] hospital_id: '${h.hospital_id}', name: '${h.hospital_name}', phone: '${h.phone}'`));

  // Check hospital duplicate names or IDs
  const hospDupes = await query("SELECT hospital_name, COUNT(*) as cnt FROM hospitals GROUP BY hospital_name HAVING cnt > 1");
  console.log('Duplicate hospital names:', hospDupes);

  // 3. Doctors table audit
  console.log('\n--- DOCTORS TABLE ---');
  try {
    const doctors = await query("SELECT id, name, specialization, hospital_id, hospital_name, phone, email FROM doctors ORDER BY id ASC");
    console.log(`Total doctors: ${doctors.length}`);
    doctors.forEach(d => console.log(`[ID ${d.id}] '${d.name}', spec: '${d.specialization}', hosp_id: '${d.hospital_id}', hosp_name: '${d.hospital_name}'`));
    
    const docDupes = await query("SELECT name, COUNT(*) as cnt FROM doctors GROUP BY name HAVING cnt > 1");
    console.log('Duplicate doctor names:', docDupes);

    // Doctors with unlinked hospital_id
    const unlinkedDocHosps = await query("SELECT d.id, d.name, d.hospital_id FROM doctors d LEFT JOIN hospitals h ON d.hospital_id = h.hospital_id WHERE d.hospital_id IS NOT NULL AND h.hospital_id IS NULL");
    console.log('Doctors with invalid hospital_id:', unlinkedDocHosps);
  } catch (e) {
    console.log('Doctors table error:', e.message);
  }

  // 4. Appointments audit
  console.log('\n--- APPOINTMENTS TABLE ---');
  try {
    const appts = await query("SELECT id, patient_id, hospital_id, doctor, doctor_id, appointment_date, appointment_time, status FROM appointments ORDER BY id ASC");
    console.log(`Total appointments: ${appts.length}`);
    appts.slice(0, 15).forEach(a => console.log(`[ID ${a.id}] pt: '${a.patient_id}', hosp: '${a.hospital_id}', doc: '${a.doctor}' (doc_id: ${a.doctor_id}), date: ${a.appointment_date} ${a.appointment_time}, status: ${a.status}`));

    // Unlinked appointments
    const unlinkedApptHosps = await query("SELECT a.id, a.hospital_id FROM appointments a LEFT JOIN hospitals h ON a.hospital_id = h.hospital_id WHERE a.hospital_id IS NOT NULL AND h.hospital_id IS NULL");
    console.log('Appointments with invalid hospital_id:', unlinkedApptHosps.length);

    const unlinkedApptDocs = await query("SELECT a.id, a.doctor_id, a.doctor FROM appointments a LEFT JOIN doctors d ON a.doctor_id = d.id WHERE a.doctor_id IS NOT NULL AND d.id IS NULL");
    console.log('Appointments with invalid doctor_id:', unlinkedApptDocs.length);

    const apptDupes = await query("SELECT patient_id, doctor_id, appointment_date, appointment_time, COUNT(*) as cnt FROM appointments GROUP BY patient_id, doctor_id, appointment_date, appointment_time HAVING cnt > 1");
    console.log('Exact duplicate appointments:', apptDupes);
  } catch (e) {
    console.log('Appointments audit error:', e.message);
  }

  // 5. Beds & Bed Bookings audit
  console.log('\n--- BEDS & BOOKINGS AUDIT ---');
  try {
    const bedTables = tableNames.filter(t => t.includes('bed'));
    for (const bt of bedTables) {
      const count = await query(`SELECT COUNT(*) as cnt FROM ${bt}`);
      console.log(`Table ${bt}: ${count[0].cnt} rows`);
      const sample = await query(`SELECT * FROM ${bt} LIMIT 3`);
      console.log(`Sample from ${bt}:`, sample);
    }
  } catch (e) {
    console.log('Beds audit error:', e.message);
  }

  // 6. Pharmacy medicines audit
  console.log('\n--- PHARMACY AUDIT ---');
  try {
    const pharmTables = tableNames.filter(t => t.includes('pharm') || t.includes('medicin'));
    for (const pt of pharmTables) {
      const count = await query(`SELECT COUNT(*) as cnt FROM ${pt}`);
      console.log(`Table ${pt}: ${count[0].cnt} rows`);
      const sample = await query(`SELECT * FROM ${pt} LIMIT 3`);
      console.log(`Sample from ${pt}:`, sample);
    }
  } catch (e) {
    console.log('Pharmacy audit error:', e.message);
  }

  process.exit(0);
}

audit().catch(e => {
  console.error(e);
  process.exit(1);
});
