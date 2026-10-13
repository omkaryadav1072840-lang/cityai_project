/**
 * SmartCity AI - Sewage Pipeline Planning & 3D Route Designer Migration
 * Extends MySQL schema for road corridors, planned sewage routes,
 * route waypoints, geometry validation, version history and rollback.
 */

const mysql = require("mysql2/promise");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

async function runSewagePlannerMigration() {
    console.log("📐 Starting Sewage Network Planner Schema Migration...");

    const pool = mysql.createPool({
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "omkar",
        database: process.env.DB_NAME || "smartcity",
        multipleStatements: true
    });

    const conn = await pool.getConnection();

    try {
        console.log("Connected to MySQL. Creating sewage planning tables...");

        // 1. CREATE TABLE: sewage_surveyed_road_corridors
        console.log("1. Creating sewage_surveyed_road_corridors table...");
        await conn.query(`
            CREATE TABLE IF NOT EXISTS sewage_surveyed_road_corridors (
                id INT AUTO_INCREMENT PRIMARY KEY,
                corridor_id VARCHAR(50) NOT NULL UNIQUE,
                road_name VARCHAR(150) NOT NULL,
                road_type ENUM('ARTERIAL', 'SUB_ARTERIAL', 'COLLECTOR', 'LOCAL') DEFAULT 'ARTERIAL',
                zone VARCHAR(100) NOT NULL,
                start_lat DECIMAL(10, 8) NOT NULL,
                start_lng DECIMAL(11, 8) NOT NULL,
                end_lat DECIMAL(10, 8) NOT NULL,
                end_lng DECIMAL(11, 8) NOT NULL,
                width_meters DECIMAL(5, 2) NULL,
                centerline_points JSON NOT NULL,
                is_surveyed TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_corridor_zone (zone)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 2. CREATE TABLE: sewage_planned_routes
        console.log("2. Creating sewage_planned_routes table...");
        await conn.query(`
            CREATE TABLE IF NOT EXISTS sewage_planned_routes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                route_id VARCHAR(50) NOT NULL UNIQUE,
                version_id VARCHAR(50) NULL,
                name VARCHAR(150) NOT NULL,
                description TEXT,
                zone VARCHAR(100) NOT NULL,
                service_area_polygon JSON NULL,
                waypoints JSON NOT NULL,
                pipe_diameter_mm INT NOT NULL DEFAULT 450,
                burial_depth_m DECIMAL(4, 2) NOT NULL DEFAULT 2.80,
                slope_pct DECIMAL(4, 2) NOT NULL DEFAULT 0.80,
                flow_direction ENUM('FORWARD', 'REVERSE') DEFAULT 'FORWARD',
                estimated_length_m DECIMAL(10, 2) NOT NULL DEFAULT 0,
                manholes_count INT NOT NULL DEFAULT 0,
                inspection_chambers_count INT NOT NULL DEFAULT 0,
                junctions_count INT NOT NULL DEFAULT 0,
                pumping_station_required TINYINT(1) DEFAULT 0,
                pumping_station_details JSON NULL,
                destination_asset_id VARCHAR(50) DEFAULT 'STP-01',
                clearance_min_m DECIMAL(4, 2) DEFAULT 2.00,
                status ENUM('DRAFT', 'VALIDATION_FAILED', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED', 'ARCHIVED') DEFAULT 'DRAFT',
                validation_results JSON NULL,
                construction_ready TINYINT(1) DEFAULT 0,
                author_id VARCHAR(50) NOT NULL,
                author_name VARCHAR(100) NOT NULL,
                approver_id VARCHAR(50) DEFAULT NULL,
                approver_name VARCHAR(100) DEFAULT NULL,
                approval_notes TEXT DEFAULT NULL,
                published_at TIMESTAMP NULL,
                version_number INT DEFAULT 1,
                parent_route_id VARCHAR(50) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_route_status (status),
                INDEX idx_route_zone (zone),
                INDEX idx_route_version (version_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 3. SEED RELIABLE GORAKHPUR ROAD CORRIDORS
        console.log("3. Seeding verified road corridors with reliable centerlines...");
        await conn.query(`
            INSERT IGNORE INTO sewage_surveyed_road_corridors
            (corridor_id, road_name, road_type, zone, start_lat, start_lng, end_lat, end_lng, width_meters, centerline_points, is_surveyed)
            VALUES
            ('ROAD-GKP-01', 'Civil Lines Arterial Trunk', 'ARTERIAL', 'Civil Lines', 26.7580, 83.3720, 26.7520, 83.3800, 18.00,
             '[[26.7580, 83.3720], [26.7550, 83.3760], [26.7520, 83.3800]]', 1),

            ('ROAD-GKP-02', 'Park Road - Golghar Link', 'ARTERIAL', 'Golghar Central', 26.7606, 83.3732, 26.7559, 83.3705, 14.50,
             '[[26.7606, 83.3732], [26.7582, 83.3718], [26.7559, 83.3705]]', 1),

            ('ROAD-GKP-03', 'Mohaddipur Central Arterial', 'ARTERIAL', 'Mohaddipur', 26.7559, 83.3705, 26.7520, 83.3900, 22.00,
             '[[26.7559, 83.3705], [26.7538, 83.3802], [26.7520, 83.3900]]', 1),

            ('ROAD-GKP-04', 'Mahewa South Bypass to STP-01', 'SUB_ARTERIAL', 'Mahewa / South Ward', 26.7520, 83.3900, 26.7350, 83.3850, 12.00,
             '[[26.7520, 83.3900], [26.7435, 83.3875], [26.7350, 83.3850]]', 1),

            ('ROAD-GKP-05', 'Medical College - Asuran Main Road', 'ARTERIAL', 'Medical College - Asuran', 26.7884, 83.3986, 26.7615, 83.3662, 20.00,
             '[[26.7884, 83.3986], [26.7750, 83.3824], [26.7615, 83.3662]]', 1),

            ('ROAD-GKP-06', 'University Old Campus Lane', 'LOCAL', 'University Crossing', 26.7595, 83.3725, 26.7570, 83.3750, NULL,
             '[[26.7595, 83.3725], [26.7570, 83.3750]]', 0);
        `);

        // 4. SEED REPRESENTATIVE BASELINE DRAFT SEWAGE ROUTE
        console.log("4. Seeding representative baseline sewage planned route...");
        const initialPolygon = [
            [26.7630, 83.3700],
            [26.7640, 83.3760],
            [26.7580, 83.3780],
            [26.7560, 83.3690]
        ];

        const initialWaypoints = [
            {
                lat: 26.7606,
                lng: 83.3732,
                elevation_m: 84.50,
                road_name: "Park Road - Golghar Link",
                road_id: "ROAD-GKP-02",
                road_width_m: 14.5,
                is_snapped: true,
                node_type: "INSPECTION_CHAMBER"
            },
            {
                lat: 26.7582,
                lng: 83.3718,
                elevation_m: 83.80,
                road_name: "Park Road - Golghar Link",
                road_id: "ROAD-GKP-02",
                road_width_m: 14.5,
                is_snapped: true,
                node_type: "MANHOLE"
            },
            {
                lat: 26.7559,
                lng: 83.3705,
                elevation_m: 83.10,
                road_name: "Park Road - Golghar Link",
                road_id: "ROAD-GKP-02",
                road_width_m: 14.5,
                is_snapped: true,
                node_type: "NETWORK_JUNCTION"
            },
            {
                lat: 26.7520,
                lng: 83.3900,
                elevation_m: 81.50,
                road_name: "Mohaddipur Central Arterial",
                road_id: "ROAD-GKP-03",
                road_width_m: 22.0,
                is_snapped: true,
                node_type: "MANHOLE"
            },
            {
                lat: 26.7350,
                lng: 83.3850,
                elevation_m: 78.20,
                road_name: "Mahewa South Bypass to STP-01",
                road_id: "ROAD-GKP-04",
                road_width_m: 12.0,
                is_snapped: true,
                node_type: "DESTINATION_STP"
            }
        ];

        await conn.query(`
            INSERT IGNORE INTO sewage_planned_routes
            (route_id, version_id, name, description, zone, service_area_polygon, waypoints, pipe_diameter_mm, burial_depth_m, slope_pct, flow_direction, estimated_length_m, manholes_count, inspection_chambers_count, junctions_count, pumping_station_required, destination_asset_id, clearance_min_m, status, construction_ready, author_id, author_name, version_number)
            VALUES
            ('SPR-2026-001', 'WNV-SEW-001', 'Golghar Central to Mahewa STP Interceptor Trunk',
             'Proposed gravity transfer sewer connecting Golghar commercial ward with Central STP-01 facility.',
             'Golghar & Mahewa', ?, ?, 600, 3.20, 0.85, 'FORWARD', 3420.50, 18, 6, 2, 0, 'STP-01', 2.00, 'DRAFT', 0, 'WATER-ADMIN-01', 'Er. A.K. Srivastava (Water Admin)', 1);
        `, [JSON.stringify(initialPolygon), JSON.stringify(initialWaypoints)]);

        console.log("✅ Sewage Network Planner migration applied successfully!");
    } catch (err) {
        console.error("❌ Sewage Network Planner migration error:", err);
        throw err;
    } finally {
        conn.release();
        await pool.end();
    }
}

if (require.main === module) {
    runSewagePlannerMigration().then(() => {
        console.log("Migration script execution finished.");
        process.exit(0);
    }).catch(err => {
        console.error("Fatal migration error:", err);
        process.exit(1);
    });
}

module.exports = { runSewagePlannerMigration };
