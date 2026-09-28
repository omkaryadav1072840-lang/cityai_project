const http = require('http');

const BASE_URL = 'http://localhost:5000';

function request(method, path, data = null, headers = {}) {
    return new Promise((resolve) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                let json = null;
                try { json = JSON.parse(body); } catch (e) { json = body; }
                resolve({ status: res.statusCode, headers: res.headers, body: json });
            });
        });

        req.on('error', (err) => {
            resolve({ status: 0, error: err.message });
        });

        if (data) {
            req.write(typeof data === 'string' ? data : JSON.stringify(data));
        }
        req.end();
    });
}

async function runAudit() {
    const bugs = [];
    console.log("==================================================");
    console.log("SMARTCITY AI - MASTER END-TO-END AUDIT SUITE");
    console.log("==================================================");

    // 1. HEALTH CHECK
    const health = await request('GET', '/api/health');
    console.log(`[Health] Status: ${health.status}, DB: ${health.body?.services?.database?.status}`);
    if (health.status !== 200) {
        bugs.push({ id: 'BUG-SYS-01', module: 'System', severity: 'CRITICAL', problem: 'Health check failed: ' + JSON.stringify(health.body) });
    }

    // 2. AUTHENTICATION & TOKENS
    console.log("\n--- Testing Authentication & RBAC Tokens ---");
    // Citizen Login
    const citizenLogin = await request('POST', '/api/login', { loginId: 'citizen@smartcity.gorakhpur.in', password: 'citizen123' });
    const citizenToken = citizenLogin.body?.token;
    console.log(`Citizen Login: ${citizenLogin.status} (Token: ${citizenToken ? 'OK' : 'MISSING'})`);
    if (!citizenToken) bugs.push({ id: 'BUG-AUTH-01', module: 'Auth', severity: 'CRITICAL', problem: 'Citizen demo login failed' });

    // Staff Logins for each department
    const staffTokens = {};
    const staffCredentials = [
        { dept: 'traffic', id: 'TR-VERMA', pass: 'verma123' },
        { dept: 'traffic_alt', id: 'TRF001', pass: '123456' },
        { dept: 'waste', id: 'WST001', pass: '123456' },
        { dept: 'parking', id: 'PRK001', pass: '123456' },
        { dept: 'hospital', id: 'STAFF-MED-01', pass: 'staff123' },
        { dept: 'emergency', id: 'EMG001', pass: 'staff123' },
        { dept: 'police', id: 'POL001', pass: 'staff123' },
        { dept: 'water', id: 'WTR001', pass: 'staff123' },
        { dept: 'street_lights', id: 'LT001', pass: 'staff123' },
        { dept: 'places', id: 'PLC001', pass: 'staff123' },
        { dept: 'admin', id: 'TR-ADMIN', pass: 'admin123' },
        { dept: 'admin_sys', id: 'STAFF-001', pass: 'admin123' },
    ];

    for (const sc of staffCredentials) {
        const res = await request('POST', '/api/staff-login', { staffId: sc.id, password: sc.pass });
        if (res.status === 200 && res.body?.token) {
            staffTokens[sc.dept] = res.body.token;
            console.log(`Staff [${sc.dept}] (${sc.id}) Login: OK`);
        } else {
            console.log(`Staff [${sc.dept}] (${sc.id}) Login: FAILED (${res.status} - ${JSON.stringify(res.body)})`);
            bugs.push({ id: `BUG-AUTH-${sc.dept.toUpperCase()}`, module: 'Auth', severity: 'HIGH', problem: `Staff login failed for ${sc.id}: ${res.body?.message}` });
        }
    }

    // Doctor Login
    const docLogin = await request('POST', '/api/staff-login', { staffId: 'DOC001', password: 'doctor123' });
    const doctorToken = docLogin.body?.token;
    console.log(`Doctor Login (DOC001): ${docLogin.status} (Token: ${doctorToken ? 'OK' : 'MISSING'})`);
    if (!doctorToken) bugs.push({ id: 'BUG-AUTH-DOC', module: 'Auth', severity: 'HIGH', problem: 'Doctor login failed for DOC001' });

    // 3. PROFILE & MY ACTIVITY
    console.log("\n--- Testing Profile & My Activity APIs ---");
    const userHeaders = { 'Authorization': `Bearer ${citizenToken}` };
    const myProfile = await request('GET', '/api/auth/me', null, userHeaders);
    console.log(`GET /api/auth/me: ${myProfile.status}`);
    if (myProfile.status !== 200) {
        // Try alternate route if any
        const meAlt = await request('GET', '/api/user/profile', null, userHeaders);
        console.log(`GET /api/user/profile: ${meAlt.status}`);
        if (meAlt.status !== 200) {
            bugs.push({ id: 'BUG-PROF-01', module: 'Profile', severity: 'MEDIUM', problem: 'No working /api/auth/me or /api/user/profile endpoint for session profile' });
        }
    }

    const myBookings = await request('GET', '/api/parking/my-bookings', null, userHeaders);
    console.log(`GET /api/parking/my-bookings: ${myBookings.status} (Count: ${myBookings.body?.bookings?.length || myBookings.body?.data?.length || 0})`);
    if (myBookings.status >= 400) {
        bugs.push({ id: 'BUG-PARK-ACT', module: 'Parking', severity: 'HIGH', problem: 'GET /api/parking/my-bookings failed: ' + JSON.stringify(myBookings.body) });
    }

    const myAppointments = await request('GET', '/api/appointments/my-appointments', null, userHeaders);
    console.log(`GET /api/appointments/my-appointments: ${myAppointments.status}`);
    if (myAppointments.status >= 400) {
        const myApptAlt = await request('GET', '/api/appointments/user/2', null, userHeaders);
        console.log(`GET /api/appointments/user/2: ${myApptAlt.status}`);
        if (myApptAlt.status >= 400) {
            bugs.push({ id: 'BUG-HOSP-ACT', module: 'Hospital', severity: 'MEDIUM', problem: 'User appointments endpoint failed' });
        }
    }

    // 4. TRAFFIC MODULE
    console.log("\n--- Testing Traffic Module APIs ---");
    const trafficJunctions = await request('GET', '/api/traffic/junctions');
    console.log(`GET /api/traffic/junctions: ${trafficJunctions.status} (Count: ${trafficJunctions.body?.junctions?.length || trafficJunctions.body?.length || 0})`);
    if (trafficJunctions.status !== 200) bugs.push({ id: 'BUG-TRF-01', module: 'Traffic', severity: 'CRITICAL', problem: 'GET /api/traffic/junctions failed' });

    const trafficSignals = await request('GET', '/api/traffic/signals');
    console.log(`GET /api/traffic/signals: ${trafficSignals.status}`);

    const trafficCameras = await request('GET', '/api/traffic/cameras');
    console.log(`GET /api/traffic/cameras: ${trafficCameras.status}`);

    const trafficViolations = await request('GET', '/api/traffic/violations');
    console.log(`GET /api/traffic/violations: ${trafficViolations.status}`);

    const trafficCorridors = await request('GET', '/api/traffic/corridors');
    console.log(`GET /api/traffic/corridors: ${trafficCorridors.status}`);

    const trafficAudit = await request('GET', '/api/traffic/audit-logs');
    console.log(`GET /api/traffic/audit-logs: ${trafficAudit.status}`);

    // Traffic Staff Control (Webster Cycle / Manual Override)
    const trafficHeaders = { 'Authorization': `Bearer ${staffTokens.traffic}` };
    const signalOverride = await request('POST', '/api/traffic/signals/override', {
        junctionId: 'GKP-JNC-001',
        activePhase: 'NORTH_SOUTH',
        holdDurationSeconds: 45
    }, trafficHeaders);
    console.log(`POST /api/traffic/signals/override (Staff): ${signalOverride.status}`);
    if (signalOverride.status >= 400) {
        bugs.push({ id: 'BUG-TRF-02', module: 'Traffic', severity: 'HIGH', problem: 'Signal override failed for traffic staff: ' + JSON.stringify(signalOverride.body) });
    }

    // 5. PARKING MODULE
    console.log("\n--- Testing Parking Module APIs ---");
    const parkingLots = await request('GET', '/api/parking/lots');
    console.log(`GET /api/parking/lots: ${parkingLots.status}`);
    if (parkingLots.status !== 200) bugs.push({ id: 'BUG-PRK-01', module: 'Parking', severity: 'CRITICAL', problem: 'GET /api/parking/lots failed' });

    const parkingSlots = await request('GET', '/api/parking/slots');
    console.log(`GET /api/parking/slots: ${parkingSlots.status}`);

    // Test Parking Booking Flow
    const testBookSlot = await request('POST', '/api/parking/book', {
        lotId: 1,
        slotNumber: 'A-01',
        vehicleNumber: 'UP53XX9999',
        userName: 'Demo Citizen',
        durationHours: 2,
        vehicleType: 'car'
    }, userHeaders);
    console.log(`POST /api/parking/book: ${testBookSlot.status} (${JSON.stringify(testBookSlot.body?.message || testBookSlot.body)})`);

    // Parking Staff Dashboard
    const parkingHeaders = { 'Authorization': `Bearer ${staffTokens.parking}` };
    const parkingStaffView = await request('GET', '/api/parking/staff/overview', null, parkingHeaders);
    console.log(`GET /api/parking/staff/overview: ${parkingStaffView.status}`);
    if (parkingStaffView.status >= 400) {
        const altStaff = await request('GET', '/api/parking/active-entries', null, parkingHeaders);
        console.log(`GET /api/parking/active-entries: ${altStaff.status}`);
    }

    // 6. HOSPITAL MODULE
    console.log("\n--- Testing Hospital Module APIs ---");
    const hospitals = await request('GET', '/api/hospitals');
    console.log(`GET /api/hospitals: ${hospitals.status}`);

    const doctors = await request('GET', '/api/doctors');
    console.log(`GET /api/doctors: ${doctors.status}`);

    const beds = await request('GET', '/api/hospital/beds');
    console.log(`GET /api/hospital/beds: ${beds.status}`);

    const bedCategories = await request('GET', '/api/hospital/bed-categories');
    console.log(`GET /api/hospital/bed-categories: ${bedCategories.status}`);

    // Strict Appointment Booking
    const apptBooking = await request('POST', '/api/appointments/book-strict', {
        patientName: 'Audit Test Patient',
        patientMobile: '9876543210',
        patientEmail: 'test@example.com',
        hospitalId: 1,
        doctorId: 1,
        appointmentDate: '2026-09-30',
        timeSlot: '10:00 AM',
        symptoms: 'Routine test checkup'
    }, userHeaders);
    console.log(`POST /api/appointments/book-strict: ${apptBooking.status}`);
    if (apptBooking.status >= 400) {
        bugs.push({ id: 'BUG-HOSP-01', module: 'Hospital', severity: 'HIGH', problem: 'POST /api/appointments/book-strict failed: ' + JSON.stringify(apptBooking.body) });
    }

    // Patient Records and Reports from MySQL
    const patientRecords = await request('GET', '/api/patients/1/records', null, userHeaders);
    console.log(`GET /api/patients/1/records: ${patientRecords.status}`);
    if (patientRecords.status >= 400) {
        bugs.push({ id: 'BUG-HOSP-02', module: 'Hospital', severity: 'HIGH', problem: 'GET /api/patients/:patientId/records failed: ' + JSON.stringify(patientRecords.body) });
    }

    const patientReports = await request('GET', '/api/patients/1/reports', null, userHeaders);
    console.log(`GET /api/patients/1/reports: ${patientReports.status}`);
    if (patientReports.status >= 400) {
        bugs.push({ id: 'BUG-HOSP-03', module: 'Hospital', severity: 'HIGH', problem: 'GET /api/patients/:patientId/reports failed: ' + JSON.stringify(patientReports.body) });
    }

    // Diagnostics / Lab Tests
    const diagTests = await request('GET', '/api/diagnostics/tests');
    console.log(`GET /api/diagnostics/tests: ${diagTests.status}`);

    // Pharmacy
    const pharmacyMeds = await request('GET', '/api/pharmacy/medicines');
    console.log(`GET /api/pharmacy/medicines: ${pharmacyMeds.status}`);

    // 7. WASTE MODULE
    console.log("\n--- Testing Waste Module APIs ---");
    const wasteBins = await request('GET', '/api/waste/bins');
    console.log(`GET /api/waste/bins: ${wasteBins.status}`);

    const wasteRequests = await request('GET', '/api/waste/requests');
    console.log(`GET /api/waste/requests: ${wasteRequests.status}`);

    // Citizen report/complaint
    const wasteReport = await request('POST', '/api/waste/report', {
        binId: 1,
        location: 'Golghar Market',
        wasteType: 'organic',
        description: 'Dustbin overflowing with commercial packaging'
    }, userHeaders);
    console.log(`POST /api/waste/report: ${wasteReport.status}`);
    if (wasteReport.status >= 400) {
        bugs.push({ id: 'BUG-WST-01', module: 'Waste', severity: 'HIGH', problem: 'POST /api/waste/report failed: ' + JSON.stringify(wasteReport.body) });
    }

    // Waste Staff Update Status
    const wasteHeaders = { 'Authorization': `Bearer ${staffTokens.waste}` };
    const wasteStaffAction = await request('POST', '/api/waste/requests/update-status', {
        requestId: 1,
        status: 'in_progress',
        assignedTo: 'WST001'
    }, wasteHeaders);
    console.log(`POST /api/waste/requests/update-status (Staff): ${wasteStaffAction.status}`);
    if (wasteStaffAction.status >= 400) {
        bugs.push({ id: 'BUG-WST-02', module: 'Waste', severity: 'HIGH', problem: 'Waste staff request status update failed: ' + JSON.stringify(wasteStaffAction.body) });
    }

    // 8. WATER MODULE
    console.log("\n--- Testing Water Module APIs ---");
    const waterTanks = await request('GET', '/api/water/tanks');
    console.log(`GET /api/water/tanks: ${waterTanks.status}`);

    const waterPipelines = await request('GET', '/api/water/pipelines');
    console.log(`GET /api/water/pipelines: ${waterPipelines.status}`);

    const waterSchedules = await request('GET', '/api/water/supply-schedules');
    console.log(`GET /api/water/supply-schedules: ${waterSchedules.status}`);

    const waterAnomalies = await request('GET', '/api/water/anomalies');
    console.log(`GET /api/water/anomalies: ${waterAnomalies.status}`);

    // Water Tanker Booking
    const tankerBooking = await request('POST', '/api/water/book-tanker', {
        name: 'Demo Citizen',
        mobile: '9876543210',
        address: 'Civil Lines, Gorakhpur',
        capacityLiters: 1000,
        deliverySlot: 'Morning'
    }, userHeaders);
    console.log(`POST /api/water/book-tanker: ${tankerBooking.status}`);

    // 9. EMERGENCY & AMBULANCE MODULE
    console.log("\n--- Testing Emergency & Ambulance Module APIs ---");
    const ambulances = await request('GET', '/api/ambulances');
    console.log(`GET /api/ambulances: ${ambulances.status}`);

    const emgIncidents = await request('GET', '/api/emergency/incidents');
    console.log(`GET /api/emergency/incidents: ${emgIncidents.status}`);

    const sosAlert = await request('POST', '/api/emergency/sos', {
        callerName: 'Demo Citizen',
        callerPhone: '9876543210',
        latitude: 26.7606,
        longitude: 83.3732,
        emergencyType: 'Medical'
    }, userHeaders);
    console.log(`POST /api/emergency/sos: ${sosAlert.status}`);

    // 10. POLICE MODULE
    console.log("\n--- Testing Police Module APIs ---");
    const policeStations = await request('GET', '/api/police/stations');
    console.log(`GET /api/police/stations: ${policeStations.status}`);

    const policeStats = await request('GET', '/api/police/stats');
    console.log(`GET /api/police/stats: ${policeStats.status}`);

    // 11. FAMOUS PLACES & TOURISM
    console.log("\n--- Testing Famous Places Module APIs ---");
    const places = await request('GET', '/api/famous-places');
    console.log(`GET /api/famous-places: ${places.status}`);

    // 12. AI ASSISTANT & PREDICTIONS
    console.log("\n--- Testing AI Assistant & Predictions APIs ---");
    const aiChat1 = await request('POST', '/api/ai/chat', {
        message: 'Nearest hospital kaha hai?'
    }, userHeaders);
    console.log(`POST /api/ai/chat ("Nearest hospital kaha hai?"): ${aiChat1.status} (Reply: ${aiChat1.body?.response?.substring(0, 50) || aiChat1.body?.reply?.substring(0, 50) || 'None'}...)`);
    if (aiChat1.status >= 400 || (!aiChat1.body?.response && !aiChat1.body?.reply)) {
        bugs.push({ id: 'BUG-AI-01', module: 'AI Assistant', severity: 'CRITICAL', problem: 'AI Chat endpoint failed: ' + JSON.stringify(aiChat1.body) });
    }

    const aiPredictions = await request('GET', '/api/ai/predictions');
    console.log(`GET /api/ai/predictions: ${aiPredictions.status}`);

    // 13. ADMIN MODULE & ANALYTICS
    console.log("\n--- Testing Admin Module APIs ---");
    const adminHeaders = { 'Authorization': `Bearer ${staffTokens.admin}` };
    const adminStats = await request('GET', '/api/admin/stats', null, adminHeaders);
    console.log(`GET /api/admin/stats: ${adminStats.status}`);

    const adminUsers = await request('GET', '/api/admin/users', null, adminHeaders);
    console.log(`GET /api/admin/users: ${adminUsers.status}`);

    const adminStaff = await request('GET', '/api/admin/staff', null, adminHeaders);
    console.log(`GET /api/admin/staff: ${adminStaff.status}`);

    console.log("\n==================================================");
    console.log(`AUDIT FINISHED. Total Endpoint Bugs Found: ${bugs.length}`);
    console.log("==================================================");
    for (const b of bugs) {
        console.log(`[${b.severity}] ${b.id} (${b.module}): ${b.problem}`);
    }

    const fs = require('fs');
    fs.writeFileSync('scratch/master_e2e_results.json', JSON.stringify({ bugs, timestamp: new Date().toISOString() }, null, 2));
    process.exit(0);
}

runAudit();
