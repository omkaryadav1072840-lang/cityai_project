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

        // 4. Apply traffic schema if present
        const trafficPath = path.join(__dirname, 'traffic_schema.sql');
        if (fs.existsSync(trafficPath)) {
            console.log(' Applying traffic_schema.sql...');
            const trafficSql = fs.readFileSync(trafficPath, 'utf8');
            await connection.query(trafficSql);
            console.log(' Traffic schema applied successfully.');
        }

        // 5. Apply famous places & tourism migrations
        const famousPath = path.join(__dirname, 'famous_places_migration.sql');
        if (fs.existsSync(famousPath)) {
            console.log(' Applying famous_places_migration.sql...');
            const famousSql = fs.readFileSync(famousPath, 'utf8');
            await connection.query(famousSql);
            console.log(' Famous places schema applied successfully.');
        }

        const tourismPath = path.join(__dirname, 'tourism_services_migration.sql');
        if (fs.existsSync(tourismPath)) {
            console.log(' Applying tourism_services_migration.sql...');
            const tourismSql = fs.readFileSync(tourismPath, 'utf8');
            await connection.query(tourismSql);
            console.log(' Tourism services migration applied successfully.');
        }

        // 6. Ensure parking_slots table exists
        await connection.query(`
            CREATE TABLE IF NOT EXISTS parking_slots (
                id INT AUTO_INCREMENT PRIMARY KEY,
                lot_id VARCHAR(50) NOT NULL,
                slot_number VARCHAR(20) NOT NULL,
                slot_type VARCHAR(20) DEFAULT 'car',
                floor VARCHAR(50) DEFAULT 'Ground Floor',
                UNIQUE KEY unique_lot_slot (lot_id, slot_number)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 7. Apply Master Expansion Migration (additive tables, columns, sensors, lights)
        const runMasterExpansionMigration = require('./master_expansion_migration');
        console.log(' Applying Master Expansion Migrations...');
        await runMasterExpansionMigration();

        // 8. Apply Patient ID & QR Enhancement Migration
        const runPatientEnhancementMigration = require('./patient_enhancement_migration');
        console.log(' Applying Patient Enhancement Migration...');
        await runPatientEnhancementMigration();

        // 9. Apply Hospital Management & Diagnostic Migration
        const runHospitalUpgradeMigration = require('./hospital_management_migration');
        console.log(' Applying Hospital Management & Diagnostic Migration...');
        await runHospitalUpgradeMigration();


        // 7. Verify tables
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
