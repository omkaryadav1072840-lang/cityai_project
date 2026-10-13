/**
 * SmartCity AI - Sewage Network Planner & 3D Route Designer
 * Comprehensive Automated Backend Test Suite
 */

const http = require("http");
const path = require("path");
const jwt = require(path.join(__dirname, "..", "backend", "node_modules", "jsonwebtoken"));
const dotenv = require(path.join(__dirname, "..", "backend", "node_modules", "dotenv"));
dotenv.config({ path: path.join(__dirname, "..", "backend", ".env") });
const assert = require("assert");

const JWT_SECRET = process.env.JWT_SECRET || "smartcity_secret_key_2026_secure";

// Helper: Make HTTP request to backend
function request(path, method = "GET", body = null, token = null) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const options = {
            hostname: "localhost",
            port: 5000,
            path,
            method,
            headers: {
                "Content-Type": "application/json",
                ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
                ...(token ? { "Authorization": `Bearer ${token}` } : {})
            }
        };

        const req = http.request(options, (res) => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => {
                try {
                    const parsed = data ? JSON.parse(data) : {};
                    resolve({ status: res.statusCode, headers: res.headers, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, headers: res.headers, raw: data });
                }
            });
        });

        req.on("error", reject);
        if (payload) req.write(payload);
        req.end();
    });
}

// Generate tokens for test roles
function createToken(role, dept, subRole = null) {
    return jwt.sign({
        id: `TEST-${role.toUpperCase()}-${dept ? dept.toUpperCase() : "GUEST"}`,
        name: `Test ${role} (${dept || "general"})`,
        role: role,
        department: dept,
        subRole: subRole
    }, JWT_SECRET, { expiresIn: "1h" });
}

const waterAdminToken = createToken("admin", "water", "Superintendent Engineer Water Admin");
const waterStaffToken = createToken("staff", "water", "pipeline_maintenance");
const trafficStaffToken = createToken("staff", "traffic", "traffic_operator");
const citizenToken = createToken("citizen", "citizen");

async function runTests() {
    console.log("📐 =============================================================");
    console.log("📐 SEWAGE NETWORK PLANNER & 3D ROUTE DESIGNER — TEST SUITE");
    console.log("📐 =============================================================\n");

    let testsPassed = 0;
    let testsFailed = 0;

    async function testCase(name, fn) {
        try {
            await fn();
            console.log(`  ✅ [PASS] ${name}`);
            testsPassed++;
        } catch (err) {
            console.error(`  ❌ [FAIL] ${name}`);
            console.error(`     Error: ${err.message}`);
            testsFailed++;
        }
    }

    // SECTION 1: RBAC & ACCESS CONTROL
    console.log("--- SECTION 1: RBAC & AUTHORIZATION GUARDRAILS ---");

    await testCase("1.1 Unauthenticated request to /api/water/sewage-planner/routes is denied (401)", async () => {
        const res = await request("/api/water/sewage-planner/routes", "GET");
        assert.strictEqual(res.status, 401);
    });

    await testCase("1.2 Citizen token is forbidden from accessing sewage planner (403)", async () => {
        const res = await request("/api/water/sewage-planner/routes", "GET", null, citizenToken);
        assert.strictEqual(res.status, 403);
    });

    await testCase("1.3 Cross-Department: Traffic Staff cannot create sewage routes (403)", async () => {
        const res = await request("/api/water/sewage-planner/routes", "POST", {
            name: "Traffic Intrusion Route",
            zone: "Golghar",
            waypoints: [{ lat: 26.76, lng: 83.37 }, { lat: 26.75, lng: 83.37 }]
        }, trafficStaffToken);
        assert.strictEqual(res.status, 403);
    });

    await testCase("1.4 Water Staff (non-admin) cannot create or publish routes (403)", async () => {
        const res = await request("/api/water/sewage-planner/routes", "POST", {
            name: "Staff Draft Route",
            zone: "Golghar",
            waypoints: [{ lat: 26.76, lng: 83.37 }, { lat: 26.75, lng: 83.37 }]
        }, waterStaffToken);
        assert.strictEqual(res.status, 403);
    });

    await testCase("1.5 Water Staff can view existing planned routes for operational awareness (200)", async () => {
        const res = await request("/api/water/sewage-planner/routes", "GET", null, waterStaffToken);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.success, true);
        assert(Array.isArray(res.data.routes));
    });

    await testCase("1.6 Water Staff can query verified road corridors (200)", async () => {
        const res = await request("/api/water/sewage-planner/road-corridors", "GET", null, waterStaffToken);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.success, true);
        assert(res.data.count >= 5, "Expected at least 5 verified road corridors in seed");
    });

    // SECTION 2: ENGINEERING VALIDATION ENGINE & BOUNDARY DEFECTS
    console.log("\n--- SECTION 2: ENGINEERING VALIDATION ENGINE ---");

    let createdDraftId = null;

    await testCase("2.1 Route with fewer than 2 waypoints fails validation", async () => {
        const res = await request("/api/water/sewage-planner/routes", "POST", {
            name: "Single Waypoint Route",
            zone: "Golghar Central",
            waypoints: [{ lat: 26.7606, lng: 83.3732 }]
        }, waterAdminToken);
        assert.strictEqual(res.status, 201);
        assert.strictEqual(res.data.route.status, "VALIDATION_FAILED");
        assert(res.data.validation.errors.some(e => e.includes("at least 2 connected waypoints")));
    });

    await testCase("2.2 Route with shallow burial depth (< 1.2m) fails structural cover check", async () => {
        const res = await request("/api/water/sewage-planner/routes", "POST", {
            name: "Shallow Sewer Route",
            zone: "Golghar Central",
            pipe_diameter_mm: 450,
            burial_depth_m: 0.80, // Fails: min 1.2m
            slope_pct: 0.85,
            waypoints: [
                { lat: 26.7606, lng: 83.3732, elevation_m: 84.5 },
                { lat: 26.7559, lng: 83.3705, elevation_m: 83.0 }
            ]
        }, waterAdminToken);
        assert.strictEqual(res.status, 201);
        assert.strictEqual(res.data.route.status, "VALIDATION_FAILED");
        assert(res.data.validation.errors.some(e => e.includes("Sub-standard burial depth")));
    });

    await testCase("2.3 Route with insufficient hydraulic slope (< 0.5% for 450mm) fails self-cleansing check", async () => {
        const res = await request("/api/water/sewage-planner/routes", "POST", {
            name: "Flat Silt-Accumulating Sewer",
            zone: "Golghar Central",
            pipe_diameter_mm: 450,
            burial_depth_m: 2.80,
            slope_pct: 0.15, // Fails: min 0.50%
            waypoints: [
                { lat: 26.7606, lng: 83.3732, elevation_m: 84.5 },
                { lat: 26.7559, lng: 83.3705, elevation_m: 83.0 }
            ]
        }, waterAdminToken);
        assert.strictEqual(res.status, 201);
        assert.strictEqual(res.data.route.status, "VALIDATION_FAILED");
        assert(res.data.validation.errors.some(e => e.includes("Insufficient hydraulic gradient")));
    });

    await testCase("2.4 Network Separation: Sewage shallower than potable line crossing causes CRITICAL contamination error", async () => {
        // PL-101 potable line runs between (26.7606, 83.3732) and (26.7559, 83.3705) at depth 2.5m
        // If we place a sewage line at depth 2.0m along this path, it is ABOVE potable water -> CRITICAL ERROR!
        const res = await request("/api/water/sewage-planner/routes", "POST", {
            name: "Hazardous Contaminating Sewer",
            zone: "Golghar Central",
            pipe_diameter_mm: 600,
            burial_depth_m: 2.00, // PL-101 potable line is at 2.5m depth -> SEWAGE IS ABOVE CLEAN WATER!
            slope_pct: 0.80,
            clearance_min_m: 2.00,
            waypoints: [
                { lat: 26.7606, lng: 83.3732, elevation_m: 84.5 },
                { lat: 26.7582, lng: 83.3718, elevation_m: 83.8 },
                { lat: 26.7559, lng: 83.3705, elevation_m: 83.0 }
            ]
        }, waterAdminToken);
        assert.strictEqual(res.status, 201);
        assert.strictEqual(res.data.route.status, "VALIDATION_FAILED");
        assert(res.data.validation.errors.some(e => e.includes("Severe Contamination Hazard")));
    });

    await testCase("2.5 Valid sewer route with proper depth (3.2m > 2.5m potable) and slope creates DRAFT successfully", async () => {
        const res = await request("/api/water/sewage-planner/routes", "POST", {
            name: "Civil Lines Trunk Interceptor Phase 2",
            zone: "Civil Lines & South Ward",
            pipe_diameter_mm: 600,
            burial_depth_m: 3.40, // Deeper than potable lines (2.5m), safe vertical clearance
            slope_pct: 0.85,
            clearance_min_m: 2.00,
            service_area_polygon: [
                [26.7620, 83.3710],
                [26.7630, 83.3770],
                [26.7570, 83.3790],
                [26.7550, 83.3700]
            ],
            waypoints: [
                {
                    lat: 26.7580, lng: 83.3720, elevation_m: 84.0,
                    road_name: "Civil Lines Arterial Trunk", road_id: "ROAD-GKP-01",
                    road_width_m: 18.0, is_snapped: true, node_type: "INSPECTION_CHAMBER"
                },
                {
                    lat: 26.7550, lng: 83.3760, elevation_m: 82.5,
                    road_name: "Civil Lines Arterial Trunk", road_id: "ROAD-GKP-01",
                    road_width_m: 18.0, is_snapped: true, node_type: "MANHOLE"
                },
                {
                    lat: 26.7520, lng: 83.3800, elevation_m: 81.0,
                    road_name: "Civil Lines Arterial Trunk", road_id: "ROAD-GKP-01",
                    road_width_m: 18.0, is_snapped: true, node_type: "NETWORK_JUNCTION"
                },
                {
                    lat: 26.7350, lng: 83.3850, elevation_m: 78.2,
                    road_name: "Mahewa South Bypass to STP-01", road_id: "ROAD-GKP-04",
                    road_width_m: 12.0, is_snapped: true, node_type: "DESTINATION_STP"
                }
            ]
        }, waterAdminToken);

        assert.strictEqual(res.status, 201);
        assert.strictEqual(res.data.route.status, "DRAFT");
        assert.strictEqual(res.data.validation.is_valid, true);
        assert(res.data.validation.metrics.total_length_m > 1000);
        assert(res.data.validation.metrics.manholes_count > 0);
        assert.strictEqual(res.data.validation.construction_ready, false, "Must never claim construction ready without GPR survey");

        createdDraftId = res.data.route.id;
    });

    // SECTION 3: LIFECYCLE, EDITING, APPROVAL & PUBLISHING
    console.log("\n--- SECTION 3: LIFECYCLE, APPROVAL & CONCURRENCY PUBLISHING ---");

    await testCase("3.1 Update route draft with edited waypoints and re-validate", async () => {
        const res = await request(`/api/water/sewage-planner/routes/${createdDraftId}`, "PUT", {
            description: "Updated engineering notes: reinforced ductile iron section at railway crossing.",
            slope_pct: 0.90
        }, waterAdminToken);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.success, true);
        assert.strictEqual(Number(res.data.route.slope_pct), 0.90);
    });

    await testCase("3.2 Validate endpoint evaluates route and returns updated status", async () => {
        const res = await request(`/api/water/sewage-planner/routes/${createdDraftId}/validate`, "POST", {}, waterAdminToken);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.validation.is_valid, true);
    });

    await testCase("3.3 Water Admin approves validated route (status -> APPROVED)", async () => {
        const res = await request(`/api/water/sewage-planner/routes/${createdDraftId}/approve`, "POST", {
            notes: "Design criteria and minimum clearances verified by Executive Engineer."
        }, waterAdminToken);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.route.status, "APPROVED");
        assert.strictEqual(res.data.route.approver_name, "Test admin (water)");
    });

    await testCase("3.4 Publishing route executes atomic transaction, updates pipelines and version history", async () => {
        const res = await request(`/api/water/sewage-planner/routes/${createdDraftId}/publish`, "POST", {}, waterAdminToken);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.success, true);
        assert.strictEqual(res.data.route.status, "PUBLISHED");
        assert(res.data.route.version_id.startsWith("WNV-SEW-"));
    });

    await testCase("3.5 Publishing is idempotent: re-publishing already published route succeeds safely", async () => {
        const res = await request(`/api/water/sewage-planner/routes/${createdDraftId}/publish`, "POST", {}, waterAdminToken);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.route.status, "PUBLISHED");
    });

    await testCase("3.6 Rollback published route safely archives version and restores baseline", async () => {
        const res = await request(`/api/water/sewage-planner/routes/${createdDraftId}/rollback`, "POST", {}, waterAdminToken);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.success, true);
        assert.strictEqual(res.data.rolled_back_route.status, "ARCHIVED");
    });

    console.log("\n=============================================================");
    console.log(`📊 SEWAGE PLANNER TEST RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED`);
    console.log("=============================================================\n");

    if (testsFailed > 0) {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error("Fatal test runner error:", err);
    process.exit(1);
});
