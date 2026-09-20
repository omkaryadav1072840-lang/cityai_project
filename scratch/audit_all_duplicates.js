const db = require('../backend/config/db');

async function auditAll() {
  const p = db.promise();
  console.log('=== FULL HEALTHCARE MODULE DUPLICATE AUDIT ===\n');

  // 1. diagnostic_tests
  const [diagTests] = await p.query(`
    SELECT LOWER(TRIM(name)) as norm_name, hospital_id, COUNT(*) as cnt, GROUP_CONCAT(test_id) as ids
    FROM diagnostic_tests
    GROUP BY LOWER(TRIM(name)), hospital_id
    HAVING cnt > 1
  `);
  console.log('Duplicate Diagnostic Tests (by name & hospital):', diagTests);

  // 2. ambulances
  const [ambs] = await p.query(`
    SELECT vehicle_number, COUNT(*) as cnt, GROUP_CONCAT(ambulance_id) as ids
    FROM ambulances
    GROUP BY vehicle_number
    HAVING cnt > 1
  `);
  console.log('Duplicate Ambulances (by vehicle_number):', ambs);

  // 3. doctors
  const [docs] = await p.query(`
    SELECT LOWER(TRIM(name)) as norm_name, hospital_id, COUNT(*) as cnt, GROUP_CONCAT(doctor_id) as ids
    FROM doctors
    GROUP BY LOWER(TRIM(name)), hospital_id
    HAVING cnt > 1
  `);
  console.log('Duplicate Doctors (by name & hospital):', docs);

  // 4. emergency_departments
  const [emg] = await p.query(`
    SELECT hospital_name, COUNT(*) as cnt
    FROM emergency_departments
    GROUP BY LOWER(TRIM(hospital_name))
    HAVING cnt > 1
  `);
  console.log('Duplicate Emergency Departments:', emg);

  // 5. hospital_wards
  const [wards] = await p.query(`
    SELECT ward_name, hospital_id, COUNT(*) as cnt, GROUP_CONCAT(ward_id) as ids
    FROM hospital_wards
    GROUP BY ward_name, hospital_id
    HAVING cnt > 1
  `);
  console.log('Duplicate Hospital Wards:', wards);

  // 6. hospital_ward_beds
  const [wardBeds] = await p.query(`
    SELECT bed_number, ward_id, hospital_id, COUNT(*) as cnt, GROUP_CONCAT(bed_id) as ids
    FROM hospital_ward_beds
    GROUP BY bed_number, ward_id, hospital_id
    HAVING cnt > 1
  `);
  console.log('Duplicate Ward Beds:', wardBeds);

  process.exit(0);
}

auditAll().catch(err => {
  console.error(err);
  process.exit(1);
});
