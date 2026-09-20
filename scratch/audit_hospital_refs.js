const db = require('../backend/config/db');

async function checkRefs() {
  const p = db.promise();
  
  // Find all tables that have hospital_id column
  const [cols] = await p.query(`
    SELECT table_name, column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'smartcity' AND column_name LIKE '%hospital_id%'
  `);

  console.log('Tables with hospital_id columns:');
  for (const c of cols) {
    const [rows] = await p.query(`SELECT ${c.COLUMN_NAME} as hid, COUNT(*) as cnt FROM ${c.TABLE_NAME} GROUP BY ${c.COLUMN_NAME}`);
    console.log(`\nTable: ${c.TABLE_NAME} (${c.COLUMN_NAME}):`, rows);
  }

  process.exit(0);
}

checkRefs().catch(err => {
  console.error(err);
  process.exit(1);
});
