const pool = require('../backend/config/db');

async function checkDb() {
  const promisePool = pool.promise();

  console.log('=== DATABASE HEALTH AUDIT ===');
  const [tables] = await promisePool.query('SHOW TABLES');
  console.log(`Total Tables: ${tables.length}`);

  const summary = {};

  for (const tRow of tables) {
    const tName = Object.values(tRow)[0];
    const [[countRow]] = await promisePool.query(`SELECT COUNT(*) as count FROM \`${tName}\``);
    summary[tName] = countRow.count;
  }

  console.log(JSON.stringify(summary, null, 2));

  // Check for duplicate names or key entities
  console.log('\n--- Duplicate Checks ---');
  
  // 1. Users
  const [dupUsers] = await promisePool.query('SELECT email, COUNT(*) as c FROM users GROUP BY email HAVING c > 1');
  console.log('Duplicate user emails:', dupUsers.length);

  // 2. Hospitals
  const [dupHospitals] = await promisePool.query('SELECT name, COUNT(*) as c FROM hospitals GROUP BY name HAVING c > 1');
  console.log('Duplicate hospital names:', dupHospitals.length);

  // 3. Pharmacy Medicines
  const [dupMeds] = await promisePool.query('SELECT medicine_name, COUNT(*) as c FROM pharmacy GROUP BY medicine_name HAVING c > 1');
  console.log('Duplicate pharmacy medicines:', dupMeds.length);

  // 4. Parking lots
  const [dupLots] = await promisePool.query('SELECT name, COUNT(*) as c FROM parking_lots GROUP BY name HAVING c > 1');
  console.log('Duplicate parking lots:', dupLots.length);

  // 5. Junctions
  const [dupJunctions] = await promisePool.query('SELECT name, COUNT(*) as c FROM traffic_junctions GROUP BY name HAVING c > 1');
  console.log('Duplicate traffic junctions:', dupJunctions.length);

  // 6. Emergency Contacts
  const [dupEmerg] = await promisePool.query('SELECT service_name, phone_number, COUNT(*) as c FROM emergency_contacts GROUP BY service_name, phone_number HAVING c > 1');
  console.log('Duplicate emergency contacts:', dupEmerg.length);

  process.exit(0);
}

checkDb().catch(err => {
  console.error(err);
  process.exit(1);
});
