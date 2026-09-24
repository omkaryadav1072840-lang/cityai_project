const pool = require("../config/db");
const { hashPassword } = require("../middleware/auth.middleware");

async function migrateDoctors() {
    try {
        const [cols] = await pool.promise().query("SHOW COLUMNS FROM doctors LIKE 'password'");
        if (cols.length === 0) {
            await pool.promise().query("ALTER TABLE doctors ADD COLUMN password VARCHAR(255) DEFAULT NULL AFTER email");
            console.log("Added password column to doctors table.");
        }
        const defaultHash = hashPassword("doctor123");
        await pool.promise().query("UPDATE doctors SET password = ? WHERE password IS NULL OR password = ''", [defaultHash]);
        console.log("Doctors password migration completed successfully.");
    } catch (err) {
        console.error("Migration error:", err.message);
    } finally {
        process.exit(0);
    }
}

migrateDoctors();
