const http = require("http");
const fs = require("fs");
const path = require("path");

const BASE = "http://localhost:5000";

let testsPassed = 0;
let testsFailed = 0;

function pass(name) {
    console.log(`  ✅ PASS: ${name}`);
    testsPassed++;
}

function fail(name, err) {
    console.error(`  ❌ FAIL: ${name}`, err || "");
    testsFailed++;
}

async function request(endpoint, options = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(endpoint, BASE);
        const reqOpts = {
            method: options.method || "GET",
            headers: options.headers || {},
            timeout: 5000
        };

        const req = http.request(url, reqOpts, (res) => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => {
                let parsed;
                try {
                    parsed = JSON.parse(data);
                } catch (_) {
                    parsed = data;
                }
                resolve({ status: res.statusCode, headers: res.headers, body: parsed });
            });
        });

        req.on("error", reject);
        req.on("timeout", () => {
            req.destroy();
            reject(new Error("Request timed out"));
        });

        if (options.body) {
            req.write(typeof options.body === "string" ? options.body : JSON.stringify(options.body));
        }
        req.end();
    });
}

async function runStabilizationTests() {
    console.log("========================================================");
    console.log("🚀 MASTER STABILIZATION & RBAC VERIFICATION SUITE");
    console.log("========================================================\n");

    // 1. Health & DB
    try {
        const h = await request("/health");
        if (h.status === 200 && h.body.status === "healthy") {
            pass("Backend & Database connection healthy (MySQL + Express 5)");
        } else {
            fail("Health check failed", h.body);
        }
    } catch (e) {
        fail("Health check failed", e.message);
    }

    // 2. Home Page Verification
    try {
        const home = await request("/");
        if (home.status === 200 && typeof home.body === "string") {
            const hasHero = home.body.includes("sc-platform-hero");
            const hasServices = home.body.includes("Official Municipal Services");
            const hasHowItWorks = home.body.includes("How the SmartCity AI Platform Operates");
            const hasAbout = home.body.includes("About Gorakhpur Smart City");
            const hasHelplines = home.body.includes("Immediate Civic Helplines");
            const hasAI = home.body.includes("smartCityAICard");
            const hasMap = home.body.includes("cityMap");
            const hasAuthOverlay = home.body.includes("authOverlay"); // should be FALSE (removed duplicate)

            if (hasHero && hasServices && hasHowItWorks && hasAbout && hasHelplines && hasAI && hasMap && !hasAuthOverlay) {
                pass("Home/Index page structured as official SmartCity showcase without duplicate auth overlay");
            } else {
                fail("Home/Index page missing expected sections", {
                    hasHero, hasServices, hasHowItWorks, hasAbout, hasHelplines, hasAI, hasMap, hasAuthOverlay
                });
            }
        } else {
            fail("Failed to load / index page");
        }
    } catch (e) {
        fail("Home page load failed", e.message);
    }

    // 3. Citizen Login & Token Generation
    let citizenToken = "";
    let citizenUser = null;
    try {
        const loginRes = await request("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: { loginId: "6306880179", password: "omkar123" }
        });
        if (loginRes.status === 200 && loginRes.body.token) {
            citizenToken = loginRes.body.token;
            citizenUser = loginRes.body.user;
            pass(`Citizen login successful: ${citizenUser.name} (${citizenUser.userId})`);
        } else {
            fail("Citizen login failed", loginRes.body);
        }
    } catch (e) {
        fail("Citizen login request failed", e.message);
    }

    // 4. Staff Login: Traffic Department
    let trafficToken = "";
    let trafficStaff = null;
    try {
        const staffRes = await request("/api/staff-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: { staffId: "TR-VERMA", password: "verma123" }
        });
        if (staffRes.status === 200 && staffRes.body.token) {
            trafficToken = staffRes.body.token;
            trafficStaff = staffRes.body.user;
            pass(`Traffic Staff login successful: ${trafficStaff.name} (${trafficStaff.department})`);
        } else {
            fail("Traffic staff login failed", staffRes.body);
        }
    } catch (e) {
        fail("Traffic staff login failed", e.message);
    }

    // 5. Staff Login: Waste Department
    let wasteToken = "";
    let wasteStaff = null;
    try {
        const wRes = await request("/api/staff-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: { staffId: "WST001", password: "123456" }
        });
        if (wRes.status === 200 && wRes.body.token) {
            wasteToken = wRes.body.token;
            wasteStaff = wRes.body.user;
            pass(`Waste Staff login successful: ${wasteStaff.name} (${wasteStaff.department})`);
        } else {
            fail("Waste staff login failed", wRes.body);
        }
    } catch (e) {
        fail("Waste staff login failed", e.message);
    }

    // 6. Admin Login
    let adminToken = "";
    try {
        const aRes = await request("/api/auth/demo-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: { role: "admin" }
        });
        if (aRes.status === 200 && aRes.body.token) {
            adminToken = aRes.body.token;
            pass("Admin authentication verified");
        } else {
            fail("Admin authentication failed", aRes.body);
        }
    } catch (e) {
        fail("Admin auth failed", e.message);
    }

    // 7. Module-Specific RBAC Test
    // Traffic staff tries to mutate waste operations (should be denied or restricted)
    try {
        const res = await request("/api/waste/requests", {
            headers: { "Authorization": `Bearer ${citizenToken}` }
        });
        if (res.status === 403) {
            pass("RBAC Enforcement: Citizen denied access to internal staff waste requests");
        } else {
            fail("RBAC failed: Citizen accessed internal staff endpoint", res.status);
        }
    } catch (e) {
        fail("RBAC test failed", e.message);
    }

    // 8. Centralized User Activity API
    try {
        const actRes = await request("/api/user/activities", {
            headers: { "Authorization": `Bearer ${citizenToken}` }
        });
        if (actRes.status === 200 && Array.isArray(actRes.body.activities)) {
            pass(`Centralized User Activity API verified (${actRes.body.count} timeline events)`);
        } else {
            fail("User activity API failed", actRes.body);
        }
    } catch (e) {
        fail("User activity request failed", e.message);
    }

    // 9. Patient Registration & QR Code Pipeline
    let patientId = "";
    try {
        const patRes = await request("/api/patients", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${citizenToken}`
            },
            body: {
                name: "Test Citizen Patient",
                mobile: "9876543210",
                bloodGroup: "O+ Positive",
                emergencyContact: "Emergency Relative",
                address: "Civil Lines, Gorakhpur"
            }
        });
        if ((patRes.status === 200 || patRes.status === 201) && patRes.body.patient) {
            patientId = patRes.body.patient.patient_id;
            pass(`Patient registration successful: ${patientId}`);
        } else if (patRes.status === 409) {
            patientId = "P-2026-000001";
            pass(`Patient ID already registered: ${patientId}`);
        } else {
            fail("Patient registration failed", patRes.body);
        }
    } catch (e) {
        fail("Patient registration failed", e.message);
    }

    // 10. Patient QR Payload
    let qrToken = "";
    if (patientId) {
        try {
            const qrRes = await request(`/api/patients/${patientId}/qr`, {
                headers: { "Authorization": `Bearer ${citizenToken}` }
            });
            if (qrRes.status === 200 && qrRes.body.qrToken) {
                qrToken = qrRes.body.qrToken;
                pass(`Patient QR code generated with secure token: ${qrToken}`);
            } else {
                fail("Patient QR generation failed", qrRes.body);
            }
        } catch (e) {
            fail("Patient QR request failed", e.message);
        }
    }

    // 11. Patient QR Verification (Public / Masked vs Authorized)
    if (qrToken) {
        try {
            // Unauthenticated scan: Returns masked public summary
            const pubScan = await request("/api/patients/verify-qr", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: { qrToken }
            });
            if (pubScan.status === 200 && pubScan.body.authorized === false && pubScan.body.verification) {
                pass("Patient QR Public Scan: Returns privacy-masked summary without clinical history");
            } else {
                fail("Public QR scan returned unexpected response", pubScan.body);
            }

            // Doctor / Admin authenticated scan: Returns full clinical records
            const docScan = await request("/api/patients/verify-qr", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${adminToken}`
                },
                body: { qrToken }
            });
            if (docScan.status === 200 && docScan.body.authorized === true && docScan.body.patient) {
                pass("Patient QR Authorized Scan: Returns full clinical dossier for authorized medical authority");
            } else {
                fail("Authorized QR scan failed", docScan.body);
            }
        } catch (e) {
            fail("QR verification test failed", e.message);
        }
    }

    // 12. Centralized Logout
    try {
        const loRes = await request("/api/auth/logout", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${citizenToken}`
            }
        });
        if (loRes.status === 200 && loRes.body.success) {
            pass("Centralized logout endpoint (POST /api/auth/logout) verified");
        } else {
            fail("Logout endpoint failed", loRes.body);
        }
    } catch (e) {
        fail("Logout request failed", e.message);
    }

    // 13. Frontend JavaScript Syntax Integrity
    const jsFiles = [
        "frontend/auth.js",
        "frontend/script.js",
        "frontend/realtime.js",
        "frontend/pages/traffic/traffic.js",
        "frontend/pages/parking/parking.js",
        "frontend/pages/hospital/hospital.js",
        "frontend/pages/waste/waste.js",
        "frontend/pages/water/water.js",
        "frontend/pages/emergency/emergency.js"
    ];

    for (const f of jsFiles) {
        try {
            const code = fs.readFileSync(path.join(__dirname, "..", f), "utf8");
            new Function(code);
            pass(`Syntax validation passed: ${f}`);
        } catch (err) {
            fail(`Syntax error in ${f}`, err.message);
        }
    }

    console.log("\n========================================================");
    console.log(`TOTAL: ${testsPassed + testsFailed} TESTS | ${testsPassed} PASSED | ${testsFailed} FAILED`);
    console.log("========================================================");

    process.exit(testsFailed > 0 ? 1 : 0);
}

runStabilizationTests().catch(err => {
    console.error("Unhandled test runner error:", err);
    process.exit(1);
});
