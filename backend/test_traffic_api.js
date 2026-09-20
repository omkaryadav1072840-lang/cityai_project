/**
 * Automated Verification Script for SmartCity AI Traffic Platform
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
    console.log('🧪 Running SmartCity Traffic Platform Integration Tests...\n');
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

    // 1. Junctions API
    await test('GET /api/traffic/junctions returns 8 Gorakhpur junctions', async () => {
        const res = await request('http://localhost:5000/api/traffic/junctions');
        if (res.status !== 200 || !res.body.success || res.body.total < 8) {
            throw new Error(`Expected status 200 & 8+ junctions, got ${res.status}`);
        }
    });

    // 2. Junction Details & Signals
    await test('GET /api/traffic/junctions/JNC-01 returns signals and cameras', async () => {
        const res = await request('http://localhost:5000/api/traffic/junctions/JNC-01');
        if (res.status !== 200 || !res.body.junction || res.body.junction.signals.length !== 4) {
            throw new Error(`Expected 4 approach signals, got ${res.body?.junction?.signals?.length}`);
        }
    });

    // 3. Camera Telemetry
    await test('GET /api/traffic/cameras/CAM-01-N/telemetry returns AI detections & speed', async () => {
        const res = await request('http://localhost:5000/api/traffic/cameras/CAM-01-N/telemetry');
        if (res.status !== 200 || !res.body.telemetry.activeDetections) {
            throw new Error(`Telemetry missing active detections`);
        }
        if (!res.body.telemetry.streamType.includes('SIMULATED DEMO STREAM')) {
            throw new Error(`Missing simulation disclosure tag in streamType`);
        }
    });

    // 4. Signal Timing Update
    await test('PUT /api/traffic/junctions/JNC-01/signals updates green timing', async () => {
        const res = await request('http://localhost:5000/api/traffic/junctions/JNC-01/signals', { method: 'PUT' }, {
            cycle_time: 125,
            signals: [{ id: 'SIG-JNC-01-NORTH', green_time: 48, yellow_time: 4, red_time: 73, pedestrian_walk: 1 }]
        });
        if (res.status !== 200 || !res.body.success) {
            throw new Error(`Failed to update signal timing: ${JSON.stringify(res.body)}`);
        }
    });

    // 5. Manual Override
    await test('POST /api/traffic/junctions/JNC-01/override applies Force Green and Restores Auto', async () => {
        const forceRes = await request('http://localhost:5000/api/traffic/junctions/JNC-01/override', { method: 'POST' }, {
            action: 'FORCE_GREEN',
            approach: 'North',
            reason: 'Test Emergency Clearance'
        });
        if (forceRes.status !== 200 || !forceRes.body.success) {
            throw new Error(`Force green override failed`);
        }

        const restoreRes = await request('http://localhost:5000/api/traffic/junctions/JNC-01/override', { method: 'POST' }, {
            action: 'RESTORE_AUTO'
        });
        if (restoreRes.status !== 200 || !restoreRes.body.success) {
            throw new Error(`Restore auto override failed`);
        }
    });

    // 6. Alternative Routes Planner
    await test('GET /api/traffic/alternative-routes compares Direct vs Congestion Avoidance', async () => {
        const res = await request('http://localhost:5000/api/traffic/alternative-routes?from=Railway%20Station&to=AIIMS');
        if (res.status !== 200 || !res.body.routes || res.body.routes.length < 2) {
            throw new Error(`Alternative routes not returned`);
        }
    });

    // 7. Emergency Green Corridor Dispatch & Deactivation
    await test('POST /api/traffic/corridors/dispatch and deactivate', async () => {
        const dispatchRes = await request('http://localhost:5000/api/traffic/corridors/dispatch', { method: 'POST' }, {
            corridor_id: 'CORR-01',
            operator: 'Test Controller'
        });
        if (dispatchRes.status !== 200 || !dispatchRes.body.success) {
            throw new Error(`Corridor dispatch failed`);
        }

        const deactRes = await request('http://localhost:5000/api/traffic/corridors/CORR-01/deactivate', { method: 'POST' }, {
            operator: 'Test Controller'
        });
        if (deactRes.status !== 200 || !deactRes.body.success) {
            throw new Error(`Corridor deactivation failed`);
        }
    });

    // 8. Incident Reporting
    await test('POST /api/traffic/incidents creates citizen traffic incident', async () => {
        const res = await request('http://localhost:5000/api/traffic/incidents', { method: 'POST' }, {
            incident_type: 'Severe Congestion',
            location_name: 'Asuran Chowk Flyover Ramp',
            latitude: 26.7725,
            longitude: 83.3772,
            description: 'Stalled tractor causing traffic tailback',
            severity: 'High',
            reporter_name: 'Test Citizen',
            reporter_phone: '9876500000'
        });
        if (res.status !== 201 || !res.body.success) {
            throw new Error(`Incident creation failed: ${JSON.stringify(res.body)}`);
        }
    });

    // 9. AI Insights
    await test('GET /api/traffic/ai-insights returns flow optimizations', async () => {
        const res = await request('http://localhost:5000/api/traffic/ai-insights');
        if (res.status !== 200 || !res.body.success) {
            throw new Error(`AI insights failed`);
        }
    });

    // 10. Audit Logs
    await test('GET /api/traffic/admin/audit-logs records operations', async () => {
        const res = await request('http://localhost:5000/api/traffic/admin/audit-logs');
        if (res.status !== 200 || !res.body.logs || res.body.logs.length === 0) {
            throw new Error(`Audit logs empty or failed`);
        }
    });

    // 11. Analytics Summary
    await test('GET /api/traffic/analytics/summary returns city metrics', async () => {
        const res = await request('http://localhost:5000/api/traffic/analytics/summary');
        if (res.status !== 200 || !res.body.summary.cityTrafficIndex) {
            throw new Error(`Analytics summary failed`);
        }
    });

    console.log(`\n================================`);
    console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
    console.log(`================================\n`);
}

runTests();
