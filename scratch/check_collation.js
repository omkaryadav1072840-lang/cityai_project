const db = require('../backend/config/db');

async function checkAndFix() {
  const [rows] = await db.promise().query(`
    SELECT table_name, column_name, collation_name 
    FROM information_schema.columns 
    WHERE table_schema = 'smartcity' 
      AND (column_name LIKE '%hospital%' OR column_name LIKE '%category%' OR table_name LIKE '%diag%' OR table_name = 'hospitals')
  `);
  console.log('Collations found:');
  const distinct = {};
  for (const r of rows) {
    console.log(`${r.TABLE_NAME}.${r.COLUMN_NAME} => ${r.COLLATION_NAME}`);
    distinct[r.COLLATION_NAME] = (distinct[r.COLLATION_NAME] || 0) + 1;
  }
  console.log('Summary:', distinct);

  // Let's ensure hospitals and all diagnostic tables use the EXACT same collation
  // If hospitals uses utf8mb4_unicode_ci or utf8mb4_0900_ai_ci, let's harmonize them!
  const [hospCol] = await db.promise().query(`
    SELECT collation_name FROM information_schema.columns 
    WHERE table_schema = 'smartcity' AND table_name = 'hospitals' AND column_name = 'hospital_id'
  `);
  const targetCollation = hospCol[0]?.COLLATION_NAME || 'utf8mb4_unicode_ci';
  console.log('Target collation from hospitals.hospital_id:', targetCollation);

  const tablesToHarmonize = [
    'diagnostic_categories',
    'diagnostic_tests',
    'test_bookings',
    'test_samples',
    'diagnostic_reports',
    'hospital_wards',
    'hospital_ward_beds',
    'hospital_invoices',
    'hospital_notifications',
    'hospital_staff'
  ];

  for (const tbl of tablesToHarmonize) {
    try {
      await db.promise().query(`ALTER TABLE ${tbl} CONVERT TO CHARACTER SET utf8mb4 COLLATE ${targetCollation}`);
      console.log(`Harmonized ${tbl} to ${targetCollation}`);
    } catch (e) {
      console.error(`Error harmonizing ${tbl}:`, e.message);
    }
  }

  process.exit(0);
}

checkAndFix();
