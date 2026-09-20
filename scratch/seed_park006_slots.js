const db = require('../backend/config/db');

async function seedPark006() {
    console.log('Seeding PARK-006 AIIMS Campus Parking physical bays...');

    // 1. Delete existing slots for PARK-006 if any
    await db.promise().query("DELETE FROM parking_slots WHERE lot_id = 'PARK-006'");
    await db.promise().query("DELETE FROM parking_bookings WHERE lot_id = 'PARK-006'");

    // 2. Demo bookings for AIIMS
    const demoBookings = [
        {
            bookingId: 'BKG-PK6-A02',
            lotId: 'PARK-006',
            slotNum: 'A-02',
            vehicle: 'UP 53 AI 1122',
            customer: 'Dr. Alok Verma',
            phone: '9876112233',
            hours: 4,
            amount: 40,
            status: 'Occupied'
        },
        {
            bookingId: 'BKG-PK6-A05',
            lotId: 'PARK-006',
            slotNum: 'A-05',
            vehicle: 'UP 53 MD 9988',
            customer: 'Dr. Sunita Rao',
            phone: '9811445566',
            hours: 6,
            amount: 60,
            status: 'Occupied'
        },
        {
            bookingId: 'BKG-PK6-B01',
            lotId: 'PARK-006',
            slotNum: 'B-01',
            vehicle: 'UP 53 EV 7700',
            customer: 'Vikas Mishra',
            phone: '9933221100',
            hours: 3,
            amount: 30,
            status: 'Occupied'
        },
        {
            bookingId: 'BKG-PK6-B03',
            lotId: 'PARK-006',
            slotNum: 'B-03',
            vehicle: 'UP 53 BZ 4004',
            customer: 'Pooja Tiwari',
            phone: '9844332211',
            hours: 2,
            amount: 20,
            status: 'Booked'
        },
        {
            bookingId: 'BKG-PK6-C02',
            lotId: 'PARK-006',
            slotNum: 'C-02',
            vehicle: 'UP 53 EM 1080',
            customer: 'AIIMS Emergency Duty Vehicle',
            phone: '9415112233',
            hours: 8,
            amount: 80,
            status: 'Occupied'
        }
    ];

    for (const b of demoBookings) {
        await db.promise().query(`
            INSERT INTO parking_bookings
            (booking_id, lot_id, user_id, vehicle_number, customer_name, customer_phone, slot_number, start_time, duration_hours, total_amount, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW() - INTERVAL 1 HOUR, ?, ?, 'Active')
        `, [
            b.bookingId,
            b.lotId,
            'staff-demo',
            b.vehicle,
            b.customer,
            b.phone,
            b.slotNum,
            b.hours,
            b.amount
        ]);
    }

    // 3. Generate 24 slots
    const slotValues = [];
    const prefixes = ['A', 'B', 'C'];
    for (const p of prefixes) {
        for (let i = 1; i <= 8; i++) {
            const slotNum = `${p}-${String(i).padStart(2, '0')}`;
            let slotType = 'car';
            if (p === 'B' && (i === 1 || i === 2)) slotType = 'ev';
            if (p === 'C' && i >= 6) slotType = 'bike';

            const matched = demoBookings.find(b => b.slotNum === slotNum);
            let status = 'Available';
            let bookingId = null;

            if (matched) {
                status = matched.status;
                bookingId = matched.bookingId;
            } else if (p === 'B' && i === 6) {
                status = 'Maintenance';
            }

            slotValues.push([
                'PARK-006',
                slotNum,
                slotType,
                p === 'A' ? 'Level 1 (OPD Front)' : (p === 'B' ? 'Level 1 (EV / Doctor Bays)' : 'Level 2'),
                status,
                bookingId
            ]);
        }
    }

    await db.promise().query(`
        INSERT INTO parking_slots 
        (lot_id, slot_number, slot_type, floor, status, current_booking_id)
        VALUES ?
    `, [slotValues]);

    // 4. Update parking_lots record for PARK-006
    await db.promise().query(`
        UPDATE parking_lots
        SET total_slots = 24, available_slots = 18, occupied_slots = 5, hourly_rate = 10.00, active = 1
        WHERE parking_code = 'PARK-006'
    `);

    console.log('✅ PARK-006 24 bays seeded successfully in MySQL!');

    // Show overall stats
    const [stats] = await db.promise().query(`
        SELECT 
            COUNT(*) AS total_lots,
            SUM(total_slots) AS total_slots,
            SUM(available_slots) AS available_slots,
            SUM(occupied_slots) AS occupied_slots
        FROM parking_lots WHERE active = 1
    `);
    console.log('LIVE MYSQL AGGREGATE STATS:', stats[0]);

    process.exit(0);
}

seedPark006().catch(err => {
    console.error(err);
    process.exit(1);
});
