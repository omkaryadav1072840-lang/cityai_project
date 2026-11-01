/**
 * SmartCity AI - Master Verification Test for Staff Login & Dustbin Terminal
 */

const authRoutes = require("../backend/routes/auth.routes");
const wasteRoutes = require("../backend/routes/waste.routes");

function mockRoute(router, method, path, body = {}) {
    return new Promise((resolve) => {
        const req = {
            method,
            url: path,
            originalUrl: path,
            path: path,
            body,
            params: {},
            query: {},
            headers: { "content-type": "application/json" },
            app: { get: () => null }
        };

        const res = {
            statusCode: 200,
            headers: {},
            setHeader(k, v) { this.headers[k] = v; },
            status(code) { this.statusCode = code; return this; },
            json(data) { resolve({ statusCode: this.statusCode, body: data }); return this; },
            send(data) { resolve({ statusCode: this.statusCode, body: data }); return this; }
        };

        router.handle(req, res, (err) => {
            if (err) resolve({ statusCode: 500, error: err });
            else resolve({ statusCode: 404, error: "Not matched" });
        });
    });
}

async function runAllVerification() {
    console.log("🚀 Running Master Verification Test Suite...\n");

    // 1. Test Staff Login with WST001
    console.log("1. Testing Staff Login with WST001 / 123456...");
    const r1 = await mockRoute(authRoutes, "POST", "/api/staff-login", { staffId: "WST001", password: "123456" });
    console.log("   Result:", r1.statusCode, r1.body.success, r1.body.message, r1.body.user?.department);
    if (!r1.body.success) throw new Error("WST001 login failed");

    // 2. Test Staff Login with BIN-GOL-01 (when user mistakenly types dustbin code in staff login)
    console.log("2. Testing Staff Login with BIN-GOL-01 / BIN@2026...");
    const r2 = await mockRoute(authRoutes, "POST", "/api/staff-login", { staffId: "BIN-GOL-01", password: "BIN@2026" });
    console.log("   Result:", r2.statusCode, r2.body.success, r2.body.message, r2.body.user?.department);
    if (!r2.body.success) throw new Error("BIN-GOL-01 operator login failed");

    // 3. Test Staff Login with STAFF-001
    console.log("3. Testing Staff Login with STAFF-001 / admin...");
    const r3 = await mockRoute(authRoutes, "POST", "/api/staff-login", { staffId: "STAFF-001", password: "admin" });
    console.log("   Result:", r3.statusCode, r3.body.success, r3.body.user?.role);
    if (!r3.body.success) throw new Error("STAFF-001 login failed");

    // 4. Test Demo Persona Login for waste
    console.log("4. Testing Demo Persona Login for 'waste'...");
    const r4 = await mockRoute(authRoutes, "POST", "/api/auth/demo-login", { persona: "waste" });
    console.log("   Result:", r4.statusCode, r4.body.success, r4.body.message, r4.body.user?.department);
    if (!r4.body.success) throw new Error("Waste demo login failed");

    // 5. Test Dustbin Terminal Auth
    console.log("5. Testing Dustbin Terminal Auth (BIN-GOL-01, BIN@2026)...");
    const r5 = await mockRoute(wasteRoutes, "POST", "/api/waste/dustbin-terminal/auth", {
        binCode: "BIN-GOL-01",
        passcode: "BIN@2026"
    });
    console.log("   Result:", r5.statusCode, r5.body.success, r5.body.bin?.name, r5.body.bin?.footfall_analysis?.frequency_text);
    if (!r5.body.success) throw new Error("Dustbin Terminal auth failed");

    console.log("\n🎉 ALL 5 TESTS PASSED WITH 100% SUCCESS!");
    process.exit(0);
}

runAllVerification().catch(e => {
    console.error("Test failed:", e);
    process.exit(1);
});

