/**
 * SmartCity AI - Waste Management Database Migration
 * Additive schema upgrades for 3-layer waste management system.
 * Strictly preserves existing tables, IDs, and data.
 */

const pool = require("../config/db").promise();

async function runWasteMigration() {
    console.log("🚀 [Migration] Starting Waste Management additive schema migration...");

    try {
        // 1. Create waste_bins table if not exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS waste_bins (
                id INT AUTO_INCREMENT PRIMARY KEY,
                bin_code VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(150) NOT NULL,
                location VARCHAR(255) NOT NULL,
                latitude DECIMAL(10, 7) NOT NULL,
                longitude DECIMAL(10, 7) NOT NULL,
                capacity_liters INT DEFAULT 500,
                bin_type VARCHAR(60) DEFAULT 'Mixed Waste',
                fill_level INT DEFAULT 0,
                status ENUM('Empty', 'Normal', 'Nearly Full', 'Full', 'Overflowing', 'Under Maintenance', 'Inactive') DEFAULT 'Normal',
                collection_schedule VARCHAR(100) DEFAULT 'Daily 07:00 AM',
                route_id INT DEFAULT NULL,
                last_emptied_at DATETIME DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_bin_code (bin_code),
                INDEX idx_bin_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log("✅ Table 'waste_bins' ready.");

        // 2. Create waste_vehicles table if not exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS waste_vehicles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vehicle_number VARCHAR(50) UNIQUE NOT NULL,
                vehicle_type VARCHAR(60) DEFAULT 'Hydraulic Compactor',
                capacity_tons DECIMAL(5, 2) DEFAULT 5.0,
                driver_name VARCHAR(100) NOT NULL,
                driver_phone VARCHAR(30) NOT NULL,
                status ENUM('Available', 'On Route', 'Maintenance', 'Inactive') DEFAULT 'Available',
                current_route_id INT DEFAULT NULL,
                latitude DECIMAL(10, 7) DEFAULT 26.7606,
                longitude DECIMAL(10, 7) DEFAULT 83.3732,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_vehicle_num (vehicle_number),
                INDEX idx_vehicle_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log("✅ Table 'waste_vehicles' ready.");

        // 3. Create waste_workers table if not exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS waste_workers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                worker_code VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(100) NOT NULL,
                phone VARCHAR(30) NOT NULL,
                role VARCHAR(60) DEFAULT 'Sanitation Worker',
                status ENUM('Active', 'On Duty', 'On Leave', 'Inactive') DEFAULT 'Active',
                assigned_vehicle_id INT DEFAULT NULL,
                assigned_route_id INT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_worker_code (worker_code),
                INDEX idx_worker_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log("✅ Table 'waste_workers' ready.");

        // 4. Create waste_routes table if not exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS waste_routes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                route_code VARCHAR(50) UNIQUE NOT NULL,
                route_name VARCHAR(150) NOT NULL,
                area VARCHAR(150) NOT NULL,
                schedule VARCHAR(100) DEFAULT 'Daily 06:00 AM - 11:00 AM',
                assigned_vehicle_id INT DEFAULT NULL,
                status ENUM('Active', 'Scheduled', 'In Progress', 'Completed', 'Suspended') DEFAULT 'Active',
                waypoints_json TEXT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_route_code (route_code)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log("✅ Table 'waste_routes' ready.");

        // 5. Additive columns for service_requests table
        const [srCols] = await pool.query("DESCRIBE service_requests");
        const existingColNames = srCols.map(c => c.Field);

        const colsToAdd = [
            { name: "waste_type", sql: "ALTER TABLE service_requests ADD COLUMN waste_type VARCHAR(80) DEFAULT NULL" },
            { name: "assigned_worker_id", sql: "ALTER TABLE service_requests ADD COLUMN assigned_worker_id INT DEFAULT NULL" },
            { name: "assigned_worker_name", sql: "ALTER TABLE service_requests ADD COLUMN assigned_worker_name VARCHAR(150) DEFAULT NULL" },
            { name: "assigned_vehicle_id", sql: "ALTER TABLE service_requests ADD COLUMN assigned_vehicle_id INT DEFAULT NULL" },
            { name: "assigned_vehicle_number", sql: "ALTER TABLE service_requests ADD COLUMN assigned_vehicle_number VARCHAR(50) DEFAULT NULL" },
            { name: "assigned_route_id", sql: "ALTER TABLE service_requests ADD COLUMN assigned_route_id INT DEFAULT NULL" },
            { name: "evidence_image", sql: "ALTER TABLE service_requests ADD COLUMN evidence_image VARCHAR(255) DEFAULT NULL" },
            { name: "internal_remarks", sql: "ALTER TABLE service_requests ADD COLUMN internal_remarks TEXT DEFAULT NULL" },
            { name: "collection_date", sql: "ALTER TABLE service_requests ADD COLUMN collection_date VARCHAR(50) DEFAULT NULL" },
            { name: "collection_time", sql: "ALTER TABLE service_requests ADD COLUMN collection_time VARCHAR(50) DEFAULT NULL" }
        ];

        for (const col of colsToAdd) {
            if (!existingColNames.includes(col.name)) {
                await pool.query(col.sql);
                console.log(`➕ Added column '${col.name}' to service_requests.`);
            }
        }

        // 6. Additive columns for waste_bin_requests table
        const [wbrCols] = await pool.query("DESCRIBE waste_bin_requests");
        const existingWbrCols = wbrCols.map(c => c.Field);

        const wbrColsToAdd = [
            { name: "assigned_staff_id", sql: "ALTER TABLE waste_bin_requests ADD COLUMN assigned_staff_id INT DEFAULT NULL" },
            { name: "assigned_staff_name", sql: "ALTER TABLE waste_bin_requests ADD COLUMN assigned_staff_name VARCHAR(150) DEFAULT NULL" },
            { name: "internal_remarks", sql: "ALTER TABLE waste_bin_requests ADD COLUMN internal_remarks TEXT DEFAULT NULL" },
            { name: "scheduled_date", sql: "ALTER TABLE waste_bin_requests ADD COLUMN scheduled_date VARCHAR(50) DEFAULT NULL" }
        ];

        for (const col of wbrColsToAdd) {
            if (!existingWbrCols.includes(col.name)) {
                await pool.query(col.sql);
                console.log(`➕ Added column '${col.name}' to waste_bin_requests.`);
            }
        }

        // 7. Seed initial Gorakhpur default records if empty
        const [binCount] = await pool.query("SELECT COUNT(*) as cnt FROM waste_bins");
        if (binCount[0].cnt === 0) {
            console.log("🌱 Seeding realistic Gorakhpur Smart Bins...");
            await pool.query(`
                INSERT INTO waste_bins (bin_code, name, location, latitude, longitude, capacity_liters, bin_type, fill_level, status, collection_schedule)
                VALUES 
                ('BIN-GOL-01', 'Bin - Golghar Market Square', 'Golghar', 26.7606, 83.3732, 500, 'Mixed Waste', 25, 'Normal', 'Daily 07:00 AM'),
                ('BIN-CMK-02', 'Bin - City Market Plaza', 'City Market', 26.7655, 83.3680, 750, 'Recyclable/Dry', 65, 'Nearly Full', 'Daily 08:30 AM'),
                ('BIN-RLY-03', 'Bin - Railway Colony Gate', 'Railway Colony', 26.7545, 83.3810, 1000, 'Organic/Wet', 95, 'Overflowing', 'Twice Daily'),
                ('BIN-UNI-04', 'Bin - University Road North', 'University Road', 26.7720, 83.3805, 500, 'Mixed Waste', 45, 'Normal', 'Daily 06:30 AM'),
                ('BIN-MED-05', 'Bin - BRD Medical College Campus', 'Medical College', 26.7480, 83.3650, 1000, 'Hazardous Waste', 88, 'Full', 'Twice Daily'),
                ('BIN-SHA-06', 'Bin - Shastri Chowk Junction', 'Shastri Chowk', 26.7580, 83.3765, 600, 'Mixed Waste', 15, 'Empty', 'Daily 07:15 AM'),
                ('BIN-RAP-07', 'Bin - Rapti Nagar Commercial Area', 'Rapti Nagar', 26.7690, 83.3610, 800, 'Organic/Wet', 72, 'Nearly Full', 'Daily 09:00 AM'),
                ('BIN-MOH-08', 'Bin - Mohaddipur Square', 'Mohaddipur', 26.7495, 83.3920, 750, 'Mixed Waste', 30, 'Normal', 'Daily 08:00 AM')
            `);
            console.log("✅ Smart Bins seeded.");
        }

        const [vehicleCount] = await pool.query("SELECT COUNT(*) as cnt FROM waste_vehicles");
        if (vehicleCount[0].cnt === 0) {
            console.log("🌱 Seeding realistic Waste Collection Vehicles...");
            await pool.query(`
                INSERT INTO waste_vehicles (vehicle_number, vehicle_type, capacity_tons, driver_name, driver_phone, status, latitude, longitude)
                VALUES 
                ('UP-53-WM-1001', 'Hydraulic Compactor', 8.5, 'Rakesh Tiwari', '9839112233', 'Available', 26.7610, 83.3725),
                ('UP-53-WM-1002', 'Tipper Truck', 5.0, 'Manoj Kumar', '9839445566', 'On Route', 26.7650, 83.3690),
                ('UP-53-WM-1003', 'Electric Mini-Van', 2.0, 'Arun Paswan', '9839778899', 'Available', 26.7550, 83.3800),
                ('UP-53-WM-1004', 'Open Dumper Truck', 10.0, 'Dinesh Yadav', '9839001122', 'Maintenance', 26.7475, 83.3645)
            `);
            console.log("✅ Waste Vehicles seeded.");
        }

        const [workerCount] = await pool.query("SELECT COUNT(*) as cnt FROM waste_workers");
        if (workerCount[0].cnt === 0) {
            console.log("🌱 Seeding Sanitation Staff & Workers...");
            await pool.query(`
                INSERT INTO waste_workers (worker_code, name, phone, role, status)
                VALUES 
                ('WRK-001', 'Ramesh Chandra', '9415012345', 'Sanitation Worker', 'Active'),
                ('WRK-002', 'Suresh Kumar', '9415023456', 'Sanitation Worker', 'Active'),
                ('WRK-003', 'Rajesh Singh', '9415034567', 'Route Supervisor', 'On Duty'),
                ('WRK-004', 'Sunil Sharma', '9415045678', 'Heavy Vehicle Driver', 'Active'),
                ('WRK-005', 'Vikram Rawat', '9415056789', 'Waste Inspector', 'Active')
            `);
            console.log("✅ Sanitation Workers seeded.");
        }

        const [routeCount] = await pool.query("SELECT COUNT(*) as cnt FROM waste_routes");
        if (routeCount[0].cnt === 0) {
            console.log("🌱 Seeding Collection Routes...");
            await pool.query(`
                INSERT INTO waste_routes (route_code, route_name, area, schedule, assigned_vehicle_id, status, waypoints_json)
                VALUES 
                ('RT-GOL-01', 'Golghar Commercial Loop', 'Golghar Central', 'Daily 06:00 AM - 10:00 AM', 1, 'Active', '[[26.7606, 83.3732], [26.7620, 83.3750], [26.7655, 83.3680]]'),
                ('RT-RLY-02', 'Railway Colony & Station Corridor', 'Railway Station Area', 'Daily 07:00 AM - 11:00 AM', 2, 'Active', '[[26.7545, 83.3810], [26.7560, 83.3850], [26.7580, 83.3765]]'),
                ('RT-UNI-03', 'Civil Lines & University Belt', 'Civil Lines', 'Daily 06:30 AM - 10:30 AM', 3, 'Active', '[[26.7720, 83.3805], [26.7700, 83.3750], [26.7690, 83.3610]]'),
                ('RT-MED-04', 'Medical College & BRD Zone', 'BRD Campus', 'Twice Daily (06:00 AM & 04:00 PM)', 4, 'Active', '[[26.7480, 83.3650], [26.7495, 83.3920], [26.7510, 83.3800]]')
            `);
            console.log("✅ Collection Routes seeded.");
        }

        console.log("🎉 [Migration] Waste Management additive migration completed successfully!");
    } catch (err) {
        console.error("🔴 [Migration Error]:", err.message);
        throw err;
    }
}

if (require.main === module) {
    runWasteMigration().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { runWasteMigration };
