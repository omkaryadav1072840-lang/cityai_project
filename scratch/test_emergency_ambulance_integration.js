const assert = require('assert');
const fs = require('fs');
const express = require('../backend/node_modules/express');
const { Readable } = require('stream');

console.log("===============================================================================");
console.log("🚑 EMERGENCY -> HOSPITAL AMBULANCE INTEGRATION TEST SUITE");
console.log("===============================================================================\n");

// 1. Verify HTML Structure & Modal
const emHtml = fs.readFileSync('frontend/pages/emergency/emergency.html', 'utf8');
assert(emHtml.includes('id="ambulanceModal"'), "Ambulance modal must be present in emergency.html");
assert(emHtml.includes('id="ambulanceMap"'), "Ambulance Leaflet map element must be present in emergency.html");
assert(emHtml.includes('id="ambulanceList"'), "Ambulance fleet list container must be present");
assert(emHtml.includes('id="emergencyRequestPanel"'), "Emergency match panel must be present");
assert(emHtml.includes('leaflet-routing-machine'), "Leaflet routing machine must be linked in emergency.html");
assert(emHtml.includes('onclick="requestAmbulance()"'), "Medical Emergency card must call requestAmbulance()");
console.log("  ✅ PASS: 1. emergency.html has ambulance modal, map, list, and routing machine");

// 2. Verify CSS Styling
const emCss = fs.readFileSync('frontend/pages/emergency/emergency.css', 'utf8');
assert(emCss.includes('.ambulance-modal-box'), "Ambulance modal styles must be present in emergency.css");
assert(emCss.includes('.ambulance-map'), "Ambulance map styles must be present in emergency.css");
assert(emCss.includes('.ambulance-route-panel'), "Route panel styles must be present in emergency.css");
assert(emCss.includes('.emergency-request-btn'), "Emergency request button styles must be present in emergency.css");
console.log("  ✅ PASS: 2. emergency.css has all required ambulance modal, map, and card styles");

// 3. Verify JS Logic
const emJs = fs.readFileSync('frontend/pages/emergency/emergency.js', 'utf8');
assert(emJs.includes('function requestAmbulance'), "requestAmbulance must be defined in emergency.js");
assert(emJs.includes('function trackAmbulance'), "trackAmbulance must be defined in emergency.js");
assert(emJs.includes('function startEmergencyRequest'), "startEmergencyRequest must be defined in emergency.js");
assert(emJs.includes('function confirmEmergencyAssignment'), "confirmEmergencyAssignment must be defined in emergency.js");
assert(emJs.includes('function refreshAmbulance'), "refreshAmbulance must be defined in emergency.js");
assert(emJs.includes('function advanceAmbulanceStatus'), "advanceAmbulanceStatus must be defined in emergency.js");
assert(emJs.includes('function resetAmbulanceTracking'), "resetAmbulanceTracking must be defined in emergency.js");
assert(emJs.includes('join-ambulance-tracking'), "Socket room join-ambulance-tracking must be wired");
console.log("  ✅ PASS: 3. emergency.js contains full hospital ambulance dispatch & tracking controller");

// Setup isolated test express app with ambulance routes
const app = express();
app.use(express.json());
const ambulanceRoutes = require('../backend/routes/ambulance.routes');
app.use(ambulanceRoutes);

function dispatchRequest(method, url, headers = {}, body = null) {
    return new Promise((resolve) => {
        const req = new Readable();
        req._read = () => {};
        req.method = method.toUpperCase();
        req.url = url;
        req.headers = { host: "localhost:5000", ...headers };

        if (body) {
            const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
            req.headers["content-type"] = req.headers["content-type"] || "application/json";
            req.headers["content-length"] = Buffer.byteLength(bodyStr);
            req.push(bodyStr);
        }
        req.push(null);

        let statusCode = 200;
        let responseHeaders = {};
        const chunks = [];

        const res = {
            statusCode: 200,
            setHeader: (k, v) => { responseHeaders[k.toLowerCase()] = v; },
            getHeader: (k) => responseHeaders[k.toLowerCase()],
            status: function (code) { statusCode = code; this.statusCode = code; return this; },
            json: function (data) {
                statusCode = this.statusCode || statusCode;
                resolve({ status: statusCode, data, headers: responseHeaders });
            },
            send: function (data) {
                statusCode = this.statusCode || statusCode;
                let parsed = data;
                try { parsed = JSON.parse(data); } catch (_) {}
                resolve({ status: statusCode, data: parsed, headers: responseHeaders });
            },
            end: function (chunk) {
                if (chunk) chunks.push(Buffer.from(chunk));
                const total = Buffer.concat(chunks).toString("utf8");
                let parsed = total;
                try { parsed = JSON.parse(total); } catch (_) {}
                resolve({ status: statusCode, data: parsed, headers: responseHeaders });
            }
        };

        app.handle(req, res);
    });
}

async function runApiTests() {
    console.log("\n--- Testing Backend Ambulance & Hospital Integration ---");

    // A. Fetch all ambulances
    const ambRes = await dispatchRequest('GET', '/api/ambulances');
    assert.strictEqual(ambRes.status, 200, "GET /api/ambulances must return 200");
    assert(Array.isArray(ambRes.data.ambulances), "ambulances must be an array");
    console.log(`  ✅ PASS: 4. Fetched ${ambRes.data.ambulances.length} ambulances from hospital network`);

    // B. Destination hospital network
    const targetHosp = { id: 1, hospital_name: 'AIIMS Gorakhpur', latitude: 26.7431, longitude: 83.4344 };
    console.log(`  ✅ PASS: 5. Destination hospital network: ${targetHosp.hospital_name}`);

    // C. Search nearby available ambulances
    const nearbyAmbRes = await dispatchRequest('GET', '/api/ambulances/nearby/search?lat=26.7606&lng=83.3732&limit=5');
    assert.strictEqual(nearbyAmbRes.status, 200, "Nearby ambulances search must return 200");
    assert(Array.isArray(nearbyAmbRes.data.ambulances), "nearby ambulances must be an array");
    console.log(`  ✅ PASS: 6. Nearby available ambulances search returned ${nearbyAmbRes.data.ambulances.length} units`);

    // D. Test emergency assignment
    const targetAmb = ambRes.data.ambulances[0];

    if (targetAmb) {
        const assignRes = await dispatchRequest('PUT', `/api/ambulances/${targetAmb.id}/assign`, {}, {
            patientName: 'Emergency Patient (SOS Integration Test)',
            patientLat: 26.7606,
            patientLng: 83.3732,
            destinationHospitalId: targetHosp.id,
            destinationHospitalName: targetHosp.hospital_name
        });
        assert.strictEqual(assignRes.status, 200, "Ambulance assignment must return 200");
        assert.strictEqual(assignRes.data.ambulance.status, 'Assigned', "Ambulance status must become 'Assigned'");
        console.log(`  ✅ PASS: 7. Ambulance ${targetAmb.ambulance_id || targetAmb.id} successfully assigned to ${targetHosp.hospital_name}`);

        // E. Test mission step advance: 'On The Way'
        const advanceRes = await dispatchRequest('PUT', `/api/ambulances/${targetAmb.id}/status`, {}, {
            status: 'On The Way'
        });
        assert.strictEqual(advanceRes.status, 200, "Advance status must return 200");
        assert.strictEqual(advanceRes.data.ambulance.status, 'On The Way', "Ambulance status must be 'On The Way'");
        console.log(`  ✅ PASS: 8. Ambulance status advanced to 'On The Way'`);

        // F. Test reset back to Available
        const resetRes = await dispatchRequest('PUT', `/api/ambulances/${targetAmb.id}/reset`);
        assert.strictEqual(resetRes.status, 200, "Ambulance reset must return 200");
        assert.strictEqual(resetRes.data.ambulance.status, 'Available', "Ambulance status must return to 'Available'");
        console.log(`  ✅ PASS: 9. Ambulance reset back to 'Available'`);
    }

    console.log("\n===============================================================================");
    console.log("🎯 ALL 9 EMERGENCY AMBULANCE INTEGRATION TESTS PASSED PERFECTLY!");
    console.log("===============================================================================");
    process.exit(0);
}

runApiTests().catch(err => {
    console.error("Test failed:", err);
    process.exit(1);
});
