const http = require('http');

const endpoints = [
    '/api/health',
    '/api/traffic/junctions',
    '/api/traffic/signals',
    '/api/traffic/cameras',
    '/api/traffic/incidents',
    '/api/waste/bins',
    '/api/waste/facilities',
    '/api/water/tanks',
    '/api/water/operations/summary',
    '/api/emergency/departments',
    '/api/emergency/incidents',
    '/api/parking',
    '/api/hospitals',
    '/api/police/stations',
    '/api/famous-places'
];

async function checkEndpoint(path) {
    return new Promise((resolve) => {
        const req = http.get(`http://localhost:5000${path}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let success = res.statusCode >= 200 && res.statusCode < 400;
                resolve({ path, status: res.statusCode, ok: success, length: data.length });
            });
        });
        req.on('error', (err) => {
            resolve({ path, status: 'ERROR', ok: false, error: err.message });
        });
        req.setTimeout(3000, () => {
            req.destroy();
            resolve({ path, status: 'TIMEOUT', ok: false });
        });
    });
}

async function run() {
    console.log("Testing all 8 department core endpoints...");
    let allPassed = true;
    for (const ep of endpoints) {
        const res = await checkEndpoint(ep);
        console.log(`[${res.ok ? 'SUCCESS' : 'FAIL'}] ${res.path} -> Status: ${res.status}`);
        if (!res.ok) allPassed = false;
    }
    console.log(allPassed ? "🎉 ALL 8 DEPARTMENTS ENDPOINTS RESPONDING HEALTHY!" : "⚠️ Some endpoints failed!");
}

run();
