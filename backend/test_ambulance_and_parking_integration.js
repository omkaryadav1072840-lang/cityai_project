/**
 * Verification Test Suite: Live Ambulance Corridor Preemption & Real Spot Parking Integration
 */

const http = require("http");

function apiRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const payload = data ? JSON.stringify(data) : null;
        const req = http.request({
            hostname: "localhost",
            port: 5000,
            path: path,
            method: method,
            headers: {
                "Content-Type": "application/json",
                ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {})
            }
        }, (res) => {
            let body = "";
            res.on("data", chunk => body += chunk);
            res.on("end", () => {
                try {
                    const json = JSON.parse(body);
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    resolve({ status: res.statusCode, body });
                }
            });
        });
        req.on("error", reject);
        if (payload) req.write(payload);
        req.end();
    });
}

async function runTests() {
    console.log("===============================================================");
    console.log("🧪 TESTING LIVE AMBULANCES & REAL PARKING SPOTS INTEGRATION");
    console.log("===============================================================\n");

    let passed = 0;
    let failed = 0;

    function assert(name, condition, details = "") {
        if (condition) {
            console.log(`✅ PASS: ${name}`);
            passed++;
        } else {
            console.error(`❌ FAIL: ${name} -> ${details}`);
            failed++;
        }
    }

    try {
        // 1. Test Connected Real Parking Spots
        console.log("--- 1. Testing Real Spot Parking Endpoint ---");
        const parkRes = await apiRequest("GET", "/api/traffic/parking-lots");
        assert("GET /api/traffic/parking-lots HTTP 200", parkRes.status === 200);
        assert("Parking returns summary object", !!parkRes.data.summary);
        assert(
            "Exact total city parking spots equals 132",
            parkRes.data.summary.totalCitySpots === 132,
            `Got ${parkRes.data.summary.totalCitySpots}`
        );
        assert(
            "Exact available city parking spots equals 107",
            parkRes.data.summary.availableCitySpots === 107,
            `Got ${parkRes.data.summary.availableCitySpots}`
        );
        assert(
            "Lots array returned with 6 facilities",
            Array.isArray(parkRes.data.lots) && parkRes.data.lots.length === 6,
            `Got ${parkRes.data.lots?.length}`
        );

        // 2. Test Live Moving Ambulances
        console.log("\n--- 2. Testing Live Ambulances Endpoint ---");
        const ambRes = await apiRequest("GET", "/api/traffic/ambulances/live");
        assert("GET /api/traffic/ambulances/live HTTP 200", ambRes.status === 200);
        assert(
            "Ambulances returned with active telemetry pool",
            ambRes.data.count > 0 && Array.isArray(ambRes.data.ambulances),
            `Got ${ambRes.data.count} ambulances`
        );
        const testAmb = ambRes.data.ambulances[0];
        assert("Ambulance has valid latitude & longitude", typeof testAmb.latitude === "number" && typeof testAmb.longitude === "number");
        assert("Ambulance has route waypoints", Array.isArray(testAmb.routeWaypoints) && testAmb.routeWaypoints.length > 0);
        assert("Ambulance has assigned driver & hospital", !!testAmb.driver_name && !!testAmb.hospital_name);

        // 3. Test Critical Ambulance Corridor Preemption
        console.log("\n--- 3. Testing Critical Corridor Preemption ---");
        const critDispatchRes = await apiRequest("POST", `/api/traffic/ambulances/${testAmb.id}/critical-dispatch`, {
            destinationHospital: "BRD Medical College",
            reason: "Acute Cardiac Emergency"
        });
        assert("POST /api/traffic/ambulances/:id/critical-dispatch HTTP 200", critDispatchRes.status === 200);
        assert("Ambulance status marked as 'Critical Transit'", critDispatchRes.data.ambulance.status === "Critical Transit");
        assert("Preempted junctions returned", Array.isArray(critDispatchRes.data.preemptedJunctions) && critDispatchRes.data.preemptedJunctions.length > 0);
        console.log(`   🚑 Preempted ${critDispatchRes.data.preemptedJunctions.length} junctions along corridor:`, critDispatchRes.data.preemptedJunctions.map(j => j.name).join(", "));

        // 4. Verify Traffic Signals in Preempted Junctions
        console.log("\n--- 4. Verifying Traffic Signals Along Corridor ---");
        const jncRes = await apiRequest("GET", "/api/traffic/junctions");
        const preemptedJnc = jncRes.data.junctions.find(j => j.id === critDispatchRes.data.preemptedJunctions[0].id);
        assert("Junction status is 'Emergency Priority'", preemptedJnc && preemptedJnc.status === "Emergency Priority");
        const greenSignals = (preemptedJnc.signals || []).filter(s => s.current_color === "Green");
        assert("Transit approaches set to GREEN", greenSignals.length > 0, `Found ${greenSignals.length} green signals`);

        // 5. Test Clear Critical Corridor
        console.log("\n--- 5. Testing Clear Critical Corridor ---");
        const clearRes = await apiRequest("POST", `/api/traffic/ambulances/${testAmb.id}/clear-critical`);
        assert("POST /api/traffic/ambulances/:id/clear-critical HTTP 200", clearRes.status === 200);
        assert("Ambulance restored to normal status", clearRes.data.ambulance.status === "On Duty" && !clearRes.data.ambulance.isCritical);

        // Verify restoration
        const jncRestoreRes = await apiRequest("GET", "/api/traffic/junctions");
        const restoredJnc = jncRestoreRes.data.junctions.find(j => j.id === critDispatchRes.data.preemptedJunctions[0].id);
        assert("Junction restored to 'Operational'", restoredJnc && restoredJnc.status === "Operational");

    } catch (err) {
        console.error("Test execution error:", err);
        failed++;
    }

    console.log("\n===============================================================");
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("===============================================================");
    process.exit(failed > 0 ? 1 : 0);
}

runTests();
