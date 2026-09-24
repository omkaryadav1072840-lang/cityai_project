const path = require('path');
const db = require(path.join(__dirname, '../backend/config/db'));

db.query("DESCRIBE parking_bookings", (err, cols) => {
    if (err) console.error(err);
    else console.log("Parking bookings cols:", cols.map(c => c.Field));
    db.query("SELECT id, user_id, customer_phone, vehicle_number, lot_id, status FROM parking_bookings LIMIT 10", (err, rows) => {
        if (err) console.error(err);
        else console.log("Parking bookings rows:", rows);
        process.exit(0);
    });
});
