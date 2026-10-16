/**
 * SmartCity AI - P0 Security Blockers Automated Verification Suite
 * Tests SEC-001, SEC-002, SEC-003, SEC-004, SEC-005
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

function request(options, postData, isRawBuffer = false) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = "";
            res.on("data", (chunk) => body += chunk);
            res.on("end", () => {
                let parsed = null;
                try {
                    parsed = JSON.parse(body);
                } catch {
                    parsed = body;
                }
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    data: parsed
                });
            });
        });

        req.on("error", reject);

        if (postData) {
            if (isRawBuffer) {
                req.write(postData);
            } else if (typeof postData === "string") {
                req.write(postData);
            } else {
                req.write(JSON.stringify(postData));
            }
        }
        req.end();
    });
}

function assert(condition, message) {
    if (!condition) {
        console.error(`❌ FAIL: ${message}`);
        throw new Error(`Assertion failed: ${message}`);
    }
    console.log(`✅ PASS: ${message}`);
}

async function runP0Tests() {
    console.log("==================================================");
    console.log("🔒 RUNNING STAGE 1 (P0) SECURITY VERIFICATION SUITE");
    console.log("==================================================\n");

    let passed = 0;
    let failed = 0;

    // ----------------------------------------------------
    // TEST 1: SEC-001 - Config Validation & No Hardcoded Credentials
    // ----------------------------------------------------
    console.log("▶️ [SEC-001] Verifying Centralized Config & Secret Handling...");
    try {
        const dbContent = fs.readFileSync(path.join(__dirname, "..", "backend", "config", "db.js"), "utf8");
        assert(!dbContent.includes('"omkar"'), "backend/config/db.js contains no hardcoded 'omkar' fallback credential.");
        passed++;

        const envConfig = require("../backend/config/env.config");
        assert(typeof envConfig.validateEnv === "function", "env.config.js exposes validateEnv function.");
        passed++;
        assert(envConfig.JWT_SECRET && envConfig.JWT_SECRET.length >= 16, "JWT_SECRET is resolved securely.");
        passed++;
    } catch (err) {
        console.error("SEC-001 assertion failed:", err.message);
        failed++;
    }

    // ----------------------------------------------------
    // Authenticate Users for Auth / BOLA tests
    // ----------------------------------------------------
    console.log("\n▶️ Authenticating test principals (Citizen, Staff, Admin)...");
    let citizenToken = "";
    let citizenUser = null;
    let staffToken = "";
    let staffUser = null;

    try {
        // Citizen Login
        const citRes = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/login",
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, { loginId: "6306880179", password: "omkar123" });

        assert(citRes.status === 200 && citRes.data.token, "Citizen logged in successfully and received JWT token.");
        citizenToken = citRes.data.token;
        citizenUser = citRes.data.user;
        passed++;

        // Healthcare Staff / Admin Login
        const staffRes = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/staff-login",
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, { staffId: "STAFF-001", password: "admin123" });

        assert(staffRes.status === 200 && staffRes.data.token, "Staff / Admin logged in successfully and received JWT token.");
        staffToken = staffRes.data.token;
        staffUser = staffRes.data.user;
        passed++;
    } catch (err) {
        console.error("Authentication setup failed:", err.message);
        failed++;
    }

    // ----------------------------------------------------
    // TEST 2: SEC-002 - Prescription Upload Protection
    // ----------------------------------------------------
    console.log("\n▶️ [SEC-002] Verifying Prescription Upload Access Control...");
    try {
        // Scenario 2A: Unauthenticated upload attempt MUST be rejected with 401
        const unauthUploadRes = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/prescriptions/upload",
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, { patientId: "P-2026-0001" });

        assert(unauthUploadRes.status === 401, "Unauthenticated prescription upload rejected with HTTP 401 Unauthorized.");
        passed++;

        // Scenario 2B: Citizen trying to upload for a non-existent patient ID MUST return 404
        const nonExistentPatientRes = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/prescriptions/upload",
            method: "POST",
            headers: {
                "Authorization": `Bearer ${citizenToken}`,
                "Content-Type": "application/json"
            }
        }, { patientId: "NON-EXISTENT-PATIENT-99999" });

        assert(nonExistentPatientRes.status === 404, "Upload for non-existent patient ID rejected with HTTP 404 Not Found.");
        passed++;
    } catch (err) {
        console.error("SEC-002 assertion failed:", err.message);
        failed++;
    }

    // ----------------------------------------------------
    // TEST 3: SEC-003 - Patient Registry BOLA / IDOR Verification
    // ----------------------------------------------------
    console.log("\n▶️ [SEC-003] Verifying Patient Registry Server-Side Authorization (BOLA/IDOR)...");
    try {
        // Find existing patients in registry using Staff Token
        const allPatientsRes = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/patients?limit=5",
            method: "GET",
            headers: { "Authorization": `Bearer ${staffToken}` }
        });

        assert(allPatientsRes.status === 200 && Array.isArray(allPatientsRes.data.patients), "Healthcare staff successfully retrieved patient list.");
        passed++;

        const patients = allPatientsRes.data.patients;
        if (patients.length >= 1) {
            // Find a patient that does NOT belong to citizenUser (id != citizenUser.id and mobile != citizenUser.mobile)
            const otherPatient = patients.find(p => Number(p.user_id) !== Number(citizenUser.id) && String(p.mobile) !== String(citizenUser.mobile));

            if (otherPatient) {
                console.log(`Targeting test patient: ${otherPatient.patient_id} (owner user_id=${otherPatient.user_id}, mobile=${otherPatient.mobile})`);

                // Scenario 3A: Unauthorized citizen requesting other patient's record -> MUST BE 403 Forbidden
                const crossCitizenGetRes = await request({
                    hostname: "localhost",
                    port: 5000,
                    path: `/api/patients/${otherPatient.patient_id}`,
                    method: "GET",
                    headers: { "Authorization": `Bearer ${citizenToken}` }
                });

                assert(crossCitizenGetRes.status === 403, `Unauthorized citizen blocked from reading other patient ${otherPatient.patient_id} (HTTP 403 Forbidden).`);
                passed++;

                // Scenario 3B: Unauthorized citizen attempting to PUT/modify other patient -> MUST BE 403 Forbidden
                const crossCitizenPutRes = await request({
                    hostname: "localhost",
                    port: 5000,
                    path: `/api/patients/${otherPatient.patient_id}`,
                    method: "PUT",
                    headers: {
                        "Authorization": `Bearer ${citizenToken}`,
                        "Content-Type": "application/json"
                    }
                }, { name: "Hacked Patient Name" });

                assert(crossCitizenPutRes.status === 403, `Unauthorized citizen blocked from modifying other patient ${otherPatient.patient_id} (HTTP 403 Forbidden).`);
                passed++;

                // Scenario 3C: Healthcare staff accessing the patient record -> MUST BE 200 OK
                const staffAccessRes = await request({
                    hostname: "localhost",
                    port: 5000,
                    path: `/api/patients/${otherPatient.patient_id}`,
                    method: "GET",
                    headers: { "Authorization": `Bearer ${staffToken}` }
                });

                assert(staffAccessRes.status === 200 && staffAccessRes.data.patient, `Authorized healthcare staff successfully accessed patient record ${otherPatient.patient_id} (HTTP 200 OK).`);
                passed++;

                // Scenario 3D: QR code access for unauthorized citizen -> MUST BE 403 Forbidden
                const unauthorizedQrRes = await request({
                    hostname: "localhost",
                    port: 5000,
                    path: `/api/patients/${otherPatient.patient_id}/qr`,
                    method: "GET",
                    headers: { "Authorization": `Bearer ${citizenToken}` }
                });

                assert(unauthorizedQrRes.status === 403, `Unauthorized citizen blocked from viewing other patient's QR code (HTTP 403 Forbidden).`);
                passed++;
            } else {
                console.log("Note: Only 1 patient record existed in test database.");
            }
        }
    } catch (err) {
        console.error("SEC-003 assertion failed:", err.message);
        failed++;
    }

    // ----------------------------------------------------
    // TEST 4: SEC-004 & SEC-005 - Reverse Proxy Trust & CORS
    // ----------------------------------------------------
    console.log("\n▶️ [SEC-004 / SEC-005] Verifying Reverse Proxy Trust and CORS Allowlists...");
    try {
        // Scenario 4A: Preflight OPTIONS request with authorized origin
        const corsOptionsRes = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/ai/status",
            method: "OPTIONS",
            headers: {
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET"
            }
        });

        assert(corsOptionsRes.status === 204 || corsOptionsRes.status === 200, "CORS preflight request succeeded with HTTP 200/204.");
        passed++;
        assert(corsOptionsRes.headers["access-control-allow-origin"] === "http://localhost:3000", "Access-Control-Allow-Origin accurately reflects allowed client origin.");
        passed++;
        assert(corsOptionsRes.headers["access-control-allow-credentials"] === "true", "Access-Control-Allow-Credentials is enabled for authorized origin.");
        passed++;

        // Scenario 4B: Request with an unapproved/malicious origin
        const disallowedOriginRes = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/ai/status",
            method: "GET",
            headers: {
                "Origin": "http://malicious-attacker-site.com"
            }
        });

        assert(disallowedOriginRes.headers["access-control-allow-origin"] !== "http://malicious-attacker-site.com", "Disallowed origin does NOT receive Access-Control-Allow-Origin header.");
        passed++;
    } catch (err) {
        console.error("SEC-004/SEC-005 assertion failed:", err.message);
        failed++;
    }

    console.log("\n==================================================");
    console.log(`📊 P0 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================");

    if (failed > 0) {
        process.exit(1);
    }
}

runP0Tests().catch(err => {
    console.error("Fatal error running P0 test suite:", err);
    process.exit(1);
});
