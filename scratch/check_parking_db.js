const mysql = require("mysql2");
require("dotenv").config({ path: "backend/.env" });

const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "smartcity_db"
});

pool.query("SELECT id, parking_code, name, total_slots, available_slots, occupied_slots, status, active FROM parking_lots", (err, rows) => {
    if (err) console.error("Error:", err);
    else console.log("Parking Lots in DB:\n", rows);

    pool.query("SELECT lot_id, COUNT(*) as total_slots, SUM(status = 'available') as avail, SUM(status IN ('occupied', 'booked')) as occ FROM parking_slots GROUP BY lot_id", (err2, slotRows) => {
        if (err2) console.error("Error2:", err2);
        else console.log("\nParking Slots Grouped:\n", slotRows);
        process.exit(0);
    });
});

