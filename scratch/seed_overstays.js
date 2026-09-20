const db = require('../backend/config/db');

async function seed() {
    const pool = db.promise();
    await pool.query(`
        INSERT INTO parking_bookings (booking_id, lot_id, user_id, vehicle_number, customer_name, customer_phone, slot_number, start_time, duration_hours, total_amount, status, overstay_minutes, penalty_amount, payment_status)
        VALUES 
        ('BKG-OVR-01', 'PARK-001', '1', 'UP 53 DX 9988', 'Vikram Singh', '9839123456', 'A-04', NOW() - INTERVAL 180 MINUTE, 2, 40.00, 'Active', 60, 100.00, 'OVERSTAY_PENDING'),
        ('BKG-OVR-02', 'PARK-004', '1', 'UP 53 BZ 4321', 'Ramesh Sharma', '9415098765', 'B-02', NOW() - INTERVAL 120 MINUTE, 1, 25.00, 'Active', 45, 50.00, 'OVERSTAY_PENDING')
        ON DUPLICATE KEY UPDATE overstay_minutes = VALUES(overstay_minutes), penalty_amount = VALUES(penalty_amount), payment_status = VALUES(payment_status)
    `);
    console.log("✓ Sample overstays seeded into MySQL database successfully!");
    process.exit(0);
}

seed().catch(err => {
    console.error("Seed error:", err);
    process.exit(1);
});
