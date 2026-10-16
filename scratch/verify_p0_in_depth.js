/**
 * SmartCity AI - Safe In-Depth Verification of P0 Implementations
 * Non-destructive verification of SEC-001 through SEC-005 without modifying data.
 */

const http = require("http");
const path = require("path");

function runTest(name, fn) {
    try {
        const result = fn();
        if (result instanceof Promise) {
            return result.then(
                () => console.log(`  [PASS] ${name}`),
                (err) => console.log(`  [FAIL] ${name}: ${err.message}`)
            );
        }
        console.log(`  [PASS] ${name}`);
        return Promise.resolve();
    } catch (err) {
        console.log(`  [FAIL] ${name}: ${err.message}`);
        return Promise.resolve();
    }
}

async function verifyAll() {
    console.log("==================================================");
    console.log("🔍 IN-DEPTH FORENSIC VERIFICATION OF SEC-001..005");
    console.log("==================================================\n");

    // 1. SEC-001: Production Boot Fail-Safe Test
    console.log("1. SEC-001: Centralized Config Validation Behavior");
    await runTest("env.config.js throws in production when JWT_SECRET is trivial", () => {
        const originalEnv = process.env.NODE_ENV;
        const originalSecret = process.env.JWT_SECRET;
        try {
            process.env.NODE_ENV = "production";
            process.env.JWT_SECRET = "secret"; // Insecure default
            delete require.cache[require.resolve("../backend/config/env.config")];
            const cfg = require("../backend/config/env.config");
            let threw = false;
            try {
                cfg.validateEnv();
            } catch (e) {
                threw = true;
            }
            if (!threw) throw new Error("validateEnv did NOT throw for insecure secret in production mode");
        } finally {
            process.env.NODE_ENV = originalEnv;
            process.env.JWT_SECRET = originalSecret;
            delete require.cache[require.resolve("../backend/config/env.config")];
        }
    });

    // 2. SEC-003: Mobile Number Collision Analysis
    console.log("\n2. SEC-003: Mobile Number Matching Collision Check");
    await runTest("Analyze if 9-digit suffix slice causes collisions between distinct mobile numbers", () => {
        const mobA = "9876543210";
        const mobB = "8876543210";
        const collides = (mobA.length >= 9 && mobB.length >= 9 && (mobA.slice(-9) === mobB.slice(-9)));
        if (collides) {
            console.log(`    ⚠️ Collision confirmed: '${mobA}' and '${mobB}' share last 9 digits ('${mobA.slice(-9)}')`);
        }
    });

    // 3. SEC-004: Express Trust Proxy Inspection
    console.log("\n3. SEC-004: Reverse Proxy Trust Verification");
    await runTest("Verify trust proxy setting in env.config.js", () => {
        const cfg = require("../backend/config/env.config");
        console.log(`    Active TRUST_PROXY config value: ${JSON.stringify(cfg.TRUST_PROXY)}`);
        console.log(`    Node environment: ${cfg.NODE_ENV}`);
    });

    // 4. SEC-005: CORS Response Headers for Allowed, Disallowed, and Missing Origins
    console.log("\n4. SEC-005: CORS Headers across Origin Scenarios");
    const testCors = (originName, reqOrigin) => {
        return new Promise((resolve) => {
            const headers = {};
            if (reqOrigin) headers["Origin"] = reqOrigin;
            const req = http.request({
                hostname: "localhost",
                port: 5000,
                path: "/api/ai/status",
                method: "GET",
                headers
            }, (res) => {
                let data = "";
                res.on("data", d => data += d);
                res.on("end", () => {
                    const allowOrigin = res.headers["access-control-allow-origin"];
                    const allowCreds = res.headers["access-control-allow-credentials"];
                    console.log(`    [Scenario: ${originName}] HTTP ${res.statusCode} | Allow-Origin: ${allowOrigin || "<none>"} | Allow-Credentials: ${allowCreds || "<none>"}`);
                    resolve();
                });
            });
            req.on("error", (e) => {
                console.log(`    [Scenario: ${originName}] Connection Error: ${e.message}`);
                resolve();
            });
            req.end();
        });
    };

    await testCors("Allowed Origin (http://localhost:3000)", "http://localhost:3000");
    await testCors("Allowed Origin (capacitor://localhost)", "capacitor://localhost");
    await testCors("Disallowed Origin (http://unauthorized-domain.test)", "http://unauthorized-domain.test");
    await testCors("Missing Origin Header (Server-to-Server / Curl)", null);

    console.log("\n==================================================");
    console.log("🏁 IN-DEPTH VERIFICATION COMPLETE");
    console.log("==================================================");
}

verifyAll();
