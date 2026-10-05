const http = require('http');

function post(url, data, headers = {}) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const bodyStr = JSON.stringify(data || {});
        const req = http.request({
            hostname: u.hostname,
            port: u.port,
            path: u.pathname + u.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(bodyStr),
                ...headers
            }
        }, (res) => {
            let resBody = '';
            res.on('data', chunk => resBody += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(resBody) });
                } catch {
                    resolve({ status: res.statusCode, raw: resBody });
                }
            });
        });
        req.on('error', reject);
        req.write(bodyStr);
        req.end();
    });
}

function put(url, data, headers = {}) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const bodyStr = JSON.stringify(data || {});
        const req = http.request({
            hostname: u.hostname,
            port: u.port,
            path: u.pathname + u.search,
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(bodyStr),
                ...headers
            }
        }, (res) => {
            let resBody = '';
            res.on('data', chunk => resBody += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(resBody) });
                } catch {
                    resolve({ status: res.statusCode, raw: resBody });
                }
            });
        });
        req.on('error', reject);
        req.write(bodyStr);
        req.end();
    });
}

function del(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const req = http.request({
            hostname: u.hostname,
            port: u.port,
            path: u.pathname + u.search,
            method: 'DELETE',
            headers: {
                ...headers
            }
        }, (res) => {
            let resBody = '';
            res.on('data', chunk => resBody += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(resBody) });
                } catch {
                    resolve({ status: res.statusCode, raw: resBody });
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

function get(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const req = http.request({
            hostname: u.hostname,
            port: u.port,
            path: u.pathname + u.search,
            method: 'GET',
            headers: {
                ...headers
            }
        }, (res) => {
            let resBody = '';
            res.on('data', chunk => resBody += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(resBody) });
                } catch {
                    resolve({ status: res.statusCode, raw: resBody });
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function runTests() {
    console.log('=== STARTING HOSPITAL MODULE END-TO-END VERIFICATION ===\n');
    let passCount = 0;
    let failCount = 0;

    function assert(name, condition, details = '') {
        if (condition) {
            console.log(`  [PASS] ${name} ${details}`);
            passCount++;
        } else {
            console.error(`  [FAIL] ${name} ${details}`);
            failCount++;
        }
    }

    try {
        // 1. Get tokens for Staff, Admin, and Citizen
        console.log('1. Authenticating test users...');
        const staffLogin = await post('http://localhost:5000/api/staff-login', {
            staffId: 'STAFF-MED-01',
            password: 'staff123'
        });
        const staffToken = staffLogin.data?.token;
        assert('Staff login', staffLogin.status === 200 && !!staffToken, `(Hospital: ${staffLogin.data?.user?.hospitalId})`);

        const adminLogin = await post('http://localhost:5000/api/staff-login', {
            staffId: 'STAFF-001',
            password: 'admin123'
        });
        const adminToken = adminLogin.data?.token;
        assert('Admin login', adminLogin.status === 200 && !!adminToken, `(Role: ${adminLogin.data?.user?.role})`);

        const citizenLogin = await post('http://localhost:5000/api/login', {
            loginId: '6306880179',
            password: 'password123'
        });
        const citizenToken = citizenLogin.data?.token;
        assert('Citizen login', citizenLogin.status === 200 && !!citizenToken, `(Role: ${citizenLogin.data?.user?.role || 'citizen'})`);

        // 2. Citizen Restrictions (RBAC)
        console.log('\n2. Testing Citizen Access Restrictions...');
        const citHospEdit = await put('http://localhost:5000/api/hospitals/HOSP-001', { hospitalName: 'Hacked AIIMS' }, {
            Authorization: `Bearer ${citizenToken}`
        });
        assert('Citizen blocked from editing hospital (403)', citHospEdit.status === 403);

        const citBedEdit = await put('http://localhost:5000/api/hospital/beds/AIIMS%20Gorakhpur', { generalBeds: 999 }, {
            Authorization: `Bearer ${citizenToken}`
        });
        assert('Citizen blocked from updating beds (403)', citBedEdit.status === 403);

        const citDocCreate = await post('http://localhost:5000/api/doctors', { doctorId: 'DOC-FAKE', name: 'Fake' }, {
            Authorization: `Bearer ${citizenToken}`
        });
        assert('Citizen blocked from adding doctors (403)', citDocCreate.status === 403);

        const citAmbCreate = await post('http://localhost:5000/api/ambulances', { ambulanceId: 'AMB-FAKE', vehicleNumber: 'UP53XX0000' }, {
            Authorization: `Bearer ${citizenToken}`
        });
        assert('Citizen blocked from registering ambulances (403)', citAmbCreate.status === 403);

        // 3. Hospital Staff Permissions & Scoping
        console.log('\n3. Testing Hospital Staff Permissions & Scoping (Assigned: HOSP-001 / AIIMS Gorakhpur)...');
        
        // A. Hospital Info Edit - Allowed on assigned facility
        const staffHospEditAllowed = await put('http://localhost:5000/api/hospitals/HOSP-001', {
            hospitalName: 'AIIMS Gorakhpur',
            hospitalType: 'Government Hospital',
            status: 'Operational',
            phone: '+91 551 220 5555',
            emergencyNumber: '108',
            email: 'admin@aiimsgorakhpur.edu.in',
            website: 'https://aiimsgorakhpur.edu.in',
            address: 'Kunraghat, Gorakhpur, UP - 273008',
            latitude: 26.7588,
            longitude: 83.4331,
            totalBeds: 750,
            icuBeds: 120,
            emergencyBeds: 50
        }, {
            Authorization: `Bearer ${staffToken}`
        });
        assert('Staff can edit assigned hospital (200)', staffHospEditAllowed.status === 200);

        // B. Cross-Hospital Edit - Forbidden on other facility (HOSP-002)
        const staffHospEditForbidden = await put('http://localhost:5000/api/hospitals/HOSP-002', {
            hospitalName: 'Hacked BRD Medical College'
        }, {
            Authorization: `Bearer ${staffToken}`
        });
        assert('Staff blocked from modifying another hospital (403)', staffHospEditForbidden.status === 403);

        // C. Bed Update - Allowed on assigned facility
        const staffBedUpdateAllowed = await put('http://localhost:5000/api/hospital/beds/AIIMS%20Gorakhpur', {
            generalBeds: 570,
            icuBeds: 120,
            emergencyBeds: 50,
            privateBeds: 10
        }, {
            Authorization: `Bearer ${staffToken}`
        });
        assert('Staff can update bed allocations for assigned hospital (200)', staffBedUpdateAllowed.status === 200);

        // D. Cross-Hospital Bed Update - Forbidden on BRD Medical College
        const staffBedUpdateForbidden = await put('http://localhost:5000/api/hospital/beds/BRD%20Medical%20College', {
            generalBeds: 100
        }, {
            Authorization: `Bearer ${staffToken}`
        });
        assert('Staff blocked from modifying another hospital\'s beds (403)', staffBedUpdateForbidden.status === 403);

        // E. Doctor Management - Add doctor to assigned hospital
        const testDocId = 'DOC-TEST-' + Math.floor(1000 + Math.random() * 9000);
        const addDocRes = await post('http://localhost:5000/api/doctors', {
            doctorId: testDocId,
            name: 'Dr. Test Surgeon',
            department: 'General Surgery',
            specialization: 'Laparoscopic Surgeon',
            qualification: 'MS, DNB',
            experience: 8,
            mobile: '+91 9876500001',
            email: 'testsurgeon@aiims.org',
            consultationFee: 400,
            status: 'Available',
            hospitalId: 'HOSP-001'
        }, {
            Authorization: `Bearer ${staffToken}`
        });
        assert('Staff can add doctor for assigned hospital (201)', addDocRes.status === 201);

        // F. Doctor Edit - Update doctor
        const editDocRes = await put(`http://localhost:5000/api/doctors/${testDocId}`, {
            name: 'Dr. Test Surgeon (Sr Consultant)',
            experience: 10,
            status: 'Busy'
        }, {
            Authorization: `Bearer ${staffToken}`
        });
        assert('Staff can update doctor in assigned hospital (200)', editDocRes.status === 200);

        // G. Cross-Hospital Doctor Modification - Forbidden on DOC-104 (BRD Medical College)
        const crossDocRes = await put('http://localhost:5000/api/doctors/DOC-104', {
            name: 'Hacked Name'
        }, {
            Authorization: `Bearer ${staffToken}`
        });
        assert('Staff blocked from modifying doctor belonging to other hospital (403)', crossDocRes.status === 403);

        // H. Delete Doctor
        const delDocRes = await del(`http://localhost:5000/api/doctors/${testDocId}`, {
            Authorization: `Bearer ${staffToken}`
        });
        assert('Staff can delete doctor in assigned hospital (200)', delDocRes.status === 200);

        // I. Ambulance Management - Register ambulance for AIIMS
        const testAmbId = 'AMB-TEST-' + Math.floor(100 + Math.random() * 900);
        const addAmbRes = await post('http://localhost:5000/api/ambulances', {
            ambulanceId: testAmbId,
            vehicleNumber: 'UP53TEST' + Math.floor(1000 + Math.random() * 9000),
            driverName: 'Suresh Kumar',
            driverMobile: '+91 9450009999',
            ambulanceType: 'Advanced Life Support (ALS)',
            hospitalName: 'AIIMS Gorakhpur',
            location: 'Trauma Wing AIIMS',
            status: 'Available',
            latitude: 26.7588,
            longitude: 83.4331
        }, {
            Authorization: `Bearer ${staffToken}`
        });
        assert('Staff can register ambulance for assigned hospital (201)', addAmbRes.status === 201);

        // J. Ambulance Edit
        const editAmbRes = await put(`http://localhost:5000/api/ambulances/${testAmbId}`, {
            driverName: 'Suresh Kumar (Senior EMT)',
            status: 'On Duty'
        }, {
            Authorization: `Bearer ${staffToken}`
        });
        assert('Staff can update ambulance for assigned hospital (200)', editAmbRes.status === 200);

        // K. Cross-Hospital Ambulance Edit - Forbidden on AMB003 (BRD Medical College)
        const crossAmbRes = await put('http://localhost:5000/api/ambulances/AMB003', {
            driverName: 'Hacked Driver'
        }, {
            Authorization: `Bearer ${staffToken}`
        });
        assert('Staff blocked from modifying ambulance of another hospital (403)', crossAmbRes.status === 403);

        // L. Delete Ambulance
        const delAmbRes = await del(`http://localhost:5000/api/ambulances/${testAmbId}`, {
            Authorization: `Bearer ${staffToken}`
        });
        assert('Staff can delete ambulance for assigned hospital (200)', delAmbRes.status === 200);

        // M. Doctor Slots Management
        const addSlotRes = await post('http://localhost:5000/api/doctor-slots', {
            doctorId: 'DOC-101', // AIIMS doctor
            slotDate: '2026-10-15',
            startTime: '10:00:00',
            endTime: '13:00:00',
            maxPatients: 20
        }, {
            Authorization: `Bearer ${staffToken}`
        });
        assert('Staff can create appointment slot for assigned doctor (201)', addSlotRes.status === 201);
        const createdSlotId = addSlotRes.data?.slot?.id;

        // N. Cross-Hospital Doctor Slot - Forbidden on DOC-104 (BRD Medical College)
        const crossSlotRes = await post('http://localhost:5000/api/doctor-slots', {
            doctorId: 'DOC-104',
            slotDate: '2026-10-15',
            startTime: '10:00:00',
            endTime: '13:00:00',
            maxPatients: 10
        }, {
            Authorization: `Bearer ${staffToken}`
        });
        assert('Staff blocked from creating slot for doctor of another hospital (403)', crossSlotRes.status === 403);

        // O. Delete Slot
        if (createdSlotId) {
            const delSlotRes = await del(`http://localhost:5000/api/doctor-slots/${createdSlotId}`, {
                Authorization: `Bearer ${staffToken}`
            });
            assert('Staff can remove doctor slot (200)', delSlotRes.status === 200);
        }

        // P. Emergency Department Management
        const staffEmgRes = await put('http://localhost:5000/api/emergency-departments/AIIMS%20Gorakhpur%20Trauma%20Center', {
            emergencyNumber: '108',
            emergencyType: 'Level 1 Trauma Center',
            availableDoctors: 6,
            availableBeds: 25,
            ambulancesAvailable: 4,
            status: 'Active',
            location: 'Ground Floor, Emergency Trauma Center'
        }, {
            Authorization: `Bearer ${staffToken}`
        });
        assert('Staff can update emergency department for assigned hospital (200)', staffEmgRes.status === 200);

        const crossEmgRes = await put('http://localhost:5000/api/emergency-departments/BRD%20Medical%20Trauma%20Center', {
            status: 'Busy'
        }, {
            Authorization: `Bearer ${staffToken}`
        });
        assert('Staff blocked from modifying emergency department of another hospital (403)', crossEmgRes.status === 403);

        // 4. Admin Permissions (City-Wide Access)
        console.log('\n4. Testing City Administrator Permissions...');
        const adminHosp1 = await put('http://localhost:5000/api/hospitals/HOSP-001', {
            totalBeds: 750
        }, {
            Authorization: `Bearer ${adminToken}`
        });
        assert('Admin can update AIIMS Gorakhpur (200)', adminHosp1.status === 200);

        const adminHosp2 = await put('http://localhost:5000/api/hospitals/HOSP-002', {
            totalBeds: 900
        }, {
            Authorization: `Bearer ${adminToken}`
        });
        assert('Admin can update BRD Medical College (200)', adminHosp2.status === 200);

        const adminBedUpdate = await put('http://localhost:5000/api/hospital/beds/BRD%20Medical%20College', {
            generalBeds: 670,
            icuBeds: 150,
            emergencyBeds: 80,
            privateBeds: 0
        }, {
            Authorization: `Bearer ${adminToken}`
        });
        assert('Admin can update beds for any hospital (200)', adminBedUpdate.status === 200);

        const adminEmgUpdate = await put('http://localhost:5000/api/emergency-departments/BRD%20Medical%20Trauma%20Center', {
            availableBeds: 30
        }, {
            Authorization: `Bearer ${adminToken}`
        });
        assert('Admin can update emergency department for any hospital (200)', adminEmgUpdate.status === 200);

    } catch (err) {
        console.error('Test execution error:', err);
        failCount++;
    }

    console.log(`\n=== RESULTS: ${passCount} PASSED, ${failCount} FAILED ===`);
    process.exit(failCount > 0 ? 1 : 0);
}

runTests();
