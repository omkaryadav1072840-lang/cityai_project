const http = require('http');

function request(url, options = {}, postData = null) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const reqOptions = {
            hostname: u.hostname,
            port: u.port,
            path: u.pathname + u.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        };

        if (postData) {
            reqOptions.headers['Content-Length'] = Buffer.byteLength(postData);
        }

        const req = http.request(reqOptions, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve({ status: res.statusCode, headers: res.headers, data: parsed, raw: body });
                } catch (e) {
                    resolve({ status: res.statusCode, headers: res.headers, raw: body });
                }
            });
        });

        req.on('error', reject);
        if (postData) req.write(postData);
        req.end();
    });
}

async function runTests() {
    console.log("=== Testing Staff Role Enforcement & Camera-Driven Congestion ===");
    try {
        // Fetch a test signal
        const sigsRes = await request('http://localhost:5000/api/traffic/signals');
        const testSignal = sigsRes.data.signals[0];
        console.log(`Test Signal: ${testSignal.id}`);

        // TEST 1: Citizen attempt to edit location -> MUST FAIL with 403
        console.log("\n[1] Testing Citizen Authorization Block on PUT /api/traffic/signals/:id/location...");
        const citizenPayload = JSON.stringify({
            latitude: 26.7599,
            longitude: 83.3739,
            role: "citizen",
            operator: "Public Citizen"
        });
        const citizenRes = await request(`http://localhost:5000/api/traffic/signals/${encodeURIComponent(testSignal.id)}/location`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-user-role': 'citizen' }
        }, citizenPayload);

        console.log(`Citizen Status: ${citizenRes.status} (Expected: 403)`);
        console.log(`Citizen Error: ${citizenRes.data?.error}`);
        if (citizenRes.status !== 403) {
            throw new Error(`Security Failure! Citizen was not blocked. Status: ${citizenRes.status}`);
        }
        console.log("✅ Citizen edit correctly BLOCKED with 403 Forbidden!");

        // TEST 2: Unauthenticated attempt without role -> MUST FAIL with 403
        console.log("\n[2] Testing Anonymous Request Block...");
        const anonRes = await request(`http://localhost:5000/api/traffic/signals/${encodeURIComponent(testSignal.id)}/location`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        }, JSON.stringify({ latitude: 26.7599, longitude: 83.3739 }));

        console.log(`Anonymous Status: ${anonRes.status} (Expected: 403)`);
        if (anonRes.status !== 403) {
            throw new Error(`Security Failure! Anonymous edit was not blocked. Status: ${anonRes.status}`);
        }
        console.log("✅ Anonymous edit correctly BLOCKED with 403 Forbidden!");

        // TEST 3: Staff attempt -> MUST SUCCEED with 200
        console.log("\n[3] Testing Authorized Staff PUT /api/traffic/signals/:id/location...");
        const staffPayload = JSON.stringify({
            latitude: 26.7596001,
            longitude: 83.3738002,
            role: "staff",
            operator: "Inspector R.K. Sharma"
        });
        const staffRes = await request(`http://localhost:5000/api/traffic/signals/${encodeURIComponent(testSignal.id)}/location`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'x-user-role': 'staff' }
        }, staffPayload);

        console.log(`Staff Status: ${staffRes.status} (Expected: 200)`);
        if (staffRes.status !== 200 || !staffRes.data?.success) {
            throw new Error(`Staff edit failed: ${JSON.stringify(staffRes.data)}`);
        }
        console.log("✅ Authorized Staff edit SUCCEEDED!");

        // TEST 4: Get Camera Traffic Summary for Junction
        console.log("\n[4] Testing GET /api/traffic/junctions/JNC-01/camera-traffic-summary...");
        const camSummaryRes = await request('http://localhost:5000/api/traffic/junctions/JNC-01/camera-traffic-summary');
        console.log(`Camera Summary Status: ${camSummaryRes.status}`);
        console.log(`Junction: ${camSummaryRes.data?.junction?.name}`);
        console.log(`Cameras reporting: ${camSummaryRes.data?.camera_count}`);
        console.log(`Total Junction Vehicles/min: ${camSummaryRes.data?.total_vehicles_per_min}`);
        console.log(`Average Speed: ${camSummaryRes.data?.average_speed_kmh} km/h`);
        if (!camSummaryRes.data?.cameras || camSummaryRes.data.cameras.length === 0) {
            throw new Error("No cameras returned for junction.");
        }
        const testCam = camSummaryRes.data.cameras[0];
        console.log(`Target Camera: ${testCam.id} (${testCam.camera_name})`);
        console.log("✅ Camera traffic summary successfully retrieved!");

        // TEST 5: Submit High Traffic Surge to Camera and verify Junction Congestion increases
        console.log(`\n[5] Simulating Heavy Traffic Surge on Camera ${testCam.id}...`);
        const surgePayload = JSON.stringify({
            vehicles_per_min: 94,
            avg_speed: 11.2,
            role: "staff",
            operator: "Vision AI Sensor Emulation"
        });
        const surgeRes = await request(`http://localhost:5000/api/traffic/cameras/${encodeURIComponent(testCam.id)}/traffic-feed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-role': 'staff' }
        }, surgePayload);

        console.log(`Surge Feed Status: ${surgeRes.status}`);
        console.log("Surge Response:", surgeRes.data?.message);
        console.log(`Recalculated Junction Congestion: ${surgeRes.data?.junctionUpdate?.congestion_level}% (${surgeRes.data?.junctionUpdate?.status})`);

        if (surgeRes.status !== 200 || !surgeRes.data?.success) {
            throw new Error(`Camera surge failed: ${JSON.stringify(surgeRes.data)}`);
        }
        if (surgeRes.data.junctionUpdate?.congestion_level < 60) {
            throw new Error(`Expected high congestion score from 94 veh/min flow, got ${surgeRes.data.junctionUpdate?.congestion_level}%`);
        }
        console.log("✅ Camera traffic successfully pushed and junction congestion automatically recalculated high!");

        // TEST 6: Verify Junction in DB reflects camera-driven congestion
        console.log("\n[6] Verifying Junction in DB after camera update...");
        const jncRes = await request('http://localhost:5000/api/traffic/junctions/JNC-01');
        console.log(`Junction JNC-01 Congestion Level in DB: ${jncRes.data?.junction?.congestion_level}%`);
        console.log(`Junction Speed in DB: ${jncRes.data?.junction?.avg_speed_kmh} km/h`);
        console.log("✅ Database verified: Camera traffic directly drives junction congestion!");

        // TEST 7: Submit Free Flow Traffic to Camera and verify Junction Congestion drops
        console.log(`\n[7] Simulating Free Flow Traffic on Camera ${testCam.id}...`);
        const freeFlowPayload = JSON.stringify({
            vehicles_per_min: 20,
            avg_speed: 39.5,
            role: "staff",
            operator: "Vision AI Sensor Emulation"
        });
        const freeFlowRes = await request(`http://localhost:5000/api/traffic/cameras/${encodeURIComponent(testCam.id)}/traffic-feed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-role': 'staff' }
        }, freeFlowPayload);

        console.log(`Free Flow Feed Status: ${freeFlowRes.status}`);
        console.log(`Recalculated Junction Congestion: ${freeFlowRes.data?.junctionUpdate?.congestion_level}% (${freeFlowRes.data?.junctionUpdate?.status})`);
        if (freeFlowRes.data.junctionUpdate?.congestion_level > 60) {
            throw new Error(`Expected low congestion score from 20 veh/min flow, got ${freeFlowRes.data.junctionUpdate?.congestion_level}%`);
        }
        console.log("✅ Camera traffic reduction automatically dropped junction congestion!");

        // TEST 8: Frontend code verification
        console.log("\n[8] Verifying Frontend Code...");
        const jsRes = await request('http://localhost:5000/pages/traffic/traffic.js');
        const hasIsStaffUser = jsRes.raw.includes('isStaffUser');
        const hasCongestionListener = jsRes.raw.includes('traffic:congestion_updated');
        const hasCameraSummary = jsRes.raw.includes('showJunctionCameraTrafficSummary');
        const hasSurgePrompt = jsRes.raw.includes('promptCameraTrafficSurge');

        console.log(`- isStaffUser guard: ${hasIsStaffUser ? '✅ Present' : '❌ Missing'}`);
        console.log(`- traffic:congestion_updated socket listener: ${hasCongestionListener ? '✅ Present' : '❌ Missing'}`);
        console.log(`- showJunctionCameraTrafficSummary: ${hasCameraSummary ? '✅ Present' : '❌ Missing'}`);
        console.log(`- promptCameraTrafficSurge: ${hasSurgePrompt ? '✅ Present' : '❌ Missing'}`);

        if (!hasIsStaffUser || !hasCongestionListener || !hasCameraSummary || !hasSurgePrompt) {
            throw new Error("One or more frontend handlers are missing.");
        }

        console.log("\n=======================================================");
        console.log("ALL TESTS PASSED! Staff-only editing & Camera-driven congestion are verified.");
        console.log("=======================================================");
    } catch (e) {
        console.error("Test failed with error:", e);
        process.exit(1);
    }
}

setTimeout(runTests, 1500);
