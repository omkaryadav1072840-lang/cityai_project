const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function runWaterMigration() {
    console.log("🌊 Starting Water Management 3-Layer Database Migration...");

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'smartcity',
        port: Number(process.env.DB_PORT) || 3306
    });

    try {
        console.log("Connected to MySQL successfully.");

        // 1. Add additive columns to water_reports
        console.log("1. Upgrading water_reports table...");
        const [repCols] = await connection.query("DESCRIBE water_reports");
        const repColNames = repCols.map(c => c.Field);

        if (!repColNames.includes('assigned_technician_id')) {
            await connection.query("ALTER TABLE water_reports ADD COLUMN assigned_technician_id INT NULL");
        }
        if (!repColNames.includes('assigned_technician_name')) {
            await connection.query("ALTER TABLE water_reports ADD COLUMN assigned_technician_name VARCHAR(100) NULL");
        }
        if (!repColNames.includes('priority')) {
            await connection.query("ALTER TABLE water_reports ADD COLUMN priority ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW') DEFAULT 'MEDIUM'");
        }
        if (!repColNames.includes('evidence_image')) {
            await connection.query("ALTER TABLE water_reports ADD COLUMN evidence_image VARCHAR(255) NULL");
        }
        if (!repColNames.includes('internal_remarks')) {
            await connection.query("ALTER TABLE water_reports ADD COLUMN internal_remarks TEXT NULL");
        }
        if (!repColNames.includes('resolved_at')) {
            await connection.query("ALTER TABLE water_reports ADD COLUMN resolved_at TIMESTAMP NULL");
        }

        // 2. Add additive columns to water_tanker_bookings
        console.log("2. Upgrading water_tanker_bookings table...");
        const [tkbCols] = await connection.query("DESCRIBE water_tanker_bookings");
        const tkbColNames = tkbCols.map(c => c.Field);

        if (!tkbColNames.includes('assigned_driver_name')) {
            await connection.query("ALTER TABLE water_tanker_bookings ADD COLUMN assigned_driver_name VARCHAR(100) NULL");
        }
        if (!tkbColNames.includes('assigned_driver_phone')) {
            await connection.query("ALTER TABLE water_tanker_bookings ADD COLUMN assigned_driver_phone VARCHAR(20) NULL");
        }
        if (!tkbColNames.includes('assigned_tanker_number')) {
            await connection.query("ALTER TABLE water_tanker_bookings ADD COLUMN assigned_tanker_number VARCHAR(50) NULL");
        }
        if (!tkbColNames.includes('delivery_slot')) {
            await connection.query("ALTER TABLE water_tanker_bookings ADD COLUMN delivery_slot VARCHAR(50) NULL");
        }
        if (!tkbColNames.includes('internal_remarks')) {
            await connection.query("ALTER TABLE water_tanker_bookings ADD COLUMN internal_remarks TEXT NULL");
        }
        if (!tkbColNames.includes('dispatched_at')) {
            await connection.query("ALTER TABLE water_tanker_bookings ADD COLUMN dispatched_at TIMESTAMP NULL");
        }
        if (!tkbColNames.includes('delivered_at')) {
            await connection.query("ALTER TABLE water_tanker_bookings ADD COLUMN delivered_at TIMESTAMP NULL");
        }

        // 3. Add additive columns to water_tanks
        console.log("3. Upgrading water_tanks table...");
        const [tankCols] = await connection.query("DESCRIBE water_tanks");
        const tankColNames = tankCols.map(c => c.Field);

        if (!tankColNames.includes('latitude')) {
            await connection.query("ALTER TABLE water_tanks ADD COLUMN latitude DECIMAL(10, 8) DEFAULT 26.7606");
        }
        if (!tankColNames.includes('longitude')) {
            await connection.query("ALTER TABLE water_tanks ADD COLUMN longitude DECIMAL(11, 8) DEFAULT 83.3732");
        }
        if (!tankColNames.includes('pump_status')) {
            await connection.query("ALTER TABLE water_tanks ADD COLUMN pump_status ENUM('ON', 'OFF', 'MAINTENANCE') DEFAULT 'ON'");
        }
        if (!tankColNames.includes('water_quality_score')) {
            await connection.query("ALTER TABLE water_tanks ADD COLUMN water_quality_score INT DEFAULT 92");
        }

        // 4. Create water_pipelines table
        console.log("4. Creating water_pipelines table...");
        await connection.query(`
            CREATE TABLE IF NOT EXISTS water_pipelines (
                id INT AUTO_INCREMENT PRIMARY KEY,
                pipeline_code VARCHAR(50) UNIQUE,
                name VARCHAR(150) NOT NULL,
                zone VARCHAR(100) NOT NULL,
                pressure_bar DECIMAL(4, 2) DEFAULT 2.8,
                flow_rate_lps DECIMAL(6, 2) DEFAULT 45.0,
                status ENUM('Normal', 'High Pressure', 'Low Pressure', 'Leakage Detected', 'Under Maintenance') DEFAULT 'Normal',
                last_inspection DATE NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 5. Create water_technicians table
        console.log("5. Creating water_technicians table...");
        await connection.query(`
            CREATE TABLE IF NOT EXISTS water_technicians (
                id INT AUTO_INCREMENT PRIMARY KEY,
                emp_code VARCHAR(50) UNIQUE,
                name VARCHAR(100) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                role ENUM('Plumber', 'Pipeline Engineer', 'Tanker Driver', 'Pump Operator', 'Quality Analyst') DEFAULT 'Plumber',
                zone VARCHAR(100) NOT NULL,
                status ENUM('Available', 'On Duty', 'Assigned', 'On Leave') DEFAULT 'Available',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 6. Create water_quality_logs table
        console.log("6. Creating water_quality_logs table...");
        await connection.query(`
            CREATE TABLE IF NOT EXISTS water_quality_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                zone VARCHAR(100) NOT NULL,
                ph DECIMAL(3, 1) DEFAULT 7.2,
                tds INT DEFAULT 280,
                turbidity DECIMAL(4, 2) DEFAULT 1.5,
                chlorine DECIMAL(4, 2) DEFAULT 0.5,
                status ENUM('Safe', 'Moderate', 'Unsafe') DEFAULT 'Safe',
                tested_by VARCHAR(100) DEFAULT 'Municipal Jal Board Lab',
                tested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 7. Create water_supply_schedules table
        console.log("7. Creating water_supply_schedules table...");
        await connection.query(`
            CREATE TABLE IF NOT EXISTS water_supply_schedules (
                id INT AUTO_INCREMENT PRIMARY KEY,
                zone VARCHAR(100) NOT NULL,
                supply_time VARCHAR(50) NOT NULL,
                duration VARCHAR(50) DEFAULT '2 Hours',
                pressure VARCHAR(50) DEFAULT 'Normal (2.8 bar)',
                status ENUM('Active', 'Scheduled', 'Delayed', 'Suspended') DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 8. Seed default realistic data for Gorakhpur water infrastructure
        console.log("8. Seeding baseline records...");

        await connection.query("UPDATE water_tanks SET latitude = 26.7606, longitude = 83.3732, pump_status = 'ON', water_quality_score = 94 WHERE tank_id = 'TANK-001' OR name LIKE '%Golghar%'");
        await connection.query("UPDATE water_tanks SET latitude = 26.7559, longitude = 83.3705, pump_status = 'ON', water_quality_score = 91 WHERE tank_id = 'TANK-002' OR name LIKE '%Civil Lines%'");
        await connection.query("UPDATE water_tanks SET latitude = 26.7615, longitude = 83.3662, pump_status = 'ON', water_quality_score = 88 WHERE tank_id = 'TANK-003' OR name LIKE '%Railway%'");
        await connection.query("UPDATE water_tanks SET latitude = 26.7884, longitude = 83.3986, pump_status = 'ON', water_quality_score = 95 WHERE tank_id = 'TANK-004' OR name LIKE '%Medical%'");
        await connection.query("UPDATE water_tanks SET latitude = 26.7252, longitude = 83.4322, pump_status = 'MAINTENANCE', water_quality_score = 86 WHERE tank_id = 'TANK-005' OR name LIKE '%GIDA%'");

        const [techCount] = await connection.query('SELECT COUNT(*) as c FROM water_technicians');
        if (techCount[0].c === 0) {
            await connection.query(`
                INSERT INTO water_technicians (emp_code, name, phone, role, zone, status) VALUES
                ('WT-01', 'Rajesh Kumar', '9876543201', 'Plumber', 'Golghar Central', 'Available'),
                ('WT-02', 'Suresh Gupta', '9876543202', 'Pipeline Engineer', 'Civil Lines', 'On Duty'),
                ('WT-03', 'Manoj Yadav', '9876543203', 'Pump Operator', 'Railway Station', 'Available'),
                ('WT-04', 'Dharmendra Singh', '9876543204', 'Tanker Driver', 'BRD Medical College', 'Available'),
                ('WT-05', 'Anita Srivastava', '9876543205', 'Quality Analyst', 'Gorakhpur Central Lab', 'On Duty'),
                ('WT-06', 'Vikas Sharma', '9876543206', 'Tanker Driver', 'Mohaddipur', 'Available')
            `);
            console.log("Seeded 6 water technicians.");
        }

        const [pipeCount] = await connection.query('SELECT COUNT(*) as c FROM water_pipelines');
        if (pipeCount[0].c === 0) {
            await connection.query(`
                INSERT INTO water_pipelines (pipeline_code, name, zone, pressure_bar, flow_rate_lps, status, last_inspection) VALUES
                ('PL-101', 'Golghar Main Feeder Trunk', 'Golghar Central', 3.10, 85.50, 'Normal', '2026-09-15'),
                ('PL-102', 'Civil Lines Distribution Loop', 'Civil Lines', 2.80, 62.00, 'Normal', '2026-09-17'),
                ('PL-103', 'Railway Junction High-Pressure Line', 'Railway Colony', 1.95, 40.20, 'Low Pressure', '2026-09-18'),
                ('PL-104', 'BRD Medical Emergency Water Conduit', 'BRD Medical College', 3.40, 110.00, 'Normal', '2026-09-19'),
                ('PL-105', 'Mohaddipur Sub-Line 4B', 'Mohaddipur', 1.40, 25.00, 'Leakage Detected', '2026-09-19'),
                ('PL-106', 'GIDA Industrial Water Arterial', 'GIDA Industrial Area', 2.90, 75.00, 'Normal', '2026-09-12')
            `);
            console.log("Seeded 6 water pipelines.");
        }

        const [schedCount] = await connection.query('SELECT COUNT(*) as c FROM water_supply_schedules');
        if (schedCount[0].c === 0) {
            await connection.query(`
                INSERT INTO water_supply_schedules (zone, supply_time, duration, pressure, status) VALUES
                ('Golghar Central', '06:00 AM - 08:30 AM', '2.5 Hours', 'Normal (3.1 bar)', 'Active'),
                ('Civil Lines', '06:30 AM - 09:00 AM', '2.5 Hours', 'Normal (2.8 bar)', 'Active'),
                ('Railway Colony', '05:30 AM - 07:30 AM', '2 Hours', 'Moderate (2.0 bar)', 'Active'),
                ('BRD Medical Zone', '24x7 Continuous Supply', 'Continuous', 'High (3.4 bar)', 'Active'),
                ('Mohaddipur & Asuran', '07:00 AM - 09:00 AM', '2 Hours', 'Low (1.4 bar)', 'Delayed'),
                ('GIDA Industrial Area', '08:00 AM - 01:00 PM', '5 Hours', 'Normal (2.9 bar)', 'Active')
            `);
            console.log("Seeded 6 water supply schedules.");
        }

        const [qualCount] = await connection.query('SELECT COUNT(*) as c FROM water_quality_logs');
        if (qualCount[0].c === 0) {
            await connection.query(`
                INSERT INTO water_quality_logs (zone, ph, tds, turbidity, chlorine, status, tested_by) VALUES
                ('Golghar Central', 7.2, 260, 1.40, 0.45, 'Safe', 'Central Jal Lab'),
                ('Civil Lines', 7.4, 290, 1.60, 0.50, 'Safe', 'Central Jal Lab'),
                ('Railway Colony', 6.9, 340, 2.10, 0.35, 'Moderate', 'North Zone Lab'),
                ('BRD Medical College', 7.1, 220, 0.90, 0.60, 'Safe', 'Hospital SCADA Sensor'),
                ('Mohaddipur', 6.8, 380, 2.80, 0.20, 'Moderate', 'East Zone Field Unit')
            `);
            console.log("Seeded 5 water quality telemetry logs.");
        }

        await connection.query("UPDATE water_reports SET priority = 'CRITICAL' WHERE issue_type = 'No Supply' AND (priority IS NULL OR priority = 'MEDIUM')");
        await connection.query("UPDATE water_reports SET priority = 'HIGH' WHERE issue_type = 'Pipe Leak' AND (priority IS NULL OR priority = 'MEDIUM')");

        console.log("🎉 Water Database Migration completed successfully!");
    } catch (err) {
        console.error("❌ Migration error:", err);
        throw err;
    } finally {
        await connection.end();
    }
}

runWaterMigration().catch(e => { console.error(e); process.exit(1); });
