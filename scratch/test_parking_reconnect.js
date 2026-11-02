const http = require("http");

function request(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const options = {
            hostname: "localhost",
            port: 5000,
            path,
            method,
            headers: {
                "Content-Type": "application/json",
                ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
                ...headers
            }
        };

        const req = http.request(options, res => {
            let data = "";
            res.on("data", c => data += c);
            res.on("end", () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, raw: data });
                }
            });
        });

        req.on("error", reject);
        if (payload) req.write(payload);
        req.end();
    });
}

async function run() {
    console.log("🧪 TESTING PARKING RE-CONNECT & REAL-TIME BOOKING STATUS UPDATE\n");

    // 1. Initial State
    console.log("Step 1: Fetching initial parking lots status via /api/traffic/parking-lots...");
    const initRes = await request("GET", "/api/traffic/parking-lots");
    if (initRes.status !== 200 || !initRes.data.success) {
        throw new Error("Failed to fetch traffic parking lots: " + JSON.stringify(initRes));
    }
    const lot001Before = initRes.data.lots.find(l => l.parking_code === "PARK-001");
    console.log(`Initial PARK-001: ${lot001Before.availableSpots} Free, ${lot001Before.occupiedSpots} Occupied (Total: ${lot001Before.totalSpots})`);

    // 2. Book a Slot on PARK-001
    console.log("\nStep 2: Booking pass via POST /api/parking/PARK-001/book...");
    const bookRes = await request("POST", "/api/parking/PARK-001/book", {
        vehicleNumber: "UP-53-AZ-8888",
        durationHours: 3,
        customerName: "Rohan Verma",
        customerPhone: "9876543210"
    });

    console.log("Book response status:", bookRes.status);
    console.log("Book response data:", bookRes.data);

    if (bookRes.status !== 201 || !bookRes.data.success) {
        throw new Error("Booking failed: " + JSON.stringify(bookRes.data));
    }

    const b = bookRes.data.booking;
    console.log(`✅ Slot Booked: ${b.slotNumber} (Booking ID: ${b.bookingId}, Amount: ₹${b.totalAmount})`);
    if (!b.slotNumber) throw new Error("Expected slotNumber to be assigned, got null/undefined!");

    // 3. Verify Status Update in Traffic API
    console.log("\nStep 3: Verifying live status update in GET /api/traffic/parking-lots...");
    const afterRes = await request("GET", "/api/traffic/parking-lots");
    const lot001After = afterRes.data.lots.find(l => l.parking_code === "PARK-001");
    console.log(`Updated PARK-001: ${lot001After.availableSpots} Free, ${lot001After.occupiedSpots} Occupied`);

    if (lot001After.availableSpots !== lot001Before.availableSpots - 1) {
        throw new Error(`Expected availableSpots to decrease by 1 (from ${lot001Before.availableSpots} to ${lot001Before.availableSpots - 1}), got ${lot001After.availableSpots}`);
    }
    if (lot001After.occupiedSpots !== lot001Before.occupiedSpots + 1) {
        throw new Error(`Expected occupiedSpots to increase by 1 (from ${lot001Before.occupiedSpots} to ${lot001Before.occupiedSpots + 1}), got ${lot001After.occupiedSpots}`);
    }
    console.log("✅ LIVE STATUS UPDATED IN TRAFFIC MODULE SUCCESSFULLY!");

    // 4. Verify in Parking Module Slots API
    console.log("\nStep 4: Verifying bay status in /api/parking/PARK-001/slots...");
    const slotsRes = await request("GET", "/api/parking/PARK-001/slots");
    const bookedSlot = slotsRes.data.slots.find(s => s.slotNumber === b.slotNumber);
    console.log(`Bay ${b.slotNumber} in Parking Module: status = '${bookedSlot.status}'`);
    if (bookedSlot.status !== "Booked" && bookedSlot.status !== "Occupied") {
        throw new Error(`Expected bay status to be 'Booked' or 'Occupied', got '${bookedSlot.status}'`);
    }
    console.log("✅ PARKING MODULE SLOTS REFLECTS REAL BOOKING!");

    // 5. Test Cancellation & Bay Release
    console.log("\nStep 5: Cancelling booking via POST /api/parking/bookings/:id/cancel...");
    const cancelRes = await request("POST", `/api/parking/bookings/${encodeURIComponent(b.bookingId)}/cancel`, {
        reason: "Test Cancellation",
        qrToken: b.qrToken
    });
    console.log("Cancel status:", cancelRes.status, cancelRes.data);
    if (cancelRes.status !== 200 || !cancelRes.data.success) {
        throw new Error("Cancellation failed: " + JSON.stringify(cancelRes.data));
    }

    // 6. Verify Status Restored
    console.log("\nStep 6: Verifying restored status in GET /api/traffic/parking-lots...");
    const finalRes = await request("GET", "/api/traffic/parking-lots");
    const lot001Final = finalRes.data.lots.find(l => l.parking_code === "PARK-001");
    console.log(`Restored PARK-001: ${lot001Final.availableSpots} Free, ${lot001Final.occupiedSpots} Occupied`);

    if (lot001Final.availableSpots !== lot001Before.availableSpots) {
        throw new Error(`Expected availableSpots to be restored to ${lot001Before.availableSpots}, got ${lot001Final.availableSpots}`);
    }
    console.log("✅ CANCELLATION RESTORED SLOTS ACCURATELY!");

    console.log("\n=======================================================");
    console.log("🎉 ALL PARKING RE-CONNECT & REAL-TIME BOOKING TESTS PASSED!");
    console.log("=======================================================");
}

run().catch(err => {
    console.error("❌ TEST FAILED:", err);
    process.exit(1);
});

