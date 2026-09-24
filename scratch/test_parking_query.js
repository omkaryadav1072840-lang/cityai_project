const path = require('path');
const db = require(path.join(__dirname, '../backend/config/db'));

const query = `
    SELECT b.id, b.user_id, b.customer_phone, b.vehicle_number
    FROM parking_bookings b
    WHERE (b.user_id = ? OR b.customer_phone = ?)
`;

db.query(query, ['1', '6306880179'], (err, rows1) => {
    console.log("Omkar (id=1, mobile=6306880179) bookings count:", rows1 ? rows1.length : err);
    console.log("Rows for Omkar:", rows1);

    db.query(query, ['2', '9876543210'], (err, rows2) => {
        console.log("Demo Citizen (id=2, mobile=9876543210) bookings count:", rows2 ? rows2.length : err);
        console.log("Rows for Demo Citizen:", rows2);
        process.exit(0);
    });
});
