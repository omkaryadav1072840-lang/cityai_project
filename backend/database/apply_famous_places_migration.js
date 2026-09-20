/**
 * Apply Famous Places Migration Script
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function runMigration() {
    console.log('🏛️ Running Famous Places Migration...');

    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'omkar',
        database: process.env.DB_NAME || 'smartcity',
        multipleStatements: true
    };

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to MySQL.');

        const migrationPath = path.join(__dirname, 'famous_places_migration.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Executing migration SQL...');
        await connection.query(sql);
        console.log('✅ Migration applied successfully.');

        const [rows] = await connection.query('SELECT id, name, category, latitude, longitude FROM famous_places ORDER BY id ASC');
        console.log(`\n📍 Seeded Places Count: ${rows.length}`);
        rows.forEach(r => console.log(`  [${r.id}] ${r.name} (${r.category}) - ${r.latitude}, ${r.longitude}`));

        const [reviews] = await connection.query('SELECT COUNT(*) as count FROM place_reviews');
        console.log(`⭐ Seeded Reviews Count: ${reviews[0].count}`);

    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exitCode = 1;
    } finally {
        if (connection) await connection.end();
    }
}

runMigration();
