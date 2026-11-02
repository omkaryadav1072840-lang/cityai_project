/**
 * Verification Test Suite: Production ITMS Backend Safety Interlocks,
 * Authenticated Ambulance GPS, E-Challan Dispute Adjudication & Road Graph Routing
 */

const jwt = require("../backend/node_modules/jsonwebtoken");

const BASE_URL = "http://localhost:5000";
const JWT_SECRET = process.env.JWT_SECRET || "smartcity_super_secret_jwt_key_gorakhpur_2026";
const AMBULANCE_UPDATE_TOKEN = process.env.AMBULANCE_UPDATE_TOKEN || "smartcity_ambulance_secret_2026";

function createToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
}

async function request(url, options = {}) {
    const res = await fetch(url, {
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        },
        method: options.method || "GET",
        body: options.body ? JSON.stringify(options.body) : undefined
    });

    let data = null;
    try {
        data = await res.json();
    } catch (e) {
        data = {};
    }

    return { status: res.status, ok: res.ok, data };
}

async function runTests() {
    console.log("🚦 STARTING PRODUCTION ITMS ADVANCED CAPABILITIES TEST SUITE\n");
    let passed = 0;
    let failed = 0;

    function assert(condition, message) {
        if (condition) {
            console.log(`  ✅ PASS: ${message}`);
            passed++;
        } else {
            console.error(`  ❌ FAIL: ${message}`);
            failed++;
        }
    }

    const adminToken = createToken({
        id: 990,
        staffId: "TR-ADMIN",
        name: "ICCC Traffic Admin",
        role: "admin",
        department: "traffic"
    });

    const officerToken = createToken({
        id: 991,
        staffId: "TR-PANDEY",
        name: "Sub-Insp. Amit Pandey",
        role: "staff",
        department: "traffic",
        assigned_junction_id: "JNC-02"
    });

    const citizenToken = createToken({
        id: 555,
        name: "Rahul Citizen",
        role: "citizen"
    });

    // TEST 1: Authenticated Ambulance GPS Ingestion
    console.log("--- 1. Authenticated Ambulance GPS Ingestion & 300m Priority Preparation ---");
    const gpsRes = await request(`${BASE_URL}/api/traffic/ambulances/telemetry/gps`, {
        method: "POST",
        headers: { "x-ambulance-token": AMBULANCE_UPDATE_TOKEN },
        body: {
            ambulance_id: "AMB-001",
            vehicle_number: "UP-53-AZ-1001",
            latitude: 26.7592,
            longitude: 83.3733,
            speed_kmh: 58.5,
            heading_deg: 180.0,
            accuracy_meters: 3.2,
            destination_hospital: "District Hospital Gorakhpur",
            is_critical: true,
            source: "AUTHENTICATED_MOBILE"
        }
    });

    assert(gpsRes.status === 200 && gpsRes.data.success, "GPS telemetry successfully ingested via authenticated token");
    assert(gpsRes.data.telemetry.provenance === "AUTHENTICATED_HARDWARE_GPS", "Verified provenance indicates hardware GPS");
    assert(gpsRes.data.telemetry.accuracyMeters === 3.2, "GPS accuracy recorded");

    // TEST 2: Emergency Corridor Cancellation
    console.log("\n--- 2. Emergency Corridor Cancellation ---");
    const cancelRes = await request(`${BASE_URL}/api/traffic/ambulances/AMB-001/corridor/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${officerToken}` }
    });
    assert(cancelRes.status === 200 && cancelRes.data.success, "Emergency corridor successfully cancelled by officer");

    // TEST 3: Dynamic Gorakhpur Road Graph Pathfinding
    console.log("\n--- 3. Dynamic Gorakhpur Road Graph Pathfinding ---");
    const routeRes = await request(`${BASE_URL}/api/traffic/alternative-routes?from=Golghar&to=Medical+College`);
    assert(routeRes.status === 200 && routeRes.data.success, "Road graph calculated route alternatives for custom origin/destination");
    assert(routeRes.data.routes.length === 3, "Three distinct route alternatives calculated (Fastest, Low-Traffic, Min-Junctions)");
    assert(routeRes.data.standardRoute.distanceKm > 0, `Fastest route distance: ${routeRes.data.standardRoute.distanceKm} km`);
    assert(Array.isArray(routeRes.data.standardRoute.coordinates) && routeRes.data.standardRoute.coordinates.length > 2, "Authentic polyline coordinates returned");

    // TEST 4: Privacy Masking on Camera Feeds for Unauthenticated Public
    console.log("\n--- 4. Privacy Masking on Camera Feeds for Unauthenticated Public ---");
    const pubCamRes = await request(`${BASE_URL}/api/traffic/cameras`);
    assert(pubCamRes.status === 200, "Public camera query returns 200");
    assert(pubCamRes.data.isStaffView === false, "Public view correctly marked as non-staff");
    const nonSimulated = pubCamRes.data.cameras.find(c => !c.is_simulated);
    if (nonSimulated) {
        assert(nonSimulated.stream_access === "PUBLIC_METADATA_ONLY", "Raw stream credentials masked for public view");
    }

    // TEST 5: E-Challan Dispute Filing & Adjudication Workflow
    console.log("\n--- 5. E-Challan Citizen Dispute Filing & Officer Adjudication ---");
    // Fetch a violation to dispute
    const viosRes = await request(`${BASE_URL}/api/traffic/violations`);
    const targetVio = viosRes.data.violations[0];

    const disputeRes = await request(`${BASE_URL}/api/traffic/violations/${targetVio.id}/dispute`, {
        method: "POST",
        body: {
            vehicle_number: targetVio.vehicle_number,
            dispute_reason: "Vehicle was sold before breach timestamp. Form 29/30 transfer submitted.",
            citizen_name: "Amit Srivastava",
            citizen_phone: "+91 98765 12345"
        }
    });
    assert(disputeRes.status === 200 && disputeRes.data.success, `Dispute filed successfully for violation ${targetVio.id}`);

    // Officer reviews active disputes
    const disputesListRes = await request(`${BASE_URL}/api/traffic/violations/disputes`, {
        headers: { Authorization: `Bearer ${officerToken}` }
    });
    assert(disputesListRes.status === 200, "Officer retrieves active dispute queue");
    const foundDispute = disputesListRes.data.disputes.find(d => d.id === targetVio.id);
    assert(foundDispute && foundDispute.dispute_status === "FILED", "Target dispute found in officer adjudication list");

    // Officer adjudicates: Waives fine
    const adjudicateRes = await request(`${BASE_URL}/api/traffic/violations/${targetVio.id}/dispute/review`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${officerToken}` },
        body: {
            action: "ACCEPT_WAIVE",
            adjudication_notes: "Form 29 ownership transfer verified from RTO database. Fine waived."
        }
    });
    assert(adjudicateRes.status === 200 && adjudicateRes.data.dispute_status === "ACCEPTED_WAIVED", "Officer successfully adjudicated dispute and waived fine");

    // TEST 6: Fail-Safe Signal Fallback
    console.log("\n--- 6. Fail-Safe Signal Fallback ---");
    const fallbackRes = await request(`${BASE_URL}/api/traffic/junctions/JNC-02/fail-safe-fallback`, {
        method: "POST",
        headers: { Authorization: `Bearer ${officerToken}` },
        body: { reason: "Edge Camera Hardware Disconnect" }
    });
    assert(fallbackRes.status === 200 && fallbackRes.data.success, "Junction successfully engaged in safe fixed-time fallback");

    // TEST 7: Admin Staff Status Management
    console.log("\n--- 7. Admin Staff Activation / Deactivation ---");
    const staffStatusRes = await request(`${BASE_URL}/api/traffic/admin/users/TR-PANDEY/status`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { status: "Active", is_active: true }
    });
    assert(staffStatusRes.status === 200 && staffStatusRes.data.isActive === true, "Admin successfully verified staff activation");

    console.log(`\n=======================================================`);
    console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`=======================================================`);
    process.exit(failed === 0 ? 0 : 1);
}

runTests();
