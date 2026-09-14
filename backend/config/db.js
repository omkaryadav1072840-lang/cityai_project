const mysql = require("mysql2");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

// =========================================================
// MYSQL CONNECTION POOL
// =========================================================
// Connection pooling automatically manages connections,
// handles auto-reconnect, and scales under concurrent traffic.

const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "omkar",
    database: process.env.DB_NAME || "smartcity",
    port: Number(process.env.DB_PORT) || 3306,
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

module.exports = pool;
