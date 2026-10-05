const db = require('../backend/config/db');

async function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function runDatabaseCleanAndLink() {
  console.log('=== STARTING DATABASE CLEANUP & DATA LINKING (WITH FK SAFETY) ===');
  await query("SET FOREIGN_KEY_CHECKS = 0");

  try {
    // 1. Ensure Dr. Rahul Sharma exists in doctors table
    console.log('1. Checking Dr. Rahul Sharma...');
    const rahulExists = await query("SELECT id, doctor_id FROM doctors WHERE name LIKE '%Rahul Sharma%'");
    let rahulDocId = 'DOC-BRD-10';
    if (rahulExists.length === 0) {
      await query(`
        INSERT INTO doctors (doctor_id, name, specialization, department, opd_room_no, available_days, consultation_timings, hospital_id, qualification, experience, mobile, email, consultation_fee, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        rahulDocId,
        'Dr. Rahul Sharma',
        'General Physician',
        'General Medicine',
        'Room OPD-105',
        'Mon, Tue, Wed, Thu, Fri, Sat',
        '09:00 AM - 02:00 PM',
        'HOSP-002', // BRD Medical College
        'MBBS, MD (Medicine)',
        12,
        '9415022010',
        'rahul.sharma@brdmc.ac.in',
        '200.00',
        'Available'
      ]);
      console.log(`  -> Inserted Dr. Rahul Sharma with doctor_id: ${rahulDocId}`);
    } else {
      rahulDocId = rahulExists[0].doctor_id || 'DOC-BRD-10';
      console.log(`  -> Dr. Rahul Sharma already exists with doctor_id: ${rahulDocId}`);
    }

    // Update all appointments referencing Dr. Rahul Sharma
    const updateRahulAppts = await query(`
      UPDATE appointments 
      SET doctor_id = ?, hospital_id = 'HOSP-002', department = 'General Medicine' 
      WHERE doctor LIKE '%Rahul Sharma%'
    `, [rahulDocId]);
    console.log(`  -> Updated ${updateRahulAppts.affectedRows} appointments for Dr. Rahul Sharma`);

    // 2. Consolidate and merge Dr. Alok Nath Tripathi into one canonical record
    console.log('\n2. Consolidating Dr. Alok Nath Tripathi...');
    const tripathis = await query("SELECT id, doctor_id FROM doctors WHERE name LIKE '%Alok Nath Tripathi%' ORDER BY id ASC");
    console.log(`  Found ${tripathis.length} records for Dr. Alok Nath Tripathi`);
    
    const canonicalTripathiDoctorId = 'DOC-AIIMS-05';
    if (tripathis.length > 0) {
      const primaryId = tripathis[0].id;
      
      // Update primary doctor record
      await query(`
        UPDATE doctors 
        SET doctor_id = ?, 
            hospital_id = 'HOSP-001', 
            specialization = 'Senior Cardiologist',
            department = 'Cardiology',
            opd_room_no = 'OPD-304 Cardio Wing',
            email = 'tripathi.alok@aiims.edu',
            consultation_fee = '500.00',
            status = 'Available'
        WHERE id = ?
      `, [canonicalTripathiDoctorId, primaryId]);
      console.log(`  -> Updated primary Dr. Alok Nath Tripathi (id: ${primaryId}) to doctor_id: ${canonicalTripathiDoctorId}, hospital: HOSP-001`);

      // Update all appointments that reference any Tripathi doctor_id or name
      const updateTripathiAppts = await query(`
        UPDATE appointments 
        SET doctor_id = ?, hospital_id = 'HOSP-001', doctor = 'Dr. Alok Nath Tripathi', department = 'Cardiology'
        WHERE doctor LIKE '%Alok Nath Tripathi%' OR doctor_id LIKE '%HOSPT%03%' OR doctor_id = 'DOC-AIIMS-05'
      `, [canonicalTripathiDoctorId]);
      console.log(`  -> Updated ${updateTripathiAppts.affectedRows} appointments for Dr. Alok Nath Tripathi`);

      // Remove the other duplicate Tripathi records
      const otherIds = tripathis.slice(1).map(t => t.id);
      if (otherIds.length > 0) {
        await query(`DELETE FROM doctors WHERE id IN (?)`, [otherIds]);
        console.log(`  -> Deleted ${otherIds.length} duplicate Tripathi records: ${otherIds.join(', ')}`);
      }
    }

    // 3. Delete dummy "Dr. Temp Doc" records
    console.log('\n3. Cleaning up dummy "Dr. Temp Doc" records...');
    const deleteTempDocs = await query("DELETE FROM doctors WHERE name LIKE '%Temp Doc%'");
    console.log(`  -> Deleted ${deleteTempDocs.affectedRows} dummy Temp Doc rows`);

    // 4. Link any remaining unlinked appointments
    console.log('\n4. Fixing any remaining unlinked appointments...');
    const apptsToFix = await query(`
      SELECT a.id, a.doctor, a.hospital_id, a.doctor_id, d.doctor_id as matched_doc_id, d.hospital_id as matched_hosp_id
      FROM appointments a
      LEFT JOIN doctors d ON a.doctor = d.name OR a.doctor_id = d.doctor_id
      WHERE a.hospital_id IS NULL OR a.doctor_id IS NULL
    `);
    console.log(`  Found ${apptsToFix.length} unlinked appointments to patch`);
    for (const a of apptsToFix) {
      const hospId = a.matched_hosp_id || 'HOSP-001';
      const docId = a.matched_doc_id || 'DOC-101';
      await query("UPDATE appointments SET hospital_id = ?, doctor_id = ? WHERE id = ?", [hospId, docId, a.id]);
      console.log(`  -> Patched appointment ID ${a.id} with hosp: ${hospId}, doc: ${docId}`);
    }

    // 5. Clean up junk rows from hospital_beds table
    console.log('\n5. Cleaning up junk/duplicate rows from hospital_beds...');
    const deleteJunkBeds = await query(`
      DELETE FROM hospital_beds 
      WHERE hospital_name LIKE '%Experimental%' 
         OR hospital_name LIKE '%7366%' 
         OR hospital_name LIKE '%6388%' 
         OR hospital_name LIKE '%0199%' 
         OR hospital_name LIKE '%5695%' 
         OR hospital_name LIKE '%0327%'
         OR hospital_name = 'City General Hospital'
    `);
    console.log(`  -> Deleted ${deleteJunkBeds.affectedRows} junk hospital_beds rows`);

    // Ensure all 14 Gorakhpur hospitals exist in hospital_beds
    const hospitals = await query("SELECT hospital_name, total_beds, icu_beds, emergency_beds FROM hospitals");
    for (const h of hospitals) {
      const existing = await query("SELECT id FROM hospital_beds WHERE hospital_name = ?", [h.hospital_name]);
      if (existing.length === 0) {
        const genBeds = Math.max(10, (h.total_beds || 100) - (h.icu_beds || 15) - (h.emergency_beds || 10));
        await query(`
          INSERT INTO hospital_beds (hospital_name, general_beds, icu_beds, emergency_beds, private_beds, updated_at)
          VALUES (?, ?, ?, ?, ?, NOW())
        `, [h.hospital_name, genBeds, h.icu_beds || 15, h.emergency_beds || 10, 20]);
        console.log(`  -> Added missing hospital_beds row for "${h.hospital_name}"`);
      }
    }

    // 6. Clean up orphaned ward beds from test hospitals
    console.log('\n6. Cleaning up orphaned ward beds...');
    const deleteJunkWardBeds = await query(`
      DELETE FROM hospital_ward_beds 
      WHERE hospital_id IN ('HOSP-T0199A', 'HOSP-T0327A', 'HOSP-T5695A', 'HOSP-T6388A')
    `);
    console.log(`  -> Deleted ${deleteJunkWardBeds.affectedRows} orphaned hospital_ward_beds rows`);

    // 7. Clean up dummy ambulances
    console.log('\n7. Cleaning up dummy ambulances...');
    const deleteJunkAmb = await query(`
      DELETE FROM ambulances 
      WHERE ambulance_id IN ('TEST', 'PHASE2-STAFF') 
         OR vehicle_number LIKE '%TEST%'
    `);
    console.log(`  -> Deleted ${deleteJunkAmb.affectedRows} dummy ambulance rows`);

    console.log('\n=== SUCCESS: ALL DATABASE CLEANUP & DATA LINKING COMPLETE ===');
  } finally {
    await query("SET FOREIGN_KEY_CHECKS = 1");
  }
  process.exit(0);
}

runDatabaseCleanAndLink().catch(e => {
  console.error('Migration error:', e);
  process.exit(1);
});
