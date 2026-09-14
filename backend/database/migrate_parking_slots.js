const db = require('../config/db');

async function migrateAndSeedParkingSlots() {
    console.log('🚀 Starting parking slots migration and seeding...');

    // 1. Add customer_name and customer_phone to parking_bookings if not exist
    try {
        await db.promise().query(`
            ALTER TABLE parking_bookings 
            ADD COLUMN customer_name VARCHAR(100) NULL AFTER vehicle_number,
            ADD COLUMN customer_phone VARCHAR(20) NULL AFTER customer_name
        `);
        console.log('✅ Added customer_name & customer_phone to parking_bookings');
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log('ℹ️ customer_name/customer_phone columns already exist in parking_bookings');
        } else {
            console.warn('Column add warning:', e.message);
        }
    }

    // 2. Create parking_slots table
    await db.promise().query(`
        CREATE TABLE IF NOT EXISTS parking_slots (
            id INT AUTO_INCREMENT PRIMARY KEY,
            lot_id VARCHAR(50) NOT NULL,
            slot_number VARCHAR(20) NOT NULL,
            slot_type VARCHAR(20) DEFAULT 'car',
            floor VARCHAR(50) DEFAULT 'Ground Floor',
            status ENUM('Available', 'Booked', 'Occupied', 'Maintenance') DEFAULT 'Available',
            current_booking_id VARCHAR(50) NULL,
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_lot_slot (lot_id, slot_number)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    // Alter to ensure floor is VARCHAR(50) if table was already created
    try {
        await db.promise().query("ALTER TABLE parking_slots MODIFY COLUMN floor VARCHAR(50) DEFAULT 'Ground Floor'");
    } catch (e) {}
    console.log('✅ Table parking_slots verified/created');

    // 3. Clear existing slots to re-seed clean realistic data
    await db.promise().query('TRUNCATE TABLE parking_slots');

    // Lots to seed: PARK-001 (City Centre), PARK-002 (Railway Station), PARK-003 (Hospital), PARK-004 (Golghar), PARK-005 (DDU Chowk)
    const lots = [
        { code: 'PARK-001', name: 'City Centre Parking', total: 24 },
        { code: 'PARK-002', name: 'Railway Station Parking', total: 20 },
        { code: 'PARK-003', name: 'Hospital Parking', total: 20 },
        { code: 'PARK-004', name: 'Golghar Market Parking', total: 20 },
        { code: 'PARK-005', name: 'DDU Chowk Parking', total: 24 }
    ];

    const demoBookings = [
        {
            lotId: 'PARK-001',
            slotNum: 'A-02',
            bookingId: 'BKG-PK1-A02',
            vehicle: 'UP 53 AB 1008',
            customer: 'Omkar Yadav',
            phone: '9876543210',
            type: 'car',
            status: 'Booked',
            hours: 3,
            amount: 60
        },
        {
            lotId: 'PARK-001',
            slotNum: 'A-04',
            bookingId: 'BKG-PK1-A04',
            vehicle: 'UP 53 CP 4455',
            customer: 'Rajesh Kumar',
            phone: '9823456781',
            type: 'car',
            status: 'Occupied',
            hours: 2,
            amount: 40
        },
        {
            lotId: 'PARK-001',
            slotNum: 'B-01',
            bookingId: 'BKG-PK1-B01',
            vehicle: 'UP 53 EV 2026',
            customer: 'Dr. Priya Sharma',
            phone: '9911223344',
            type: 'ev',
            status: 'Occupied',
            hours: 4,
            amount: 100
        },
        {
            lotId: 'PARK-001',
            slotNum: 'B-05',
            bookingId: 'BKG-PK1-B05',
            vehicle: 'UP 53 BK 7890',
            customer: 'Amit Patel',
            phone: '9788665544',
            type: 'bike',
            status: 'Booked',
            hours: 2,
            amount: 20
        },
        {
            lotId: 'PARK-002',
            slotNum: 'A-01',
            bookingId: 'BKG-PK2-A01',
            vehicle: 'UP 53 DX 9090',
            customer: 'Sunil Jaiswal',
            phone: '9450123456',
            type: 'car',
            status: 'Occupied',
            hours: 5,
            amount: 150
        },
        {
            lotId: 'PARK-003',
            slotNum: 'A-03',
            bookingId: 'BKG-PK3-A03',
            vehicle: 'UP 53 AM 1080',
            customer: 'Civil Hospital Emergency Desk',
            phone: '9415000000',
            type: 'car',
            status: 'Occupied',
            hours: 6,
            amount: 120
        }
    ];

    // Seed bookings into parking_bookings
    for (const b of demoBookings) {
        await db.promise().query(`
            INSERT INTO parking_bookings
            (booking_id, lot_id, user_id, vehicle_number, customer_name, customer_phone, slot_number, start_time, duration_hours, total_amount, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW() - INTERVAL 45 MINUTE, ?, ?, 'Active')
            ON DUPLICATE KEY UPDATE 
                vehicle_number = VALUES(vehicle_number),
                customer_name = VALUES(customer_name),
                slot_number = VALUES(slot_number),
                status = VALUES(status)
        `, [
            b.bookingId,
            b.lotId,
            'citizen-demo',
            b.vehicle,
            b.customer,
            b.phone,
            b.slotNum,
            b.hours,
            b.amount
        ]);
    }
    console.log('✅ Inserted demo parking bookings');

    // Generate slots for each lot
    for (const lot of lots) {
        const slotValues = [];
        const prefixes = ['A', 'B', 'C'];
        const slotsPerPrefix = Math.ceil(lot.total / prefixes.length);
        let count = 0;

        for (const p of prefixes) {
            for (let i = 1; i <= slotsPerPrefix && count < lot.total; i++) {
                count++;
                const slotNum = `${p}-${String(i).padStart(2, '0')}`;
                let slotType = 'car';
                if (p === 'B' && i <= 2) slotType = 'ev';
                if (p === 'C' && i >= slotsPerPrefix - 3) slotType = 'bike';

                // Check if demo booking matches
                const matchedBooking = demoBookings.find(b => b.lotId === lot.code && b.slotNum === slotNum);
                let status = 'Available';
                let bookingId = null;

                if (matchedBooking) {
                    status = matchedBooking.status;
                    bookingId = matchedBooking.bookingId;
                } else if (count === 12) {
                    status = 'Maintenance';
                }

                slotValues.push([
                    lot.code,
                    slotNum,
                    slotType,
                    p === 'A' ? 'Level 1 (Front)' : (p === 'B' ? 'Level 1 (EV / Premium)' : 'Level 2'),
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

        // Update lot available and occupied counts
        const [counts] = await db.promise().query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) as avail,
                SUM(CASE WHEN status IN ('Booked', 'Occupied') THEN 1 ELSE 0 END) as occ
            FROM parking_slots
            WHERE lot_id = ?
        `, [lot.code]);

        const total = counts[0].total || lot.total;
        const avail = counts[0].avail || 0;
        const occ = counts[0].occ || 0;

        await db.promise().query(`
            UPDATE parking_lots 
            SET total_slots = ?, available_slots = ?, occupied_slots = ?
            WHERE parking_code = ?
        `, [total, avail, occ, lot.code]);

        console.log(`✅ Seeded ${slotValues.length} slots for ${lot.name} (${lot.code}) [Available: ${avail}, Occupied: ${occ}]`);
    }

    console.log('\n🎉 ALL PARKING SLOTS & BOOKINGS SEEDED SUCCESSFULLY!');
    process.exit(0);
}

migrateAndSeedParkingSlots().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
