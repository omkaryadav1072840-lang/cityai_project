const mysql = require("mysql2");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

// =========================================================
// MYSQL CONNECTION POOL
// =========================================================
// Connection pooling automatically manages connections,
// handles auto-reconnect, and scales under concurrent traffic.

const pool = mysql.createPool({
    host: process.env.DB_HOST || process.env.MYSQL_HOST || "localhost",
    user: process.env.DB_USER || process.env.MYSQL_USER || "root",
    password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : (process.env.MYSQL_PASSWORD !== undefined ? process.env.MYSQL_PASSWORD : "omkar"),
    database: process.env.DB_NAME || process.env.MYSQL_DATABASE || "smartcity",
    port: Number(process.env.DB_PORT || process.env.MYSQL_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 15,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
});

// Test connection on startup
pool.getConnection((err, connection) => {
    if (err) {
        console.error("🔴 MySQL Connection Error:", err.message);
        console.error("👉 Please ensure MySQL is running and credentials in .env are correct.");
    } else {
        console.log("🟢 MySQL Connection Pool initialized successfully.");
        connection.release();
    }
});

// Pool error resilience & auto-reconnect logging
pool.on("error", (err) => {
    console.error("⚠️ [MySQL Pool Error Caught]:", err.code || err.message);
    if (err.code === "PROTOCOL_CONNECTION_LOST" || err.code === "ECONNRESET") {
        console.log("🔄 MySQL connection lost. Pool will auto-reconnect on next query.");
    }
});

// Resilient Health Check Helper for API and System Diagnostics
pool.healthCheck = async function () {
    try {
        const [rows] = await pool.promise().query("SELECT 1 AS alive");
        return { ok: true, rows };
    } catch (err) {
        return { ok: false, error: err.message };
    }
};

module.exports = pool;
