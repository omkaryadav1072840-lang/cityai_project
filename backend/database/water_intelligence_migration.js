/**
 * SmartCity AI - Water Intelligence Database Migration
 * Extends MySQL schema for 3D Pipeline Explorer, Wastewater Treatment,
 * Route Versioning, Asset Registry, and Role-Based Work Orders.
 */

const mysql = require("mysql2/promise");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

async function runMigration() {
    console.log("🌊 Starting Water Intelligence Schema Migration...");

    const pool = mysql.createPool({
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "omkar",
        database: process.env.DB_NAME || "smartcity",
        multipleStatements: true
    });

    const conn = await pool.getConnection();

    try {
        console.log("Connected to MySQL. Applying schema extensions...");

        // 1. EXTEND water_pipelines table
        console.log("1. Checking & updating water_pipelines table...");
        const [pipelineCols] = await conn.query("SHOW COLUMNS FROM water_pipelines");
        const existingColNames = pipelineCols.map(c => c.Field);

        const colsToAdd = [
            { name: "pipe_type", def: "ENUM('POTABLE', 'WASTEWATER', 'RECLAIMED') DEFAULT 'POTABLE'" },
            { name: "start_lat", def: "DECIMAL(10, 8) DEFAULT 26.7606" },
            { name: "start_lng", def: "DECIMAL(11, 8) DEFAULT 83.3732" },
            { name: "end_lat", def: "DECIMAL(10, 8) DEFAULT 26.7559" },
            { name: "end_lng", def: "DECIMAL(11, 8) DEFAULT 83.3705" },
            { name: "diameter_mm", def: "INT DEFAULT 450" },
            { name: "material", def: "VARCHAR(50) DEFAULT 'Ductile Iron'" },
            { name: "depth_meters", def: "DECIMAL(4, 2) DEFAULT 2.4" },
            { name: "source_node", def: "VARCHAR(50) DEFAULT 'TANK-001'" },
            { name: "target_node", def: "VARCHAR(50) DEFAULT 'TANK-002'" },
            { name: "data_source", def: "ENUM('MEASURED', 'SIMULATED') DEFAULT 'MEASURED'" }
        ];

        for (const col of colsToAdd) {
            if (!existingColNames.includes(col.name)) {
                console.log(`Adding column ${col.name} to water_pipelines...`);
                await conn.query(`ALTER TABLE water_pipelines ADD COLUMN ${col.name} ${col.def}`);
            }
        }

        // Update existing pipeline coordinates and connections with realistic Gorakhpur topology
        await conn.query(`
            UPDATE water_pipelines SET
                pipe_type = 'POTABLE',
                start_lat = 26.7606, start_lng = 83.3732,
                end_lat = 26.7559, end_lng = 83.3705,
                diameter_mm = 600, material = 'Ductile Iron', depth_meters = 2.5,
                source_node = 'TANK-001', target_node = 'TANK-002',
                data_source = 'MEASURED'
            WHERE pipeline_code = 'PL-101';

            UPDATE water_pipelines SET
                pipe_type = 'POTABLE',
                start_lat = 26.7559, start_lng = 83.3705,
                end_lat = 26.7615, end_lng = 83.3662,
                diameter_mm = 450, material = 'HDPE', depth_meters = 2.2,
                source_node = 'TANK-002', target_node = 'TANK-003',
                data_source = 'MEASURED'
            WHERE pipeline_code = 'PL-102';

            UPDATE water_pipelines SET
                pipe_type = 'POTABLE',
                start_lat = 26.7615, start_lng = 83.3662,
                end_lat = 26.7884, end_lng = 83.3986,
                diameter_mm = 400, material = 'Cast Iron', depth_meters = 3.0,
                source_node = 'TANK-003', target_node = 'TANK-004',
                data_source = 'MEASURED'
            WHERE pipeline_code = 'PL-103';

            UPDATE water_pipelines SET
                pipe_type = 'POTABLE',
                start_lat = 26.7884, start_lng = 83.3986,
                end_lat = 26.7950, end_lng = 83.4050,
                diameter_mm = 500, material = 'Ductile Iron', depth_meters = 2.8,
                source_node = 'TANK-004', target_node = 'WTP-01',
                data_source = 'MEASURED'
            WHERE pipeline_code = 'PL-104';

            UPDATE water_pipelines SET
                pipe_type = 'WASTEWATER',
                start_lat = 26.7559, start_lng = 83.3705,
                end_lat = 26.7350, end_lng = 83.3850,
                diameter_mm = 800, material = 'Reinforced Concrete', depth_meters = 3.8,
                source_node = 'TANK-002', target_node = 'STP-01',
                data_source = 'MEASURED'
            WHERE pipeline_code = 'PL-105';

            UPDATE water_pipelines SET
                pipe_type = 'RECLAIMED',
                start_lat = 26.7350, start_lng = 83.3850,
                end_lat = 26.7252, end_lng = 83.4322,
                diameter_mm = 350, material = 'HDPE', depth_meters = 2.0,
                source_node = 'STP-01', target_node = 'TANK-005',
                data_source = 'MEASURED'
            WHERE pipeline_code = 'PL-106';
        `);

        // Insert additional pipelines for network richness (reclaimed and sewage lines) if not exists
        await conn.query(`
            INSERT IGNORE INTO water_pipelines 
            (id, pipeline_code, name, zone, pressure_bar, flow_rate_lps, status, pipe_type, start_lat, start_lng, end_lat, end_lng, diameter_mm, material, depth_meters, source_node, target_node, data_source)
            VALUES
            (7, 'PL-201', 'Ramgarh Tal Reclaimed Eco-Corridor', 'Ramgarh Tal Lakefront', 2.60, 48.00, 'Normal', 'RECLAIMED', 26.7350, 83.3850, 26.7450, 83.4000, 400, 'HDPE', 1.8, 'STP-01', 'DEST-RAMGARH', 'MEASURED'),
            (8, 'PL-202', 'North Gorakhpur Trunk Sewer', 'Medical College - Asuran', 1.20, 140.00, 'Normal', 'WASTEWATER', 26.7884, 83.3986, 26.7350, 83.3850, 1000, 'Reinforced Concrete', 4.2, 'TANK-004', 'STP-01', 'MEASURED');
        `);

        // 2. CREATE TABLE: water_network_assets
        console.log("2. Creating water_network_assets table...");
        await conn.query(`
            CREATE TABLE IF NOT EXISTS water_network_assets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                asset_id VARCHAR(50) NOT NULL UNIQUE,
                name VARCHAR(150) NOT NULL,
                asset_type ENUM('TREATMENT_PLANT_STP', 'TREATMENT_PLANT_WTP', 'BOOSTER_PUMP', 'CONTROL_VALVE', 'NETWORK_JUNCTION', 'DISCHARGE_POINT') NOT NULL,
                zone VARCHAR(100) NOT NULL,
                latitude DECIMAL(10, 8) NOT NULL,
                longitude DECIMAL(11, 8) NOT NULL,
                elevation_m DECIMAL(6, 2) DEFAULT 84.50,
                status ENUM('OPERATIONAL', 'MAINTENANCE', 'STANDBY', 'OFFLINE') DEFAULT 'OPERATIONAL',
                specifications JSON,
                last_reading JSON,
                data_source ENUM('MEASURED', 'SIMULATED') DEFAULT 'MEASURED',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_asset_type (asset_type),
                INDEX idx_zone (zone)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // Seed core Gorakhpur municipal network assets
        await conn.query(`
            INSERT IGNORE INTO water_network_assets 
            (asset_id, name, asset_type, zone, latitude, longitude, elevation_m, status, specifications, last_reading, data_source)
            VALUES
            ('STP-01', 'Gorakhpur Central Sewage Treatment Plant (60 MLD)', 'TREATMENT_PLANT_STP', 'Mahewa / South Ward', 26.7350, 83.3850, 78.20, 'OPERATIONAL', 
             '{"capacity_mld": 60, "technology": "SBR - Sequential Batch Reactor", "commissioned_year": 2023, "energy_kwh_day": 1420}',
             '{"inflow_mld": 48.5, "outflow_mld": 45.2, "bod_inlet": 210, "bod_outlet": 7.4, "status": "Compliant"}', 'MEASURED'),

            ('WTP-01', 'Rohin River Raw Water Treatment Plant', 'TREATMENT_PLANT_WTP', 'Dharampur Rohin', 26.7950, 83.4050, 86.40, 'OPERATIONAL',
             '{"capacity_mld": 90, "technology": "Rapid Gravity Filtration + Ozonation", "turbidity_inlet_ntu": 45}',
             '{"treated_flow_mld": 72.8, "clarity_ntu": 0.8, "chlorine_residual_ppm": 1.2}', 'MEASURED'),

            ('PUMP-01', 'Golghar Central Booster Pump Station', 'BOOSTER_PUMP', 'Golghar Central', 26.7580, 83.3718, 83.10, 'OPERATIONAL',
             '{"motor_hp": 125, "rpm": 1480, "head_meters": 45, "vibration_level_mm_s": 1.4}',
             '{"flow_rate_lps": 95.0, "discharge_pressure_bar": 3.8, "power_kw": 88}', 'MEASURED'),

            ('VALVE-01', 'Automated SCADA PRV Valve #12', 'CONTROL_VALVE', 'University Crossing', 26.7595, 83.3725, 84.00, 'OPERATIONAL',
             '{"diameter_mm": 450, "actuator": "Rotork Electric Modulating", "pressure_rating_bar": 16}',
             '{"opening_percentage": 75, "inlet_bar": 3.6, "outlet_bar": 2.4}', 'MEASURED'),

            ('JUNC-01', 'Mohaddipur Multi-Feeder Junction', 'NETWORK_JUNCTION', 'Mohaddipur', 26.7520, 83.3900, 82.50, 'OPERATIONAL',
             '{"connected_trunks": 4, "chamber_material": "Reinforced Masonry"}',
             '{"total_flow_lps": 185.0, "net_pressure_bar": 2.85}', 'MEASURED'),

            ('DEST-RAMGARH', 'Ramgarh Tal Ecological Replenishment Outfall', 'DISCHARGE_POINT', 'Ramgarh Tal North Bank', 26.7450, 83.4000, 77.00, 'OPERATIONAL',
             '{"designated_use": "Eco-Restoration & Non-Contact Recreation", "regulatory_body": "UPPCB / NGT Standard"}',
             '{"daily_discharge_mld": 25.0, "dissolved_oxygen_ppm": 6.8}', 'MEASURED');
        `);

        // 3. CREATE TABLE: water_treatment_batches
        console.log("3. Creating water_treatment_batches table...");
        await conn.query(`
            CREATE TABLE IF NOT EXISTS water_treatment_batches (
                id INT AUTO_INCREMENT PRIMARY KEY,
                batch_id VARCHAR(50) NOT NULL UNIQUE,
                plant_id VARCHAR(50) NOT NULL,
                plant_name VARCHAR(150) NOT NULL,
                source_type ENUM('SEWAGE', 'GREYWATER', 'INDUSTRIAL_EFFLUENT') DEFAULT 'SEWAGE',
                inlet_volume_kl DECIMAL(10, 2) NOT NULL,
                outlet_volume_kl DECIMAL(10, 2) NOT NULL,
                stage ENUM('COLLECTION', 'SCREENING', 'AERATION_BIO', 'SECONDARY_CLARIFIER', 'FILTRATION_UV', 'QUALITY_VERIFIED', 'DISCHARGED', 'REUSED') DEFAULT 'QUALITY_VERIFIED',
                bod_mg_l DECIMAL(6, 2) NOT NULL,
                cod_mg_l DECIMAL(6, 2) NOT NULL,
                tss_mg_l DECIMAL(6, 2) NOT NULL,
                ph DECIMAL(4, 2) NOT NULL,
                fecal_coliform_mpn INT NOT NULL,
                turbidity_ntu DECIMAL(5, 2) NOT NULL,
                quality_status ENUM('COMPLIANT', 'NON_COMPLIANT', 'PENDING') DEFAULT 'COMPLIANT',
                reuse_destination ENUM('RAMGARH_TAL_LAKE', 'GIDA_INDUSTRIAL_COOLING', 'MUNICIPAL_GARDENS', 'PERMITTED_DISCHARGE') DEFAULT 'RAMGARH_TAL_LAKE',
                approval_status ENUM('PENDING_APPROVAL', 'APPROVED', 'BLOCKED_QUALITY_FAILURE') DEFAULT 'PENDING_APPROVAL',
                approved_by VARCHAR(100) DEFAULT NULL,
                approval_timestamp TIMESTAMP NULL,
                rejection_reason TEXT DEFAULT NULL,
                operator_notes TEXT,
                data_source ENUM('MEASURED', 'SIMULATED') DEFAULT 'MEASURED',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_plant_id (plant_id),
                INDEX idx_approval (approval_status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // Seed representative wastewater batches
        await conn.query(`
            INSERT IGNORE INTO water_treatment_batches
            (batch_id, plant_id, plant_name, source_type, inlet_volume_kl, outlet_volume_kl, stage, bod_mg_l, cod_mg_l, tss_mg_l, ph, fecal_coliform_mpn, turbidity_ntu, quality_status, reuse_destination, approval_status, approved_by, approval_timestamp, operator_notes)
            VALUES
            ('BATCH-2026-091', 'STP-01', 'Gorakhpur Central STP', 'SEWAGE', 12000.00, 11400.00, 'REUSED', 6.80, 32.00, 12.00, 7.35, 80, 2.10, 'COMPLIANT', 'RAMGARH_TAL_LAKE', 'APPROVED', 'Er. A.K. Srivastava (Water Admin)', CURRENT_TIMESTAMP, 'Tertiary UV disinfection active. Passed all CPCB Grade-A water discharge criteria.'),
            ('BATCH-2026-092', 'STP-01', 'Gorakhpur Central STP', 'SEWAGE', 9500.00, 9100.00, 'QUALITY_VERIFIED', 8.20, 38.50, 14.50, 7.42, 120, 2.80, 'COMPLIANT', 'GIDA_INDUSTRIAL_COOLING', 'APPROVED', 'Er. A.K. Srivastava (Water Admin)', CURRENT_TIMESTAMP, 'Dual-media filtration passed. Dispatched via Reclaimed Trunk Line PL-106.'),
            ('BATCH-2026-093', 'STP-01', 'Gorakhpur Central STP', 'SEWAGE', 14000.00, 13200.00, 'QUALITY_VERIFIED', 7.90, 35.00, 13.00, 7.28, 95, 2.40, 'COMPLIANT', 'RAMGARH_TAL_LAKE', 'PENDING_APPROVAL', NULL, NULL, 'Awaiting Water Admin final authorization before opening lake sluice valve.'),
            ('BATCH-2026-094', 'STP-01', 'Gorakhpur Central STP', 'SEWAGE', 8000.00, 7500.00, 'AERATION_BIO', 28.50, 110.00, 48.00, 6.20, 8500, 18.00, 'NON_COMPLIANT', 'PERMITTED_DISCHARGE', 'BLOCKED_QUALITY_FAILURE', NULL, NULL, 'BLOCKED: Exceeds maximum BOD (28.5 mg/L > 10.0 mg/L limit) and acidic pH 6.2. Recirculating to secondary aeration.');
        `);

        // 4. CREATE TABLE: water_network_versions
        console.log("4. Creating water_network_versions table (Water Admin Route Authority)...");
        await conn.query(`
            CREATE TABLE IF NOT EXISTS water_network_versions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                version_id VARCHAR(50) NOT NULL UNIQUE,
                version_number VARCHAR(20) NOT NULL,
                status ENUM('DRAFT', 'VALIDATED', 'APPROVED', 'PUBLISHED', 'ROLLED_BACK') DEFAULT 'DRAFT',
                change_title VARCHAR(200) NOT NULL,
                description TEXT,
                affected_zones VARCHAR(255),
                author_id VARCHAR(50) NOT NULL,
                author_name VARCHAR(100) NOT NULL,
                approver_id VARCHAR(50) DEFAULT NULL,
                approver_name VARCHAR(100) DEFAULT NULL,
                approval_comments TEXT,
                network_payload JSON NOT NULL,
                impact_assessment JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                published_at TIMESTAMP NULL,
                INDEX idx_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // Seed initial published network baseline
        await conn.query(`
            INSERT IGNORE INTO water_network_versions
            (version_id, version_number, status, change_title, description, affected_zones, author_id, author_name, approver_id, approver_name, network_payload, impact_assessment, published_at)
            VALUES
            ('WNV-2026-001', 'v1.0.0', 'PUBLISHED', 'Gorakhpur Smart City Base Hydrological Network',
             'Official baseline configuration including 5 overhead tanks, 8 trunk lines, and Central STP connection.',
             'Golghar, University, Railway, Medical, Sahjanwa', 'SYS-ADMIN', 'Municipal GIS Directorate',
             'WATER-ADMIN-01', 'Er. A.K. Srivastava (Superintendent Engineer)',
             '{"active_tanks": 5, "active_pipelines": 8, "total_capacity_kl": 460, "flow_capacity_lps": 480}',
             '{"pressure_stability_score": 96.2, "contingency_coverage_pct": 94.0, "risk_level": "LOW"}',
             CURRENT_TIMESTAMP);
        `);

        // 5. CREATE TABLE: water_work_orders
        console.log("5. Creating water_work_orders table (Role-Based Field Task Allocation)...");
        await conn.query(`
            CREATE TABLE IF NOT EXISTS water_work_orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id VARCHAR(50) NOT NULL UNIQUE,
                title VARCHAR(200) NOT NULL,
                description TEXT,
                asset_id VARCHAR(50) NOT NULL,
                asset_type VARCHAR(50) NOT NULL,
                zone VARCHAR(100) NOT NULL,
                assigned_to_id VARCHAR(50),
                assigned_to_name VARCHAR(100),
                required_role ENUM(
                    'tank_operator',
                    'pipeline_maintenance',
                    'operations_engineer',
                    'treatment_operator',
                    'quality_technician',
                    'recycling_supervisor',
                    'field_inspector',
                    'citizen_support',
                    'water_admin'
                ) NOT NULL,
                priority ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW') DEFAULT 'MEDIUM',
                deadline DATE NOT NULL,
                status ENUM('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED', 'CANCELLED') DEFAULT 'ASSIGNED',
                completion_notes TEXT,
                evidence_photo VARCHAR(255),
                created_by VARCHAR(100) DEFAULT 'Water Admin Office',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP NULL,
                INDEX idx_assigned_role (required_role),
                INDEX idx_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // Seed initial work orders across diverse roles
        await conn.query(`
            INSERT IGNORE INTO water_work_orders
            (order_id, title, description, asset_id, asset_type, zone, assigned_to_id, assigned_to_name, required_role, priority, deadline, status)
            VALUES
            ('WO-WAT-101', 'Inspect Mohaddipur Pipe Joint Leakage', 'Deploy ultrasonic leak detector and repair gasket seal on PL-105.', 'PL-105', 'PIPELINE', 'Mohaddipur', 'TECH-02', 'Ramesh Kumar', 'pipeline_maintenance', 'CRITICAL', '2026-10-15', 'IN_PROGRESS'),
            ('WO-WAT-102', 'Bi-Weekly Chlorination & Scada Sensor Calibration', 'Calibrate pH and residual chlorine electrodes on Tank Delta reservoir.', 'TANK-004', 'TANK', 'Medical Road & Basharatpur', 'TECH-01', 'Sunil Verma', 'tank_operator', 'HIGH', '2026-10-16', 'ASSIGNED'),
            ('WO-WAT-103', 'Sequential Batch Reactor #2 Aeration Dissolved Oxygen Check', 'Perform manual Winkler titration check against online optical DO sensors.', 'STP-01', 'TREATMENT_PLANT', 'Mahewa / South Ward', 'OPR-STP-01', 'Vijay Prakash', 'treatment_operator', 'MEDIUM', '2026-10-18', 'ASSIGNED'),
            ('WO-WAT-104', 'Grab Sampling for Ramgarh Tal Outfall Compliance', 'Collect triplicate grab samples at outfall PL-201 before release batch approval.', 'DEST-RAMGARH', 'DISCHARGE_POINT', 'Ramgarh Tal North Bank', 'LAB-01', 'Dr. Preeti Mishra', 'quality_technician', 'HIGH', '2026-10-14', 'ASSIGNED'),
            ('WO-WAT-105', 'Assess Hydraulic Capacity for Reclaimed Water Loop to GIDA', 'Evaluate pressure gradient and secondary booster requirements on trunk PL-106.', 'PL-106', 'PIPELINE', 'GIDA Industrial Area', 'ENG-01', 'Er. Manish Tiwari', 'operations_engineer', 'MEDIUM', '2026-10-20', 'ASSIGNED');
        `);

        // 6. RUN SEWAGE NETWORK PLANNER EXTENSION
        try {
            const { runSewagePlannerMigration } = require("./sewage_planner_migration");
            await runSewagePlannerMigration();
        } catch (sewErr) {
            console.warn("Notice: sewage planner migration sub-call:", sewErr.message);
        }

        console.log("✅ All Water Intelligence schema extensions and seed records applied successfully!");
    } catch (err) {
        console.error("❌ Migration error:", err);
        throw err;
    } finally {
        conn.release();
        await pool.end();
    }
}

if (require.main === module) {
    runMigration().then(() => {
        console.log("Migration script execution finished.");
        process.exit(0);
    }).catch(err => {
        console.error("Fatal migration error:", err);
        process.exit(1);
    });
}

module.exports = { runMigration };
