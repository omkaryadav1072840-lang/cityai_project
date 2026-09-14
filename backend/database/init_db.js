/**
 * Database Initialization & Migration Script
 * Runs schema.sql and seed.sql against MySQL
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function initDatabase() {
    console.log('🚀 Starting Smart City AI database initialization...');

    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'omkar',
        multipleStatements: true
    };

    let connection;
    try {
        console.log(`Connecting to MySQL at ${dbConfig.host} as ${dbConfig.user}...`);
        connection = await mysql.createConnection(dbConfig);
        console.log(' Connected to MySQL server.');

        // 1. Create database if not exists
        const dbName = process.env.DB_NAME || 'smartcity';
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        await connection.query(`USE \`${dbName}\`;`);
        console.log(` Using database: ${dbName}`);

        // 2. Execute schema.sql
        const schemaPath = path.join(__dirname, 'schema.sql');
        if (fs.existsSync(schemaPath)) {
            console.log(' Applying schema.sql...');
            const schemaSql = fs.readFileSync(schemaPath, 'utf8');
            await connection.query(schemaSql);
            console.log(' Schema applied successfully.');
        }

        // 3. Execute seed.sql
        const seedPath = path.join(__dirname, 'seed.sql');
        if (fs.existsSync(seedPath)) {
            console.log(' Applying seed.sql...');
            const seedSql = fs.readFileSync(seedPath, 'utf8');
            await connection.query(seedSql);
            console.log(' Seed data inserted successfully.');
        }

        // 4. Verify tables
        const [tables] = await connection.query('SHOW TABLES;');
        console.log(`\n Verified Database Tables (${tables.length}):`);
        tables.forEach(t => {
            const tableName = Object.values(t)[0];
            console.log(`  - ${tableName}`);
        });

        console.log('\n Database initialization completed successfully!\n');
    } catch (err) {
        console.error(' Database initialization failed:', err.message);
        process.exitCode = 1;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

initDatabase();
