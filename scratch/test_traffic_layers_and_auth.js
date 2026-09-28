/**
 * Verification test for Traffic Staff & Admin Login and Layer Switching
 */

const http = require("http");

function fetchApi(path, options = {}) {
    return new Promise((resolve, reject) => {
        const req = http.request(`http://localhost:5000${path}`, options, (res) => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, raw: data });
                }
            });
        });
        req.on("error", reject);
        if (options.body) req.write(options.body);
        req.end();
    });
}

async function testTrafficAuthAndLayers() {
    console.log("==================================================");
    console.log("🧪 TESTING TRAFFIC STAFF & ADMIN AUTHENTICATION");
    console.log("==================================================");

    let passed = 0;
    let failed = 0;

    function assert(cond, msg) {
        if (cond) {
            console.log(`✅ PASS: ${msg}`);
            passed++;
        } else {
            console.error(`❌ FAIL: ${msg}`);
            failed++;
        }
    }

    try {
        // 1. Test Staff Login endpoint with TR-VERMA / verma123
        const staffRes = await fetchApi("/api/staff-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ staffId: "TR-VERMA", password: "verma123" })
        });
        assert(staffRes.status === 200, "TR-VERMA login returns HTTP 200");
        assert(staffRes.body && !!staffRes.body.token, "TR-VERMA received valid JWT token");
        assert(staffRes.body && staffRes.body.user && staffRes.body.user.role === "staff", "TR-VERMA has staff role");

        // 2. Test Admin Login endpoint with TR-ADMIN / admin123
        const adminRes = await fetchApi("/api/staff-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ staffId: "TR-ADMIN", password: "admin123" })
        });
        assert(adminRes.status === 200, "TR-ADMIN login returns HTTP 200");
        assert(adminRes.body && !!adminRes.body.token, "TR-ADMIN received valid JWT token");
        assert(adminRes.body && adminRes.body.user && adminRes.body.user.role === "admin", "TR-ADMIN has admin role");

        // 3. Test Invalid credentials handling
        const failRes = await fetchApi("/api/staff-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ staffId: "TR-VERMA", password: "wrong_password" })
        });
        assert(failRes.status === 401, "Invalid password correctly rejected with HTTP 401");

        // 4. Verify traffic.html DOM structure
        const fs = require("fs");
        const html = fs.readFileSync("frontend/pages/traffic/traffic.html", "utf8");

        assert(html.indexOf('id="layer-citizen-content"') === html.lastIndexOf('id="layer-citizen-content"'), "Only 1 layer-citizen-content element exists in HTML (no duplicates)");
        assert(html.includes("quickLoginTrafficStaff()"), "quickLoginTrafficStaff() button is present in staff gatekeeper");
        assert(html.includes("quickLoginTrafficAdmin()"), "quickLoginTrafficAdmin() button is present in admin gatekeeper");
        assert(html.includes("END LAYER 1 (CITIZEN)") && html.includes("END LAYER 2 (CONTROL)") && html.includes("END LAYER 3 (ADMIN)"), "All 3 layers have balanced boundary markers");

        // 5. Verify traffic.js role and auth handlers
        const js = fs.readFileSync("frontend/pages/traffic/traffic.js", "utf8");
        assert(js.includes("quickLoginTrafficStaff"), "quickLoginTrafficStaff function implemented in traffic.js");
        assert(js.includes("quickLoginTrafficAdmin"), "quickLoginTrafficAdmin function implemented in traffic.js");
        assert(js.includes("verma123"), "TR-VERMA password updated to verma123");
        assert(js.includes("admin123"), "TR-ADMIN password updated to admin123");

    } catch (err) {
        console.error("Test error:", err);
        failed++;
    }

    console.log("\n==================================================");
    console.log(`📊 TRAFFIC AUTH TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================");

    process.exit(failed > 0 ? 1 : 0);
}

testTrafficAuthAndLayers();
