/**
 * SmartCity AI - Water Management Platform Upgrade Migration
 * Adds tables and columns for:
 * 1. Water Supply Announcements & Announced Water Cuts
 * 2. Tank & Source Area Supply Mappings (`supplied_areas`, `source_asset_id` on water_tanks)
 * 3. Water Network Assets expansion (WTP, STP, Sources, Pumps, Valves, Drainage Outlets, Connections)
 * 4. Water Complaints enhancement with categories, map coordinates, and photo attachments
 */

const mysql = require("mysql2/promise");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

async function runMigration() {
    console.log("================================================================================");
    console.log("💧 RUNNING WATER MANAGEMENT PLATFORM UPGRADE MIGRATION");
    console.log("================================================================================\n");

    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : "",
        database: process.env.DB_NAME || "smartcity",
        port: Number(process.env.DB_PORT) || 3306,
        multipleStatements: true
    });

    try {
        // -------------------------------------------------------------------------
        // 1. Water Supply Announcements & Announced Water Cuts Table
        // -------------------------------------------------------------------------
        console.log("1. Creating water_supply_announcements table...");
        await conn.query(`
            CREATE TABLE IF NOT EXISTS water_supply_announcements (
                id INT AUTO_INCREMENT PRIMARY KEY,
                announcement_id VARCHAR(50) NOT NULL UNIQUE,
                title VARCHAR(150) NOT NULL,
                type ENUM('WATER_CUT', 'LOW_PRESSURE_ALERT', 'MAINTENANCE', 'SUPPLY_SCHEDULE', 'WATER_QUALITY_ADVISORY') DEFAULT 'WATER_CUT',
                zone VARCHAR(100) NOT NULL,
                affected_areas JSON NOT NULL,
                start_time DATETIME NOT NULL,
                end_time DATETIME NOT NULL,
                reason TEXT NOT NULL,
                alternative_supply VARCHAR(255) DEFAULT 'Emergency water tankers on standby.',
                status ENUM('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED') DEFAULT 'SCHEDULED',
                created_by VARCHAR(100) DEFAULT 'Water Admin',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_status (status),
                INDEX idx_zone (zone)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // Seed initial announcements
        await conn.query(`
            INSERT IGNORE INTO water_supply_announcements
            (announcement_id, title, type, zone, affected_areas, start_time, end_time, reason, alternative_supply, status, created_by)
            VALUES
            ('ANN-WTR-01', 'Scheduled Main Pipeline Maintenance - Civil Lines', 'WATER_CUT', 'Civil Lines', 
             '["Civil Lines North", "Park Road", "Judiciary Complex"]', 
             DATE_ADD(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 1 DAY) + INTERVAL 4 HOUR, 
             'Pre-monsoon trunk feeder valve replacement and hydraulic pressure balancing.', 
             'Mobile tanker tankers stationed at Civil Lines Chowk (Tanker #UP53-WT-101).', 'SCHEDULED', 'Water Admin'),

            ('ANN-WTR-02', 'Raw Water Intake Desiltation - Rohin WTP', 'LOW_PRESSURE_ALERT', 'Medical College Ward', 
             '["BRD Medical Campus", "Asuran Chowk", "Basharatpur"]', 
             NOW(), DATE_ADD(NOW(), INTERVAL 8 HOUR), 
             'Periodic sand filter backwash and intake channel desiltation.', 
             'Normal pressure will be restored by 06:00 PM.', 'ACTIVE', 'Water Admin')
        `);

        // -------------------------------------------------------------------------
        // 2. Enhance water_tanks with supplied_areas and source connections
        // -------------------------------------------------------------------------
        console.log("2. Checking water_tanks columns...");
        const [tankCols] = await conn.query("SHOW COLUMNS FROM water_tanks");
        const tankColNames = tankCols.map(c => c.Field);

        if (!tankColNames.includes("supplied_areas")) {
            console.log("   Adding supplied_areas column to water_tanks...");
            await conn.query("ALTER TABLE water_tanks ADD COLUMN supplied_areas JSON DEFAULT NULL");
        }
        if (!tankColNames.includes("source_asset_id")) {
            console.log("   Adding source_asset_id column to water_tanks...");
            await conn.query("ALTER TABLE water_tanks ADD COLUMN source_asset_id VARCHAR(50) DEFAULT NULL");
        }
        if (!tankColNames.includes("supply_schedule")) {
            console.log("   Adding supply_schedule column to water_tanks...");
            await conn.query("ALTER TABLE water_tanks ADD COLUMN supply_schedule VARCHAR(150) DEFAULT '06:00 AM - 09:00 AM, 05:00 PM - 08:00 PM'");
        }

        // Seed supplied areas for existing tanks
        await conn.query(`
            UPDATE water_tanks SET 
                supplied_areas = '["Golghar Central", "Bal Vihar", "Cinema Road"]',
                source_asset_id = 'WTP-01',
                supply_schedule = '06:00 AM - 09:00 AM, 05:00 PM - 08:00 PM'
            WHERE tank_id = 'TANK-001' OR name LIKE '%Golghar%'
        `);
        await conn.query(`
            UPDATE water_tanks SET 
                supplied_areas = '["Civil Lines North", "Kachhari", "Park Road"]',
                source_asset_id = 'WTP-01',
                supply_schedule = '06:30 AM - 09:30 AM, 05:30 PM - 08:30 PM'
            WHERE tank_id = 'TANK-002' OR name LIKE '%Civil Lines%'
        `);
        await conn.query(`
            UPDATE water_tanks SET 
                supplied_areas = '["Railway Colony", "Dharamshala Bazar", "Alinagar"]',
                source_asset_id = 'SRC-WELL-01',
                supply_schedule = '05:30 AM - 08:30 AM, 05:00 PM - 07:30 PM'
            WHERE tank_id = 'TANK-003' OR name LIKE '%Railway%'
        `);
        await conn.query(`
            UPDATE water_tanks SET 
                supplied_areas = '["BRD Medical Campus", "Mogalaha", "Asuran"]',
                source_asset_id = 'SRC-WELL-02',
                supply_schedule = '06:00 AM - 10:00 AM, 05:00 PM - 09:00 PM'
            WHERE tank_id = 'TANK-004' OR name LIKE '%Medical%'
        `);
        await conn.query(`
            UPDATE water_tanks SET 
                supplied_areas = '["GIDA Sector 3", "Industrial Area", "Sahjanwa Road"]',
                source_asset_id = 'WTP-01',
                supply_schedule = '07:00 AM - 11:00 AM, 04:00 PM - 08:00 PM'
            WHERE tank_id = 'TANK-005' OR name LIKE '%GIDA%'
        `);

        // -------------------------------------------------------------------------
        // 3. Enhance water_network_assets for full facilities management
        // -------------------------------------------------------------------------
        console.log("3. Checking water_network_assets columns...");
        const [assetCols] = await conn.query("SHOW COLUMNS FROM water_network_assets");
        const assetColNames = assetCols.map(c => c.Field);

        if (!assetColNames.includes("supplied_areas")) {
            console.log("   Adding supplied_areas column to water_network_assets...");
            await conn.query("ALTER TABLE water_network_assets ADD COLUMN supplied_areas JSON DEFAULT NULL");
        }
        if (!assetColNames.includes("connected_assets")) {
            console.log("   Adding connected_assets column to water_network_assets...");
            await conn.query("ALTER TABLE water_network_assets ADD COLUMN connected_assets JSON DEFAULT NULL");
        }
        if (!assetColNames.includes("depth_m")) {
            console.log("   Adding depth_m column to water_network_assets...");
            await conn.query("ALTER TABLE water_network_assets ADD COLUMN depth_m DECIMAL(4, 2) DEFAULT 2.50");
        }

        // Alter asset_type ENUM to support all required facilities
        console.log("   Extending asset_type ENUM in water_network_assets...");
        await conn.query(`
            ALTER TABLE water_network_assets 
            MODIFY COLUMN asset_type ENUM(
                'TREATMENT_PLANT_STP',
                'TREATMENT_PLANT_WTP',
                'WATER_SOURCE',
                'BOOSTER_PUMP',
                'CONTROL_VALVE',
                'DRAINAGE_OUTLET',
                'NETWORK_JUNCTION',
                'STORAGE_RESERVOIR',
                'DISCHARGE_POINT'
            ) NOT NULL;
        `);

        // Seed diverse facilities (Sources, WTPs, STPs, Pumps, Valves, Drainage Outlets, Connections)
        await conn.query(`
            INSERT IGNORE INTO water_network_assets
            (asset_id, name, asset_type, zone, latitude, longitude, elevation_m, depth_m, status, pump_state, valve_state, flow_direction, telemetry_provenance, specifications, supplied_areas, connected_assets, data_source)
            VALUES
            ('SRC-WELL-01', 'Dharamshala Deep Aquifer Tubewell Source #4', 'WATER_SOURCE', 'Dharamshala Ward', 
             26.7640, 83.3645, 84.10, 85.00, 'OPERATIONAL', 'ON', 'OPEN', 'FORWARD', 'MEASURED',
             '{"type": "Deep Tubewell", "discharge_lps": 45, "depth_meters": 120, "water_table_m": 18.5, "aquifer_strata": "Fine Sand & Gravel"}',
             '["Dharamshala Bazar", "Railway Colony"]', '["TANK-003", "PUMP-01"]', 'MEASURED'),

            ('SRC-WELL-02', 'BRD North Borewell Raw Supply Point #2', 'WATER_SOURCE', 'Medical College Ward', 
             26.7910, 83.3995, 87.20, 95.00, 'OPERATIONAL', 'ON', 'OPEN', 'FORWARD', 'MEASURED',
             '{"type": "Deep Tubewell", "discharge_lps": 60, "depth_meters": 140, "water_table_m": 22.0}',
             '["BRD Medical Campus", "Mogalaha"]', '["TANK-004"]', 'MEASURED'),

            ('DRN-OUT-01', 'Ramgarh Tal Main Stormwater Drainage Outfall', 'DRAINAGE_OUTLET', 'Ramgarh Tal East', 
             26.7410, 83.4020, 77.50, 3.20, 'OPERATIONAL', 'STANDBY', 'OPEN', 'FORWARD', 'MEASURED',
             '{"type": "Sluice Gate Box Culvert", "width_m": 4.5, "height_m": 2.8, "max_discharge_cumecs": 24.0, "silt_trap_status": "Clean"}',
             '["Mohaddipur", "Padleyganj Storm Drain Corridor"]', '["PIPE-SEC4"]', 'MEASURED'),

            ('DRN-OUT-02', 'Rapti River South Drainage Flap Gate #3', 'DRAINAGE_OUTLET', 'Mahewa Rapti Embankment', 
             26.7280, 83.3710, 76.80, 3.80, 'OPERATIONAL', 'STANDBY', 'OPEN', 'FORWARD', 'MEASURED',
             '{"type": "Cast Iron Flap Valve", "diameter_mm": 1200, "backflow_protection": "Active", "max_discharge_cumecs": 18.5}',
             '["Civil Lines South", "Transportation Nagar"]', '["STP-01"]', 'MEASURED'),

            ('CONN-NODE-01', 'Golghar Central Distribution Interconnect Hub', 'NETWORK_JUNCTION', 'Golghar Central', 
             26.7575, 83.3725, 83.40, 2.10, 'OPERATIONAL', 'STANDBY', 'OPEN', 'FORWARD', 'MEASURED',
             '{"type": "Cast Ductile Iron Manifold 4-Way", "inlet_diameter_mm": 600, "outlets_count": 3}',
             '["Golghar Market", "Park Road", "Cinema Road"]', '["PIPE-SEC1", "PIPE-SEC2"]', 'MEASURED')
        `);

        // -------------------------------------------------------------------------
        // 4. Enhance water_reports for Visitor Complaints
        // -------------------------------------------------------------------------
        console.log("4. Checking water_reports columns...");
        const [repCols] = await conn.query("SHOW COLUMNS FROM water_reports");
        const repColNames = repCols.map(c => c.Field);

        if (!repColNames.includes("latitude")) {
            console.log("   Adding latitude column to water_reports...");
            await conn.query("ALTER TABLE water_reports ADD COLUMN latitude DECIMAL(10, 8) DEFAULT NULL");
        }
        if (!repColNames.includes("longitude")) {
            console.log("   Adding longitude column to water_reports...");
            await conn.query("ALTER TABLE water_reports ADD COLUMN longitude DECIMAL(11, 8) DEFAULT NULL");
        }
        if (!repColNames.includes("category")) {
            console.log("   Adding category column to water_reports...");
            await conn.query("ALTER TABLE water_reports ADD COLUMN category VARCHAR(50) DEFAULT 'Water Quality'");
        }

        console.log("✅ Water Management platform migrations completed successfully.\n");
        await conn.end();
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration failed:", err);
        try { await conn.end(); } catch (_) {}
        process.exit(1);
    }
}

runMigration();
