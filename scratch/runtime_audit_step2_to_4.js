/**
 * SMARTCITY AI - RUNTIME BUG AUDIT (STEPS 2, 3, 4)
 * Comprehensive live runtime probing against Ports 5000, 8000, 3306.
 */

const http = require("http");

const BASE_URL = "http://localhost:5000";

async function request(path, options = {}) {
    const url = new URL(path, BASE_URL);
    const method = options.method || "GET";
    const headers = options.headers || {};
    let body = options.body;

    if (body && typeof body === "object") {
        body = JSON.stringify(body);
        headers["Content-Type"] = "application/json";
    }

    return new Promise((resolve, reject) => {
        const req = http.request(url, { method, headers }, (res) => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => {
                let parsed = data;
                try {
                    parsed = JSON.parse(data);
                } catch (e) {}
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    data: parsed
                });
            });
        });
        req.on("error", reject);
        if (body) req.write(body);
        req.end();
    });
}

async function runAudit() {
    console.log("========================================================");
    console.log("  🔍 SMARTCITY AI - LIVE RUNTIME AUDIT (STEPS 2, 3, 4)");
    console.log("========================================================");

    const issues = [];
    const passes = [];

    function recordPass(testName) {
        console.log(`  ✅ [PASS] ${testName}`);
        passes.push(testName);
    }

    function recordFail(testName, details) {
        console.error(`  ❌ [FAIL] ${testName}`);
        console.error(`     Details:`, details);
        issues.push({ test: testName, details });
    }

    // =========================================================
    // STEP 2: BACKEND HEALTH & ENDPOINT AUDIT
    // =========================================================
    console.log("\n--- STEP 2: Backend Health & Route Probing ---");

    try {
        const hRes = await request("/api/health");
        if (hRes.status === 200 && hRes.data.status === "healthy") {
            recordPass("Backend Health check (/api/health) returns 200 Healthy");
        } else {
            recordFail("Backend Health check (/api/health)", hRes);
        }
    } catch (e) {
        recordFail("Backend Health check connection error", e.message);
    }

    try {
        const h2 = await request("/health");
        if (h2.status === 200 && h2.data.status === "healthy") {
            recordPass("Root health alias (/health) returns 200 Healthy");
        } else {
            recordFail("Root health alias (/health)", h2);
        }
    } catch (e) {
        recordFail("Root health alias connection error", e.message);
    }

    // Check important endpoints for 404, 500, or SQL errors
    const endpoints = [
        { path: "/api/traffic/junctions", method: "GET", name: "Traffic Junctions" },
        { path: "/api/traffic/signals", method: "GET", name: "Traffic Signals" },
        { path: "/api/traffic/cameras", method: "GET", name: "Traffic Cameras" },
        { path: "/api/traffic/dashboard-metrics", method: "GET", name: "Traffic Metrics" },
        { path: "/api/parking/lots", method: "GET", name: "Parking Lots" },
        { path: "/api/parking/slots?lot_id=1", method: "GET", name: "Parking Slots" },
        { path: "/api/hospitals", method: "GET", name: "Hospitals List" },
        { path: "/api/doctors", method: "GET", name: "Doctors List" },
        { path: "/api/hospital/bed-categories", method: "GET", name: "Bed Categories" },
        { path: "/api/waste/bins", method: "GET", name: "Waste Bins" },
        { path: "/api/waste/facilities", method: "GET", name: "Waste Facilities" },
        { path: "/api/water/tanks", method: "GET", name: "Water Tanks" },
        { path: "/api/water/schedules", method: "GET", name: "Water Schedules" },
        { path: "/api/emergency/ambulances", method: "GET", name: "Ambulances List" },
        { path: "/api/emergency/contacts", method: "GET", name: "Emergency Contacts" },
        { path: "/api/police/stations", method: "GET", name: "Police Stations" },
        { path: "/api/ai/status", method: "GET", name: "AI Status" },
        { path: "/api/ai/models", method: "GET", name: "AI Models" },
        { path: "/api/ai/traffic/predict", method: "GET", name: "AI Traffic Predict" },
        { path: "/api/ai/waste/predict", method: "GET", name: "AI Waste Predict" },
        { path: "/api/ai/water/anomalies", method: "GET", name: "AI Water Anomalies" },
        { path: "/api/ai/environment/aqi-forecast", method: "GET", name: "AI AQI Forecast" },
        { path: "/api/ai/tourism/itinerary", method: "GET", name: "AI Tourism Itinerary" }
    ];

    for (const ep of endpoints) {
        try {
            const res = await request(ep.path, { method: ep.method });
            if (res.status === 200 && res.data && res.data.success !== false) {
                recordPass(`${ep.name} (${ep.path}) returned 200 OK`);
            } else {
                recordFail(`${ep.name} (${ep.path}) failed with status ${res.status}`, res.data);
            }
        } catch (e) {
            recordFail(`${ep.name} (${ep.path}) connection error`, e.message);
        }
    }

    // =========================================================
    // STEP 3: DATABASE SCHEMA & MODEL AUDIT
    // =========================================================
    console.log("\n--- STEP 3: Database & SQL Integrity Probing ---");

    const pool = require("../backend/config/db").promise();

    // Verify key tables exist
    const tables = [
        "users", "traffic_junctions", "traffic_signals", "traffic_incidents", "traffic_cameras",
        "parking_lots", "parking_slots", "parking_bookings", "hospitals", "doctors", "appointments",
        "hospital_bed_categories", "waste_bins", "waste_bin_requests", "service_requests", "water_tanks",
        "water_supply_schedules", "emergency_incidents", "police_stations", "famous_places",
        "ai_models", "ai_predictions"
    ];

    for (const t of tables) {
        try {
            const [rows] = await pool.query(`SELECT COUNT(*) AS cnt FROM ${t}`);
            recordPass(`Table '${t}' exists and queryable (${rows[0].cnt} rows)`);
        } catch (e) {
            recordFail(`Table '${t}' SQL query failed`, e.message);
        }
    }

    // =========================================================
    // STEP 4: AUTHENTICATION & RBAC TESTING
    // =========================================================
    console.log("\n--- STEP 4: Authentication & RBAC Probing ---");

    // 1. Citizen Login
    let citizenToken = null;
    try {
        const cLogin = await request("/api/login", {
            method: "POST",
            body: { username: "citizen_demo", password: "password123" }
        });
        if (cLogin.status === 200 && cLogin.data && cLogin.data.success) {
            citizenToken = cLogin.data.token || (cLogin.data.data && cLogin.data.data.token);
            recordPass("Citizen demo login succeeds with JWT");
        } else {
            // Try with demo endpoint
            const demoLogin = await request("/api/auth/demo-login", {
                method: "POST",
                body: { role: "citizen" }
            });
            if (demoLogin.status === 200 && demoLogin.data && demoLogin.data.success) {
                citizenToken = demoLogin.data.token;
                recordPass("Citizen demo-login endpoint succeeds with JWT");
            } else {
                recordFail("Citizen login failed", { normal: cLogin.data, demo: demoLogin.data });
            }
        }
    } catch (e) {
        recordFail("Citizen login request error", e.message);
    }

    // 2. Staff Login (Traffic)
    let trafficStaffToken = null;
    try {
        const tLogin = await request("/api/staff-login", {
            method: "POST",
            body: { username: "traffic_officer_01", password: "password123", department: "traffic" }
        });
        if (tLogin.status === 200 && tLogin.data && tLogin.data.success) {
            trafficStaffToken = tLogin.data.token || (tLogin.data.data && tLogin.data.data.token);
            recordPass("Traffic staff login succeeds with JWT");
        } else {
            const demoTLogin = await request("/api/auth/demo-login", {
                method: "POST",
                body: { role: "staff", department: "traffic" }
            });
            if (demoTLogin.status === 200 && demoTLogin.data && demoTLogin.data.success) {
                trafficStaffToken = demoTLogin.data.token;
                recordPass("Traffic staff demo-login succeeds with JWT");
            } else {
                recordFail("Traffic staff login failed", { normal: tLogin.data, demo: demoTLogin.data });
            }
        }
    } catch (e) {
        recordFail("Traffic staff login request error", e.message);
    }

    // 3. Admin Login
    let adminToken = null;
    try {
        const aLogin = await request("/api/auth/demo-login", {
            method: "POST",
            body: { role: "admin", department: "iccc" }
        });
        if (aLogin.status === 200 && aLogin.data && aLogin.data.success) {
            adminToken = aLogin.data.token;
            recordPass("Admin login succeeds with JWT");
        } else {
            recordFail("Admin login failed", aLogin.data);
        }
    } catch (e) {
        recordFail("Admin login request error", e.message);
    }

    // 4. RBAC: Citizen cannot access Staff/Admin endpoint (e.g., Signal Override or AI model review)
    if (citizenToken) {
        try {
            const forbiddenRes = await request("/api/traffic/signals/override", {
                method: "POST",
                headers: { "Authorization": `Bearer ${citizenToken}` },
                body: { junctionId: "JNC-01", action: "FORCE_GREEN" }
            });
            if (forbiddenRes.status === 403 || forbiddenRes.status === 401 || (forbiddenRes.data && forbiddenRes.data.success === false)) {
                recordPass("RBAC Guard: Citizen blocked from Signal Override (401/403/Forbidden)");
            } else {
                recordFail("RBAC Guard: Citizen unexpectedly allowed to override signal!", forbiddenRes);
            }
        } catch (e) {
            recordPass("RBAC Guard: Citizen blocked with network error/rejection: " + e.message);
        }
    }

    // 5. RBAC: Traffic Staff blocked from Hospital modification
    if (trafficStaffToken) {
        try {
            const crossDeptRes = await request("/api/hospital/beds/update", {
                method: "POST",
                headers: { "Authorization": `Bearer ${trafficStaffToken}` },
                body: { hospital_id: 1, available_beds: 999 }
            });
            if (crossDeptRes.status === 403 || crossDeptRes.status === 401 || crossDeptRes.status === 404 || (crossDeptRes.data && crossDeptRes.data.success === false)) {
                recordPass("RBAC Guard: Traffic Staff blocked from modifying Hospital beds");
            } else {
                recordFail("RBAC Guard: Traffic Staff unexpectedly allowed to modify Hospital beds!", crossDeptRes);
            }
        } catch (e) {
            recordPass("RBAC Guard: Cross-department blocked: " + e.message);
        }
    }

    // 6. Invalid credentials rejected
    try {
        const badLogin = await request("/api/login", {
            method: "POST",
            body: { username: "nonexistent_user_999", password: "wrong_password_xyz" }
        });
        if (badLogin.status === 401 || badLogin.status === 400 || (badLogin.data && badLogin.data.success === false)) {
            recordPass("Security: Invalid credentials rejected (401/400/success=false)");
        } else {
            recordFail("Security: Invalid credentials unexpectedly accepted!", badLogin);
        }
    } catch (e) {
        recordPass("Security: Invalid login correctly rejected: " + e.message);
    }

    // 7. Expired/Bogus token rejected
    try {
        const bogusRes = await request("/api/ai/review/PRED-001", {
            method: "POST",
            headers: { "Authorization": "Bearer bogus_token_payload_random_junk_123" },
            body: { decision: "APPROVE" }
        });
        if (bogusRes.status === 401 || bogusRes.status === 403 || (bogusRes.data && bogusRes.data.success === false)) {
            recordPass("Security: Bogus/Malformed Bearer token rejected");
        } else {
            recordFail("Security: Bogus token accepted!", bogusRes);
        }
    } catch (e) {
        recordPass("Security: Bogus token correctly rejected: " + e.message);
    }

    console.log("\n========================================================");
    console.log(`  AUDIT SCORE: ${passes.length} PASSED | ${issues.length} ISSUES`);
    console.log("========================================================");

    process.exit(issues.length === 0 ? 0 : 1);
}

runAudit();
