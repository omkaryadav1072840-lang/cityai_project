const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function runParkingMigration() {
    console.log("🅿️ Starting Parking Management 3-Layer Database Migration...");

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'smartcity',
        port: Number(process.env.DB_PORT) || 3306
    });

    try {
        console.log("Connected to MySQL successfully.");

        // 1. Add additive columns to parking_lots
        console.log("1. Upgrading parking_lots table...");
        const [lotCols] = await connection.query("DESCRIBE parking_lots");
        const lotColNames = lotCols.map(c => c.Field);

        if (!lotColNames.includes('peak_hourly_rate')) {
            await connection.query("ALTER TABLE parking_lots ADD COLUMN peak_hourly_rate DECIMAL(10, 2) NULL DEFAULT 35.00");
        }
        if (!lotColNames.includes('surge_active')) {
            await connection.query("ALTER TABLE parking_lots ADD COLUMN surge_active TINYINT(1) DEFAULT 0");
        }
        if (!lotColNames.includes('cctv_status')) {
            await connection.query("ALTER TABLE parking_lots ADD COLUMN cctv_status ENUM('Operational', 'Degraded', 'Maintenance') DEFAULT 'Operational'");
        }

        // 2. Add additive columns to parking_bookings
        console.log("2. Upgrading parking_bookings table...");
        const [bookCols] = await connection.query("DESCRIBE parking_bookings");
        const bookColNames = bookCols.map(c => c.Field);

        if (!bookColNames.includes('overstay_minutes')) {
            await connection.query("ALTER TABLE parking_bookings ADD COLUMN overstay_minutes INT DEFAULT 0");
        }
        if (!bookColNames.includes('penalty_amount')) {
            await connection.query("ALTER TABLE parking_bookings ADD COLUMN penalty_amount DECIMAL(10, 2) DEFAULT 0.00");
        }
        if (!bookColNames.includes('payment_method')) {
            await connection.query("ALTER TABLE parking_bookings ADD COLUMN payment_method ENUM('CASH', 'UPI', 'FASTAG', 'CARD') DEFAULT 'UPI'");
        }
        if (!bookColNames.includes('payment_status')) {
            await connection.query("ALTER TABLE parking_bookings ADD COLUMN payment_status ENUM('PENDING', 'PAID', 'OVERSTAY_PENDING') DEFAULT 'PAID'");
        }
        if (!bookColNames.includes('attendant_staff_id')) {
            await connection.query("ALTER TABLE parking_bookings ADD COLUMN attendant_staff_id VARCHAR(50) NULL");
        }

        // 3. Create parking_anpr_scans table if not exists
        console.log("3. Creating parking_anpr_scans table...");
        await connection.query(`
            CREATE TABLE IF NOT EXISTS parking_anpr_scans (
                id INT AUTO_INCREMENT PRIMARY KEY,
                scan_id VARCHAR(50) UNIQUE,
                plate_number VARCHAR(30) NOT NULL,
                lot_id INT NOT NULL,
                lot_name VARCHAR(150),
                gate_type ENUM('ENTRY', 'EXIT') DEFAULT 'ENTRY',
                confidence_percent INT DEFAULT 98,
                action_taken ENUM('BARRIER_OPENED', 'DENIED_INVALID', 'MANUAL_OVERRIDE') DEFAULT 'BARRIER_OPENED',
                scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 4. Seed realistic sample ANPR scans if empty
        console.log("4. Seeding baseline ANPR records...");
        const [anprCount] = await connection.query("SELECT COUNT(*) as c FROM parking_anpr_scans");
        if (anprCount[0].c === 0) {
            await connection.query(`
                INSERT INTO parking_anpr_scans (scan_id, plate_number, lot_id, lot_name, gate_type, confidence_percent, action_taken) VALUES
                ('ANPR-1001', 'UP53AB1234', 1, 'City Centre Parking', 'ENTRY', 99, 'BARRIER_OPENED'),
                ('ANPR-1002', 'UP53XY8899', 4, 'Golghar Market Parking', 'ENTRY', 97, 'BARRIER_OPENED'),
                ('ANPR-1003', 'UP53BK5566', 2, 'Railway Station Parking', 'EXIT', 98, 'BARRIER_OPENED'),
                ('ANPR-1004', 'UP53CZ7744', 3, 'Hospital Parking', 'ENTRY', 96, 'BARRIER_OPENED'),
                ('ANPR-1005', 'UP53DL3322', 1, 'City Centre Parking', 'EXIT', 99, 'BARRIER_OPENED')
            `);
            console.log("Seeded 5 baseline ANPR scans.");
        }

        // 5. Seed a realistic active overstay booking if none has overstay
        console.log("5. Updating sample overstay vehicle...");
        await connection.query(`
            UPDATE parking_bookings 
            SET overstay_minutes = 45, penalty_amount = 50.00, payment_status = 'OVERSTAY_PENDING'
            WHERE vehicle_number LIKE '%1234%' OR id = 1
        `);

        // Update peak rate for Golghar
        await connection.query("UPDATE parking_lots SET peak_hourly_rate = 40.00, surge_active = 1 WHERE parking_code = 'PARK-004' OR name LIKE '%Golghar%'");
        await connection.query("UPDATE parking_lots SET peak_hourly_rate = 30.00, surge_active = 0 WHERE parking_code = 'PARK-001' OR name LIKE '%City Centre%'");

        console.log("🎉 Parking 3-Layer Database Migration completed successfully!");
    } catch (err) {
        console.error("❌ Migration error:", err);
        throw err;
    } finally {
        await connection.end();
    }
}

runParkingMigration().catch(e => { console.error(e); process.exit(1); });
