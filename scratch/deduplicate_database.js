const db = require('../backend/config/db');

async function deduplicate() {
  const p = db.promise();
  console.log('=== STARTING DATABASE DEDUPLICATION ===\n');

  // 1. DEDUPLICATE HOSPITALS
  console.log('--- 1. Deduplicating Hospitals ---');

  // AIIMS Gorakhpur: HOSP-GKP-002 -> HOSP-001
  // BRD Medical: HOSP-GKP-001 -> HOSP-002
  // District Hospital: HOSP-GKP-004 -> HOSP-003

  const hospitalRemaps = [
    { oldId: 'HOSP-GKP-002', newId: 'HOSP-001', name: 'AIIMS Gorakhpur' },
    { oldId: 'HOSP-GKP-001', newId: 'HOSP-002', name: 'BRD Medical College' },
    { oldId: 'HOSP-GKP-004', newId: 'HOSP-003', name: 'Gorakhpur District Hospital (Sadar)' }
  ];

  for (const remap of hospitalRemaps) {
    console.log(`Remapping ${remap.oldId} -> ${remap.newId} (${remap.name})...`);

    // Remap appointments
    await p.query('UPDATE appointments SET hospital_id = ? WHERE hospital_id = ?', [remap.newId, remap.oldId]);

    // Remap doctor_schedules
    await p.query('UPDATE doctor_schedules SET hospital_id = ? WHERE hospital_id = ?', [remap.newId, remap.oldId]);

    // Remap doctors
    await p.query('UPDATE doctors SET hospital_id = ? WHERE hospital_id = ?', [remap.newId, remap.oldId]);

    // Delete duplicate bed categories and departments for the old ID
    await p.query('DELETE FROM hospital_bed_categories WHERE hospital_id = ?', [remap.oldId]);
    await p.query('DELETE FROM hospital_departments WHERE hospital_id = ?', [remap.oldId]);

    // Delete the duplicate hospital record
    await p.query('DELETE FROM hospitals WHERE hospital_id = ?', [remap.oldId]);
    console.log(`✅ Successfully removed duplicate ${remap.oldId}`);
  }

  // Check remaining hospitals
  const [remainingHospitals] = await p.query('SELECT hospital_id, hospital_name, hospital_type FROM hospitals ORDER BY hospital_name');
  console.log(`\nRemaining unique hospitals (${remainingHospitals.length}):`);
  remainingHospitals.forEach(h => console.log(` - [${h.hospital_id}] ${h.hospital_name} (${h.hospital_type})`));

  // 2. DEDUPLICATE PHARMACY MEDICINES
  console.log('\n--- 2. Deduplicating Pharmacy Medicines ---');
  
  // Find all duplicates and keep only MIN(id) for each medicine_name
  const [dupes] = await p.query(`
    SELECT LOWER(TRIM(medicine_name)) as norm_name, MIN(id) as keep_id, GROUP_CONCAT(id) as all_ids, COUNT(*) as cnt
    FROM pharmacy
    GROUP BY LOWER(TRIM(medicine_name))
    HAVING cnt > 1
  `);

  console.log(`Found ${dupes.length} medicines with duplicates.`);

  for (const d of dupes) {
    const keepId = d.keep_id;
    const allIds = d.all_ids.split(',').map(Number);
    const deleteIds = allIds.filter(id => id !== keepId);

    if (deleteIds.length > 0) {
      // If any pharmacy_cart or pharmacy_bill_items point to deleteIds, remap them to keepId
      await p.query(`UPDATE pharmacy_cart SET medicine_id = ? WHERE medicine_id IN (?)`, [keepId, deleteIds]);
      await p.query(`UPDATE pharmacy_bill_items SET medicine_id = ? WHERE medicine_id IN (?)`, [keepId, deleteIds]);

      // Delete the duplicate medicines
      await p.query(`DELETE FROM pharmacy WHERE id IN (?)`, [deleteIds]);
      console.log(`✅ Deduplicated "${d.norm_name}": kept ID ${keepId}, removed ${deleteIds.length} duplicates`);
    }
  }

  // Add UNIQUE KEY to pharmacy so duplicates can never be re-introduced
  try {
    await p.query(`ALTER TABLE pharmacy ADD UNIQUE KEY idx_unique_medicine_name (medicine_name)`);
    console.log('✅ Added UNIQUE KEY idx_unique_medicine_name to pharmacy table');
  } catch (keyErr) {
    console.log('Unique key already exists or:', keyErr.message);
  }

  // Check remaining pharmacy items
  const [remainingMedicines] = await p.query('SELECT id, medicine_name, category, price, quantity FROM pharmacy ORDER BY medicine_name');
  console.log(`\nRemaining unique medicines (${remainingMedicines.length}):`);
  remainingMedicines.forEach(m => console.log(` - [ID: ${m.id}] ${m.medicine_name} (${m.category}) - Rs ${m.price}, Qty: ${m.quantity}`));

  console.log('\n=== DEDUPLICATION COMPLETE ===');
  process.exit(0);
}

deduplicate().catch(err => {
  console.error('Deduplication failed:', err);
  process.exit(1);
});
