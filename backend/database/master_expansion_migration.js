const pool = require("../config/db").promise();
const { hashPassword } = require("../middleware/auth.middleware");

async function addColumnIfNotExists(tableName, columnName, columnDefinition) {
    try {
        const [rows] = await pool.query(
            `SELECT COUNT(*) AS count 
             FROM information_schema.COLUMNS 
             WHERE TABLE_SCHEMA = DATABASE() 
               AND TABLE_NAME = ? 
               AND COLUMN_NAME = ?`,
            [tableName, columnName]
        );
        if (rows[0].count === 0) {
            await pool.query(`ALTER TABLE \`${tableName}\` ADD COLUMN ${columnDefinition}`);
            console.log(`✅ Added column '${columnName}' to table '${tableName}'.`);
        } else {
            console.log(`ℹ️ Column '${columnName}' already exists in table '${tableName}'.`);
        }
    } catch (err) {
        console.error(`⚠️ Error verifying column '${columnName}' in '${tableName}':`, err.message);
    }
}

async function runMasterExpansionMigration() {
    console.log("🚀 Starting SmartCity AI Master Expansion Migration (Strictly Additive)...");

    // 1. Column additions for existing core tables
    await addColumnIfNotExists("users", "role", "role ENUM('citizen','staff','admin') DEFAULT 'citizen'");
    await addColumnIfNotExists("users", "department", "department VARCHAR(50) NULL");

    await addColumnIfNotExists("staff", "role", "role ENUM('staff','admin') DEFAULT 'staff'");
    await addColumnIfNotExists("staff", "email", "email VARCHAR(150) NULL");

    await addColumnIfNotExists("traffic_cameras", "location", "location VARCHAR(255) NULL");
    await addColumnIfNotExists("traffic_cameras", "latitude", "latitude DECIMAL(10, 7) NULL");
    await addColumnIfNotExists("traffic_cameras", "longitude", "longitude DECIMAL(10, 7) NULL");
    await addColumnIfNotExists("traffic_cameras", "department", "department VARCHAR(50) DEFAULT 'traffic'");
    await addColumnIfNotExists("traffic_cameras", "created_by", "created_by INT NULL");

    await addColumnIfNotExists("traffic_signals", "name", "name VARCHAR(150) NULL");
    await addColumnIfNotExists("traffic_signals", "mode", "mode VARCHAR(50) DEFAULT 'AUTO'");
    await addColumnIfNotExists("traffic_signals", "department", "department VARCHAR(50) DEFAULT 'traffic'");

    // Update existing admin staff accounts
    await pool.query(`UPDATE staff SET role = 'admin' WHERE department = 'admin' OR staff_id IN ('STAFF-001', 'TR-ADMIN')`);

    // 2. Create NOTIFICATIONS Table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NULL,
            role VARCHAR(50) NULL,
            department VARCHAR(50) NULL,
            type VARCHAR(50) NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            module VARCHAR(50) NOT NULL,
            reference_id VARCHAR(100) NULL,
            is_read TINYINT(1) DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_notif_user_read (user_id, is_read),
            INDEX idx_notif_dept_read (department, is_read),
            INDEX idx_notif_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("✅ Table 'notifications' verified/created.");

    // 3. Create SERVICE_REQUESTS Table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS service_requests (
            id INT AUTO_INCREMENT PRIMARY KEY,
            request_code VARCHAR(50) UNIQUE NOT NULL,
            user_id INT NULL,
            citizen_name VARCHAR(150) NULL,
            citizen_mobile VARCHAR(50) NULL,
            department VARCHAR(50) NOT NULL,
            category VARCHAR(100) NOT NULL,
            description TEXT NOT NULL,
            latitude DECIMAL(10, 7) NULL,
            longitude DECIMAL(10, 7) NULL,
            address VARCHAR(255) NULL,
            priority ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
            status ENUM('Submitted', 'Acknowledged', 'Assigned', 'In Progress', 'Resolved', 'Rejected', 'Escalated') DEFAULT 'Submitted',
            assigned_staff_id INT NULL,
            assigned_staff_name VARCHAR(150) NULL,
            sla_deadline DATETIME NULL,
            resolved_at DATETIME NULL,
            resolution_notes TEXT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_req_dept_status (department, status),
            INDEX idx_req_assigned (assigned_staff_id, status),
            INDEX idx_req_priority (priority),
            INDEX idx_req_sla (status, sla_deadline)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("✅ Table 'service_requests' verified/created.");

    // 4. Create STREET_LIGHTS Table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS street_lights (
            id INT AUTO_INCREMENT PRIMARY KEY,
            light_code VARCHAR(50) UNIQUE NOT NULL,
            name VARCHAR(150) NOT NULL,
            location VARCHAR(255) NOT NULL,
            latitude DECIMAL(10, 7) NOT NULL,
            longitude DECIMAL(10, 7) NOT NULL,
            status ENUM('ON', 'OFF', 'FAULT', 'UNKNOWN') DEFAULT 'ON',
            brightness INT DEFAULT 100,
            fault_type VARCHAR(100) NULL,
            department VARCHAR(50) DEFAULT 'street_lights',
            last_seen DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_light_status (status),
            INDEX idx_light_dept (department)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("✅ Table 'street_lights' verified/created.");

    // 5. Create CITY_ENVIRONMENTAL_SENSORS Table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS city_environmental_sensors (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sensor_code VARCHAR(50) UNIQUE NOT NULL,
            location VARCHAR(255) NOT NULL,
            zone VARCHAR(100) NOT NULL,
            latitude DECIMAL(10, 7) NOT NULL,
            longitude DECIMAL(10, 7) NOT NULL,
            aqi INT NOT NULL,
            pm25 DECIMAL(6, 2) NOT NULL,
            pm10 DECIMAL(6, 2) NOT NULL,
            temp_c DECIMAL(5, 2) NOT NULL,
            humidity_pct DECIMAL(5, 2) NOT NULL,
            co_ppm DECIMAL(5, 2) NOT NULL,
            status ENUM('Active', 'Maintenance', 'Offline') DEFAULT 'Active',
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_sensor_code (sensor_code),
            INDEX idx_sensor_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("✅ Table 'city_environmental_sensors' verified/created.");

    // 6. Create CITIZEN_FEEDBACK Table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS citizen_feedback (
            id INT AUTO_INCREMENT PRIMARY KEY,
            request_id INT NULL,
            user_id INT NULL,
            citizen_name VARCHAR(150) NULL,
            department VARCHAR(50) NOT NULL,
            rating INT NOT NULL,
            comments TEXT NULL,
            staff_id INT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_feedback_dept (department),
            INDEX idx_feedback_req (request_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("✅ Table 'citizen_feedback' verified/created.");

    // 7. Create AUDIT_LOGS Table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NULL,
            user_name VARCHAR(150) NULL,
            role VARCHAR(50) NULL,
            department VARCHAR(50) NULL,
            action VARCHAR(100) NOT NULL,
            module VARCHAR(50) NOT NULL,
            record_id VARCHAR(100) NULL,
            ip_address VARCHAR(50) NULL,
            metadata JSON NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_audit_module (module),
            INDEX idx_audit_dept (department),
            INDEX idx_audit_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("✅ Table 'audit_logs' verified/created.");

    // 8. Seed Default Staff for all departments if missing
    const defaultStaff = [
        { name: "Emergency Dispatch Staff", staff_id: "EMG001", department: "emergency", role: "staff" },
        { name: "Police Dispatch Staff", staff_id: "POL001", department: "police", role: "staff" },
        { name: "Water Works Supervisor", staff_id: "WTR001", department: "water", role: "staff" },
        { name: "Street Light Operations", staff_id: "LT001", department: "street_lights", role: "staff" },
        { name: "Tourism Guide Coordinator", staff_id: "PLC001", department: "places", role: "staff" }
    ];

    const defaultStaffPasswordHash = hashPassword("staff123");
    for (const st of defaultStaff) {
        const [existing] = await pool.query("SELECT id FROM staff WHERE staff_id = ?", [st.staff_id]);
        if (existing.length === 0) {
            await pool.query(
                "INSERT INTO staff (name, staff_id, password, department, role) VALUES (?, ?, ?, ?, ?)",
                [st.name, st.staff_id, defaultStaffPasswordHash, st.department, st.role]
            );
            console.log(`➕ Created default staff account for department '${st.department}' (${st.staff_id})`);
        }
    }

    // 9. Seed Gorakhpur Environmental Sensor Stations
    const sensors = [
        { code: "AQI-GKP-01", location: "Golghar Central Crossing", zone: "Commercial", lat: 26.7588, lng: 83.3732, aqi: 142, pm25: 58.4, pm10: 122.0, temp: 28.5, hum: 62.0, co: 1.4 },
        { code: "AQI-GKP-02", location: "Gorakhnath Temple Precinct", zone: "Cultural / Heritage", lat: 26.7885, lng: 83.3512, aqi: 78, pm25: 28.2, pm10: 64.5, temp: 27.2, hum: 66.5, co: 0.8 },
        { code: "AQI-GKP-03", location: "GIDA Industrial Zone", zone: "Industrial", lat: 26.7320, lng: 83.2750, aqi: 215, pm25: 112.5, pm10: 230.0, temp: 31.0, hum: 55.0, co: 2.8 },
        { code: "AQI-GKP-04", location: "Ramgarh Tal Promenade", zone: "Ecological / Lakefront", lat: 26.7380, lng: 83.4020, aqi: 62, pm25: 22.0, pm10: 48.0, temp: 26.8, hum: 74.0, co: 0.5 },
        { code: "AQI-GKP-05", location: "AIIMS Gorakhpur Medical Enclave", zone: "Healthcare", lat: 26.7215, lng: 83.4420, aqi: 85, pm25: 32.4, pm10: 71.0, temp: 27.5, hum: 65.0, co: 0.7 },
        { code: "AQI-GKP-06", location: "Mohaddipur Transport Hub", zone: "High-Traffic Corridor", lat: 26.7520, lng: 83.3980, aqi: 178, pm25: 76.8, pm10: 165.2, temp: 29.8, hum: 59.0, co: 1.9 }
    ];

    for (const s of sensors) {
        await pool.query(
            `INSERT INTO city_environmental_sensors 
             (sensor_code, location, zone, latitude, longitude, aqi, pm25, pm10, temp_c, humidity_pct, co_ppm, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')
             ON DUPLICATE KEY UPDATE 
                aqi = VALUES(aqi), pm25 = VALUES(pm25), pm10 = VALUES(pm10), 
                temp_c = VALUES(temp_c), humidity_pct = VALUES(humidity_pct), co_ppm = VALUES(co_ppm)`,
            [s.code, s.location, s.zone, s.lat, s.lng, s.aqi, s.pm25, s.pm10, s.temp, s.hum, s.co]
        );
    }
    console.log(`✅ Seeded ${sensors.length} environmental monitoring sensors.`);

    // 10. Seed Smart Street Lights
    const streetLights = [
        { code: "SL-GKP-001", name: "Golghar High-Mast Light 1", location: "Golghar Central Crossing", lat: 26.7590, lng: 83.3734, status: "ON", brightness: 100 },
        { code: "SL-GKP-002", name: "Golghar North Pole 2", location: "Park Road, Golghar", lat: 26.7602, lng: 83.3740, status: "ON", brightness: 90 },
        { code: "SL-GKP-003", name: "Dharamshala Solar Pole 1", location: "Dharamshala Bazar Crossing", lat: 26.7668, lng: 83.3642, status: "FAULT", brightness: 0, fault: "Bulb burnout / Circuit failure" },
        { code: "SL-GKP-004", name: "Asuran Avenue Light 3", location: "Asuran Chowk Corridor", lat: 26.7745, lng: 83.3812, status: "ON", brightness: 80 },
        { code: "SL-GKP-005", name: "Mohaddipur Junction Light 1", location: "Mohaddipur Junction West", lat: 26.7522, lng: 83.3982, status: "ON", brightness: 100 },
        { code: "SL-GKP-006", name: "Mohaddipur Junction Light 2", location: "Mohaddipur Junction East", lat: 26.7518, lng: 83.3990, status: "OFF", brightness: 0 },
        { code: "SL-GKP-007", name: "Ramgarh Tal Lake Road Light 1", location: "Naya Savera Lakefront", lat: 26.7385, lng: 83.4025, status: "ON", brightness: 100 },
        { code: "SL-GKP-008", name: "Gorakhnath Road Lamp 4", location: "Gorakhnath Mandir Road", lat: 26.7870, lng: 83.3520, status: "ON", brightness: 85 }
    ];

    for (const sl of streetLights) {
        await pool.query(
            `INSERT INTO street_lights 
             (light_code, name, location, latitude, longitude, status, brightness, fault_type, department)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'street_lights')
             ON DUPLICATE KEY UPDATE 
                name = VALUES(name), location = VALUES(location), 
                latitude = VALUES(latitude), longitude = VALUES(longitude),
                status = VALUES(status), brightness = VALUES(brightness), fault_type = VALUES(fault_type)`,
            [sl.code, sl.name, sl.location, sl.lat, sl.lng, sl.status, sl.brightness, sl.fault || null]
        );
    }
    console.log(`✅ Seeded ${streetLights.length} smart street lighting assets.`);

    // 11. Seed initial demo Service Requests if table is empty
    const [existingReqs] = await pool.query("SELECT COUNT(*) AS count FROM service_requests");
    if (existingReqs[0].count === 0) {
        const demoRequests = [
            {
                code: "REQ-WST-2026-001",
                citizen_name: "Rahul Sharma",
                citizen_mobile: "9876543210",
                department: "waste",
                category: "Garbage Overflow",
                description: "Community waste bin overflowing near Golghar market square, urgent clearance needed.",
                lat: 26.7592,
                lng: 83.3728,
                address: "Golghar Market Square",
                priority: "HIGH",
                status: "Assigned",
                assigned_staff_id: 2,
                assigned_staff_name: "Waste Staff",
                sla_hours: 6
            },
            {
                code: "REQ-TRF-2026-002",
                citizen_name: "Anita Verma",
                citizen_mobile: "9812345678",
                department: "traffic",
                category: "Traffic Signal Malfunction",
                description: "Traffic signal stuck on amber creating severe gridlock at Dharamshala Bazar.",
                lat: 26.7665,
                lng: 83.3640,
                address: "Dharamshala Bazar Crossing",
                priority: "CRITICAL",
                status: "In Progress",
                assigned_staff_id: 1,
                assigned_staff_name: "Traffic Staff",
                sla_hours: 2
            },
            {
                code: "REQ-LT-2026-003",
                citizen_name: "Vikas Dubey",
                citizen_mobile: "9933445566",
                department: "street_lights",
                category: "Dark Street / Light Failure",
                description: "Street light pole SL-GKP-003 completely dark since last night, safety hazard for pedestrians.",
                lat: 26.7668,
                lng: 83.3642,
                address: "Dharamshala Bazar Crossing Pole 3",
                priority: "MEDIUM",
                status: "Submitted",
                assigned_staff_id: null,
                assigned_staff_name: null,
                sla_hours: 24
            }
        ];

        for (const dr of demoRequests) {
            const now = new Date();
            const deadline = new Date(now.getTime() + dr.sla_hours * 3600 * 1000);
            await pool.query(
                `INSERT INTO service_requests 
                 (request_code, citizen_name, citizen_mobile, department, category, description, latitude, longitude, address, priority, status, assigned_staff_id, assigned_staff_name, sla_deadline)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [dr.code, dr.citizen_name, dr.citizen_mobile, dr.department, dr.category, dr.description, dr.lat, dr.lng, dr.address, dr.priority, dr.status, dr.assigned_staff_id, dr.assigned_staff_name, deadline]
            );
        }
        console.log(`✅ Seeded ${demoRequests.length} demo smart service requests.`);
    }

    console.log("🎉 SmartCity AI Master Expansion Migration completed successfully.");
}

if (require.main === module) {
    runMasterExpansionMigration()
        .then(() => process.exit(0))
        .catch(err => {
            console.error("❌ Migration failed:", err);
            process.exit(1);
        });
}

module.exports = runMasterExpansionMigration;
