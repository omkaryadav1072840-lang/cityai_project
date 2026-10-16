/**
 * SmartCity AI - Verification of Fix 1 (Mobile Ownership Collision) & Fix 2 (ABHA Authorization)
 * Non-destructive automated tests validating exact 10-digit matching and ABHA access controls.
 */

const http = require("http");
const jwt = require("../backend/node_modules/jsonwebtoken");
const { JWT_SECRET } = require("../backend/config/env.config");

function request(options, postData) {
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
            req.write(typeof postData === "string" ? postData : JSON.stringify(postData));
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

async function runTests() {
    console.log("==================================================");
    console.log("🔒 TESTING FIX 1 (MOBILE OWNERSHIP) & FIX 2 (ABHA)");
    console.log("==================================================\n");

    let passed = 0;
    let failed = 0;

    // 1. Authenticate Citizens & Staff
    console.log("▶️ Authenticating test principals...");
    let citizenToken = "";
    let staffToken = "";

    try {
        // Authenticate Standard Citizen
        const citRes = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/login",
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, { loginId: "6306880179", password: "omkar123" });

        assert(citRes.status === 200 && citRes.data.token, "Standard citizen logged in successfully.");
        citizenToken = citRes.data.token;
        passed++;

        // Authenticate Staff / Admin
        const staffRes = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/staff-login",
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, { staffId: "STAFF-001", password: "admin123" });

        assert(staffRes.status === 200 && staffRes.data.token, "Staff / Admin logged in successfully.");
        staffToken = staffRes.data.token;
        passed++;
    } catch (e) {
        console.error("Auth setup error:", e.message);
        failed++;
    }

    // ----------------------------------------------------
    // Create an Isolated Synthetic Patient for Collision & ABHA Testing
    // Patient has mobile: 8876543210 and user_id: 888
    // ----------------------------------------------------
    const collisionTestPatientId = `P-COL-${Date.now().toString().slice(-6)}`;
    console.log(`\n▶️ Creating isolated synthetic patient '${collisionTestPatientId}' with mobile 8876543210...`);
    try {
        const createRes = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/patients",
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${staffToken}`
            }
        }, {
            patientId: collisionTestPatientId,
            name: "Collision Test Patient",
            mobile: "+91 8876543210",
            age: 30,
            gender: "Male"
        });

        assert(createRes.status === 201 && createRes.data.patient, `Isolated synthetic patient '${collisionTestPatientId}' registered.`);
        passed++;
    } catch (e) {
        console.error("Creation error:", e.message);
        failed++;
    }

    // ----------------------------------------------------
    // TEST SUITE 1: FIX 1 - Mobile Collision & Ownership
    // ----------------------------------------------------
    console.log("\n▶️ [FIX 1] Testing Mobile Number Ownership & Suffix Collision Immunity...");
    try {
        // Token for Citizen with mobile 9876543210 (DIFFERS ONLY IN FIRST DIGIT from 8876543210)
        const tokenDiffFirstDigit = jwt.sign({
            id: 991,
            name: "Citizen 9",
            role: "citizen",
            mobile: "9876543210"
        }, JWT_SECRET, { expiresIn: "1h" });

        // Token for Citizen with exact matching mobile +91 8876543210
        const tokenExactMatchMobile = jwt.sign({
            id: 992,
            name: "Citizen 8",
            role: "citizen",
            mobile: "+91-8876543210"
        }, JWT_SECRET, { expiresIn: "1h" });

        // Token for Citizen with completely invalid short mobile
        const tokenInvalidMobile = jwt.sign({
            id: 993,
            name: "Citizen Short",
            role: "citizen",
            mobile: "543210"
        }, JWT_SECRET, { expiresIn: "1h" });

        // Negative Test 1A: Two mobile numbers differing only in first digit (9876543210 vs 8876543210) -> MUST BE 403
        const diffFirstDigitRes = await request({
            hostname: "localhost",
            port: 5000,
            path: `/api/patients/${collisionTestPatientId}`,
            method: "GET",
            headers: { "Authorization": `Bearer ${tokenDiffFirstDigit}` }
        });

        assert(diffFirstDigitRes.status === 403,
            "NEGATIVE TEST PASSED: Access strictly DENIED for citizen with mobile 9876543210 accessing patient with 8876543210 (HTTP 403 Forbidden). No suffix sharing!");
        passed++;

        // Negative Test 1B: Invalid short mobile -> MUST BE 403
        const invalidMobRes = await request({
            hostname: "localhost",
            port: 5000,
            path: `/api/patients/${collisionTestPatientId}`,
            method: "GET",
            headers: { "Authorization": `Bearer ${tokenInvalidMobile}` }
        });

        assert(invalidMobRes.status === 403,
            "NEGATIVE TEST PASSED: Access strictly DENIED for citizen with invalid mobile (HTTP 403 Forbidden).");
        passed++;

        // Positive Test 1C: Exact matching valid mobile (with +91 country prefix) -> MUST BE 200
        const exactMatchRes = await request({
            hostname: "localhost",
            port: 5000,
            path: `/api/patients/${collisionTestPatientId}`,
            method: "GET",
            headers: { "Authorization": `Bearer ${tokenExactMatchMobile}` }
        });

        assert(exactMatchRes.status === 200 && exactMatchRes.data.patient,
            "POSITIVE TEST PASSED: Access GRANTED for citizen with exact matching 10-digit mobile (HTTP 200 OK).");
        passed++;
    } catch (e) {
        console.error("Suite 1 error:", e.message);
        failed++;
    }

    // ----------------------------------------------------
    // TEST SUITE 2: FIX 2 - ABHA Link & Unlink Authorization
    // ----------------------------------------------------
    console.log("\n▶️ [FIX 2] Testing ABHA Link & Unlink Route Authorization...");
    try {
        // Token for Citizen with exact matching mobile (legitimate owner)
        const tokenOwner = jwt.sign({
            id: 992,
            name: "Citizen Owner",
            role: "citizen",
            mobile: "8876543210"
        }, JWT_SECRET, { expiresIn: "1h" });

        // Token for wrong citizen (mobile 9876543210)
        const tokenWrongCitizen = jwt.sign({
            id: 991,
            name: "Wrong Citizen",
            role: "citizen",
            mobile: "9876543210"
        }, JWT_SECRET, { expiresIn: "1h" });

        // Case 2A: Unauthenticated POST /link-abha -> MUST BE 401
        const unauthLinkRes = await request({
            hostname: "localhost",
            port: 5000,
            path: `/api/patients/${collisionTestPatientId}/link-abha`,
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, { abhaAddress: "attacker@abdm", consentGiven: true });

        assert(unauthLinkRes.status === 401, "Unauthenticated POST /link-abha rejected with HTTP 401 Unauthorized.");
        passed++;

        // Case 2B: Unauthenticated POST /unlink-abha -> MUST BE 401
        const unauthUnlinkRes = await request({
            hostname: "localhost",
            port: 5000,
            path: `/api/patients/${collisionTestPatientId}/unlink-abha`,
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, {});

        assert(unauthUnlinkRes.status === 401, "Unauthenticated POST /unlink-abha rejected with HTTP 401 Unauthorized.");
        passed++;

        // Case 2C: Wrong-citizen attempt to link ABHA -> MUST BE 403
        const wrongCitizenLinkRes = await request({
            hostname: "localhost",
            port: 5000,
            path: `/api/patients/${collisionTestPatientId}/link-abha`,
            method: "POST",
            headers: {
                "Authorization": `Bearer ${tokenWrongCitizen}`,
                "Content-Type": "application/json"
            }
        }, { abhaAddress: "wrongcitizen@abdm", consentGiven: true });

        assert(wrongCitizenLinkRes.status === 403, "Wrong citizen attempt to link ABHA rejected with HTTP 403 Forbidden.");
        passed++;

        // Case 2D: Wrong-citizen attempt to unlink ABHA -> MUST BE 403
        const wrongCitizenUnlinkRes = await request({
            hostname: "localhost",
            port: 5000,
            path: `/api/patients/${collisionTestPatientId}/unlink-abha`,
            method: "POST",
            headers: {
                "Authorization": `Bearer ${tokenWrongCitizen}`,
                "Content-Type": "application/json"
            }
        }, {});

        assert(wrongCitizenUnlinkRes.status === 403, "Wrong citizen attempt to unlink ABHA rejected with HTTP 403 Forbidden.");
        passed++;

        // Case 2E: Verify database state remained unmodified by denied requests
        const stateCheckRes = await request({
            hostname: "localhost",
            port: 5000,
            path: `/api/patients/${collisionTestPatientId}`,
            method: "GET",
            headers: { "Authorization": `Bearer ${staffToken}` }
        });

        assert(stateCheckRes.status === 200, "Verified database state after denied attempts.");
        passed++;
        assert(stateCheckRes.data.patient.abha_address !== "wrongcitizen@abdm" && stateCheckRes.data.patient.abha_address !== "attacker@abdm",
            "Database state verified: ABHA address was NOT modified by unauthorized requests.");
        passed++;

        // Case 2F: Authorized citizen owner linking ABHA -> MUST BE 200
        const ownerLinkRes = await request({
            hostname: "localhost",
            port: 5000,
            path: `/api/patients/${collisionTestPatientId}/link-abha`,
            method: "POST",
            headers: {
                "Authorization": `Bearer ${tokenOwner}`,
                "Content-Type": "application/json"
            }
        }, { abhaAddress: "owner@abdm", consentGiven: true });

        assert(ownerLinkRes.status === 200 && ownerLinkRes.data.abhaStatus === "Linked",
            "Authorized citizen owner successfully linked ABHA (HTTP 200 OK).");
        passed++;

        // Case 2G: Authorized healthcare staff unlinking ABHA -> MUST BE 200
        const staffUnlinkRes = await request({
            hostname: "localhost",
            port: 5000,
            path: `/api/patients/${collisionTestPatientId}/unlink-abha`,
            method: "POST",
            headers: {
                "Authorization": `Bearer ${staffToken}`,
                "Content-Type": "application/json"
            }
        }, {});

        assert(staffUnlinkRes.status === 200 && staffUnlinkRes.data.abhaStatus === "Not Linked",
            "Authorized healthcare staff successfully unlinked ABHA (HTTP 200 OK).");
        passed++;
    } catch (e) {
        console.error("Suite 2 error:", e.message);
        failed++;
    }

    console.log("\n==================================================");
    console.log(`📊 FINAL TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================");

    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error("Fatal error running test suite:", err);
    process.exit(1);
});
