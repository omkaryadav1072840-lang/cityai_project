// scratch/test_dustbin_unlock_and_isolation.js
// Verification for Dustbin Dashboard Unlocking and Strict Single-Bin Role Isolation

const path = require('path');
const express = require(path.join(__dirname, '../backend/node_modules/express'));

const authRouter = require(path.join(__dirname, '../backend/routes/auth.routes'));
const wasteRouter = require(path.join(__dirname, '../backend/routes/waste.routes'));
const wasteWorkforceRouter = require(path.join(__dirname, '../backend/routes/waste_workforce.routes'));

const masterApp = express();
masterApp.use(express.json());
masterApp.use(authRouter);
masterApp.use(wasteRouter);
masterApp.use(wasteWorkforceRouter);

let testPassed = 0;
let testFailed = 0;

function assert(condition, message) {
    if (condition) {
        testPassed++;
        console.log(`  ✅ PASS: ${message}`);
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

async function runTests() {
    console.log("=========================================================================");
    console.log("VERIFYING DUSTBIN DASHBOARD UNLOCK & ROLE ISOLATION");
    console.log("=========================================================================\n");

    try {
        // TEST 1: Terminal Auth Endpoint Returns Full Session & Dedicated Route
        console.log("--- TEST 1: POST /api/waste/dustbin-terminal/auth ---");
        const termRes = await dispatch("POST", "/api/waste/dustbin-terminal/auth", {
            binCode: "BIN-GOL-01",
            passcode: "BIN@2026",
            staffId: "WST001"
        });
        assert(termRes.status === 200 && termRes.body.success, "Terminal unlocked successfully");
        assert(termRes.body.token !== undefined, "Terminal auth generated valid JWT token");
        assert(termRes.body.user !== undefined, "Terminal auth generated user object");
        assert(termRes.body.user.role === "bin_staff", "User role is 'bin_staff'");
        assert(termRes.body.user.assigned_bin_code === "BIN-GOL-01", "User assigned to BIN-GOL-01");
        assert(termRes.body.targetDashboard.includes("bin_dashboard.html?binCode=BIN-GOL-01"), "targetDashboard correctly points to bin_dashboard.html");
        assert(termRes.body.bin !== undefined, "Live telemetry analytics payload included");

        // TEST 2: Staff Login with Dustbin Credentials
        console.log("\n--- TEST 2: POST /api/staff-login with Dustbin Operator ID ---");
        const staffRes = await dispatch("POST", "/api/staff-login", {
            staffId: "BIN-GOL-01",
            password: "BIN@2026"
        });
        assert(staffRes.status === 200 && staffRes.body.success, "Dustbin credentials accepted at staff login");
        assert(staffRes.body.role === "bin_staff", "Role correctly identified as bin_staff");
        assert(staffRes.body.targetDashboard.includes("pages/waste/bin_dashboard.html?binCode=BIN-GOL-01"), "Login routes directly to dedicated bin_dashboard.html");
        assert(staffRes.body.user.assigned_bin_code === "BIN-GOL-01", "Assigned bin code preserved");

        // TEST 3: Authorized Bin Telemetry Access with Generated Token
        console.log("\n--- TEST 3: Access Dedicated Unit Telemetry with Token ---");
        const binRes = await dispatch("GET", "/api/waste/bin-staff/my-bin", null, termRes.body.token);
        assert(binRes.status === 200 && binRes.body.success, "Bin operator fetched assigned unit telemetry");
        assert(binRes.body.bin.bin_code === "BIN-GOL-01", "Restricted strictly to unit BIN-GOL-01");

        // TEST 4: Frontend Role Isolation Guard Logic Verification
        console.log("\n--- TEST 4: Role Isolation Guard Rules (Browser Environment Simulation) ---");
        const mockUser = staffRes.body.user;
        let redirectedTo = null;

        function simulateIsolation(user, currentPath) {
            redirectedTo = null;
            const role = (user.role || user.accountType || "").toLowerCase();
            const staffId = String(user.staffId || "").toUpperCase();
            const isBinOperator = role === "bin_staff" || staffId.startsWith("BIN-");
            if (isBinOperator) {
                if (!currentPath.includes("bin_dashboard.html")) {
                    const assignedBin = user.assigned_bin_code || (staffId.startsWith("BIN-") ? staffId : "BIN-GOL-01");
                    redirectedTo = `pages/waste/bin_dashboard.html?binCode=${encodeURIComponent(assignedBin)}`;
                    return true;
                }
            }
            return false;
        }

        // Case A: Bin Operator attempts to visit waste.html -> MUST REDIRECT
        const didRedirectWaste = simulateIsolation(mockUser, "/pages/waste/waste.html");
        assert(didRedirectWaste && redirectedTo.includes("bin_dashboard.html?binCode=BIN-GOL-01"), "Bin operator visiting waste.html is redirected to bin_dashboard.html");

        // Case B: Bin Operator attempts to visit index.html -> MUST REDIRECT
        const didRedirectIndex = simulateIsolation(mockUser, "/index.html");
        assert(didRedirectIndex && redirectedTo.includes("bin_dashboard.html?binCode=BIN-GOL-01"), "Bin operator visiting index.html is redirected to bin_dashboard.html");

        // Case C: Bin Operator on bin_dashboard.html -> ALLOWED (NO REDIRECT)
        const didRedirectDashboard = simulateIsolation(mockUser, "/pages/waste/bin_dashboard.html");
        assert(!didRedirectDashboard && redirectedTo === null, "Bin operator on bin_dashboard.html is permitted to stay");

        // Case D: Admin visiting waste.html -> ALLOWED (NO REDIRECT)
        const adminUser = { role: "admin", staffId: "WST-ADMIN" };
        const didRedirectAdmin = simulateIsolation(adminUser, "/pages/waste/waste.html");
        assert(!didRedirectAdmin, "Admin is permitted to view waste.html");

        console.log("\n=========================================================================");
        console.log(`SUMMARY: ${testPassed} PASSED, ${testFailed} FAILED`);
        console.log("=========================================================================\n");

        if (testFailed > 0) process.exit(1);
        process.exit(0);
    } catch (err) {
        console.error("Test execution exception:", err);
        process.exit(1);
    }
}

runTests();
