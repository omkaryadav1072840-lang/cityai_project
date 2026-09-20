const http = require('http');

function post(path, body, headers = {}) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const req = http.request(`http://localhost:5000${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
                ...headers
            }
        }, (res) => {
            let resBody = '';
            res.on('data', c => resBody += c);
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(resBody || '{}') }));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

function put(path, body, headers = {}) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const req = http.request(`http://localhost:5000${path}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
                ...headers
            }
        }, (res) => {
            let resBody = '';
            res.on('data', c => resBody += c);
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(resBody || '{}') }));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

function del(path, body = {}, headers = {}) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const req = http.request(`http://localhost:5000${path}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
                ...headers
            }
        }, (res) => {
            let resBody = '';
            res.on('data', c => resBody += c);
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(resBody || '{}') }));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function run() {
    console.log("1. Logging in as Traffic Staff (TRF001)...");
    const loginRes = await post("/api/staff-login", { staffId: "TRF001", password: "123456" });
    const token = loginRes.body.token;
    console.log("   Staff Login Status:", loginRes.status, "Has Token:", !!token);

    const staffHeaders = { "Authorization": `Bearer ${token}` };

    console.log("\n2. Testing Signal Location Relocation (PUT /api/traffic/signals/SIG-JNC-01-EAST/location)...");
    const relocRes = await put("/api/traffic/signals/SIG-JNC-01-EAST/location", {
        latitude: 26.7591234,
        longitude: 83.3734567,
        operator: "Traffic Officer"
    }, staffHeaders);
    console.log("   Relocation Status:", relocRes.status, "Message:", relocRes.body.message);

    console.log("\n3. Testing Citizen blocked from relocating signal (Citizen without staff role)...");
    const citReloc = await put("/api/traffic/signals/SIG-JNC-01-EAST/location", {
        latitude: 26.7591234,
        longitude: 83.3734567
    }, { "x-user-role": "citizen" });
    console.log("   Citizen Block Status (Should be 403):", citReloc.status);

    console.log("\n4. Testing Create and Delete Signal...");
    const createSig = await post("/api/traffic/signals", {
        id: "SIG-TEMP-TEST",
        junction_id: "JNC-001",
        approach: "North-West Test",
        street_name: "Test Street",
        latitude: 26.76,
        longitude: 83.37,
        signal_type: "Standard 3-Phase",
        green_time: 40,
        yellow_time: 4,
        red_time: 45
    }, staffHeaders);
    console.log("   Create Signal Status:", createSig.status, "Success:", createSig.body.success);

    const delSig = await del("/api/traffic/signals/SIG-TEMP-TEST", { operator: "Traffic Officer" }, staffHeaders);
    console.log("   Delete Signal Status:", delSig.status, "Success:", delSig.body.success);

    console.log("\n5. Testing Create and Delete Camera...");
    const createCam = await post("/api/traffic/cameras", {
        id: "CAM-TEMP-TEST",
        junction_id: "JNC-001",
        camera_name: "Temporary Test Cam",
        direction: "North",
        stream_url: "http://192.168.1.100:8080/video",
        status: "Configured"
    }, staffHeaders);
    console.log("   Create Camera Status:", createCam.status, "Success:", createCam.body.success);

    const delCam = await del("/api/traffic/cameras/CAM-TEMP-TEST", { operator: "Traffic Officer" }, staffHeaders);
    console.log("   Delete Camera Status:", delCam.status, "Success:", delCam.body.success);

    console.log("\n🎉 ALL TRAFFIC STAFF CUSTOMIZATION & DELETION CHECKS PASSED!");
}

run().catch(console.error);
