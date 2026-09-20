const BASE = "http://localhost:5000";

async function testAllLots() {
    const lotCodes = ['PARK-001', 'PARK-002', 'PARK-003', 'PARK-004', 'PARK-005', 'PARK-006'];
    console.log("=== TESTING BOOKING ACROSS ALL 6 GORAKHPUR FACILITIES ===");

    for (const code of lotCodes) {
        try {
            // 1. Fetch slots
            const slotsRes = await fetch(`${BASE}/api/parking/${code}/slots`);
            if (!slotsRes.ok) {
                console.error(`❌ GET ${code}/slots failed with HTTP ${slotsRes.status}`);
                continue;
            }
            const slotsData = await slotsRes.json();
            const available = (slotsData.slots || []).filter(s => s.status === 'Available');
            console.log(`\nFacility ${code} (${slotsData.lotName}): Total slots = ${slotsData.slots.length}, Available = ${available.length}`);

            if (available.length === 0) {
                console.warn(`No available slot in ${code}`);
                continue;
            }

            const targetSlot = available[0];

            // 2. Book slot
            const bookRes = await fetch(`${BASE}/api/parking/${code}/book-slot`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    slotNumber: targetSlot.slotNumber,
                    vehicleNumber: "UP-53-AUDIT-01",
                    customerName: "Audit Test Citizen",
                    customerPhone: "9988112233",
                    durationHours: 2,
                    bookingDate: "2026-09-15",
                    startTimeStr: "20:00"
                })
            });

            const bookData = await bookRes.json();
            if (!bookRes.ok || !bookData.success) {
                console.error(`❌ Booking failed in ${code} for slot ${targetSlot.slotNumber}:`, bookData);
                continue;
            }

            const bookingId = bookData.booking.bookingId;
            console.log(`✓ Booking created: ${bookingId} for Bay ${targetSlot.slotNumber} (QR Token: ${bookData.booking.qrToken.slice(0, 8)}...)`);

            // 3. Cancel booking to leave database clean
            const cancelRes = await fetch(`${BASE}/api/parking/bookings/${bookingId}/cancel`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    phone: "9988112233",
                    reason: "Automated audit test cleanup"
                })
            });
            const cancelData = await cancelRes.json();
            if (cancelRes.ok && cancelData.success) {
                console.log(`✓ Cleaned up booking ${bookingId}, Bay ${targetSlot.slotNumber} restored to Available.`);
            } else {
                console.warn(`Cleanup issue for ${bookingId}:`, cancelData);
            }
        } catch (e) {
            console.error(`❌ Error testing ${code}:`, e.message);
        }
    }
}

testAllLots();
