// scratch/test_police_enhancements.js
const assert = require("assert");

async function runPoliceTests() {
    console.log("🚀 Testing Police Service Enhancements...");
    const BASE = "http://localhost:5000";

    // 1. Stations endpoint
    console.log("\n[Test 1] GET /api/police/stations");
    const stRes = await fetch(`${BASE}/api/police/stations`);
    assert.strictEqual(stRes.status, 200);
    const stData = await stRes.json();
    assert.strictEqual(stData.success, true);
    assert(Array.isArray(stData.stations) && stData.stations.length >= 8);
    console.log(`✅ Stations verified: ${stData.stations.length} Gorakhpur police stations loaded.`);

    // 2. PRV Dial 112 Units
    console.log("\n[Test 2] GET /api/police/prv-units");
    const prvRes = await fetch(`${BASE}/api/police/prv-units`);
    assert.strictEqual(prvRes.status, 200);
    const prvData = await prvRes.json();
    assert.strictEqual(prvData.success, true);
    assert(prvData.count >= 5);
    const pinkPatrol = prvData.units.find(u => u.vehicleType && u.vehicleType.includes("Pink"));
    assert(pinkPatrol, "Pink patrol PRV unit should be present");
    console.log(`✅ PRV Fleet verified: ${prvData.count} active units, including Pink Patrol (${pinkPatrol.id}).`);

    // 3. Emergency SOS Dispatch
    console.log("\n[Test 3] POST /api/police/emergency-sos");
    const sosRes = await fetch(`${BASE}/api/police/emergency-sos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            latitude: 26.7580,
            longitude: 83.3720,
            citizenName: "Test Citizen Priya",
            mobile: "9876543210",
            alertType: "CITIZEN_PANIC_SOS",
            silent: false
        })
    });
    assert.strictEqual(sosRes.status, 201);
    const sosData = await sosRes.json();
    assert.strictEqual(sosData.success, true);
    assert(sosData.alertId.startsWith("SOS-GKP-"));
    assert(sosData.nearestStation && sosData.nearestStation.name);
    assert(sosData.dispatch && sosData.dispatch.unit);
    console.log(`✅ Emergency SOS triggered: Alert ID ${sosData.alertId}, Nearest Station: ${sosData.nearestStation.name} (${sosData.nearestStation.distanceKm} km), Dispatched: ${sosData.dispatch.unit}`);

    // 4. Staff SOS Alerts Feed
    console.log("\n[Test 4] GET /api/police/sos-alerts");
    const sosFeedRes = await fetch(`${BASE}/api/police/sos-alerts`);
    assert.strictEqual(sosFeedRes.status, 200);
    const sosFeed = await sosFeedRes.json();
    assert.strictEqual(sosFeed.success, true);
    assert(sosFeed.alerts.length > 0);
    console.log(`✅ SOS Alerts Feed: ${sosFeed.alerts.length} recent alerts retrieved.`);

    // 5. Citizen e-Complaint and Public CCTNS Tracking
    console.log("\n[Test 5] POST /api/police/complaint & GET /api/police/complaints/track/:ref");
    const cmpRes = await fetch(`${BASE}/api/police/complaint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            citizenName: "Rohan Verma",
            mobile: "9988776655",
            category: "Theft",
            stationId: "1",
            subject: "Bicycle stolen at Golghar market",
            description: "Black Hero bicycle stolen outside market near clock tower."
        })
    });
    assert.strictEqual(cmpRes.status, 201);
    const cmpData = await cmpRes.json();
    assert.strictEqual(cmpData.success, true);
    const cmpRef = cmpData.complaint.complaintId;
    console.log(`✅ Citizen Complaint created: ${cmpRef}`);

    const trackRes = await fetch(`${BASE}/api/police/complaints/track/${encodeURIComponent(cmpRef)}`);
    assert.strictEqual(trackRes.status, 200);
    const trackData = await trackRes.json();
    assert.strictEqual(trackData.success, true);
    assert.strictEqual(trackData.complaint.citizen_name, "Rohan Verma");
    console.log(`✅ CCTNS Track successful: Found complaint "${trackData.complaint.subject}" with status: "${trackData.complaint.status}"`);

    // 6. Mission Shakti Safe Ride
    console.log("\n[Test 6] POST /api/police/safe-ride & GET /api/police/safe-rides");
    const rideRes = await fetch(`${BASE}/api/police/safe-ride`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            citizenName: "Ananya Sharma",
            mobile: "9123456780",
            origin: "Gorakhpur Junction Platform 1",
            destination: "BRD Medical College Campus",
            emergencyContact: "9876501234",
            vehicleDetails: "Auto UP53T 7788",
            etaMinutes: 20
        })
    });
    assert.strictEqual(rideRes.status, 201);
    const rideData = await rideRes.json();
    assert.strictEqual(rideData.success, true);
    assert(rideData.ride.rideId.startsWith("MS-RIDE-"));
    console.log(`✅ Mission Shakti Safe Ride Registered: ID ${rideData.ride.rideId}, Route: ${rideData.ride.origin} ➔ ${rideData.ride.destination}`);

    // 7. Cyber Crime 1930 Rapid Golden-Hour Freeze
    console.log("\n[Test 7] POST /api/police/cyber-freeze");
    const cybRes = await fetch(`${BASE}/api/police/cyber-freeze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            victimName: "Suresh Chandra",
            mobile: "9450123456",
            fraudType: "UPI QR Scam",
            transactionRef: "UTR982341209341",
            bankName: "State Bank of India",
            amountLost: 45000,
            suspectDetails: "fraudster@upi / 9876543299"
        })
    });
    assert.strictEqual(cybRes.status, 201);
    const cybData = await cybRes.json();
    assert.strictEqual(cybData.success, true);
    assert(cybData.freezeId.startsWith("CYB-1930-"));
    console.log(`✅ 1930 Cyber Freeze Dispatched: ID ${cybData.freezeId}, Amount: ₹${cybData.amount}, UTR: ${cybData.transactionRef}`);

    // 8. Stolen Vehicle & Property Hotlist Search
    console.log("\n[Test 8] GET /api/police/hotlist-search");
    const hotlistStolen = await fetch(`${BASE}/api/police/hotlist-search?q=UP53BL8940`);
    assert.strictEqual(hotlistStolen.status, 200);
    const stolenData = await hotlistStolen.json();
    assert.strictEqual(stolenData.isFlagged, true);
    assert(stolenData.records.length > 0);
    console.log(`✅ Stolen Vehicle Flagged: Found ${stolenData.records[0].identifier} (${stolenData.records[0].make_model}), FIR: ${stolenData.records[0].fir_number}`);

    const hotlistClean = await fetch(`${BASE}/api/police/hotlist-search?q=CLEANPLATE99`);
    assert.strictEqual(hotlistClean.status, 200);
    const cleanData = await hotlistClean.json();
    assert.strictEqual(cleanData.isFlagged, false);
    assert.strictEqual(cleanData.records.length, 0);
    console.log(`✅ Clean Vehicle Verified: Correctly returned 0 records for non-stolen plate.`);

    // 9. Tenant & Domestic Help Police Verification
    console.log("\n[Test 9] POST /api/police/verification-request & GET /api/police/verifications");
    const verRes = await fetch(`${BASE}/api/police/verification-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            applicantName: "Vipin Agrawal",
            applicantMobile: "9839012345",
            candidateName: "Manoj Kumar",
            candidateType: "Tenant",
            candidateAadhar: "123456789012",
            stationId: "PS-001",
            address: "House 42, Golghar Main Road, Gorakhpur"
        })
    });
    assert.strictEqual(verRes.status, 201);
    const verData = await verRes.json();
    assert.strictEqual(verData.success, true);
    const verId = verData.verification.verificationId;
    console.log(`✅ Police Verification Submitted: Token ${verId}`);

    const verQuery = await fetch(`${BASE}/api/police/verifications?query=${encodeURIComponent(verId)}`);
    assert.strictEqual(verQuery.status, 200);
    const verQueryData = await verQuery.json();
    assert(verQueryData.verifications.length > 0);
    console.log(`✅ Police Verification lookup: ${verQueryData.verifications[0].candidate_name} status is "${verQueryData.verifications[0].status}"`);

    console.log("\n🎉 ALL 9 POLICE ENHANCEMENT TESTS PASSED PERFECTLY!\n");
}

runPoliceTests().catch(err => {
    console.error("❌ Test failed:", err);
    process.exit(1);
});
