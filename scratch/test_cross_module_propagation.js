const SmartCityTools = require('../backend/ai/tools/smartcity_tools');
const pool = require('../backend/config/db').promise();

async function run() {
    console.log('========================================================');
    console.log('  🔄 CROSS-MODULE DATA PROPAGATION VERIFICATION');
    console.log('========================================================\n');

    // 1. Get an available slot
    const [slots] = await pool.query("SELECT id, slot_number, lot_id, status FROM parking_slots WHERE lot_id = 'PARK-001' AND status = 'Available' LIMIT 1");
    if (slots.length === 0) {
        console.log('No available slot found in Lot PARK-001 to test. Releasing slot A-01 for test.');
        await pool.query("UPDATE parking_slots SET status = 'Available' WHERE lot_id = 'PARK-001' AND slot_number = 'A-01'");
    }
    const [[slot]] = await pool.query("SELECT id, slot_number, lot_id, status FROM parking_slots WHERE lot_id = 'PARK-001' AND status = 'Available' LIMIT 1");
    console.log(`Testing with Slot: ${slot.slot_number} (ID: ${slot.id}) in Lot ${slot.lot_id}`);

    // 2. Query AI Tool before booking
    const aiBefore = await SmartCityTools.get_parking_availability({ lot_id: 'PARK-001' });
    const availableBefore = aiBefore.data ? aiBefore.data.available_slots : 0;
    console.log(`AI Tool Available Slots BEFORE booking: ${availableBefore}`);

    // 3. Query Map API before booking
    const mapResBefore = await fetch('http://localhost:5000/api/map/incidents?layers=parking');
    const mapDataBefore = await mapResBefore.json();
    const mapLotBefore = (mapDataBefore.features || []).find(f => f.properties && f.properties.layer === 'parking');
    console.log(`Map API lot found:`, !!mapLotBefore, 'Available Slots:', mapLotBefore ? mapLotBefore.properties.availableSlots : 0);

    // 4. Perform Citizen Booking via API
    const loginRes = await fetch('http://localhost:5000/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona: 'citizen' })
    });
    const { token } = await loginRes.json();

    const bookRes = await fetch(`http://localhost:5000/api/parking/PARK-001/book-slot`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            slotNumber: slot.slot_number,
            vehicleNumber: 'UP53AB1234',
            durationHours: 2
        })
    });
    const bookData = await bookRes.json();
    console.log(`Booking API response status: HTTP ${bookRes.status}`, bookData.success ? 'SUCCESS' : bookData.message);

    // 5. Verify MySQL DB update
    const [[slotAfter]] = await pool.query("SELECT status FROM parking_slots WHERE id = ?", [slot.id]);
    console.log(`Database Slot Status AFTER booking: ${slotAfter.status}`);

    // 6. Query AI Tool after booking
    const aiAfter = await SmartCityTools.get_parking_availability({ lot_id: 'PARK-001' });
    const availableAfter = aiAfter.data ? aiAfter.data.available_slots : 0;
    console.log(`AI Tool Available Slots AFTER booking: ${availableAfter}`);

    // 7. Query Map API after booking
    const mapResAfter = await fetch('http://localhost:5000/api/map/incidents?layers=parking');
    const mapDataAfter = await mapResAfter.json();
    const mapLotAfter = (mapDataAfter.features || []).find(f => f.properties && f.properties.layer === 'parking');
    console.log(`Map API Available Slots AFTER booking:`, mapLotAfter ? mapLotAfter.properties.availableSlots : 0);

    const propagationSuccess = slotAfter.status === 'Booked' && availableAfter === (availableBefore - 1);
    console.log(`\n========================================================`);
    console.log(`  CROSS-MODULE VERIFICATION: ${propagationSuccess ? 'PASSED ✅' : 'FAILED ❌'}`);
    console.log(`  - Slot changed to 'Booked': ${slotAfter.status === 'Booked'}`);
    console.log(`  - AI Tool updated synchronously: ${availableAfter === (availableBefore - 1)}`);
    console.log(`  - Map layer updated synchronously: ${mapLotAfter.properties.availableSlots === availableAfter}`);
    console.log(`========================================================`);

    // Cleanup test booking
    await pool.query("DELETE FROM parking_bookings WHERE vehicle_number = 'UP53AB1234'");
    await pool.query("UPDATE parking_slots SET status = 'Available' WHERE id = ?", [slot.id]);
    await pool.query("UPDATE parking_lots SET available_slots = available_slots + 1, occupied_slots = occupied_slots - 1 WHERE parking_code = 'PARK-001'");
    console.log(`Cleaned up test booking. Slot ${slot.slot_number} restored to 'Available'.`);

    process.exit(propagationSuccess ? 0 : 1);
}

run().catch(e => {
    console.error('Propagation test error:', e);
    process.exit(1);
});
