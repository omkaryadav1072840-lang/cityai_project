const db = require('../backend/config/db').promise();
async function check() {
  try {
    const [rows] = await db.query('SELECT tank_id, name, zone, capacity_liters, current_level_percent, latitude, longitude, pump_status FROM water_tanks');
    console.log(`Found ${rows.length} tanks:`);
    rows.forEach(r => console.log(`  ${r.tank_id}: ${r.name} @ (${r.latitude}, ${r.longitude}) - ${r.current_level_percent}%`));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
check();
