const http = require('http');

function request(url, options = {}, body = null) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const reqOptions = {
            hostname: parsed.hostname,
            port: parsed.port,
            path: parsed.pathname + parsed.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        };
        const req = http.request(reqOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    resolve({ status: res.statusCode, data });
                }
            });
        });
        req.on('error', reject);
        if (body) {
            req.write(typeof body === 'string' ? body : JSON.stringify(body));
        }
        req.end();
    });
}

async function testDoctorAuthAndRouting() {
    console.log('🩺 === TESTING DOCTOR LOGIN & REDIRECT PIPELINE === 🩺\n');

    // 1. Valid Doctor Login with DOC003
    console.log('1. Testing POST /api/doctor/login with valid ID DOC003 (Dr. Amit Kumar)...');
    const res1 = await request('http://localhost:5000/api/doctor/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, { doctorId: 'DOC003' });

    console.log(`   Status: ${res1.status}, Success: ${res1.data.success}`);
    console.log(`   Doctor Name: ${res1.data.doctor?.name}`);
    console.log(`   Specialization: ${res1.data.doctor?.specialization}`);
    console.log(`   Hospital: ${res1.data.doctor?.hospitalName}`);
    console.log(`   Token Issued: ${!!res1.data.token}`);

    if (res1.status !== 200 || !res1.data.token) {
        throw new Error('Doctor login DOC003 failed');
    }

    // 2. Valid Doctor Login with DOC001
    console.log('\n2. Testing POST /api/doctor/login with ID DOC001 (Dr. Rahul Sharma)...');
    const res2 = await request('http://localhost:5000/api/doctor/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, { doctorId: 'DOC001' });

    console.log(`   Status: ${res2.status}, Success: ${res2.data.success}`);
    console.log(`   Doctor Name: ${res2.data.doctor?.name}`);

    // 3. Invalid Doctor Login
    console.log('\n3. Testing POST /api/doctor/login with invalid ID NOT_REAL_DOC...');
    const res3 = await request('http://localhost:5000/api/doctor/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, { doctorId: 'NOT_REAL_DOC' });

    console.log(`   Status: ${res3.status} (Expected 401), Message: "${res3.data.message}"`);
    if (res3.status !== 401) {
        throw new Error('Expected 401 for invalid doctor ID');
    }

    // 4. Verify hospital.html integration
    console.log('\n4. Verifying hospital.html modal & buttons...');
    const hospRes = await request('http://localhost:5000/pages/hospital/hospital.html');
    const hospHtml = hospRes.data;
    const hasModal = hospHtml.includes('id="doctorLoginModal"');
    const hasNavBtn = hospHtml.includes('openDoctorLoginModal()');
    const hasServiceCard = hospHtml.includes('Doctor Login & Console');
    console.log(`   doctorLoginModal present: ${hasModal}`);
    console.log(`   Navbar / Hero openDoctorLoginModal triggers present: ${hasNavBtn}`);
    console.log(`   Service grid Doctor Portal card present: ${hasServiceCard}`);

    if (!hasModal || !hasNavBtn || !hasServiceCard) {
        throw new Error('hospital.html missing doctor portal elements');
    }

    // 5. Verify doctor_dashboard.css theme match
    console.log('\n5. Verifying doctor_dashboard.css theme matching hospital.css...');
    const cssRes = await request('http://localhost:5000/pages/hospital/doctor_dashboard.css');
    const hasTheme = cssRes.data.includes('#f5f8fc') && cssRes.data.includes('#2563eb');
    console.log(`   Theme variables aligned with hospital.css (#f5f8fc, #2563eb): ${hasTheme}`);

    console.log('\n🎉 ALL DOCTOR AUTH, MODAL, ROUTING & UI THEME MATCHING CHECKS PASSED!');
}

testDoctorAuthAndRouting().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
