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
                status ENUM('Available','Booked','Occupied','Maintenance') DEFAULT 'Available',
                current_booking_id VARCHAR(50) DEFAULT NULL,
                last_updated TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_lot_slot (lot_id, slot_number)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 7. Ensure applied_migrations tracking table exists
        await connection.query(`
            CREATE TABLE IF NOT EXISTS applied_migrations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 8. Ordered modular migrations list
        const migrationFiles = [
            'master_expansion_migration.js',
            'patient_enhancement_migration.js',
            'hospital_management_migration.js',
            'clinical_care_assistant_migration.js',
            'apply_clinical_learning_migration.js',
            'water_management_upgrade_migration.js',
            'water_sectors_and_rbac_migration.js',
            'water_road_dual_pipelines_migration.js',
            'sewage_planner_migration.js',
            'water_digital_twin_migration.js',
            'water_intelligence_migration.js',
            'water_command_center_migration.js'
        ];

        console.log('\n📦 Running Automated Modular Migrations Pipeline:');
        const { execSync } = require('child_process');
        for (const file of migrationFiles) {
            const filePath = path.join(__dirname, file);
            if (!fs.existsSync(filePath)) continue;

            const [alreadyApplied] = await connection.query(
                'SELECT id FROM applied_migrations WHERE name = ?',
                [file]
            );

            if (alreadyApplied.length > 0) {
                console.log(`  ⏭️  [Already Applied] ${file}`);
                continue;
            }

            console.log(`  ▶️  [Applying] ${file}...`);
            try {
                execSync(`node "${filePath}"`, {
                    cwd: __dirname,
                    stdio: 'inherit',
                    env: process.env
                });
                await connection.query(
                    'INSERT IGNORE INTO applied_migrations (name) VALUES (?)',
                    [file]
                );
                console.log(`  ✅ [Applied Successfully] ${file}`);
            } catch (migrationErr) {
                console.warn(`  ⚠️ [Migration Notice] ${file}: ${migrationErr.message}`);
                await connection.query(
                    'INSERT IGNORE INTO applied_migrations (name) VALUES (?)',
                    [file]
                );
            }
        }


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
