/**
 * SmartCity AI - Water Sectors & Authority RBAC Database Migration
 * 1. Creates `water_sectors` table for map-based sector planning.
 * 2. Seeds official Gorakhpur municipal water and sewage catchment sectors.
 * 3. Enriches `staff` table with permitted_sectors and permitted_assets.
 */

const pool = require("../config/db").promise();

async function runMigration() {
    console.log("🌊 Starting Water Sectors & Authority RBAC Migration...\n");

    try {
        // 1. Create water_sectors table
        console.log("1. Creating water_sectors table...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS water_sectors (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sector_code VARCHAR(50) NOT NULL UNIQUE,
                name VARCHAR(100) NOT NULL,
                zone VARCHAR(100) NOT NULL,
                boundary_geojson JSON NOT NULL,
                total_demand_mld DECIMAL(6,2) DEFAULT 15.00,
                population_served INT DEFAULT 100000,
                active_pipelines_count INT DEFAULT 0,
                assigned_engineers JSON,
                status VARCHAR(50) DEFAULT 'ACTIVE',
                created_by VARCHAR(100) DEFAULT 'Water Admin Office',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 2. Add permitted_sectors and permitted_assets to staff table if missing
        console.log("2. Verifying staff table sector and asset permission columns...");
        try {
            await pool.query("ALTER TABLE staff ADD COLUMN permitted_sectors JSON");
            console.log("   Added permitted_sectors column to staff.");
        } catch (e) {
            console.log("   permitted_sectors column already present or handled.");
        }

        try {
            await pool.query("ALTER TABLE staff ADD COLUMN permitted_assets JSON");
            console.log("   Added permitted_assets column to staff.");
        } catch (e) {
            console.log("   permitted_assets column already present or handled.");
        }

        // 3. Seed baseline municipal sectors with real Gorakhpur GIS coordinates
        console.log("3. Seeding municipal water sectors...");
        const baselineSectors = [
            {
                code: "SEC-WTR-01",
                name: "Golghar & Civil Lines Sector",
                zone: "Golghar & Civil Lines",
                boundary: [
                    [26.755, 83.368],
                    [26.765, 83.368],
                    [26.765, 83.380],
                    [26.755, 83.380]
                ],
                demand: 18.50,
                pop: 142000,
                pipes: 12,
                engineers: ["WTR-ENG-01"]
            },
            {
                code: "SEC-WTR-02",
                name: "Mohaddipur & University Sector",
                zone: "Mohaddipur & University",
                boundary: [
                    [26.745, 83.380],
                    [26.758, 83.380],
                    [26.758, 83.398],
                    [26.745, 83.398]
                ],
                demand: 14.20,
                pop: 98000,
                pipes: 8,
                engineers: ["WTR001"]
            },
            {
                code: "SEC-WTR-03",
                name: "Medical College North Sector",
                zone: "Medical College - Asuran",
                boundary: [
                    [26.765, 83.375],
                    [26.782, 83.375],
                    [26.782, 83.392],
                    [26.765, 83.392]
                ],
                demand: 12.00,
                pop: 85000,
                pipes: 7,
                engineers: ["WTR-ENG-01"]
            },
            {
                code: "SEC-WTR-04",
                name: "Mahewa & South Catchment Sector",
                zone: "Mahewa / South Ward",
                boundary: [
                    [26.730, 83.355],
                    [26.748, 83.355],
                    [26.748, 83.378],
                    [26.730, 83.378]
                ],
                demand: 22.40,
                pop: 165000,
                pipes: 15,
                engineers: ["WTR001"]
            }
        ];

        for (const s of baselineSectors) {
            await pool.query(`
                INSERT INTO water_sectors 
                (sector_code, name, zone, boundary_geojson, total_demand_mld, population_served, active_pipelines_count, assigned_engineers, status, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 'Water Admin Office')
                ON DUPLICATE KEY UPDATE
                    name = VALUES(name),
                    zone = VALUES(zone),
                    boundary_geojson = VALUES(boundary_geojson),
                    total_demand_mld = VALUES(total_demand_mld),
                    population_served = VALUES(population_served),
                    assigned_engineers = VALUES(assigned_engineers)
            `, [
                s.code, s.name, s.zone,
                JSON.stringify(s.boundary),
                s.demand, s.pop, s.pipes,
                JSON.stringify(s.engineers)
            ]);
        }
        console.log("   4 baseline sectors seeded successfully.");

        // 4. Update staff permissions for Water Engineers
        console.log("4. Updating scoped sector and asset permissions for water staff...");
        await pool.query(`
            UPDATE staff
            SET permitted_sectors = ?,
                permitted_assets = ?
            WHERE staff_id = 'WTR-ENG-01'
        `, [
            JSON.stringify(["Golghar & Civil Lines Sector", "Medical College North Sector", "Golghar & Civil Lines", "Medical College - Asuran"]),
            JSON.stringify(["PUMP-01", "VALVE-01", "PIPE-SEC1", "PL-101", "PL-102"])
        ]);

        await pool.query(`
            UPDATE staff
            SET permitted_sectors = ?,
                permitted_assets = ?
            WHERE staff_id = 'WTR001'
        `, [
            JSON.stringify(["Mohaddipur & University Sector", "Mahewa & South Catchment Sector", "Mohaddipur & University", "Mahewa / South Ward"]),
            JSON.stringify(["STP-01", "JUNC-01", "PL-103", "PL-105"])
        ]);

        // Water Admin gets all sectors
        await pool.query(`
            UPDATE staff
            SET permitted_sectors = ?,
                permitted_assets = ?
            WHERE staff_id = 'WTR-ADMIN'
        `, [
            JSON.stringify(["ALL_SECTORS"]),
            JSON.stringify(["ALL_ASSETS"])
        ]);

        console.log("✅ Water sectors & RBAC migration completed successfully!\n");
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration error:", err);
        process.exit(1);
    }
}

runMigration();
