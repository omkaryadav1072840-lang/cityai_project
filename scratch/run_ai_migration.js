const fs = require('fs');
const path = require('path');
const pool = require('../backend/config/db').promise();

async function runMigration() {
  const filePath = path.join(__dirname, '../backend/database/migrations/20260924_create_ai_intelligence_tables.sql');
  const sql = fs.readFileSync(filePath, 'utf8');

  // Strip line comments
  const cleanSql = sql
    .split('\n')
    .map(line => line.trim().startsWith('--') ? '' : line)
    .join('\n');

  const statements = cleanSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`Executing ${statements.length} migration statements...`);
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    await pool.query(stmt);
  }
  console.log('All migration statements executed successfully!');

  // Verify created tables
  const [tables] = await pool.query("SHOW TABLES LIKE 'ai_%'");
  console.log('Verified AI tables in DB:', tables.map(t => Object.values(t)[0]));

  const [models] = await pool.query('SELECT model_identifier, module, status FROM ai_models');
  console.log('Registered AI models count:', models.length);
  console.table(models);

  process.exit(0);
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
