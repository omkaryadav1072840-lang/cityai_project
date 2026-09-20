/**
 * Database Migration Script for Enhanced Traffic Management Module
 * Adds traffic_violations, updates traffic_signals with coords & type,
 * and ensures full compatibility with shared SmartCity platform.
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function migrateTrafficSchema() {
    console.log('🔄 Running Traffic Schema Enhancements for Gorakhpur SmartCity...');

    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'omkar',
        database: process.env.DB_NAME || 'smartcity',
        multipleStatements: true
    };

    const connection = await mysql.createConnection(dbConfig);

    try {
        // 1. Create traffic_violations table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS \`traffic_violations\` (
                \`id\` VARCHAR(50) PRIMARY KEY,
                \`junction_id\` VARCHAR(50) NOT NULL,
                \`camera_id\` VARCHAR(50) DEFAULT NULL,
                \`violation_type\` VARCHAR(100) NOT NULL,
                \`vehicle_number\` VARCHAR(30) DEFAULT 'UP-53-XX-0000',
                \`vehicle_type\` VARCHAR(50) DEFAULT 'Two-Wheeler',
                \`speed_kmh\` DECIMAL(5,2) DEFAULT NULL,
                \`evidence_image_url\` VARCHAR(255) DEFAULT NULL,
                \`confidence_score\` DECIMAL(4,2) DEFAULT 0.92,
                \`status\` ENUM('AI_FLAGGED', 'UNDER_REVIEW', 'VERIFIED_CHALLAN_REFERRED', 'DISMISSED') DEFAULT 'AI_FLAGGED',
                \`reviewed_by\` VARCHAR(100) DEFAULT NULL,
                \`fine_amount\` DECIMAL(8,2) DEFAULT 1000.00,
                \`timestamp\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                \`reviewed_at\` TIMESTAMP NULL DEFAULT NULL,
                \`notes\` TEXT DEFAULT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('✅ Verified/Created traffic_violations table.');

        // 2. Add coordinates & signal_type & status columns to traffic_signals if not present
        const [sigCols] = await connection.query(`DESCRIBE traffic_signals`);
        const existingSigFields = sigCols.map(c => c.Field);

        if (!existingSigFields.includes('latitude')) {
            await connection.query(`ALTER TABLE traffic_signals ADD COLUMN \`latitude\` DECIMAL(10, 7) DEFAULT NULL AFTER \`street_name\``);
            console.log('✅ Added latitude column to traffic_signals.');
        }
        if (!existingSigFields.includes('longitude')) {
            await connection.query(`ALTER TABLE traffic_signals ADD COLUMN \`longitude\` DECIMAL(10, 7) DEFAULT NULL AFTER \`latitude\``);
            console.log('✅ Added longitude column to traffic_signals.');
        }
        if (!existingSigFields.includes('signal_type')) {
            await connection.query(`ALTER TABLE traffic_signals ADD COLUMN \`signal_type\` VARCHAR(50) DEFAULT 'Standard 3-Phase' AFTER \`longitude\``);
            console.log('✅ Added signal_type column to traffic_signals.');
        }
        if (!existingSigFields.includes('status')) {
            await connection.query(`ALTER TABLE traffic_signals ADD COLUMN \`status\` ENUM('Active', 'Maintenance', 'Offline') DEFAULT 'Active' AFTER \`signal_type\``);
            console.log('✅ Added status column to traffic_signals.');
        }

        // 3. Update existing traffic_signals with accurate junction offset coordinates
        const [junctions] = await connection.query(`SELECT id, latitude, longitude FROM traffic_junctions`);
        for (const j of junctions) {
            const jLat = parseFloat(j.latitude);
            const jLng = parseFloat(j.longitude);

            // Set coordinates based on approach offset (approx 30m away)
            await connection.query(`UPDATE traffic_signals SET latitude = ?, longitude = ?, signal_type = 'Standard 3-Phase', status = 'Active' WHERE junction_id = ? AND approach = 'North' AND latitude IS NULL`, [jLat + 0.0003, jLng, j.id]);
            await connection.query(`UPDATE traffic_signals SET latitude = ?, longitude = ?, signal_type = 'Standard 3-Phase', status = 'Active' WHERE junction_id = ? AND approach = 'South' AND latitude IS NULL`, [jLat - 0.0003, jLng, j.id]);
            await connection.query(`UPDATE traffic_signals SET latitude = ?, longitude = ?, signal_type = 'Standard 3-Phase', status = 'Active' WHERE junction_id = ? AND approach = 'East' AND latitude IS NULL`, [jLat, jLng + 0.0003, j.id]);
            await connection.query(`UPDATE traffic_signals SET latitude = ?, longitude = ?, signal_type = 'Standard 3-Phase', status = 'Active' WHERE junction_id = ? AND approach = 'West' AND latitude IS NULL`, [jLat, jLng - 0.0003, j.id]);
        }
        console.log('✅ Synchronized signal head coordinates with parent junctions.');

        // 4. Seed sample AI-flagged violations
        const sampleViolations = [
            {
                id: 'VIO-2026-001',
                jnc: 'JNC-01',
                cam: 'CAM-01-N',
                type: 'Red Light Violation',
                plate: 'UP-53-AZ-4921',
                vehType: 'Motorcycle',
                spd: 42.5,
                conf: 0.96,
                status: 'AI_FLAGGED',
                fine: 1000.00,
                notes: 'Vehicle crossed stop line 3.4 seconds after red signal active on North approach.'
            },
            {
                id: 'VIO-2026-002',
                jnc: 'JNC-02',
                cam: 'CAM-02-E',
                type: 'Wrong-Way Movement',
                plate: 'UP-53-BT-8812',
                vehType: 'Auto-Rickshaw',
                spd: 28.0,
                conf: 0.91,
                status: 'AI_FLAGGED',
                fine: 2000.00,
                notes: 'Contraflow driving observed along Mohaddipur eastward slip road.'
            },
            {
                id: 'VIO-2026-003',
                jnc: 'JNC-03',
                cam: 'CAM-03-N',
                type: 'Triple Riding without Helmet',
                plate: 'UP-53-CP-1029',
                vehType: 'Two-Wheeler',
                spd: 35.0,
                conf: 0.89,
                status: 'VERIFIED_CHALLAN_REFERRED',
                fine: 1500.00,
                notes: 'Verified by Traffic Head Constable Sunil Yadav. Forwarded to Gorakhpur e-Challan repository.'
            },
            {
                id: 'VIO-2026-004',
                jnc: 'JNC-08',
                cam: 'CAM-08-W',
                type: 'Over Speeding in Urban Zone',
                plate: 'UP-53-DL-6644',
                vehType: 'Private Car',
                spd: 68.0,
                conf: 0.94,
                status: 'UNDER_REVIEW',
                fine: 2000.00,
                notes: 'Radar sensor captured speed 68 km/h exceeding 40 km/h urban limit on railway approach.'
            }
        ];

        for (const v of sampleViolations) {
            await connection.query(`
                INSERT INTO traffic_violations 
                (id, junction_id, camera_id, violation_type, vehicle_number, vehicle_type, speed_kmh, confidence_score, status, fine_amount, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE status=VALUES(status)
            `, [v.id, v.jnc, v.cam, v.type, v.plate, v.vehType, v.spd, v.conf, v.status, v.fine, v.notes]);
        }
        console.log(`✅ Seeded ${sampleViolations.length} sample AI traffic violations.`);

        console.log('\n🎉 Traffic schema enhancements completed successfully!\n');
    } catch (err) {
        console.error('❌ Migration error:', err);
    } finally {
        await connection.end();
    }
}

migrateTrafficSchema();
