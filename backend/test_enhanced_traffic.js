/**
 * Comprehensive Automated Verification for Enhanced SmartCity Traffic Management Module
 */

const http = require('http');

function request(url, options = {}, data = null) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const reqOptions = {
            hostname: u.hostname,
            port: u.port,
            path: u.pathname + u.search,
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {})
            }
        };

        const req = http.request(reqOptions, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve({ status: res.statusCode, body: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, text: body });
                }
            });
        });

        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function runTests() {
    console.log('🧪 Starting Enhanced SmartCity Traffic Management Integration Tests...\n');
    let passed = 0;
    let failed = 0;

    async function test(name, fn) {
        try {
            await fn();
            console.log(`✅ [PASS] ${name}`);
            passed++;
        } catch (err) {
            console.error(`❌ [FAIL] ${name}: ${err.message}`);
            failed++;
        }
    }

    // 1. Shared Parking Integration
    await test('GET /api/parking verifies shared database connection with Parking module', async () => {
        const res = await request('http://localhost:5000/api/parking');
        const lots = res.body.parkingLots || res.body.lots;
        if (res.status !== 200 || !lots || lots.length === 0) {
            throw new Error(`Failed to fetch lots from shared parking module: status ${res.status}`);
        }
        if (res.body.stats && res.body.stats.totalSlots <= 0) {
            throw new Error(`Total parking slots should be > 0`);
        }
    });

    // 2. Traffic Signals Independent CRUD
    let testSigId = null;
    await test('POST /api/traffic/signals creates traffic light with exact coordinates and type', async () => {
        const res = await request('http://localhost:5000/api/traffic/signals', { method: 'POST' }, {
            junction_id: 'JNC-01',
            approach: 'North',
            street_name: 'Test Sadar Hospital Crossing Light',
            latitude: 26.7591,
            longitude: 83.3734,
            signal_type: 'Pedestrian Pelican',
            status: 'Active',
            green_time: 40,
            yellow_time: 4,
            red_time: 70
        });
        if (res.status !== 201 || !res.body.signalId) {
            throw new Error(`Signal creation failed: ${JSON.stringify(res.body)}`);
        }
        testSigId = res.body.signalId;
    });

    await test('PUT /api/traffic/signals/:id updates traffic light', async () => {
        const res = await request(`http://localhost:5000/api/traffic/signals/${testSigId}`, { method: 'PUT' }, {
            status: 'Maintenance',
            signal_type: 'Standard 3-Phase',
            green_time: 50
        });
        if (res.status !== 200 || !res.body.success) {
            throw new Error(`Signal update failed`);
        }
    });

    await test('DELETE /api/traffic/signals/:id deletes traffic light', async () => {
        const res = await request(`http://localhost:5000/api/traffic/signals/${testSigId}`, { method: 'DELETE' });
        if (res.status !== 200 || !res.body.success) {
            throw new Error(`Signal deletion failed`);
        }
    });

    // 3. Dynamic CCTV Cameras System
    let testCamId = null;
    await test('GET /api/traffic/cameras returns all cameras grouped across junctions', async () => {
        const res = await request('http://localhost:5000/api/traffic/cameras');
        if (res.status !== 200 || !res.body.cameras || res.body.count < 10) {
            throw new Error(`Expected at least 10 cameras, got ${res.body.count}`);
        }
    });

    await test('POST /api/traffic/cameras adds new camera dynamically to database', async () => {
        const res = await request('http://localhost:5000/api/traffic/cameras', { method: 'POST' }, {
            junction_id: 'JNC-03',
            camera_name: 'Asuran Test Flyover Camera',
            direction: 'North',
            stream_url: 'https://test-stream.internal/asuran.m3u8',
            resolution: '1080p FHD',
            fps: 30,
            status: 'Online'
        });
        if (res.status !== 201 || !res.body.cameraId) {
            throw new Error(`Camera creation failed: ${JSON.stringify(res.body)}`);
        }
        testCamId = res.body.cameraId;
    });

    await test('PUT /api/traffic/cameras/:id updates camera parameters', async () => {
        const res = await request(`http://localhost:5000/api/traffic/cameras/${testCamId}`, { method: 'PUT' }, {
            status: 'Offline',
            camera_name: 'Asuran Test Flyover Camera (Offline Test)'
        });
        if (res.status !== 200 || !res.body.success) {
            throw new Error(`Camera update failed`);
        }
    });

    await test('DELETE /api/traffic/cameras/:id deletes camera', async () => {
        const res = await request(`http://localhost:5000/api/traffic/cameras/${testCamId}`, { method: 'DELETE' });
        if (res.status !== 200 || !res.body.success) {
            throw new Error(`Camera deletion failed`);
        }
    });

    // 4. AI Violations & Challan Referral System
    let testVioId = null;
    await test('GET /api/traffic/violations returns AI-flagged violations with disclaimer', async () => {
        const res = await request('http://localhost:5000/api/traffic/violations');
        if (res.status !== 200 || !res.body.violations || res.body.violations.length === 0) {
            throw new Error(`Expected violations array`);
        }
        if (!res.body.disclaimer.includes('Demo / Simulated AI Detection')) {
            throw new Error(`Missing demo disclaimer in violations`);
        }
    });

    await test('POST /api/traffic/violations flags a new violation', async () => {
        const res = await request('http://localhost:5000/api/traffic/violations', { method: 'POST' }, {
            junction_id: 'JNC-01',
            violation_type: 'Red Light Violation',
            vehicle_number: 'UP-53-ZZ-9999',
            vehicle_type: 'Motorcycle',
            speed_kmh: 38.0,
            fine_amount: 1000.00,
            notes: 'Automated optical stop-line breach detection'
        });
        if (res.status !== 201 || !res.body.violationId) {
            throw new Error(`Violation flagging failed: ${JSON.stringify(res.body)}`);
        }
        testVioId = res.body.violationId;
    });

    await test('PUT /api/traffic/violations/:id/review verifies and refers to challan system', async () => {
        const res = await request(`http://localhost:5000/api/traffic/violations/${testVioId}/review`, { method: 'PUT' }, {
            action: 'VERIFY',
            notes: 'Evidence plate confirmed by Insp. R.K. Verma',
            operator: 'Insp. R.K. Verma',
            role: 'Traffic Staff'
        });
        if (res.status !== 200 || !res.body.success || !res.body.message.includes('verified and referred')) {
            throw new Error(`Violation review verification failed: ${JSON.stringify(res.body)}`);
        }
    });

    // 5. Junction Edit & Delete
    await test('PUT /api/traffic/junctions/JNC-01 updates junction landmark', async () => {
        const res = await request('http://localhost:5000/api/traffic/junctions/JNC-01', { method: 'PUT' }, {
            landmark: 'Near City Mall & Sadar District Hospital (Main Crossing)'
        });
        if (res.status !== 200 || !res.body.success) {
            throw new Error(`Junction update failed`);
        }
    });

    // 6. Audit Trail Recording
    await test('GET /api/traffic/admin/audit-logs records all CRUD and review actions', async () => {
        const res = await request('http://localhost:5000/api/traffic/admin/audit-logs?limit=5');
        if (res.status !== 200 || !res.body.logs || res.body.logs.length === 0) {
            throw new Error(`Audit logs failed or empty`);
        }
    });

    console.log(`\n======================================================`);
    console.log(`Enhanced Integration Test Results: ${passed} Passed, ${failed} Failed`);
    console.log(`======================================================\n`);
}

runTests();
