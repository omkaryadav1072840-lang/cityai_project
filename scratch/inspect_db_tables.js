const pool = require('../backend/config/db').promise();
const fs = require('fs');
const path = require('path');

(async () => {
    try {
        const [tables] = await pool.query('SHOW TABLES');
        const tableNameKey = Object.keys(tables[0])[0];
        const list = [];
        for (const t of tables) {
            const name = t[tableNameKey];
            try {
                const [[{ cnt }]] = await pool.query(`SELECT COUNT(*) AS cnt FROM \`${name}\``);
                list.push({ name, count: cnt });
            } catch (e) {
                list.push({ name, count: -1, err: e.message });
            }
        }
        console.log(`Discovered ${list.length} database tables.`);
        fs.writeFileSync(path.join(__dirname, 'discovered_tables.json'), JSON.stringify(list, null, 2));
        process.exit(0);
    } catch (err) {
        console.error('Error querying database:', err);
        process.exit(1);
    }
})();
