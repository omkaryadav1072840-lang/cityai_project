const pool = require('../backend/config/db');
async function run() {
  const [cols] = await pool.promise().query("DESCRIBE parking_anpr_scans");
  cols.forEach(c => console.log(`${c.Field}: ${c.Type}`));
  process.exit(0);
}
run();
