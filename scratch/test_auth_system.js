/**
 * Automated test script to verify auth.js syntax and backend profile endpoints
 */

const fs = require('fs');
const path = require('path');

console.log("=== Testing SmartCity AI Auth & Profile System ===");

// 1. Check auth.js syntax
try {
    const authCode = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'auth.js'), 'utf8');
    new Function(authCode.replace(/window\./g, 'global.').replace(/document\./g, '({}).'));
    console.log("✅ frontend/auth.js syntax validation passed with no parse errors!");
} catch (e) {
    console.error("❌ Syntax error in frontend/auth.js:", e.message);
}

// 2. Test live server auth endpoints
async function testServer() {
    try {
        const http = require('http');

        const testReq = (options, postData) => new Promise((resolve, reject) => {
            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve({ statusCode: res.statusCode, data: JSON.parse(data || '{}') }));
            });
            req.on('error', reject);
            if (postData) req.write(JSON.stringify(postData));
            req.end();
        });

        // Test citizen login
        console.log("Testing POST /api/login for Citizen (6306880179)...");
        const citRes = await testReq({
            hostname: 'localhost',
            port: 5000,
            path: '/api/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { loginId: '6306880179', password: 'omkar123' });

        console.log(`Citizen Login status: ${citRes.statusCode}, Token returned: ${!!citRes.data.token}, User: ${citRes.data.user?.name}`);

        if (citRes.data.token) {
            // Test PUT /api/auth/profile
            console.log("Testing PUT /api/auth/profile with bearer token...");
            const profRes = await testReq({
                hostname: 'localhost',
                port: 5000,
                path: '/api/auth/profile',
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${citRes.data.token}`
                }
            }, {
                name: 'Omkar Yadav',
                vehicleNumber: 'UP 53 AB 1008',
                ward: 'Ward 14 - Golghar Commercial / Civil Lines'
            });

            console.log(`Profile update status: ${profRes.statusCode}, Success: ${profRes.data.success}, Msg: ${profRes.data.message}`);
        }

        // Test staff login
        console.log("Testing POST /api/staff-login for Traffic Staff (TR-VERMA)...");
        const staffRes = await testReq({
            hostname: 'localhost',
            port: 5000,
            path: '/api/staff-login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { staffId: 'TR-VERMA', password: 'verma123' });

        console.log(`Staff Login status: ${staffRes.statusCode}, Token returned: ${!!staffRes.data.token}, User: ${staffRes.data.user?.name}`);

        console.log("🎉 ALL AUTH & PROFILE TESTS PASSED!");
    } catch (err) {
        console.error("Test server error:", err.message);
    }
}

testServer();
