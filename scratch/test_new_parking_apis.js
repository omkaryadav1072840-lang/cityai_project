const http = require('http');

function post(path, body) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(body);
        const req = http.request({
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch(e) {
                    resolve({ status: res.statusCode, raw: data });
                }
            });
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

function get(path) {
    return new Promise((resolve, reject) => {
        http.get('http://localhost:5000' + path, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch(e) {
                    resolve({ status: res.statusCode, raw: data });
                }
            });
        }).on('error', reject);
    });
}

async function runTests() {
    console.log("=== 1. Test GET /api/parking/my-bookings without user params ===");
    const resEmpty = await get('/api/parking/my-bookings');
    console.log("Status:", resEmpty.status, "Count:", resEmpty.data.count, "Bookings:", resEmpty.data.bookings);

    console.log("\n=== 2. Test POST /api/parking/PARK-006/book-slot ===");
    // First let's get slots for PARK-006 to pick an Available slot
    const slotsRes = await get('/api/parking/PARK-006/slots');
    const availableSlot = (slotsRes.data.slots || []).find(s => s.status === 'Available');
    if (!availableSlot) {
        console.log("No available slot found in PARK-006! Slots:", slotsRes.data.slots);
        return;
    }
    const slotNum = availableSlot.slotNumber || availableSlot.slot_number;
    console.log("Found available slot:", slotNum);

    const bookingRes = await post('/api/parking/PARK-006/book-slot', {
        slotNumber: slotNum,
        vehicleNumber: 'UP-53-TEST-99',
        customerName: 'Omkar Test Citizen',
        customerPhone: '9988776655',
        durationHours: 3,
        userId: 'citizen-test-101',
        bookingDate: '2026-09-15',
        startTimeStr: '19:00'
    });
    console.log("Booking response status:", bookingRes.status);
    console.log("Booking payload:", bookingRes.data);

    const bookingId = bookingRes.data.booking?.bookingId;
    const qrPayload = bookingRes.data.booking?.qrPayload;
    const qrToken = bookingRes.data.booking?.qrToken;

    console.log("\n=== 3. Test GET /api/parking/my-bookings for this citizen ===");
    const myBookings = await get('/api/parking/my-bookings?userId=citizen-test-101');
    console.log("My bookings count:", myBookings.data.count);
    const found = (myBookings.data.bookings || []).find(b => b.booking_id === bookingId);
    console.log("Found our booking?:", !!found, "QR token:", found?.qr_token, "Payload:", found?.qr_payload);

    console.log("\n=== 4. Test POST /api/parking/verify-qr (Staff check-in) ===");
    const verifyRes = await post('/api/parking/verify-qr', {
        qrPayload: qrPayload
    });
    console.log("Verify status:", verifyRes.status);
    console.log("Verify data:", verifyRes.data);

    console.log("\n=== 5. Test Duplicate POST /api/parking/verify-qr ===");
    const duplicateVerify = await post('/api/parking/verify-qr', {
        qrPayload: qrPayload
    });
    console.log("Duplicate status (expect 409):", duplicateVerify.status);
    console.log("Duplicate message:", duplicateVerify.data.message);

    console.log("\n=== 6. Test Cancel on Checked-in Booking (expect 400) ===");
    const cancelCheckedIn = await post(`/api/parking/bookings/${bookingId}/cancel`, {
        userId: 'citizen-test-101'
    });
    console.log("Cancel checked-in status:", cancelCheckedIn.status);
    console.log("Cancel checked-in message:", cancelCheckedIn.data.message);

    console.log("\n=== 7. Book another slot to test successful cancellation ===");
    const slotsRes2 = await get('/api/parking/PARK-006/slots');
    const availableSlot2 = (slotsRes2.data.slots || []).find(s => s.status === 'Available');
    if (availableSlot2) {
        const slotNum2 = availableSlot2.slotNumber || availableSlot2.slot_number;
        const book2 = await post('/api/parking/PARK-006/book-slot', {
            slotNumber: slotNum2,
            vehicleNumber: 'UP-53-CANCEL-01',
            customerName: 'Omkar Test Citizen 2',
            customerPhone: '9988776655',
            durationHours: 2,
            userId: 'citizen-test-101'
        });
        const bId2 = book2.data.booking?.bookingId;
        console.log("Booked 2nd slot:", slotNum2, "Booking ID:", bId2);

        const cancelRes = await post(`/api/parking/bookings/${bId2}/cancel`, {
            userId: 'citizen-test-101',
            reason: 'Change of schedule'
        });
        console.log("Cancel status (expect 200):", cancelRes.status);
        console.log("Cancel message:", cancelRes.data.message);

        // Verify slot is Available again
        const slotsRes3 = await get('/api/parking/PARK-006/slots');
        const slotCheck = (slotsRes3.data.slots || []).find(s => (s.slotNumber || s.slot_number) === slotNum2);
        console.log("Slot status after cancel (expect Available):", slotCheck?.status);
    }
}

runTests().catch(console.error);
