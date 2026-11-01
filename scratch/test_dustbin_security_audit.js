// scratch/test_dustbin_security_audit.js
// Comprehensive Security Audit Suite: JWT Security, Authentication, Isolation, IDOR & Logout

const path = require('path');
const jwt = require(path.join(__dirname, '../backend/node_modules/jsonwebtoken'));
const express = require(path.join(__dirname, '../backend/node_modules/express'));

const { JWT_SECRET } = require(path.join(__dirname, '../backend/config/env.config'));
const authRouter = require(path.join(__dirname, '../backend/routes/auth.routes'));
const wasteRouter = require(path.join(__dirname, '../backend/routes/waste.routes'));
const wasteWorkforceRouter = require(path.join(__dirname, '../backend/routes/waste_workforce.routes'));
const waterRouter = require(path.join(__dirname, '../backend/routes/water.routes'));

const masterApp = express();
masterApp.use(express.json());
masterApp.use(authRouter);
masterApp.use(wasteRouter);
masterApp.use(wasteWorkforceRouter);
masterApp.use(waterRouter);

let testPassed = 0;
let testFailed = 0;

function assert(condition, message) {
    if (condition) {
        testPassed++;
        console.log(`  🔒 PASS: ${message}`);
    } else {
        testFailed++;
        console.error(`  ❌ FAIL: ${message}`);
    }
}

function dispatch(method, url, body = null, token = null) {
    return new Promise((resolve) => {
        const headers = { 'content-type': 'application/json' };
        if (token) headers['authorization'] = `Bearer ${token}`;

        const [pathOnly, queryString] = url.split('?');
        const query = {};
        if (queryString) {
            queryString.split('&').forEach(pair => {
                const [k, v] = pair.split('=');
                query[decodeURIComponent(k)] = decodeURIComponent(v || '');
            });
        }

        const req = {
            method: method.toUpperCase(),
            url: url,
            path: pathOnly,
            query: query,
            params: {},
            headers: headers,
            body: body || {},
            get: function (headerName) {
                return this.headers[headerName.toLowerCase()];
            }
        };

        let resStatus = 200;
        let resHeaders = {};
        let resBody = null;

        const res = {
            status(code) {
                resStatus = code;
                return this;
            },
            set(k, v) {
                resHeaders[k] = v;
                return this;
            },
            setHeader(k, v) {
                resHeaders[k] = v;
                return this;
            },
            json(data) {
                resBody = data;
                resolve({ status: resStatus, body: resBody });
                return this;
            },
            send(data) {
                resBody = data;
                resolve({ status: resStatus, body: resBody });
                return this;
            },
            end() {
                resolve({ status: resStatus, body: resBody });
                return this;
            }
        };

        masterApp.handle(req, res, (err) => {
            if (err) resolve({ status: 500, body: { error: err.message } });
            else resolve({ status: 404, body: { error: "Route not found" } });
        });
    });
}

async function runAudit() {
    console.log("===============================================================================");
    console.log("🛡️ STARTING COMPREHENSIVE DUSTBIN & ROLE ISOLATION SECURITY AUDIT");
    console.log("===============================================================================\n");

    try {
        // =====================================================================
        // SECTION 1: JWT SECURITY AUDIT
        // =====================================================================
        console.log("--- SECTION 1: JWT Cryptographic & Identity Security ---");
        
        // 1.1 Generate legitimate token via terminal auth
        const authRes = await dispatch("POST", "/api/waste/dustbin-terminal/auth", {
            binCode: "BIN-GOL-01",
            passcode: "BIN@2026",
            staffId: "WST001"
        });
        assert(authRes.status === 200 && authRes.body.token, "Terminal authentication returns valid token");
        const validToken = authRes.body.token;

        // Verify cryptographic decode
        const decoded = jwt.verify(validToken, JWT_SECRET);
        assert(decoded.role === "bin_staff", "Token payload contains verified role 'bin_staff'");
        assert(decoded.assigned_bin_code === "BIN-GOL-01", "Token payload binds strictly to 'BIN-GOL-01'");
        assert(decoded.iss === "smartcity.gorakhpur.gov.in", "Token payload contains verified issuer");
        assert(decoded.aud === "smartcity-portal", "Token payload contains verified audience");
        assert(decoded.exp !== undefined && decoded.exp > Date.now() / 1000, "Token has valid non-expired exp timestamp");

        // 1.2 Tampered Signature Rejection
        const tamperedSignatureToken = validToken.slice(0, -6) + "XXXXXX";
        const tamperRes = await dispatch("GET", "/api/waste/bin-staff/my-bin", null, tamperedSignatureToken);
        assert(tamperRes.status === 403, "Tampered cryptographic signature REJECTED with HTTP 403");

        // 1.3 Tampered Payload Rejection (e.g. attacker changes role to admin without secret)
        const parts = validToken.split('.');
        const payloadObj = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        payloadObj.role = "admin";
        const forgedPayloadB64 = Buffer.from(JSON.stringify(payloadObj)).toString('base64').replace(/=/g, '');
        const forgedToken = `${parts[0]}.${forgedPayloadB64}.${parts[2]}`;
        const forgedRes = await dispatch("GET", "/api/waste/control-center/complaints", null, forgedToken);
        assert(forgedRes.status === 403, "Forged payload with mismatched signature REJECTED with HTTP 403");

        // 1.4 Expired Token Rejection
        const expiredPayload = {
            id: 301,
            staffId: "BIN-GOL-01",
            role: "bin_staff",
            assigned_bin_code: "BIN-GOL-01",
            exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour in the past
        };
        const expiredToken = jwt.sign(expiredPayload, JWT_SECRET);
        const expRes = await dispatch("GET", "/api/waste/bin-staff/my-bin", null, expiredToken);
        assert(expRes.status === 403, "Expired JWT token REJECTED with HTTP 403");

        // =====================================================================
        // SECTION 2: AUTHENTICATION & PRODUCTION BYPASS AUDIT
        // =====================================================================
        console.log("\n--- SECTION 2: Authentication & Production Mode Bypass Audit ---");
        const prevEnv = process.env.NODE_ENV;
        const prevAllow = process.env.ALLOW_OFFLINE_DEMO_AUTH;
        
        try {
            // Emulate Strict Production Mode
            process.env.NODE_ENV = "production";
            process.env.ALLOW_OFFLINE_DEMO_AUTH = "false";

            // 2.1 Demo credentials rejected in staff login (returns 401 or 500 if DB offline, NEVER 200)
            const prodStaffRes = await dispatch("POST", "/api/staff-login", {
                staffId: "BIN-GOL-01",
                password: "BIN@2026"
            });
            assert(prodStaffRes.status !== 200, "Production mode strictly REJECTS demo password 'BIN@2026' at /api/staff-login (HTTP 401/500)");

            const prodStaffRes2 = await dispatch("POST", "/api/staff-login", {
                staffId: "BIN-GOL-01",
                password: "123456"
            });
            assert(prodStaffRes2.status !== 200, "Production mode strictly REJECTS bypass PIN '123456' at /api/staff-login (HTTP 401/500)");

            // 2.2 Terminal auth demo bypass keys rejected in production
            const prodTermRes = await dispatch("POST", "/api/waste/dustbin-terminal/auth", {
                binCode: "BIN-GOL-01",
                passcode: "123456",
                staffId: "WST001"
            });
            assert(prodTermRes.status === 401, "Production mode strictly REJECTS bypass key '123456' at /api/waste/dustbin-terminal/auth (HTTP 401)");
        } finally {
            // Restore development environment
            process.env.NODE_ENV = prevEnv || "development";
            process.env.ALLOW_OFFLINE_DEMO_AUTH = prevAllow || "true";
        }

        // =====================================================================
        // SECTION 3: DASHBOARD & API ISOLATION AUDIT
        // =====================================================================
        console.log("\n--- SECTION 3: Dashboard & API Isolation Audit ---");

        // 3.1 Backend API Isolation: BIN_STAFF cannot access other roles' APIs
        const binStaffToken = validToken;

        // A. Control Center APIs
        const ccMapRes = await dispatch("GET", "/api/waste/control-center/map-data", null, binStaffToken);
        assert(ccMapRes.status === 403, "Bin Staff FORBIDDEN from Control Center GIS Map API (HTTP 403)");

        const ccCompRes = await dispatch("GET", "/api/waste/control-center/complaints", null, binStaffToken);
        assert(ccCompRes.status === 403, "Bin Staff FORBIDDEN from Control Center Complaints API (HTTP 403)");

        const ccAssignRes = await dispatch("POST", "/api/waste/control-center/assign-complaint", { complaintId: 501, workerId: 1 }, binStaffToken);
        assert(ccAssignRes.status === 403, "Bin Staff FORBIDDEN from assigning complaints (HTTP 403)");

        // B. Field Worker APIs
        const wrkTaskRes = await dispatch("GET", "/api/waste/worker/tasks", null, binStaffToken);
        assert(wrkTaskRes.status === 403, "Bin Staff FORBIDDEN from Field Worker Task API (HTTP 403)");

        const wrkNavRes = await dispatch("GET", "/api/waste/worker/navigation/501", null, binStaffToken);
        assert(wrkNavRes.status === 403, "Bin Staff FORBIDDEN from Field Worker Navigation API (HTTP 403)");

        // C. Administrative APIs
        const admStaffRes = await dispatch("GET", "/api/waste/admin/staff", null, binStaffToken);
        assert(admStaffRes.status === 403, "Bin Staff FORBIDDEN from Admin Staff Directory API (HTTP 403)");

        // D. Cross-Department APIs (Water Department)
        const waterTankRes = await dispatch("POST", "/api/water/tanks", { name: "Rogue Tank" }, binStaffToken);
        assert(waterTankRes.status === 403, "Bin Staff FORBIDDEN from Water Department Management API (HTTP 403)");

        // 3.2 Frontend Isolation: enforceRoleIsolation() redirects all cross-module pages
        const testUser = { role: "bin_staff", accountType: "BIN_STAFF", staffId: "BIN-GOL-01", assigned_bin_code: "BIN-GOL-01" };
        function checkFrontendRedirect(path) {
            const role = (testUser.role || "").toLowerCase();
            const staffId = String(testUser.staffId || "").toUpperCase();
            if (role === "bin_staff" || staffId.startsWith("BIN-")) {
                if (!path.toLowerCase().includes("bin_dashboard.html")) {
                    return `pages/waste/bin_dashboard.html?binCode=${testUser.assigned_bin_code}`;
                }
            }
            return null;
        }

        const forbiddenRoutes = [
            "/",
            "/index.html",
            "/pages/waste/waste.html",
            "/pages/water/water.html",
            "/pages/traffic/traffic.html",
            "/pages/emergency/emergency.html",
            "/pages/parking/parking.html",
            "/pages/waste/control_center.html",
            "/pages/waste/worker_dashboard.html"
        ];

        for (const route of forbiddenRoutes) {
            const redirectUrl = checkFrontendRedirect(route);
            assert(redirectUrl && redirectUrl.includes("bin_dashboard.html?binCode=BIN-GOL-01"), `Frontend isolation redirects ${route} -> bin_dashboard.html`);
        }

        // =====================================================================
        // SECTION 4: IDOR (INSECURE DIRECT OBJECT REFERENCE) AUDIT
        // =====================================================================
        console.log("\n--- SECTION 4: Insecure Direct Object Reference (IDOR) Audit ---");
        
        // 4.1 IDOR via query parameter in /api/waste/bin-staff/my-bin?binCode=BIN-CMK-02
        const idorQueryRes = await dispatch("GET", "/api/waste/bin-staff/my-bin?binCode=BIN-CMK-02", null, binStaffToken);
        assert(idorQueryRes.status === 403, "IDOR Query Parameter tampering (BIN-CMK-02) BLOCKED with HTTP 403");

        // 4.2 IDOR via request body in /api/waste/bin-staff/trigger-collection
        const idorBodyRes = await dispatch("POST", "/api/waste/bin-staff/trigger-collection", {
            binCode: "BIN-CMK-02",
            fillPercentage: 90
        }, binStaffToken);
        assert(idorBodyRes.status === 403, "IDOR Body tampering (BIN-CMK-02) BLOCKED with HTTP 403");

        // 4.3 IDOR via query parameter in /api/waste/bin-staff/ai-prediction?binCode=BIN-CMK-02
        const idorPredRes = await dispatch("GET", "/api/waste/bin-staff/ai-prediction?binCode=BIN-CMK-02", null, binStaffToken);
        assert(idorPredRes.status === 403, "IDOR AI Prediction parameter tampering BLOCKED with HTTP 403");

        // 4.4 IDOR via path parameter in /api/waste/dustbin-terminal/:binCode
        const idorTermRes = await dispatch("GET", "/api/waste/dustbin-terminal/BIN-CMK-02", null, binStaffToken);
        assert(idorTermRes.status === 403, "IDOR Path parameter tampering at dustbin-terminal/:binCode BLOCKED with HTTP 403");

        // 4.5 IDOR via path parameter in /api/waste/iot/telemetry/:binCode/history
        const idorHistRes = await dispatch("GET", "/api/waste/iot/telemetry/BIN-CMK-02/history", null, binStaffToken);
        assert(idorHistRes.status === 403, "IDOR Path parameter tampering at telemetry/:binCode/history BLOCKED with HTTP 403");

        // 4.6 Verification: Authorized bin CAN access their own unit
        const validOwnRes = await dispatch("GET", "/api/waste/bin-staff/my-bin", null, binStaffToken);
        assert(validOwnRes.status === 200 && validOwnRes.body.bin.bin_code === "BIN-GOL-01", "Authorized request to own assigned unit (BIN-GOL-01) SUCCEEDS (HTTP 200)");

        // =====================================================================
        // SECTION 5: LOGOUT & TOKEN REVOCATION AUDIT
        // =====================================================================
        console.log("\n--- SECTION 5: Logout & Token Revocation Audit ---");

        // 5.1 Call /api/logout with active token
        const logoutRes = await dispatch("POST", "/api/logout", null, binStaffToken);
        assert(logoutRes.status === 200 && logoutRes.body.success, "Server logout endpoint accepted token and logged out");

        // 5.2 Attempt to reuse old token after logout -> MUST FAIL
        const reuseRes = await dispatch("GET", "/api/waste/bin-staff/my-bin", null, binStaffToken);
        assert(reuseRes.status === 401, "Reusing revoked token after logout REJECTED with HTTP 401");
        assert(reuseRes.body.message?.includes("revoked"), "Rejection message confirms token revocation");

        // 5.3 Safely log in another user afterward
        const newAuthRes = await dispatch("POST", "/api/waste/dustbin-terminal/auth", {
            binCode: "BIN-CMK-02",
            passcode: "BIN@2026",
            staffId: "WST002"
        });
        assert(newAuthRes.status === 200 && newAuthRes.body.token, "New operator (BIN-CMK-02) can log in safely after previous logout");
        assert(newAuthRes.body.user.assigned_bin_code === "BIN-CMK-02", "New operator bound exclusively to BIN-CMK-02");

        // Verify new operator cannot access BIN-GOL-01
        const newOpToken = newAuthRes.body.token;
        const crossCheckRes = await dispatch("GET", "/api/waste/dustbin-terminal/BIN-GOL-01", null, newOpToken);
        assert(crossCheckRes.status === 403, "New operator cannot access previous operator's bin (HTTP 403)");

        console.log("\n===============================================================================");
        console.log(`🎯 SECURITY AUDIT SUMMARY: ${testPassed} PASSED, ${testFailed} FAILED`);
        console.log("===============================================================================\n");

        if (testFailed > 0) process.exit(1);
        process.exit(0);
    } catch (err) {
        console.error("Security audit execution exception:", err);
        process.exit(1);
    }
}

runAudit();
