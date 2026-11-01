/**
 * scratch/test_final_adversarial_security.js
 * Comprehensive Adversarial Security & Verification Test Suite
 * Covers Sections A through G as specified in Task Prompt.
 */

process.env.NODE_PATH = require("path").join(__dirname, "../backend/node_modules");
require("module").Module._initPaths();

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const express = require("express");

const {
    JWT_SECRET,
    JWT_EXPIRES_IN,
    generateToken,
    authenticateToken,
    revokeToken,
    isTokenRevoked,
    hashPasswordSync,
    verifyPassword
} = require("../backend/middleware/auth.middleware");

// Build test express application mounting workforce & core routes
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const workforceRoutes = require("../backend/routes/waste_workforce.routes");
app.use(workforceRoutes);

const wasteRoutes = require("../backend/routes/waste.routes");
app.use(wasteRoutes);

const authRoutes = require("../backend/routes/auth.routes");
app.use(authRoutes);

// Test helper for in-process HTTP dispatch
function dispatchRequest(method, url, headers = {}, body = null) {
    return new Promise((resolve) => {
        const req = new (require("stream").Readable)();
        req._read = () => {};
        req.method = method.toUpperCase();
        req.url = url;
        req.headers = { host: "localhost:5000", ...headers };

        if (body) {
            const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
            req.headers["content-type"] = req.headers["content-type"] || "application/json";
            req.headers["content-length"] = Buffer.byteLength(bodyStr);
            req.push(bodyStr);
        }
        req.push(null);

        let statusCode = 200;
        let responseHeaders = {};
        const chunks = [];

        const res = {
            statusCode: 200,
            setHeader: (k, v) => { responseHeaders[k.toLowerCase()] = v; },
            getHeader: (k) => responseHeaders[k.toLowerCase()],
            status: function (code) { statusCode = code; this.statusCode = code; return this; },
            json: function (data) {
                statusCode = this.statusCode || statusCode;
                resolve({ status: statusCode, body: data, headers: responseHeaders });
            },
            send: function (data) {
                statusCode = this.statusCode || statusCode;
                let parsed = data;
                try { parsed = JSON.parse(data); } catch (_) {}
                resolve({ status: statusCode, body: parsed, headers: responseHeaders });
            },
            end: function (chunk) {
                if (chunk) chunks.push(Buffer.from(chunk));
                const total = Buffer.concat(chunks).toString("utf8");
                let parsed = total;
                try { parsed = JSON.parse(total); } catch (_) {}
                resolve({ status: statusCode, body: parsed, headers: responseHeaders });
            }
        };

        app.handle(req, res);
    });
}

let passed = 0;
let failed = 0;

function assert(desc, condition) {
    if (condition) {
        console.log(`  [PASS] ${desc}`);
        passed++;
    } else {
        console.error(`  [FAIL] ${desc}`);
        failed++;
    }
}

async function runAdversarialTestSuite() {
    console.log("========================================================================");
    console.log("FINAL ADVERSARIAL SECURITY VERIFICATION SUITE");
    console.log("========================================================================\n");

    // =========================================================================
    // SECTION A: JWT SECURITY, FORGERY & TOKEN REVOCATION PERSISTENCE
    // =========================================================================
    console.log("--- Section A: JWT Security, Cryptography & Persistence ---");

    // A1. Valid baseline token
    const binStaffUser = {
        userId: 301,
        name: "Bin Operator (BIN-GOL-01)",
        role: "bin_staff",
        accountType: "BIN_STAFF",
        staffId: "BIN-GOL-01",
        assigned_bin_code: "BIN-GOL-01",
        department: "waste"
    };
    const validToken = generateToken(binStaffUser, "bin_staff");
    assert("A1. Legitimate JWT generated with HMAC-SHA256 signature", typeof validToken === "string" && validToken.split(".").length === 3);

    // A2. Forged signature
    const parts = validToken.split(".");
    const forgedToken = `${parts[0]}.${parts[1]}.tampered_signature_xyz123`;
    const resA2 = await dispatchRequest("GET", "/api/waste/bin-staff/my-bin", { authorization: `Bearer ${forgedToken}` });
    assert("A2. Forged signature token strictly rejected (HTTP 403)", resA2.status === 403);

    // A3. Altered role in payload
    const decodedPayload = jwt.decode(validToken);
    const alteredRolePayload = { ...decodedPayload, role: "admin", accountType: "ADMIN" };
    const alteredRoleToken = `${parts[0]}.${Buffer.from(JSON.stringify(alteredRolePayload)).toString("base64url")}.${parts[2]}`;
    const resA3 = await dispatchRequest("GET", "/api/waste/admin/staff", { authorization: `Bearer ${alteredRoleToken}` });
    assert("A3. Altered role in payload strictly rejected via signature validation (HTTP 403)", resA3.status === 403);

    // A4. Altered assigned bin code
    const alteredBinPayload = { ...decodedPayload, assigned_bin_code: "BIN-CMK-02", staffId: "BIN-CMK-02" };
    const alteredBinToken = `${parts[0]}.${Buffer.from(JSON.stringify(alteredBinPayload)).toString("base64url")}.${parts[2]}`;
    const resA4 = await dispatchRequest("GET", "/api/waste/bin-staff/my-bin", { authorization: `Bearer ${alteredBinToken}` });
    assert("A4. Altered assigned bin code strictly rejected via cryptographic signature check (HTTP 403)", resA4.status === 403);

    // A5. Expired token
    const expiredPayload = { ...decodedPayload, exp: Math.floor(Date.now() / 1000) - 3600 };
    const expiredToken = jwt.sign(expiredPayload, JWT_SECRET);
    const resA5 = await dispatchRequest("GET", "/api/waste/bin-staff/my-bin", { authorization: `Bearer ${expiredToken}` });
    assert("A5. Expired token strictly rejected (HTTP 403)", resA5.status === 403);

    // A6. Invalid issuer
    const invalidIssPayload = { ...decodedPayload, iss: "malicious.hacker.com" };
    const invalidIssToken = jwt.sign(invalidIssPayload, JWT_SECRET);
    const resA6 = await dispatchRequest("GET", "/api/waste/bin-staff/my-bin", { authorization: `Bearer ${invalidIssToken}` });
    assert("A6. Token with invalid issuer strictly rejected (HTTP 403)", resA6.status === 403);

    // A7. Invalid audience
    const invalidAudPayload = { ...decodedPayload, aud: "unauthorized-client" };
    const invalidAudToken = jwt.sign(invalidAudPayload, JWT_SECRET);
    const resA7 = await dispatchRequest("GET", "/api/waste/bin-staff/my-bin", { authorization: `Bearer ${invalidAudToken}` });
    assert("A7. Token with invalid audience strictly rejected (HTTP 403)", resA7.status === 403);

    // A8. Token revocation and multi-instance persistence
    const testRevokeUser = { userId: 399, staffId: "BIN-REV-01", role: "bin_staff", assigned_bin_code: "BIN-GOL-01" };
    const testRevokeToken = generateToken(testRevokeUser, "bin_staff");
    assert("A8a. Pre-revocation token is active", !isTokenRevoked(testRevokeToken));

    revokeToken(testRevokeToken);
    assert("A8b. Token revoked in-memory", isTokenRevoked(testRevokeToken));

    const resA8c = await dispatchRequest("GET", "/api/waste/bin-staff/my-bin", { authorization: `Bearer ${testRevokeToken}` });
    assert("A8c. Revoked token rejected on API access (HTTP 401)", resA8c.status === 401);

    // Verify persistence to disk (survives restart)
    const revokedJsonPath = path.join(__dirname, "../backend/data/revoked_tokens.json");
    assert("A8d. Revoked tokens file exists on disk", fs.existsSync(revokedJsonPath));

    const fileContent = JSON.parse(fs.readFileSync(revokedJsonPath, "utf8"));
    const tokenHash = crypto.createHash("sha256").update(testRevokeToken).digest("hex");
    const foundInFile = fileContent.some(x => x.hash === tokenHash);
    assert("A8e. Token SHA-256 hash persisted to disk for restart survivability", foundInFile);

    // =========================================================================
    // SECTION B: PRODUCTION AUTHENTICATION & SCRYPT VERIFICATION
    // =========================================================================
    console.log("\n--- Section B: Production Authentication & Scrypt Hashes ---");

    // B1. Rejection of demo passwords in production
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    delete process.env.ALLOW_OFFLINE_DEMO_AUTH;

    const resB1 = await dispatchRequest("POST", "/api/staff-login", {}, { staffId: "WRK-001", password: "worker123" });
    assert("B1. Production strictly rejects demo password 'worker123' (HTTP 401/500)", resB1.status !== 200);

    const resB2 = await dispatchRequest("POST", "/api/staff-login", {}, { staffId: "WST-CC-01", password: "control123" });
    assert("B2. Production strictly rejects demo password 'control123' (HTTP 401/500)", resB2.status !== 200);

    const resB3 = await dispatchRequest("POST", "/api/staff-login", {}, { staffId: "BIN-GOL-01", password: "BIN@2026" });
    assert("B3. Production strictly rejects demo password 'BIN@2026' (HTTP 401/500)", resB3.status !== 200);

    // B4. Bypass PIN rejection
    const resB4 = await dispatchRequest("POST", "/api/waste/dustbin-terminal/auth", {}, { binCode: "BIN-GOL-01", passcode: "123456" });
    assert("B4. Production rejects bypass PIN '123456' at terminal auth (HTTP 401/404)", resB4.status !== 200);

    // B5. scrypt password hashing verification
    const plainTestPass = "StrongMunicipal#2026!Secured";
    const scryptHash = hashPasswordSync(plainTestPass);
    assert("B5a. Password hashed using scrypt format", scryptHash.startsWith("scrypt$"));
    const hashParts = scryptHash.split("$");
    assert("B5b. scrypt format contains 3 delimiter segments", hashParts.length === 3);
    assert("B5c. scrypt salt is 32-char hex (16 bytes)", hashParts[1].length === 32);
    assert("B5d. scrypt derived key is 128-char hex (64 bytes)", hashParts[2].length === 128);

    const scryptMatch = await verifyPassword(plainTestPass, scryptHash);
    assert("B5e. Valid password verifies true against scrypt hash", scryptMatch === true);

    const scryptBadMatch = await verifyPassword("WrongPassword123", scryptHash);
    assert("B5f. Wrong password verifies false against scrypt hash", scryptBadMatch === false);

    // B6. Suspended employee rejection
    // Suspend worker WRK-002
    const adminUser = { userId: 1, staffId: "WST-ADMIN", role: "admin", department: "waste" };
    const adminToken = generateToken(adminUser, "admin");

    const suspendRes = await dispatchRequest("POST", "/api/waste/admin/staff/WRK-002/status", { authorization: `Bearer ${adminToken}` }, { is_active: false, reason: "Adversarial test suspension" });
    assert("B6a. Admin successfully suspended staff WRK-002", suspendRes.status === 200);

    const suspendedWorkerToken = generateToken({ userId: 4, staffId: "WRK-002", role: "working_staff", department: "waste" }, "working_staff");
    const resB6b = await dispatchRequest("GET", "/api/waste/worker/tasks", { authorization: `Bearer ${suspendedWorkerToken}` });
    assert("B6b. Suspended employee token strictly rejected on API access (HTTP 403)", resB6b.status === 403);

    // Restore WRK-002
    await dispatchRequest("POST", "/api/waste/admin/staff/WRK-002/status", { authorization: `Bearer ${adminToken}` }, { is_active: true });

    process.env.NODE_ENV = origEnv;

    // =========================================================================
    // SECTION C: AUTHORIZATION MATRIX & ADMIN EXCLUSIVE AUTHORITY
    // =========================================================================
    console.log("\n--- Section C: Authorization Matrix & Role Isolation ---");

    const binToken = generateToken({ userId: 301, staffId: "BIN-GOL-01", role: "bin_staff", assigned_bin_code: "BIN-GOL-01", department: "waste" }, "bin_staff");
    const workerToken = generateToken({ userId: 3, staffId: "WRK-001", role: "working_staff", department: "waste", worker_id: 1 }, "working_staff");
    const ccToken = generateToken({ userId: 1, staffId: "WST-CC-01", role: "control_center", department: "waste" }, "control_center");

    // C1. BIN_STAFF denied from Control Center
    const resC1 = await dispatchRequest("GET", "/api/waste/control-center/map-data", { authorization: `Bearer ${binToken}` });
    assert("C1. BIN_STAFF blocked from Control Center GIS map (HTTP 403)", resC1.status === 403);

    // C2. BIN_STAFF denied from Worker Tasks
    const resC2 = await dispatchRequest("GET", "/api/waste/worker/tasks", { authorization: `Bearer ${binToken}` });
    assert("C2. BIN_STAFF blocked from Worker Tasks (HTTP 403)", resC2.status === 403);

    // C3. BIN_STAFF denied from Admin Workforce
    const resC3 = await dispatchRequest("GET", "/api/waste/admin/staff", { authorization: `Bearer ${binToken}` });
    assert("C3. BIN_STAFF blocked from Admin Workforce Management (HTTP 403)", resC3.status === 403);

    // C4. Working Staff denied from Control Center
    const resC4 = await dispatchRequest("GET", "/api/waste/control-center/complaints", { authorization: `Bearer ${workerToken}` });
    assert("C4. Working Staff blocked from Control Center complaints triage (HTTP 403)", resC4.status === 403);

    // C5. Working Staff denied from Admin Workforce
    const resC5 = await dispatchRequest("GET", "/api/waste/admin/staff", { authorization: `Bearer ${workerToken}` });
    assert("C5. Working Staff blocked from Admin Workforce Management (HTTP 403)", resC5.status === 403);

    // C6. Control Center denied from Admin employee provisioning
    const resC6 = await dispatchRequest("POST", "/api/waste/admin/staff", { authorization: `Bearer ${ccToken}` }, { staffId: "ROGUE-01", name: "Rogue", role: "admin", password: "123" });
    assert("C6. Control Center staff CANNOT create staff accounts (HTTP 403)", resC6.status === 403);

    // C7. Control Center denied from Admin credential reset
    const resC7 = await dispatchRequest("POST", "/api/waste/admin/staff/WRK-001/reset-password", { authorization: `Bearer ${ccToken}` }, { password: "newPass123!" });
    assert("C7. Control Center staff CANNOT reset employee credentials (HTTP 403)", resC7.status === 403);

    // C8. Admin exclusive authority
    const resC8 = await dispatchRequest("GET", "/api/waste/admin/staff", { authorization: `Bearer ${adminToken}` });
    assert("C8. Admin possesses exclusive workforce governance access (HTTP 200)", resC8.status === 200);

    // =========================================================================
    // SECTION D: BIN IDOR & MULTI-FORMAT ATTACK MATRIX
    // =========================================================================
    console.log("\n--- Section D: Bin IDOR & Multi-Format Attack Matrix ---");

    // Operator assigned to BIN-GOL-01
    // Attack 1: Query param IDOR
    const resD1 = await dispatchRequest("GET", "/api/waste/bin-staff/my-bin?binCode=BIN-CMK-02", { authorization: `Bearer ${binToken}` });
    assert("D1. Query parameter IDOR tampered bin code strictly rejected (HTTP 403)", resD1.status === 403);

    // Attack 2: Request body IDOR
    const resD2 = await dispatchRequest("POST", "/api/waste/bin-staff/trigger-collection", { authorization: `Bearer ${binToken}` }, { binCode: "BIN-CMK-02", fillPercentage: 88 });
    assert("D2. Request body IDOR tampered bin code strictly rejected (HTTP 403)", resD2.status === 403);

    // Attack 3: URL path parameter IDOR on telemetry history
    const resD3 = await dispatchRequest("GET", "/api/waste/iot/telemetry/BIN-CMK-02/history", { authorization: `Bearer ${binToken}` });
    assert("D3. URL path parameter IDOR on telemetry history strictly rejected (HTTP 403)", resD3.status === 403);

    // Attack 4: Lowercase and alternate format IDOR
    const resD4 = await dispatchRequest("GET", "/api/waste/bin-staff/my-bin?bin=bin-cmk-02", { authorization: `Bearer ${binToken}` });
    assert("D4. Alternate query format & lowercase IDOR denied (HTTP 403)", resD4.status === 403);

    // Attack 5: Authorized access to assigned bin succeeds
    const resD5 = await dispatchRequest("GET", "/api/waste/bin-staff/my-bin", { authorization: `Bearer ${binToken}` });
    assert("D5. Authorized access to assigned bin BIN-GOL-01 succeeds (HTTP 200)", resD5.status === 200 && resD5.body.bin?.bin_code === "BIN-GOL-01");

    // Attack 6: Cross-bin terminal access denied
    const resD6 = await dispatchRequest("GET", "/api/waste/dustbin-terminal/BIN-MED-05", { authorization: `Bearer ${binToken}` });
    assert("D6. BIN_STAFF access to terminal of unassigned bin BIN-MED-05 denied (HTTP 403)", resD6.status === 403);

    // =========================================================================
    // SECTION E: LOGOUT & SESSION INVALIDATION
    // =========================================================================
    console.log("\n--- Section E: Logout & Session Invalidation ---");

    const tempToken = generateToken({ userId: 501, staffId: "BIN-TEMP", role: "bin_staff", assigned_bin_code: "BIN-GOL-01" }, "bin_staff");
    const preLogoutRes = await dispatchRequest("GET", "/api/waste/bin-staff/my-bin", { authorization: `Bearer ${tempToken}` });
    assert("E1. Session valid before logout (HTTP 200)", preLogoutRes.status === 200);

    const logoutRes = await dispatchRequest("POST", "/api/logout", { authorization: `Bearer ${tempToken}` });
    assert("E2. Server logout endpoint completes successfully (HTTP 200)", logoutRes.status === 200);

    const postLogoutRes = await dispatchRequest("GET", "/api/waste/bin-staff/my-bin", { authorization: `Bearer ${tempToken}` });
    assert("E3. Post-logout access strictly denied (HTTP 401)", postLogoutRes.status === 401);

    // =========================================================================
    // SECTION F: ANDROID ASSET PARITY (13 ASSETS)
    // =========================================================================
    console.log("\n--- Section F: Android Asset Parity Verification ---");

    const assetList = [
        "pages/waste/waste.html",
        "pages/waste/waste.js",
        "pages/waste/waste.css",
        "pages/waste/bin_dashboard.html",
        "pages/waste/bin_dashboard.js",
        "pages/waste/bin_dashboard.css",
        "pages/waste/control_center.html",
        "pages/waste/control_center.js",
        "pages/waste/control_center.css",
        "pages/waste/worker_dashboard.html",
        "pages/waste/worker_dashboard.js",
        "pages/waste/worker_dashboard.css",
        "auth.js"
    ];

    let allAssetsMatched = true;
    for (const relPath of assetList) {
        const srcPath = path.join(__dirname, `../frontend/${relPath}`);
        const dstPath = path.join(__dirname, `../android/app/src/main/assets/public/${relPath}`);

        if (!fs.existsSync(srcPath) || !fs.existsSync(dstPath)) {
            allAssetsMatched = false;
            assert(`F. Asset exists: ${relPath}`, false);
            continue;
        }

        const h1 = crypto.createHash("sha256").update(fs.readFileSync(srcPath)).digest("hex");
        const h2 = crypto.createHash("sha256").update(fs.readFileSync(dstPath)).digest("hex");
        const match = (h1 === h2);
        if (!match) allAssetsMatched = false;
        assert(`F. SHA-256 parity: ${relPath}`, match);
    }
    assert("F. Total Android assets verified (13/13 exact parity)", allAssetsMatched);

    // =========================================================================
    // SECTION G: HOSPITAL PROTECTION INVARIANT
    // =========================================================================
    console.log("\n--- Section G: Hospital Protection & Module Invariants ---");

    const hospRoutesPath = path.join(__dirname, "../backend/routes/hospital.routes.js");
    const hospControllerPath = path.join(__dirname, "../backend/controllers/hospital.controller.js");

    assert("G1. Hospital routes file exists untouched", fs.existsSync(hospRoutesPath));
    assert("G2. Hospital controller file exists untouched", fs.existsSync(hospControllerPath));

    // Check git diff on hospital routes
    const execSync = require("child_process").execSync;
    const hospDiff = execSync("git diff HEAD backend/routes/hospital.routes.js", { encoding: "utf8" }).trim();
    assert("G3. Git diff confirms ZERO modifications to hospital.routes.js", hospDiff.length === 0);

    const hospCtrlDiff = execSync("git diff HEAD backend/controllers/hospital.controller.js", { encoding: "utf8" }).trim();
    assert("G4. Git diff confirms ZERO modifications to hospital.controller.js", hospCtrlDiff.length === 0);

    // =========================================================================
    // FINAL SUMMARY
    // =========================================================================
    console.log("\n========================================================================");
    console.log(`TOTAL TESTS: ${passed + failed}`);
    console.log(`PASSED:      ${passed}`);
    console.log(`FAILED:      ${failed}`);
    console.log("========================================================================");

    if (failed === 0) {
        console.log("FINAL ADVERSARIAL VERIFICATION: ALL AUDIT CHECKS PASSED PERFECTLY!");
    } else {
        console.error(`VERIFICATION FAILED: ${failed} defects detected.`);
        process.exit(1);
    }
}

runAdversarialTestSuite().catch(err => {
    console.error("Fatal test error:", err);
    process.exit(1);
});

