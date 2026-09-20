const fs = require('fs');
const pool = require('./backend/config/db');
const routes = fs.readFileSync('backend/routes/traffic.routes.js', 'utf8');

const tableRegex = /(?:FROM|INTO|UPDATE|JOIN)\s+`?([a-zA-Z0-9_]+)`?/gi;
let match;
const tables = new Set();
while ((match = tableRegex.exec(routes)) !== null) {
  if (match[1]) {
    const tbl = match[1].toLowerCase();
    if (!['select', 'where', 'set', 'order', 'group', 'limit', 'staff', 'users', 'case', 'when'].includes(tbl)) {
      tables.add(tbl);
    }
  }
}

async function verifyTables() {
  console.log('Tables used in traffic.routes.js:', Array.from(tables));
  for (const t of tables) {
    try {
      await pool.promise().query('SELECT 1 FROM ' + t + ' LIMIT 1');
      console.log('Table OK:', t);
    } catch (e) {
      console.error('TABLE QUERY FAILED:', t, e.message);
    }
  }
  pool.end();
}
verifyTables();
