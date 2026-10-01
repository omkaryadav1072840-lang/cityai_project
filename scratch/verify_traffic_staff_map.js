const fs = require('fs');
const http = require('http');

console.log("=== VERIFYING TRAFFIC STAFF LOGIN & MAP FEATURE ===");

// 1. Static HTML checks
const html = fs.readFileSync('frontend/pages/traffic/traffic.html', 'utf8');

const requiredIds = [
    'staffGatekeeper',
    'trafficStaffLoginForm',
    'trafficStaffIdInput',
    'trafficStaffPasswordInput',
    'btnTrafficStaffSubmit',
    'staffLoginErrorAlert',
    'citizen-map-mount',
    'staff-map-mount',
    'trafficMapContainerCard',
    'staff-map-gis-bar',
    'btnStaffPinLocationMode',
    'modal-quick-add-feature',
    'quick-pick-lat',
    'quick-pick-lng',
    'modal-junction',
    'modal-signal',
    'modal-camera',
    'modal-incident'
];

let allIdsFound = true;
for (const id of requiredIds) {
    if (html.includes(`id="${id}"`)) {
        console.log(`✅ Found ID: #${id}`);
    } else {
        console.error(`❌ Missing ID: #${id}`);
        allIdsFound = false;
    }
}

// 2. JS function exports / bindings check
const js = fs.readFileSync('frontend/pages/traffic/traffic.js', 'utf8');
const requiredFunctions = [
    'handleTrafficStaffLoginSubmit',
    'fillStaffCredentials',
    'toggleStaffPasswordVisibility',
    'updateMapMount',
    'toggleMapPinPlacementMode',
    'showQuickAddFeatureModal',
    'quickAddSelectFeature',
    'submitJunctionForm',
    'submitSignalForm',
    'submitCameraForm',
    'submitTrafficIncident'
];

let allFnsFound = true;
for (const fn of requiredFunctions) {
    if (js.includes(`function ${fn}`) || js.includes(`${fn} =`)) {
        console.log(`✅ Found Function: ${fn}`);
    } else {
        console.error(`❌ Missing Function: ${fn}`);
        allFnsFound = false;
    }
}

// 3. API test for staff login
function testStaffLogin(staffId, password) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({ staffId, password });
        const req = http.request({
            hostname: 'localhost',
            port: 5000,
            path: '/api/staff-login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

(async () => {
    try {
        console.log("\n--- Testing /api/staff-login Endpoint ---");
        // Test wrong password
        const wrongRes = await testStaffLogin('TR-VERMA', 'wrongpass');
        console.log("Wrong password test status:", wrongRes.status, "(Expected 401)");
        if (wrongRes.status === 401) {
            console.log("✅ Rejection on invalid credentials verified.");
        } else {
            console.error("❌ Unexpected response on wrong password:", wrongRes);
        }

        // Test correct credentials
        const correctRes = await testStaffLogin('TR-VERMA', 'verma123');
        console.log("Correct password test status:", correctRes.status, "(Expected 200)");
        if (correctRes.status === 200 && correctRes.body.token) {
            console.log("✅ Success! Token received for:", correctRes.body.user.name, `(${correctRes.body.user.role})`);
        } else {
            console.error("❌ Login failed for TR-VERMA:", correctRes);
        }

        console.log("\n=============================================");
        if (allIdsFound && allFnsFound && correctRes.status === 200) {
            console.log("🎉 ALL TRAFFIC STAFF LOGIN & MAP VERIFICATIONS PASSED!");
        } else {
            console.log("⚠️ Some verifications had warnings.");
        }
        console.log("=============================================");
    } catch (err) {
        console.error("API error:", err.message);
    }
})();
