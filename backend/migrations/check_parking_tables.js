const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'backend/.env' });

async function check() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'smartcity',
        port: Number(process.env.DB_PORT) || 3306
    });

    const [tables] = await conn.query("SHOW TABLES LIKE '%park%'");
    const tableNames = tables.map(t => Object.values(t)[0]);
    console.log('Parking tables found:', tableNames);

    for (const t of tableNames) {
        const [rows] = await conn.query('SELECT COUNT(*) as c FROM ' + t);
        console.log(`${t} count: ${rows[0].c}`);
    }
    await conn.end();
}
check().catch(console.error);
