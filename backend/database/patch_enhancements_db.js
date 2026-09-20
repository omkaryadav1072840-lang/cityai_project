const pool = require('../config/db');

async function patch() {
    try {
        console.log("Updating traffic_violations status column...");
        await pool.promise().query(
            "ALTER TABLE traffic_violations MODIFY COLUMN status ENUM('AI_FLAGGED','UNDER_REVIEW','VERIFIED_CHALLAN_REFERRED','DISMISSED','PAID_SETTLED') DEFAULT 'AI_FLAGGED'"
        );
        console.log("✅ Altered traffic_violations status enum.");

        await pool.promise().query(`
            INSERT INTO traffic_violations 
            (id, junction_id, camera_id, violation_type, vehicle_number, vehicle_type, speed_kmh, confidence_score, status, fine_amount, notes)
            VALUES 
            ('VIO-2026-101', 'JNC-01', 'CAM-01', 'Red Light Signal Jumping', 'UP-53-AZ-1001', 'Private Car', 48.5, 0.96, 'VERIFIED_CHALLAN_REFERRED', 1000.00, 'Crossed stop line 4.2s into Red Phase at Golghar Crossing'),
            ('VIO-2026-102', 'JNC-03', 'CAM-05', 'Wrong-Way Driving on Flyover', 'UP-53-BK-2044', 'Motorcycle', 32.0, 0.94, 'VERIFIED_CHALLAN_REFERRED', 2000.00, 'Entered one-way ramp in opposite direction')
            ON DUPLICATE KEY UPDATE vehicle_number = VALUES(vehicle_number)
        `);
        console.log("✅ Seeded demo plates UP-53-AZ-1001 and UP-53-BK-2044.");

        process.exit(0);
    } catch (err) {
        console.error("Patch error:", err);
        process.exit(1);
    }
}

patch();
