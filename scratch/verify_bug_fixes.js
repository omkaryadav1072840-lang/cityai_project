const http = require('http');

const BASE_URL = 'http://localhost:5000';

function makeRequest(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const reqHeaders = { ...headers };
        let payload = null;
        if (body) {
            payload = JSON.stringify(body);
            reqHeaders['Content-Type'] = 'application/json';
            reqHeaders['Content-Length'] = Buffer.byteLength(payload);
        }

        const req = http.request(url, {
            method,
            headers: reqHeaders,
            timeout: 5000
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let parsed = null;
                try {
                    parsed = JSON.parse(data);
                } catch {
                    parsed = data;
                }
                resolve({ status: res.statusCode, headers: res.headers, data: parsed });
            });
        });

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        if (payload) req.write(payload);
        req.end();
    });
}

async function runVerification() {
    console.log('====================================================');
    console.log(' 🧪 SMARTCITY BUG FIX VERIFICATION SUITE');
    console.log('====================================================\n');

    let passed = 0;
    let failed = 0;

    function assert(name, condition, extra = '') {
        if (condition) {
            console.log(`  ✅ PASS: ${name} ${extra}`);
            passed++;
        } else {
            console.error(`  ❌ FAIL: ${name} ${extra}`);
            failed++;
        }
    }

    try {
        // 1. Check Server Health
        console.log('1. Checking Server Health...');
        const healthRes = await makeRequest('GET', '/health');
        assert('Server /health returns 200 OK', healthRes.status === 200);

        // 2. Staff Login Verification (TR-VERMA, TR-PANDEY, TR-ADMIN)
        console.log('\n2. Testing Staff Login Authentication...');
        const invalidLogin = await makeRequest('POST', '/api/staff-login', {
            staffId: 'TR-VERMA',
            password: 'wrong_password_999'
        });
        assert('Invalid password rejects with 401', invalidLogin.status === 401);

        const vermaLogin = await makeRequest('POST', '/api/staff-login', {
            staffId: 'TR-VERMA',
            password: 'verma123'
        });
        assert('TR-VERMA login succeeds (200)', vermaLogin.status === 200);
        assert('TR-VERMA returns genuine JWT token', !!vermaLogin.data.token);
        assert('TR-VERMA department is traffic', vermaLogin.data.user && vermaLogin.data.user.department === 'traffic');
        const vermaToken = vermaLogin.data.token;

        const pandeyLogin = await makeRequest('POST', '/api/staff-login', {
            staffId: 'TR-PANDEY',
            password: 'pandey123'
        });
        assert('TR-PANDEY login succeeds (200)', pandeyLogin.status === 200);
        assert('TR-PANDEY returns genuine JWT token', !!pandeyLogin.data.token);

        const adminLogin = await makeRequest('POST', '/api/staff-login', {
            staffId: 'TR-ADMIN',
            password: 'admin123'
        });
        assert('TR-ADMIN login succeeds (200)', adminLogin.status === 200);
        assert('TR-ADMIN returns genuine JWT token', !!adminLogin.data.token);
        assert('TR-ADMIN role is admin', adminLogin.data.user && adminLogin.data.user.role === 'admin');

        // 3. Test Ambulance Section API
        console.log('\n3. Testing Ambulance Section Endpoints...');
        const ambRes = await makeRequest('GET', '/api/ambulances');
        assert('GET /api/ambulances returns 200', ambRes.status === 200);
        assert('Ambulances list is populated array', Array.isArray(ambRes.data.ambulances) && ambRes.data.ambulances.length > 0);

        const liveAmbs = await makeRequest('GET', '/api/traffic/ambulances/live');
        assert('GET /api/traffic/ambulances/live returns 200', liveAmbs.status === 200);
        const testAmb = (liveAmbs.data.ambulances && liveAmbs.data.ambulances[0]) || { id: 'AMB-001', vehicle_number: 'UP-53-AMB-101' };

        // 4. Test Ambulance Critical Corridor Protection
        console.log('\n4. Testing Ambulance Critical Corridor Security & Authorization...');
        
        // A. Attempt dispatch WITHOUT token (should be rejected with 401)
        const unauthDispatch = await makeRequest('POST', `/api/traffic/ambulances/${testAmb.id}/critical-dispatch`, {
            destinationHospital: 'BRD Medical College',
            reason: 'Acute Trauma'
        });
        assert('Ambulance critical dispatch WITHOUT token returns 401 Unauthorized', unauthDispatch.status === 401);

        // B. Attempt dispatch WITH staff token (should succeed with 200)
        const authDispatch = await makeRequest('POST', `/api/traffic/ambulances/${testAmb.id}/critical-dispatch`, {
            destinationHospital: 'BRD Medical College',
            reason: 'Acute Trauma'
        }, {
            'Authorization': `Bearer ${vermaToken}`
        });
        assert('Ambulance critical dispatch WITH staff Bearer token returns 200 OK', authDispatch.status === 200);
        assert('Response confirms green wave corridor active', authDispatch.data.success === true);

        // C. Attempt clear WITHOUT token (should be rejected with 401)
        const unauthClear = await makeRequest('POST', `/api/traffic/ambulances/${testAmb.id}/clear-critical`);
        assert('Ambulance clear critical WITHOUT token returns 401 Unauthorized', unauthClear.status === 401);

        // D. Attempt clear WITH staff token (should succeed with 200)
        const authClear = await makeRequest('POST', `/api/traffic/ambulances/${testAmb.id}/clear-critical`, {}, {
            'Authorization': `Bearer ${vermaToken}`
        });
        assert('Ambulance clear critical WITH staff Bearer token returns 200 OK', authClear.status === 200);
        assert('Response confirms normal signal operations restored', authClear.data.success === true);

        // 5. Test Traffic Mutations Authorization
        console.log('\n5. Testing Traffic Mutation Authorization...');
        const unauthOverride = await makeRequest('POST', '/api/traffic/junctions/JNC-01/override', {
            action: 'FORCE_GREEN',
            approach: 'North'
        });
        assert('Junction manual override WITHOUT token returns 401 Unauthorized', unauthOverride.status === 401);

        const authOverride = await makeRequest('POST', '/api/traffic/junctions/JNC-01/override', {
            action: 'FORCE_GREEN',
            approach: 'North'
        }, {
            'Authorization': `Bearer ${vermaToken}`
        });
        assert('Junction manual override WITH staff Bearer token returns 200 OK', authOverride.status === 200);

        // Reset junction to normal
        await makeRequest('POST', '/api/traffic/junctions/JNC-01/override', {
            action: 'AUTO',
            approach: 'North'
        }, {
            'Authorization': `Bearer ${vermaToken}`
        });

        console.log('\n====================================================');
        console.log(` 🏁 RESULTS: ${passed} PASSED, ${failed} FAILED`);
        console.log('====================================================');

        process.exit(failed > 0 ? 1 : 0);
    } catch (err) {
        console.error('❌ Verification suite crashed:', err);
        process.exit(1);
    }
}

runVerification();
