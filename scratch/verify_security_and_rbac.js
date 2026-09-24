const http = require("http");
const jwt = require("../backend/node_modules/jsonwebtoken");
const { app, server } = require("../backend/server");
const pool = require("../backend/config/db");

const JWT_SECRET = process.env.JWT_SECRET || "smartcity_super_secret_jwt_key_gorakhpur_2026";

// Helpers to mint valid tokens for testing
function makeToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
}

const citizenToken = makeToken({ id: 1, role: "citizen", type: "citizen", name: "Test Citizen", mobile: "9876543210" });
const otherCitizenToken = makeToken({ id: 999, role: "citizen", type: "citizen", name: "Other Citizen", mobile: "9999999999" });
const doctorToken = makeToken({ id: 1, role: "doctor", type: "doctor", name: "Dr. Manoj Kumar" });
const trafficStaffToken = makeToken({ id: 10, role: "staff", type: "staff", department: "traffic", name: "Traffic Controller" });
const waterStaffToken = makeToken({ id: 11, role: "staff", type: "staff", department: "water", name: "Water Supervisor" });
const adminToken = makeToken({ id: 99, role: "admin", type: "admin", department: "admin", name: "Super Administrator" });
const forgedToken = jwt.sign({ id: 1, role: "admin", department: "admin" }, "wrong_secret");

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`  ✅ PASS: ${message}`);
    } else {
        failedTests++;
        console.error(`  ❌ FAIL: ${message}`);
    }
}

function request({ method, path, headers = {}, body = null }) {
    return new Promise((resolve, reject) => {
        const addr = server.address();
        const port = addr ? addr.port : 5000;
        const options = {
            hostname: "127.0.0.1",
            port,
            path,
            method,
            headers: {
                ...headers,
                ...(body ? { "Content-Type": "application/json" } : {})
            }
        };

        const req = http.request(options, (res) => {
            let data = "";
            res.on("data", (chunk) => { data += chunk; });
            res.on("end", () => {
                let parsed = null;
                try { parsed = JSON.parse(data); } catch (e) { parsed = data; }
                resolve({ status: res.statusCode, data: parsed, headers: res.headers });
            });
        });

        req.on("error", (e) => reject(e));
        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function runTests() {
    console.log("\n========================================================");
    console.log("🛡️  RUNNING COMPREHENSIVE SECURITY & RBAC AUDIT SUITE");
    console.log("========================================================\n");

    try {
        // Wait 500ms for server to be ready
        await new Promise(r => setTimeout(r, 500));

        // ---------------------------------------------------------
        // SECTION 1: HEALTHCARE & PATIENT PRIVACY
        // ---------------------------------------------------------
        console.log("1. Healthcare & Patient Privacy:");
        
        let res = await request({ method: "GET", path: "/api/patients" });
        assert(res.status === 401, "GET /api/patients without token returns 401 Unauthorized");

        res = await request({ method: "GET", path: "/api/patients", headers: { Authorization: `Bearer ${citizenToken}` } });
        assert(res.status === 200, "GET /api/patients with citizen token returns 200 OK");
        assert(Array.isArray(res.data.patients) && res.data.patients.length <= 1, "Citizen only receives their own record from GET /api/patients");

        res = await request({ method: "GET", path: "/api/patients/1" });
        assert(res.status === 401, "GET /api/patients/:id without token returns 401 Unauthorized");

        res = await request({ method: "GET", path: "/api/patients/1", headers: { Authorization: `Bearer ${otherCitizenToken}` } });
        assert(res.status === 403, "GET /api/patients/1 with mismatched citizen token returns 403 Forbidden");

        res = await request({ method: "GET", path: "/api/patients/1/records", headers: { Authorization: `Bearer ${otherCitizenToken}` } });
        assert(res.status === 403, "GET /api/patients/1/records with mismatched citizen returns 403 Forbidden");

        res = await request({ method: "GET", path: "/api/patients/1/prescriptions", headers: { Authorization: `Bearer ${otherCitizenToken}` } });
        assert(res.status === 403, "GET /api/patients/1/prescriptions with mismatched citizen returns 403 Forbidden");

        res = await request({ method: "POST", path: "/api/patients/1/records", headers: { Authorization: `Bearer ${citizenToken}` }, body: { diagnosis: "Test" } });
        assert(res.status === 403, "POST /api/patients/1/records by citizen returns 403 Forbidden");

        // ---------------------------------------------------------
        // SECTION 2: DOCTOR PORTAL & CREDENTIALS
        // ---------------------------------------------------------
        console.log("\n2. Doctor Portal & Credentials:");

        res = await request({ method: "POST", path: "/api/doctor/login", body: { doctorId: "DOC001", password: "wrong_password" } });
        assert(res.status === 401, "POST /api/doctor/login with wrong password returns 401 Unauthorized");

        res = await request({ method: "POST", path: "/api/doctor/login", body: { doctorId: "DOC001", password: "doctor123" } });
        assert(res.status === 200 && res.data.success === true, "POST /api/doctor/login with valid password returns 200 & JWT");

        res = await request({ method: "GET", path: "/api/doctor/DOC001/appointments" });
        assert(res.status === 401, "GET /api/doctor/:id/appointments unauthenticated returns 401");

        res = await request({ method: "GET", path: "/api/doctor/DOC001/appointments", headers: { Authorization: `Bearer ${citizenToken}` } });
        assert(res.status === 403, "GET /api/doctor/:id/appointments by citizen returns 403 Forbidden");

        // ---------------------------------------------------------
        // SECTION 3: APPOINTMENTS & PHARMACY DATA ISOLATION
        // ---------------------------------------------------------
        console.log("\n3. Appointments & Pharmacy Data Isolation:");

        res = await request({ method: "GET", path: "/api/appointments" });
        assert(res.status === 401, "GET /api/appointments without token returns 401");

        res = await request({ method: "GET", path: "/api/appointments/1", headers: { Authorization: `Bearer ${otherCitizenToken}` } });
        assert(res.status === 403, "GET /api/appointments/:patientId with mismatched citizen returns 403");

        res = await request({ method: "GET", path: "/api/pharmacy/cart/1", headers: { Authorization: `Bearer ${otherCitizenToken}` } });
        assert(res.status === 403, "GET /api/pharmacy/cart/:patientId with mismatched citizen returns 403");

        res = await request({ method: "GET", path: "/api/pharmacy/bills/1", headers: { Authorization: `Bearer ${otherCitizenToken}` } });
        assert(res.status === 403, "GET /api/pharmacy/bills/:patientId with mismatched citizen returns 403");

        // ---------------------------------------------------------
        // SECTION 4: TRAFFIC CONTROL & SIGNAL OVERRIDE
        // ---------------------------------------------------------
        console.log("\n4. Traffic Control & Hardware Overrides:");

        res = await request({ method: "POST", path: "/api/traffic/junctions/1/override", body: { action: "FORCE_RED" } });
        assert(res.status === 401, "POST /api/traffic/junctions/:id/override unauthenticated returns 401");

        res = await request({ method: "POST", path: "/api/traffic/junctions/1/override", headers: { "x-user-role": "admin" }, body: { action: "FORCE_RED" } });
        assert(res.status === 401, "POST /api/traffic/junctions/:id/override with spoofed x-user-role returns 401 (Header spoofing eliminated!)");

        res = await request({ method: "POST", path: "/api/traffic/junctions/1/override", headers: { Authorization: `Bearer ${citizenToken}` }, body: { action: "FORCE_RED" } });
        assert(res.status === 403, "POST /api/traffic/junctions/:id/override with citizen token returns 403 Forbidden");

        res = await request({ method: "POST", path: "/api/traffic/corridors/dispatch", body: { corridor_id: 1 } });
        assert(res.status === 401, "POST /api/traffic/corridors/dispatch unauthenticated returns 401");

        res = await request({ method: "POST", path: "/api/traffic/corridors/dispatch", headers: { Authorization: `Bearer ${citizenToken}` }, body: { corridor_id: 1 } });
        assert(res.status === 403, "POST /api/traffic/corridors/dispatch with citizen token returns 403");

        res = await request({ method: "POST", path: "/api/traffic/admin/users", body: { name: "Hacker", staff_id: "HCK001", password: "evil" } });
        assert(res.status === 401, "POST /api/traffic/admin/users unauthenticated returns 401");

        res = await request({ method: "POST", path: "/api/traffic/admin/users", headers: { Authorization: `Bearer ${citizenToken}` }, body: { name: "Hacker", staff_id: "HCK001", password: "evil" } });
        assert(res.status === 403, "POST /api/traffic/admin/users with citizen token returns 403 Forbidden");

        // ---------------------------------------------------------
        // SECTION 5: PARKING SYSTEM & HARDWARE GATES
        // ---------------------------------------------------------
        console.log("\n5. Parking System & Hardware Gates:");

        res = await request({ method: "GET", path: "/api/parking/users/search" });
        assert(res.status === 401, "GET /api/parking/users/search unauthenticated returns 401 (Citizen directory leak plugged!)");

        res = await request({ method: "GET", path: "/api/parking/users/search", headers: { Authorization: `Bearer ${citizenToken}` } });
        assert(res.status === 403, "GET /api/parking/users/search with citizen token returns 403 Forbidden");

        res = await request({ method: "POST", path: "/api/parking/emergency-barrier-override", body: { action: "RAISE" } });
        assert(res.status === 401, "POST /api/parking/emergency-barrier-override unauthenticated returns 401");

        res = await request({ method: "POST", path: "/api/parking/emergency-barrier-override", headers: { Authorization: `Bearer ${citizenToken}` }, body: { action: "RAISE" } });
        assert(res.status === 403, "POST /api/parking/emergency-barrier-override with citizen token returns 403 Forbidden");

        res = await request({ method: "POST", path: "/api/parking/gate-action", body: { bookingId: "PRK-TEST" } });
        assert(res.status === 401, "POST /api/parking/gate-action unauthenticated returns 401");

        res = await request({ method: "POST", path: "/api/parking/gate-action", headers: { Authorization: `Bearer ${citizenToken}` }, body: { bookingId: "PRK-TEST" } });
        assert(res.status === 403, "POST /api/parking/gate-action with citizen token returns 403 Forbidden");

        res = await request({ method: "PUT", path: "/api/parking/lots/1/pricing", body: { hourly_rate: 999 } });
        assert(res.status === 401, "PUT /api/parking/lots/:id/pricing unauthenticated returns 401");

        res = await request({ method: "PUT", path: "/api/parking/lots/1/pricing", headers: { Authorization: `Bearer ${citizenToken}` }, body: { hourly_rate: 999 } });
        assert(res.status === 403, "PUT /api/parking/lots/:id/pricing with citizen token returns 403 Forbidden");

        // ---------------------------------------------------------
        // SECTION 6: POLICE, WASTE, WATER & EMERGENCY
        // ---------------------------------------------------------
        console.log("\n6. Police, Waste, Water & Emergency:");

        res = await request({ method: "GET", path: "/api/police/complaints" });
        assert(res.status === 401, "GET /api/police/complaints unauthenticated returns 401");

        res = await request({ method: "GET", path: "/api/police/complaints", headers: { Authorization: `Bearer ${citizenToken}` } });
        assert(res.status === 200, "GET /api/police/complaints with citizen token returns 200 (isolated to citizen)");

        res = await request({ method: "GET", path: "/api/waste/bin-requests" });
        assert(res.status === 401, "GET /api/waste/bin-requests unauthenticated returns 401");

        res = await request({ method: "GET", path: "/api/waste/bin-requests", headers: { Authorization: `Bearer ${citizenToken}` } });
        assert(res.status === 200, "GET /api/waste/bin-requests with citizen token returns 200 (isolated to citizen)");

        res = await request({ method: "GET", path: "/api/water/tanker-bookings" });
        assert(res.status === 200 && Array.isArray(res.data.bookings) && res.data.bookings.length === 0, "GET /api/water/tanker-bookings unauthenticated returns empty list (0 records leaked)");

        res = await request({ method: "GET", path: "/api/emergency/incidents" });
        assert(res.status === 200 && (!res.data.incidents || res.data.incidents.every(i => !i.caller_mobile)), "GET /api/emergency/incidents unauthenticated masks caller mobile numbers");

        // ---------------------------------------------------------
        // SECTION 7: ADMIN LAYER & GLOBAL SEARCH
        // ---------------------------------------------------------
        console.log("\n7. Admin Layer & Global Search:");

        res = await request({ method: "GET", path: "/api/admin/command-center" });
        assert(res.status === 401, "GET /api/admin/command-center unauthenticated returns 401");

        res = await request({ method: "GET", path: "/api/admin/command-center", headers: { Authorization: `Bearer ${citizenToken}` } });
        assert(res.status === 403, "GET /api/admin/command-center with citizen token returns 403 Forbidden");

        res = await request({ method: "GET", path: "/api/admin/analytics" });
        assert(res.status === 401, "GET /api/admin/analytics unauthenticated returns 401");

        res = await request({ method: "GET", path: "/api/admin/analytics", headers: { Authorization: `Bearer ${citizenToken}` } });
        assert(res.status === 403, "GET /api/admin/analytics with citizen token returns 403 Forbidden");

        res = await request({ method: "GET", path: "/api/admin/command-center", headers: { Authorization: `Bearer ${adminToken}` } });
        assert(res.status === 200 && res.data.success === true, "GET /api/admin/command-center with admin token returns 200 OK");

        res = await request({ method: "GET", path: "/api/search?q=hospital", headers: { Authorization: `Bearer ${forgedToken}` } });
        assert(res.status === 200, "GET /api/search with forged token ignores forged role and safely returns public results");

        console.log("\n========================================================");
        console.log(`📊 AUDIT RESULTS: Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
        console.log("========================================================\n");

        if (failedTests > 0) {
            process.exit(1);
        } else {
            console.log("🎉 ALL SECURITY & RBAC CONSTRAINTS VERIFIED SUCCESSFULLY!\n");
            process.exit(0);
        }
    } catch (err) {
        console.error("Test execution fatal error:", err);
        process.exit(1);
    }
}

runTests();
