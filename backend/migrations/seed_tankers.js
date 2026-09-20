const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function seedTankers() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'smartcity',
        port: Number(process.env.DB_PORT) || 3306
    });

    const [existing] = await conn.query('SELECT COUNT(*) as c FROM water_tanker_bookings');
    if (existing[0].c === 0) {
        await conn.query(`
            INSERT INTO water_tanker_bookings 
            (booking_id, user_id, citizen_name, mobile, delivery_address, capacity, booking_date, delivery_slot, status, assigned_driver_name, assigned_driver_phone, assigned_tanker_number, dispatched_at)
            VALUES 
            ('TKB-001', 1, 'Omkar', '6306880179', 'Civil Lines, House 42, Gorakhpur', '5000 Litres', '2026-09-19', 'Morning (08:00 AM - 12:00 PM)', 'Pending', NULL, NULL, NULL, NULL),
            ('TKB-002', 2, 'Priya Sharma', '9876543210', 'Golghar Central, Near City Mall', '2000 Litres', '2026-09-19', 'Afternoon (12:00 PM - 04:00 PM)', 'Dispatched', 'Dharmendra Singh', '9876543204', 'UP-53-WT-101', CURRENT_TIMESTAMP)
        `);
        console.log('Seeded 2 realistic tanker bookings.');
    } else {
        console.log('Tanker bookings already present:', existing[0].c);
    }
    await conn.end();
}
seedTankers().catch(console.error);
