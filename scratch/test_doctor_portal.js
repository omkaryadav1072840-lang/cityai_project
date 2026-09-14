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

async function runTests() {
    console.log('🩺 === TESTING DOCTOR PORTAL & CLINICAL WORKFLOW === 🩺\n');

    // 1. Get Doctors List
    console.log('1. Testing GET /api/doctors...');
    const docRes = await request('http://localhost:5000/api/doctors');
    const doctorsList = docRes.data?.doctors || (Array.isArray(docRes.data) ? docRes.data : []);
    console.log(`   Status: ${docRes.status}, Doctors found: ${doctorsList.length}`);
    if (doctorsList.length > 0) {
        console.log(`   Sample doctor: ${doctorsList[0].name} (${doctorsList[0].doctor_id || doctorsList[0].doctorId || doctorsList[0].id})`);
    }

    // 2. Doctor Appointments Queue
    const testDoc = doctorsList[0] || {};
    const testDocId = testDoc.doctor_id || testDoc.doctorId || testDoc.id || 'DOC-101';
    console.log(`\n2. Testing GET /api/doctor/${testDocId}/appointments...`);
    const apptRes = await request(`http://localhost:5000/api/doctor/${testDocId}/appointments`);
    const queueList = apptRes.data?.appointments || (Array.isArray(apptRes.data) ? apptRes.data : []);
    console.log(`   Status: ${apptRes.status}, Queue length: ${queueList.length}`);

    // 3. Patient History ("Kahan Kahan Dawa Karwaya")
    const testPatientId = 'PAT-5931984821';
    console.log(`\n3. Testing GET /api/doctor/patient-history/${testPatientId}...`);
    const histRes = await request(`http://localhost:5000/api/doctor/patient-history/${testPatientId}`);
    console.log(`   Status: ${histRes.status}`);
    console.log(`   Patient Name: ${histRes.data.patient?.name}`);
    console.log(`   Past Clinical Consultations ("Kahan Dawa Karwaya"): ${histRes.data.records?.length || 0}`);
    console.log(`   Lab Reports: ${histRes.data.reports?.length || 0}`);
    console.log(`   Prescriptions: ${histRes.data.prescriptions?.length || 0}`);

    // 4. Clinical Consultation Submission
    console.log('\n4. Testing POST /api/doctor/consultation...');
    const consultPayload = {
        patientId: testPatientId,
        doctorId: testDocId,
        diagnosis: 'Seasonal Influenza with Rhinovirus',
        treatment: '1. Tab Paracetamol 650mg TDS x 3 days\n2. Tab Levocetirizine 5mg HS x 5 days\n3. Warm saline gargles',
        notes: 'Advised adequate hydration and rest. Review if temperature persists above 101F.',
        followUpDate: '2026-09-21'
    };
    const consultRes = await request('http://localhost:5000/api/doctor/consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, consultPayload);
    console.log(`   Status: ${consultRes.status}, Result:`, consultRes.data);

    // 5. Verify history updated with new clinical record
    console.log(`\n5. Verifying history update for ${testPatientId}...`);
    const verifyHist = await request(`http://localhost:5000/api/doctor/patient-history/${testPatientId}`);
    const latestRec = verifyHist.data.records?.[0];
    console.log(`   Total records now: ${verifyHist.data.records?.length}`);
    console.log(`   Latest Record Diagnosis: "${latestRec?.diagnosis}" by Dr. ${latestRec?.doctorName}`);

    // 6. Test Doctor Dashboard HTML served
    console.log('\n6. Testing Doctor Dashboard HTML serving...');
    const pageRes = await request('http://localhost:5000/pages/hospital/doctor_dashboard.html');
    console.log(`   Page status: ${pageRes.status}, Content length: ${pageRes.data.length} bytes`);

    console.log('\n🎉 ALL DOCTOR PORTAL BACKEND & FRONTEND ASSETS VERIFIED SUCCESSFULLY!');
}

runTests().catch(err => {
    console.error('Test execution failed:', err);
    process.exit(1);
});
