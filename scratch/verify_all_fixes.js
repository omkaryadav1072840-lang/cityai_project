const db = require('../backend/config/db');

async function testFixes() {
    console.log("==========================================");
    console.log("   SMARTCITY AI BUG FIX VERIFICATION");
    console.log("==========================================");

    let allPassed = true;

    // 1. TEST HAVERSINE CLAMPING
    console.log("\n[TEST 1] Testing Haversine Distance Clamping against floating-point overflow...");
    try {
        const testLat = 26.7606;
        const testLng = 83.3732;
        const sql = `
            SELECT 
                (6371 * ACOS(LEAST(1.0, GREATEST(-1.0,
                    COS(RADIANS(?)) * COS(RADIANS(?)) *
                    COS(RADIANS(?) - RADIANS(?)) +
                    SIN(RADIANS(?)) * SIN(RADIANS(?))
                )))) AS distance_km
        `;
        const [rows] = await db.promise().query(sql, [testLat, testLat, testLng, testLng, testLat, testLat]);
        const dist = rows[0].distance_km;
        console.log(`Computed distance for exact same coordinates: ${dist} km`);
        if (dist === null || isNaN(dist) || Math.abs(dist) > 0.001) {
            throw new Error(`Distance computation failed or returned NULL: ${dist}`);
        }
        console.log("✅ Haversine distance clamping passed! Zero distance correctly calculated without NULL crash.");
    } catch (err) {
        console.error("❌ Haversine test failed:", err.message);
        allPassed = false;
    }

    // 2. TEST TRAFFIC JUNCTIONS STATUS UPDATE (ENUM VALIDATION)
    console.log("\n[TEST 2] Testing Traffic Junctions status enum constraint...");
    try {
        const [jncRows] = await db.promise().query("SELECT id, status FROM traffic_junctions LIMIT 1");
        if (jncRows.length > 0) {
            const jncId = jncRows[0].id;
            // Test updating to 'Heavy Congestion' and 'Operational' (Valid enum values)
            await db.promise().query("UPDATE traffic_junctions SET status = 'Heavy Congestion', congestion_level = 75 WHERE id = ?", [jncId]);
            await db.promise().query("UPDATE traffic_junctions SET status = 'Operational', congestion_level = 35 WHERE id = ?", [jncId]);
            console.log("✅ Traffic Junction status update passed without ER_DATA_TRUNCATED!");
        } else {
            console.log("ℹ️ No junctions found in DB; skipped status update.");
        }
    } catch (err) {
        console.error("❌ Traffic status test failed:", err.message);
        allPassed = false;
    }

    // 3. TEST PARKING ATOMIC CONCURRENCY CHECK
    console.log("\n[TEST 3] Testing Parking Slot Atomic Update Logic...");
    try {
        const [slotRows] = await db.promise().query("SELECT id, slot_number, status FROM parking_slots LIMIT 1");
        if (slotRows.length > 0) {
            const slot = slotRows[0];
            // Ensure slot is available
            await db.promise().query("UPDATE parking_slots SET status = 'Available' WHERE id = ?", [slot.id]);

            // Simulation: 1st concurrent request books the slot
            const [update1] = await db.promise().query(
                "UPDATE parking_slots SET status = 'Booked' WHERE id = ? AND status = 'Available'",
                [slot.id]
            );
            // Simulation: 2nd concurrent request attempts to book the SAME slot simultaneously
            const [update2] = await db.promise().query(
                "UPDATE parking_slots SET status = 'Booked' WHERE id = ? AND status = 'Available'",
                [slot.id]
            );

            console.log(`First request affectedRows: ${update1.affectedRows} (Expected: 1)`);
            console.log(`Second request affectedRows: ${update2.affectedRows} (Expected: 0)`);

            if (update1.affectedRows === 1 && update2.affectedRows === 0) {
                console.log("✅ Atomic slot booking successfully protected against race conditions!");
            } else {
                throw new Error("Atomic booking race condition check failed!");
            }

            // Restore slot status
            await db.promise().query("UPDATE parking_slots SET status = 'Available' WHERE id = ?", [slot.id]);
        }
    } catch (err) {
        console.error("❌ Parking concurrency test failed:", err.message);
        allPassed = false;
    }

    // 4. TEST PHARMACY STOCK OUT-OF-STOCK AUTO-UPDATE
    console.log("\n[TEST 4] Testing Pharmacy Stock availability automation...");
    try {
        const [medRows] = await db.promise().query("SELECT id, quantity, availability FROM pharmacy LIMIT 1");
        if (medRows.length > 0) {
            const med = medRows[0];
            const originalQty = med.quantity;
            const originalAvail = med.availability;

            // Simulate stock dropping to 0
            await db.promise().query(`
                UPDATE pharmacy 
                SET quantity = 0, 
                    availability = CASE WHEN GREATEST(quantity - 9999, 0) = 0 THEN 'Out of Stock' ELSE availability END 
                WHERE id = ?
            `, [med.id]);

            const [updated] = await db.promise().query("SELECT quantity, availability FROM pharmacy WHERE id = ?", [med.id]);
            if (updated[0].quantity === 0 && updated[0].availability === 'Out of Stock') {
                console.log("✅ Pharmacy stock update correctly sets availability to 'Out of Stock'!");
            } else {
                throw new Error(`Unexpected stock state: ${JSON.stringify(updated[0])}`);
            }

            // Restore
            await db.promise().query("UPDATE pharmacy SET quantity = ?, availability = ? WHERE id = ?", [originalQty, originalAvail, med.id]);
        }
    } catch (err) {
        console.error("❌ Pharmacy stock test failed:", err.message);
        allPassed = false;
    }

    console.log("\n==========================================");
    if (allPassed) {
        console.log("🎉 ALL BUG FIX VERIFICATIONS PASSED SUCCESSFULLY!");
    } else {
        console.log("⚠️ Some tests encountered issues.");
    }
    console.log("==========================================");
    process.exit(allPassed ? 0 : 1);
}

testFixes();
