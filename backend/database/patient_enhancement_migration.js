/**
 * Migration: Enhance Patients Table & Create Patient Audit Logs
 * SmartCity AI Hospital / Healthcare Module
 */

const mysql = require('mysql2/promise');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function runPatientEnhancementMigration() {
    console.log('🔄 Running Patient Enhancement Migration...');

    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'omkar',
        database: process.env.DB_NAME || 'smartcity'
    };

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);

        // Helper to check if a column exists
        async function columnExists(table, column) {
            const [rows] = await connection.query(
                `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                 WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
                [dbConfig.database, table, column]
            );
            return rows.length > 0;
        }

        // 1. Add missing columns to `patients` table
        const columnsToAdd = [
            { name: 'dob', type: 'DATE NULL AFTER name' },
            { name: 'emergency_contact', type: 'VARCHAR(30) NULL AFTER mobile' },
            { name: 'hospital_id', type: 'VARCHAR(50) NULL AFTER address' },
            { name: 'abha_status', type: "VARCHAR(30) DEFAULT 'Not Linked' AFTER hospital_id" },
            { name: 'abha_address', type: 'VARCHAR(100) NULL AFTER abha_status' },
            { name: 'qr_token', type: 'VARCHAR(100) NULL AFTER abha_address' },
            { name: 'emergency_info', type: 'TEXT NULL AFTER qr_token' },
            { name: 'status', type: "VARCHAR(20) DEFAULT 'Active' AFTER emergency_info" },
            { name: 'updated_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at' }
        ];

        for (const col of columnsToAdd) {
            const exists = await columnExists('patients', col.name);
            if (!exists) {
                console.log(`  ➕ Adding column patients.${col.name}...`);
                await connection.query(`ALTER TABLE \`patients\` ADD COLUMN \`${col.name}\` ${col.type};`);
            } else {
                console.log(`  ✔️ Column patients.${col.name} already exists.`);
            }
        }

        // Add index on qr_token if not exists
        try {
            await connection.query('ALTER TABLE `patients` ADD UNIQUE INDEX `idx_patients_qr_token` (`qr_token`);');
            console.log('  ➕ Added unique index idx_patients_qr_token.');
        } catch (idxErr) {
            if (idxErr.code !== 'ER_DUP_KEYNAME') {
                console.warn('  ⚠️ Index creation note:', idxErr.message);
            }
        }

        // 2. Backfill unique qr_token for any existing patients missing one
        const [patientsWithoutQr] = await connection.query(
            "SELECT id, patient_id FROM patients WHERE qr_token IS NULL OR qr_token = ''"
        );
        if (patientsWithoutQr.length > 0) {
            console.log(`  🔄 Backfilling qr_token for ${patientsWithoutQr.length} existing patient(s)...`);
            for (const p of patientsWithoutQr) {
                const token = 'SCPAT-' + crypto.randomBytes(12).toString('hex');
                await connection.query(
                    'UPDATE patients SET qr_token = ? WHERE id = ?',
                    [token, p.id]
                );
            }
            console.log('  ✅ qr_token backfill complete.');
        }

        // 3. Create `patient_audit_logs` table
        console.log('  🔄 Ensuring patient_audit_logs table exists...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS \`patient_audit_logs\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`patient_id\` VARCHAR(50) NOT NULL,
                \`action\` VARCHAR(50) NOT NULL,
                \`performed_by_id\` INT NULL,
                \`performed_by_name\` VARCHAR(100) NULL,
                \`role\` VARCHAR(30) NULL,
                \`details\` TEXT NULL,
                \`ip_address\` VARCHAR(45) NULL,
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX \`idx_audit_patient\` (\`patient_id\`),
                INDEX \`idx_audit_action\` (\`action\`),
                INDEX \`idx_audit_created\` (\`created_at\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('  ✅ patient_audit_logs table verified.');

        console.log('🎉 Patient enhancement migration completed successfully!\n');
    } catch (err) {
        console.error('❌ Patient enhancement migration error:', err);
        throw err;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

if (require.main === module) {
    runPatientEnhancementMigration()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = runPatientEnhancementMigration;
