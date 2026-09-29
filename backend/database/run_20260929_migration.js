/**
 * Runner for 20260929 Production Hardening & Performance Indexes
 */

const pool = require("../config/db");

async function runMigration() {
    console.log("🛠️ Starting 20260929 Database Hardening Migration...");

    try {
        // 1. Create analytics_events table
        await pool.promise().query(`
            CREATE TABLE IF NOT EXISTS analytics_events (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                event_name VARCHAR(64) NOT NULL,
                page_path VARCHAR(128) NOT NULL,
                metadata_json JSON NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_event_created (event_name, created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("✅ Created or verified analytics_events table.");

        // Helper function to safely create index
        async function safeCreateIndex(table, indexName, columns) {
            try {
                const [existing] = await pool.promise().query(`
                    SHOW INDEX FROM \`${table}\` WHERE Key_name = ?
                `, [indexName]);

                if (existing.length === 0) {
                    await pool.promise().query(`
                        CREATE INDEX \`${indexName}\` ON \`${table}\` (${columns})
                    `);
                    console.log(`✅ Index ${indexName} added on ${table}.`);
                } else {
                    console.log(`ℹ️ Index ${indexName} already exists on ${table}.`);
                }
            } catch (err) {
                console.warn(`⚠️ Skipped index ${indexName} on ${table}:`, err.message);
            }
        }

        await safeCreateIndex("users", "idx_users_mobile_email", "mobile, email");
        await safeCreateIndex("staff", "idx_staff_id_dept", "staff_id, department");
        await safeCreateIndex("doctors", "idx_doctors_id_dept", "doctor_id, department");
        await safeCreateIndex("parking_bookings", "idx_parking_user_status", "user_id, status");
        await safeCreateIndex("service_requests", "idx_requests_user_dept_status", "user_id, department, status");

        console.log("🎉 Database Hardening Migration Completed Successfully!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration error:", err.message);
        process.exit(1);
    }
}

runMigration();
