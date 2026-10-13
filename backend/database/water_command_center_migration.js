/**
 * SmartCity AI - Water & Sewage Command Center Master Migration
 * Upgrades MySQL schema for:
 * - Hospital-like RBAC (Super Admin, Water Admin, Water Staff, Citizen)
 * - Work Order Lifecycle (ASSIGNED, ACKNOWLEDGED, IN_PROGRESS, BLOCKED, RESOLVED, VERIFIED)
 * - Network Type Separation (POTABLE_WATER, SEWAGE, RECLAIMED_WATER, STORMWATER)
 * - Flow Control, Provenance & Valve/Pump States
 * - Configurable Styles & Color Legends
 * - Fault Provenance (CONFIRMED, CITIZEN_REPORT, ALGORITHMIC_SUSPICION, SIMULATED)
 */

const mysql = require("mysql2/promise");
const path = require("path");
const crypto = require("crypto");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

function hashPassword(plainPassword) {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(String(plainPassword), salt, 64).toString("hex");
    return `scrypt$${salt}$${hash}`;
}

async function runWaterCommandCenterMigration() {
    console.log("🌊 =====================================================");
    console.log("🌊 Running Water & Sewage Command Center Schema Migration");
    console.log("🌊 =====================================================");

    const pool = mysql.createPool({
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "omkar",
        database: process.env.DB_NAME || "smartcity",
        multipleStatements: true
    });

    const conn = await pool.getConnection();

    try {
        console.log("1. Checking and upgrading water_work_orders table...");
        const [woCols] = await conn.query("SHOW COLUMNS FROM water_work_orders");
        const woColNames = woCols.map(c => c.Field);

        // Modify status column to support full lifecycle
        await conn.query(`
            ALTER TABLE water_work_orders 
            MODIFY COLUMN status ENUM('ASSIGNED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'BLOCKED', 'RESOLVED', 'VERIFIED', 'COMPLETED', 'CANCELLED') 
            DEFAULT 'ASSIGNED'
        `);

        if (!woColNames.includes("observations")) {
            await conn.query("ALTER TABLE water_work_orders ADD COLUMN observations TEXT NULL");
        }
        if (!woColNames.includes("acknowledged_at")) {
            await conn.query("ALTER TABLE water_work_orders ADD COLUMN acknowledged_at TIMESTAMP NULL");
        }
        if (!woColNames.includes("blocked_reason")) {
            await conn.query("ALTER TABLE water_work_orders ADD COLUMN blocked_reason TEXT NULL");
        }
        if (!woColNames.includes("verified_by")) {
            await conn.query("ALTER TABLE water_work_orders ADD COLUMN verified_by VARCHAR(100) NULL");
        }
        if (!woColNames.includes("verified_at")) {
            await conn.query("ALTER TABLE water_work_orders ADD COLUMN verified_at TIMESTAMP NULL");
        }
        if (!woColNames.includes("evidence_notes")) {
            await conn.query("ALTER TABLE water_work_orders ADD COLUMN evidence_notes TEXT NULL");
        }
        if (!woColNames.includes("network_type")) {
            await conn.query("ALTER TABLE water_work_orders ADD COLUMN network_type ENUM('POTABLE_WATER', 'SEWAGE', 'RECLAIMED_WATER', 'STORMWATER') DEFAULT 'POTABLE_WATER'");
        }

        console.log("2. Checking and upgrading water_pipelines table...");
        const [pipeCols] = await conn.query("SHOW COLUMNS FROM water_pipelines");
        const pipeColNames = pipeCols.map(c => c.Field);

        await conn.query(`
            ALTER TABLE water_pipelines 
            MODIFY COLUMN pipe_type ENUM('POTABLE', 'WASTEWATER', 'SEWAGE', 'RECLAIMED', 'STORMWATER', 'POTABLE_WATER', 'RECLAIMED_WATER') 
            DEFAULT 'POTABLE'
        `);

        if (!pipeColNames.includes("flow_direction")) {
            await conn.query("ALTER TABLE water_pipelines ADD COLUMN flow_direction ENUM('FORWARD', 'REVERSE', 'BIDIRECTIONAL') DEFAULT 'FORWARD'");
        }
        if (!pipeColNames.includes("valve_state")) {
            await conn.query("ALTER TABLE water_pipelines ADD COLUMN valve_state ENUM('OPEN', 'CLOSED', 'THROTTLED') DEFAULT 'OPEN'");
        }
        if (!pipeColNames.includes("telemetry_provenance")) {
            await conn.query("ALTER TABLE water_pipelines ADD COLUMN telemetry_provenance ENUM('MEASURED', 'SIMULATED', 'STALE', 'UNAVAILABLE', 'HARDWARE_UNVERIFIED') DEFAULT 'MEASURED'");
        }
        if (!pipeColNames.includes("target_pressure_bar")) {
            await conn.query("ALTER TABLE water_pipelines ADD COLUMN target_pressure_bar DECIMAL(4,2) DEFAULT 2.80");
        }
        if (!pipeColNames.includes("target_flow_lps")) {
            await conn.query("ALTER TABLE water_pipelines ADD COLUMN target_flow_lps DECIMAL(6,2) DEFAULT 50.00");
        }
        if (!pipeColNames.includes("survey_status")) {
            await conn.query("ALTER TABLE water_pipelines ADD COLUMN survey_status ENUM('SURVEYED', 'NEEDS_SURVEY', 'UNKNOWN') DEFAULT 'SURVEYED'");
        }
        if (!pipeColNames.includes("road_width_m")) {
            await conn.query("ALTER TABLE water_pipelines ADD COLUMN road_width_m DECIMAL(5,2) DEFAULT 14.50");
        }

        console.log("3. Checking and upgrading water_network_assets table...");
        const [assetCols] = await conn.query("SHOW COLUMNS FROM water_network_assets");
        const assetColNames = assetCols.map(c => c.Field);

        if (!assetColNames.includes("pump_state")) {
            await conn.query("ALTER TABLE water_network_assets ADD COLUMN pump_state ENUM('ON', 'OFF', 'MAINTENANCE', 'STANDBY') DEFAULT 'ON'");
        }
        if (!assetColNames.includes("valve_state")) {
            await conn.query("ALTER TABLE water_network_assets ADD COLUMN valve_state ENUM('OPEN', 'CLOSED', 'THROTTLED') DEFAULT 'OPEN'");
        }
        if (!assetColNames.includes("flow_direction")) {
            await conn.query("ALTER TABLE water_network_assets ADD COLUMN flow_direction VARCHAR(20) DEFAULT 'FORWARD'");
        }
        if (!assetColNames.includes("telemetry_provenance")) {
            await conn.query("ALTER TABLE water_network_assets ADD COLUMN telemetry_provenance ENUM('MEASURED', 'SIMULATED', 'STALE', 'UNAVAILABLE', 'HARDWARE_UNVERIFIED') DEFAULT 'MEASURED'");
        }
        if (!assetColNames.includes("operating_mode")) {
            await conn.query("ALTER TABLE water_network_assets ADD COLUMN operating_mode ENUM('AUTO', 'MANUAL', 'SIMULATED') DEFAULT 'AUTO'");
        }

        console.log("4. Checking and upgrading sewage_planned_routes table...");
        const [sewCols] = await conn.query("SHOW COLUMNS FROM sewage_planned_routes");
        const sewColNames = sewCols.map(c => c.Field);

        if (!sewColNames.includes("network_type")) {
            await conn.query("ALTER TABLE sewage_planned_routes ADD COLUMN network_type ENUM('POTABLE_WATER', 'SEWAGE', 'RECLAIMED_WATER', 'STORMWATER') DEFAULT 'SEWAGE'");
        }
        if (!sewColNames.includes("color")) {
            await conn.query("ALTER TABLE sewage_planned_routes ADD COLUMN color VARCHAR(20) DEFAULT '#c2410c'");
        }
        if (!sewColNames.includes("line_style")) {
            await conn.query("ALTER TABLE sewage_planned_routes ADD COLUMN line_style VARCHAR(20) DEFAULT 'solid'");
        }
        if (!sewColNames.includes("survey_status")) {
            await conn.query("ALTER TABLE sewage_planned_routes ADD COLUMN survey_status ENUM('SURVEYED', 'NEEDS_SURVEY', 'UNKNOWN') DEFAULT 'SURVEYED'");
        }
        if (!sewColNames.includes("road_width_m")) {
            await conn.query("ALTER TABLE sewage_planned_routes ADD COLUMN road_width_m DECIMAL(5,2) DEFAULT 12.00");
        }

        console.log("5. Creating or verifying water_network_config table...");
        await conn.query(`
            CREATE TABLE IF NOT EXISTS water_network_config (
                config_key VARCHAR(50) PRIMARY KEY,
                config_value JSON NOT NULL,
                updated_by VARCHAR(100) DEFAULT 'Water Admin',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // Seed default configurable network types styling
        const defaultStyles = {
            POTABLE_WATER: {
                key: "POTABLE_WATER",
                label: "Potable Drinking Water Main",
                color: "#0284c7",
                secondary_color: "#38bdf8",
                icon: "🚰",
                line_style: "solid",
                default_diameter_mm: 500,
                default_depth_m: 2.4,
                clearance_req_m: 2.0,
                description: "Treated clean municipal drinking water distribution network."
            },
            SEWAGE: {
                key: "SEWAGE",
                label: "Sanitary Sewage & Wastewater",
                color: "#c2410c",
                secondary_color: "#ea580c",
                icon: "📐",
                line_style: "dashed",
                default_diameter_mm: 600,
                default_depth_m: 3.2,
                clearance_req_m: 2.0,
                description: "Underground gravity sewer trunks and interceptor network conveying wastewater to STP."
            },
            RECLAIMED_WATER: {
                key: "RECLAIMED_WATER",
                label: "Treated Reclaimed Water",
                color: "#10b981",
                secondary_color: "#34d399",
                icon: "♻️",
                line_style: "dotted",
                default_diameter_mm: 350,
                default_depth_m: 2.0,
                clearance_req_m: 1.5,
                description: "Tertiary treated recycled water from STP for Ramgarh Tal lake replenishment, park irrigation, and GIDA cooling."
            },
            STORMWATER: {
                key: "STORMWATER",
                label: "Urban Stormwater & Monsoon Drainage",
                color: "#8b5cf6",
                secondary_color: "#a855f7",
                icon: "🌧️",
                line_style: "dash-dot",
                default_diameter_mm: 900,
                default_depth_m: 1.8,
                clearance_req_m: 1.0,
                description: "Surface and subterranean monsoon runoff drainage network."
            }
        };

        await conn.query(`
            INSERT INTO water_network_config (config_key, config_value, updated_by)
            VALUES ('NETWORK_STYLES', ?, 'System Super Admin')
            ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)
        `, [JSON.stringify(defaultStyles)]);

        console.log("6. Creating or verifying water_fault_records table...");
        await conn.query(`
            CREATE TABLE IF NOT EXISTS water_fault_records (
                id INT AUTO_INCREMENT PRIMARY KEY,
                fault_code VARCHAR(50) UNIQUE NOT NULL,
                asset_id VARCHAR(50) NOT NULL,
                network_type ENUM('POTABLE_WATER', 'SEWAGE', 'RECLAIMED_WATER', 'STORMWATER') DEFAULT 'POTABLE_WATER',
                zone VARCHAR(100) NOT NULL,
                title VARCHAR(200) NOT NULL,
                description TEXT,
                fault_type ENUM('LOW_FLOW', 'HIGH_PRESSURE', 'BURST_LEAK', 'BLOCKAGE', 'OVERFLOW_RISK', 'SENSOR_OFFLINE', 'TREATMENT_QUALITY_NON_COMPLIANT', 'TOPOLOGY_DEFECT') NOT NULL,
                severity ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW') DEFAULT 'HIGH',
                provenance ENUM('CONFIRMED', 'CITIZEN_REPORT', 'ALGORITHMIC_SUSPICION', 'SIMULATED') NOT NULL,
                confidence_pct DECIMAL(5,2) DEFAULT 88.50,
                status ENUM('OPEN', 'ASSIGNED', 'INVESTIGATING', 'RESOLVED', 'FALSE_ALARM') DEFAULT 'OPEN',
                affected_flow_lps DECIMAL(6,2) DEFAULT 0.00,
                affected_pressure_bar DECIMAL(4,2) DEFAULT 0.00,
                recommended_action TEXT,
                detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                resolved_at TIMESTAMP NULL,
                INDEX idx_provenance (provenance),
                INDEX idx_status (status),
                INDEX idx_zone (zone)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // Seed realistic faults with clear provenance separation
        const [existingFaults] = await conn.query("SELECT COUNT(*) AS c FROM water_fault_records");
        if (existingFaults[0].c === 0) {
            await conn.query(`
                INSERT INTO water_fault_records 
                (fault_code, asset_id, network_type, zone, title, description, fault_type, severity, provenance, confidence_pct, status, affected_flow_lps, affected_pressure_bar, recommended_action)
                VALUES
                ('FLT-POT-01', 'PL-105', 'POTABLE_WATER', 'Mohaddipur', 'Physical Pipe Fracture & Pressure Drop', 'Acoustic sensor verified circumferential joint displacement on feeder line.', 'BURST_LEAK', 'CRITICAL', 'CONFIRMED', 98.0, 'OPEN', 25.0, 1.4, 'Dispatch emergency excavation crew. Close isolation valve V-MOH-04.'),
                ('FLT-SEW-01', 'STP-01', 'SEWAGE', 'Mahewa / South Ward', 'Wet Well Peak Influent Surcharge', 'Inflow sensor reports 58 MLD exceeding hydraulic dry-weather design limit.', 'HIGH_PRESSURE', 'HIGH', 'CONFIRMED', 95.0, 'INVESTIGATING', 85.0, 1.2, 'Start auxiliary screw pump #3 at inlet pumping station.'),
                ('FLT-CIT-01', 'PL-103', 'POTABLE_WATER', 'Railway Colony', 'Turbid Water Odor Complaint', 'Citizen grievance #REQ-WAT-8821 reported discoloration near Railway Platform 1.', 'TREATMENT_QUALITY_NON_COMPLIANT', 'MEDIUM', 'CITIZEN_REPORT', 70.0, 'ASSIGNED', 0.0, 2.1, 'Collect laboratory grab sample for chlorine residual and turbidity verification.'),
                ('FLT-AI-01', 'PL-102', 'POTABLE_WATER', 'Civil Lines', 'Anomalous Nocturnal Flow Discrepancy', 'Machine learning isolation forest flagged 18% higher minimum night flow (MNF).', 'LOW_FLOW', 'MEDIUM', 'ALGORITHMIC_SUSPICION', 82.5, 'OPEN', 12.0, 2.8, 'Deploy acoustic correlation logger to detect subterranean pinhole leak.'),
                ('FLT-SIM-01', 'PL-201', 'RECLAIMED_WATER', 'Ramgarh Tal Lakefront', 'Simulated Lake Outfall Valve Choke Scenario', 'Command center hydraulic drill: valve throttled to 20% in simulation sandbox.', 'BLOCKAGE', 'LOW', 'SIMULATED', 100.0, 'OPEN', 48.0, 3.4, 'Simulated operator training exercise: no real infrastructure affected.')
            `);
            console.log("Seeded 5 baseline water faults with distinct provenance.");
        }

        console.log("7. Seeding or verifying Water Staff & Administrator accounts in staff table...");
        const defaultPasswordHash = hashPassword("smartcity2026");

        // Super Admin account
        await conn.query(`
            INSERT INTO staff (staff_id, name, department, role, email, password, status, permissions, assigned_modules)
            VALUES ('STAFF-001', 'Vikramaditya Rathore', 'Admin', 'admin', 'superadmin@smartcity.gov.in', ?, 'Active', 
                    JSON_ARRAY('all', 'admin', 'manage_staff', 'manage_water', 'manage_hospitals'), 
                    JSON_ARRAY('admin', 'water', 'sewage_planner', 'hospital', 'traffic', 'waste', 'parking'))
            ON DUPLICATE KEY UPDATE 
                role = 'admin',
                permissions = JSON_ARRAY('all', 'admin', 'manage_staff', 'manage_water', 'manage_hospitals'),
                assigned_modules = JSON_ARRAY('admin', 'water', 'sewage_planner', 'hospital', 'traffic', 'waste', 'parking')
        `, [defaultPasswordHash]);

        // Water Admin account (Superintendent Engineer)
        await conn.query(`
            INSERT INTO staff (staff_id, name, department, role, email, password, status, permissions, assigned_modules)
            VALUES ('WTR-ADMIN', 'Er. R.N. Tripathi (Water Admin)', 'water', 'admin', 'water.admin@smartcity.gov.in', ?, 'Active',
                    JSON_ARRAY('all', 'water_admin', 'manage_routes', 'publish_network', 'assign_work_orders', 'flow_control', 'approve_batches'),
                    JSON_ARRAY('water', 'sewage_planner', 'water_command_center', 'water_staff_desk'))
            ON DUPLICATE KEY UPDATE 
                role = 'admin',
                permissions = JSON_ARRAY('all', 'water_admin', 'manage_routes', 'publish_network', 'assign_work_orders', 'flow_control', 'approve_batches'),
                assigned_modules = JSON_ARRAY('water', 'sewage_planner', 'water_command_center', 'water_staff_desk')
        `, [defaultPasswordHash]);

        // Water Staff Engineer account
        await conn.query(`
            INSERT INTO staff (staff_id, name, department, role, email, password, status, permissions, assigned_modules)
            VALUES ('WTR-ENG-01', 'Er. Saurabh Mishra (Pipeline Engineer)', 'water', 'staff', 'saurabh.mishra@smartcity.gov.in', ?, 'Active',
                    JSON_ARRAY('view', 'update', 'work_orders', 'inspect_assets', 'update_status'),
                    JSON_ARRAY('water', 'sewage_planner', 'water_staff_desk'))
            ON DUPLICATE KEY UPDATE 
                role = 'staff',
                department = 'water',
                permissions = JSON_ARRAY('view', 'update', 'work_orders', 'inspect_assets', 'update_status'),
                assigned_modules = JSON_ARRAY('water', 'sewage_planner', 'water_staff_desk')
        `, [defaultPasswordHash]);

        // Water Field Supervisor (WTR001)
        await conn.query(`
            INSERT INTO staff (staff_id, name, department, role, email, password, status, permissions, assigned_modules)
            VALUES ('WTR001', 'Manoj Yadav (Field Supervisor)', 'water', 'staff', 'wtr001@smartcity.gov.in', ?, 'Active',
                    JSON_ARRAY('view', 'update', 'work_orders'),
                    JSON_ARRAY('water', 'water_staff_desk'))
            ON DUPLICATE KEY UPDATE 
                role = 'staff',
                department = 'water',
                permissions = JSON_ARRAY('view', 'update', 'work_orders'),
                assigned_modules = JSON_ARRAY('water', 'water_staff_desk')
        `, [defaultPasswordHash]);

        console.log("8. Seeding realistic work orders across lifecycle states...");
        const [woCount] = await conn.query("SELECT COUNT(*) AS c FROM water_work_orders");
        if (woCount[0].c < 5) {
            await conn.query(`
                INSERT INTO water_work_orders 
                (order_id, title, description, asset_id, asset_type, zone, assigned_to_id, assigned_to_name, required_role, priority, deadline, status, created_by, created_at, acknowledged_at, observations)
                VALUES
                ('WO-2026-001', 'Repair Feeder Pipe Joint at Mohaddipur Sub-Line', 'Acoustic confirmed joint leak. Dig trench, install stainless steel repair clamp.', 'PL-105', 'PIPELINE', 'Mohaddipur', 'WTR-ENG-01', 'Er. Saurabh Mishra', 'pipeline_maintenance', 'CRITICAL', '2026-10-18', 'IN_PROGRESS', 'Er. R.N. Tripathi (Water Admin)', NOW() - INTERVAL 5 HOUR, NOW() - INTERVAL 4 HOUR, 'Trench shoring installed; groundwater dewatering pump running.'),
                ('WO-2026-002', 'STP Aeration Basin DO Probe Calibration', 'Calibrate dissolved oxygen sensor in Aeration Basin #2 at Mahewa STP.', 'STP-01', 'TREATMENT_PLANT_STP', 'Mahewa / South Ward', 'WTR-ENG-01', 'Er. Saurabh Mishra', 'treatment_operator', 'HIGH', '2026-10-20', 'ACKNOWLEDGED', 'Er. R.N. Tripathi (Water Admin)', NOW() - INTERVAL 2 HOUR, NOW() - INTERVAL 1 HOUR, 'Standard zero-point oxygen calibration buffer prepared.'),
                ('WO-2026-003', 'Inspect Gravity Sewer Manhole MH-03 Clearance', 'Inspect sewer invert depth and silt accumulation near Golghar roundabout.', 'SPR-2026-01', 'SEWAGE_ROUTE', 'Golghar Central', 'WTR001', 'Manoj Yadav (Field Supervisor)', 'field_inspector', 'MEDIUM', '2026-10-22', 'ASSIGNED', 'Er. R.N. Tripathi (Water Admin)', NOW() - INTERVAL 1 HOUR, NULL, NULL),
                ('WO-2026-004', 'Chlorination Dosing Check at BRD Reservoir', 'Verify sodium hypochlorite residual at BRD Medical overhead tank.', 'TANK-004', 'TANK', 'BRD Medical College', 'WTR-ENG-01', 'Er. Saurabh Mishra', 'quality_technician', 'HIGH', '2026-10-14', 'RESOLVED', 'Er. R.N. Tripathi (Water Admin)', NOW() - INTERVAL 24 HOUR, NOW() - INTERVAL 22 HOUR, 'Chlorine dosing pump serviced. Free chlorine measured at compliant 0.55 mg/L.'),
                ('WO-2026-005', 'Golghar Sluice Valve V-GOL-01 Chamber Desilting', 'De-silt subterranean valve pit and apply anti-corrosion grease to spindle.', 'PL-101', 'PIPELINE', 'Golghar Central', 'WTR001', 'Manoj Yadav (Field Supervisor)', 'operations_engineer', 'LOW', '2026-10-10', 'VERIFIED', 'Er. R.N. Tripathi (Water Admin)', NOW() - INTERVAL 48 HOUR, NOW() - INTERVAL 46 HOUR, 'Chamber cleaned, spindle rotated 360 degrees smoothly. Verified by Superintendent.')
            `);
            console.log("Seeded 5 sample work orders covering ASSIGNED, ACKNOWLEDGED, IN_PROGRESS, RESOLVED, VERIFIED.");
        }

        console.log("🎉 Water & Sewage Command Center Master Migration Completed Successfully!");
    } catch (err) {
        console.error("❌ Migration error:", err);
        throw err;
    } finally {
        conn.release();
        await pool.end();
    }
}

runWaterCommandCenterMigration().catch(err => {
    console.error(err);
    process.exit(1);
});
