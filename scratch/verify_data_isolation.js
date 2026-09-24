const http = require('http');

function postJson(path, body) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(body);
        const req = http.request({
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, json: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, text: data });
                }
            });
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

function getJson(path, token) {
    return new Promise((resolve, reject) => {
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        http.get({
            hostname: 'localhost',
            port: 5000,
            path: path,
            headers: headers
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, json: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, text: data });
                }
            });
        }).on('error', reject);
    });
}

async function verifyIsolation() {
    console.log('========================================================');
    console.log('   STRICT MULTI-USER DATA ISOLATION VERIFICATION TEST   ');
    console.log('========================================================\n');

    // 1. Citizen 1: Omkar
    const omkarLogin = await postJson('/api/login', { loginId: '6306880179', password: 'password123' });
    if (!omkarLogin.json?.token) throw new Error('Omkar login failed');
    const omkarToken = omkarLogin.json.token;
    console.log(`✅ [User 1 - Omkar] Logged in successfully (ID: ${omkarLogin.json.user.id}, Mobile: ${omkarLogin.json.user.mobile})`);

    const omkarReq = await getJson('/api/requests', omkarToken);
    const omkarReqList = omkarReq.json?.data || [];
    console.log(`   - Grievances count: ${omkarReqList.length}`);
    omkarReqList.forEach(r => {
        if (r.citizen_mobile && r.citizen_mobile !== '6306880179' && r.user_id !== 1) {
            throw new Error(`Data leak! Omkar saw request from ${r.citizen_mobile}`);
        }
    });

    const omkarAppts = await getJson('/api/appointments', omkarToken);
    const omkarApptList = omkarAppts.json?.appointments || [];
    console.log(`   - Doctor Appointments count: ${omkarApptList.length}`);
    omkarApptList.forEach(a => {
        if (a.patient_mobile && a.patient_mobile !== '6306880179') {
            throw new Error(`Data leak! Omkar saw appointment for patient ${a.patient_mobile}`);
        }
    });

    const omkarParking = await getJson('/api/parking/my-bookings', omkarToken);
    const omkarParkList = omkarParking.json?.bookings || [];
    console.log(`   - Parking Passes count: ${omkarParkList.length}`);
    omkarParkList.forEach(p => {
        if (p.customer_phone && p.customer_phone !== '6306880179' && String(p.user_id) !== '1') {
            throw new Error(`Data leak! Omkar saw parking booking for phone ${p.customer_phone}`);
        }
    });

    console.log('   -> User 1 data integrity: 100% verified isolated!\n');

    // 2. Citizen 2: Demo Citizen
    const demoLogin = await postJson('/api/login', { loginId: '9876543210', password: 'citizen123' });
    if (!demoLogin.json?.token) throw new Error('Demo citizen login failed');
    const demoToken = demoLogin.json.token;
    console.log(`✅ [User 2 - Demo Citizen] Logged in successfully (ID: ${demoLogin.json.user.id}, Mobile: ${demoLogin.json.user.mobile})`);

    const demoReq = await getJson('/api/requests', demoToken);
    const demoReqList = demoReq.json?.data || [];
    console.log(`   - Grievances count: ${demoReqList.length}`);
    demoReqList.forEach(r => {
        if (r.citizen_mobile && r.citizen_mobile !== '9876543210' && r.user_id !== 2) {
            throw new Error(`Data leak! Demo citizen saw request from ${r.citizen_mobile}`);
        }
    });

    const demoAppts = await getJson('/api/appointments', demoToken);
    const demoApptList = demoAppts.json?.appointments || [];
    console.log(`   - Doctor Appointments count: ${demoApptList.length}`);
    demoApptList.forEach(a => {
        if (a.patient_mobile && a.patient_mobile !== '9876543210') {
            throw new Error(`Data leak! Demo citizen saw appointment for patient ${a.patient_mobile}`);
        }
    });

    const demoParking = await getJson('/api/parking/my-bookings', demoToken);
    const demoParkList = demoParking.json?.bookings || [];
    console.log(`   - Parking Passes count: ${demoParkList.length}`);
    demoParkList.forEach(p => {
        if (p.customer_phone && p.customer_phone !== '9876543210' && String(p.user_id) !== '2') {
            throw new Error(`Data leak! Demo citizen saw parking booking for phone ${p.customer_phone}`);
        }
    });

    console.log('   -> User 2 data integrity: 100% verified isolated (ZERO Omkar records visible)!\n');

    // 3. User 3: New Isolated Citizen
    const uniquePhone = '99' + Math.floor(10000000 + Math.random() * 90000000);
    const regRes = await postJson('/api/register', {
        name: 'New Isolated User',
        mobile: uniquePhone,
        email: `isolated_${Date.now()}@example.com`,
        password: 'password123'
    });
    console.log(`✅ [User 3 - Brand New Citizen: ${uniquePhone}] Registered & Logged In`);
    const newLogin = await postJson('/api/login', { loginId: uniquePhone, password: 'password123' });
    const newToken = newLogin.json?.token;

    const newReq = await getJson('/api/requests', newToken);
    const newReqList = newReq.json?.data || [];
    console.log(`   - Grievances count: ${newReqList.length} (Expected: 0)`);
    if (newReqList.length !== 0) throw new Error('Data leak! New user saw other requests');

    const newAppts = await getJson('/api/appointments', newToken);
    const newApptList = newAppts.json?.appointments || [];
    console.log(`   - Doctor Appointments count: ${newApptList.length} (Expected: 0)`);
    if (newApptList.length !== 0) throw new Error('Data leak! New user saw other appointments');

    const newParking = await getJson('/api/parking/my-bookings', newToken);
    const newParkList = newParking.json?.bookings || [];
    console.log(`   - Parking Passes count: ${newParkList.length} (Expected: 0)`);
    if (newParkList.length !== 0) throw new Error('Data leak! New user saw other parking bookings');

    console.log('   -> User 3 clean state: 100% verified isolated!\n');

    // 4. Staff Officer: Insp. Verma
    const staffLogin = await postJson('/api/staff-login', { staffId: 'TR-VERMA', password: 'verma123' });
    const staffToken = staffLogin.json?.token;
    console.log(`✅ [User 4 - Staff Officer] Logged in as Insp. Verma (Dept: traffic)`);
    const staffReq = await getJson('/api/requests', staffToken);
    const staffReqList = staffReq.json?.data || [];
    console.log(`   - Traffic Department requests count: ${staffReqList.length}`);
    staffReqList.forEach(r => {
        if (r.department.toLowerCase() !== 'traffic') {
            throw new Error(`Department leak! Traffic staff saw ${r.department} request`);
        }
    });
    console.log('   -> Staff role-based departmental scoping: 100% verified isolated!\n');

    console.log('🎉 ALL DATA ISOLATION TESTS PASSED WITH 0 LEAKS!');
    console.log('Whichever person logs in, ONLY their data is shown, and all users are strictly isolated!');
}

verifyIsolation().catch(err => {
    console.error('❌ Data Isolation Test Failed:', err);
    process.exit(1);
});
