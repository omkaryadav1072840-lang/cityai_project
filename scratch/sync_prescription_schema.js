const db = require('../backend/config/db');

async function syncSchema() {
    const cols = [
        'original_file_name VARCHAR(255) DEFAULT NULL',
        'stored_file_name VARCHAR(255) DEFAULT NULL',
        'file_path VARCHAR(255) DEFAULT NULL',
        'file_type VARCHAR(50) DEFAULT NULL',
        'file_size INT DEFAULT NULL',
        'uploaded_by VARCHAR(50) DEFAULT "Patient"'
    ];

    for (const col of cols) {
        const colName = col.split(' ')[0];
        try {
            await db.promise().query(`ALTER TABLE prescriptions ADD COLUMN ${col}`);
            console.log(`✅ Added column: ${colName}`);
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log(`ℹ️ Column already exists: ${colName}`);
            } else {
                console.error(`❌ Error adding column ${colName}:`, e.message);
            }
        }
    }

    try {
        await db.promise().query('ALTER TABLE prescriptions MODIFY COLUMN prescription_file TEXT DEFAULT NULL');
        console.log('✅ Modified prescription_file to DEFAULT NULL');
    } catch (e) {
        console.error('Error modifying prescription_file:', e.message);
    }

    console.log('✅ Prescription table schema sync completed.');
    process.exit(0);
}

syncSchema();
