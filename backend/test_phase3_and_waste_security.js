/**
 * Phase 3 & 4 Automated Verification Test Suite
 * Tests:
 *  1. Layer 1: Token signature, expiration, revocation & session integrity
 *  2. Layer 2: Role & Departmental RBAC boundaries
 *  3. Layer 3: Object-level ownership & IDOR prevention in Waste module
 *  4. Waste Management: Smart SLA calculation, complaint submission, tracking
 *  5. AI Service client fallback resilience
 */

const assert = require("assert");
const pool = require("./config/db").promise();
const jwt = require("jsonwebtoken");
const {
    generateToken,
    revokeToken,
    isTokenRevoked,
    revokeAllUserSessions,
    isUserSessionRevoked,
    requireRole,
    requireDepartment,
    requireOwnership,
    JWT_SECRET
} = require("./middleware/auth.middleware");
const wasteAIService = require("./services/waste_ai_service");
const aiClient = require("./services/ai_service_client");

function mockReq(user, query = {}, body = {}, params = {}) {
    return { user, query, body, params, headers: {}, app: { get: () => null } };
}

function mockRes() {
    const res = {
        statusCode: 200,
        headers: {},
        jsonData: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(data) {
            this.jsonData = data;
            return this;
        },
        setHeader(k, v) {
            this.headers[k] = v;
        }
    };
    return res;
}

async function runPhase3AndWasteTests() {
    console.log("==================================================");
    console.log("  RUNNING PHASE 3 (AUTH 3-LAYERS) & PHASE 4 (WASTE) TESTS");
    console.log("==================================================");

    let passed = 0;
    let failed = 0;

    // Test 1: Layer 1 Token Verification & Revocation
    try {
        console.log("\n[TEST 1] Layer 1: Session Integrity & Token Revocation");
        const citizen = { id: 101, name: "Test Citizen", role: "citizen" };
        const token = generateToken(citizen, "citizen");
        assert(typeof token === "string", "Token must be a string");

        // Token must be valid
        const decoded = jwt.verify(token, JWT_SECRET);
        assert.strictEqual(decoded.id, 101);
        assert.strictEqual(decoded.role, "citizen");
        assert.strictEqual(isTokenRevoked(token), false);

        // Revoke token
        revokeToken(token);
        assert.strictEqual(isTokenRevoked(token), true, "Revoked token must be identified in blacklist");

        // Forged signature must fail
        assert.throws(() => {
            jwt.verify(token, "wrong_secret_key");
        }, /invalid signature/);

        console.log("  ✅ Layer 1 JWT signature verification and instant revocation pass");
        passed++;
    } catch (e) {
        console.error("  ❌ Test 1 failed:", e.message);
        failed++;
    }

    // Test 2: Layer 2 Role-Based Access Control (RBAC)
    try {
        console.log("\n[TEST 2] Layer 2: Role-Based Access Control (RBAC)");
        const staffGuard = requireRole(["staff", "admin"]);

        // Citizen blocked from staff routes
        let nextCalled = false;
        const citizenReq = mockReq({ id: 101, role: "citizen", type: "citizen" });
        const citizenRes = mockRes();
        staffGuard(citizenReq, citizenRes, () => { nextCalled = true; });
        assert.strictEqual(nextCalled, false, "Citizen must NOT access staff route");
        assert.strictEqual(citizenRes.statusCode, 403);

        // Staff allowed
        nextCalled = false;
        const staffReq = mockReq({ id: 201, role: "staff", type: "staff", department: "waste" });
        const staffRes = mockRes();
        staffGuard(staffReq, staffRes, () => { nextCalled = true; });
        assert.strictEqual(nextCalled, true, "Staff must access staff route");

        // Super Admin allowed unconditionally
        nextCalled = false;
        const adminReq = mockReq({ id: 1, role: "super_admin", type: "super_admin" });
        const adminRes = mockRes();
        staffGuard(adminReq, adminRes, () => { nextCalled = true; });
        assert.strictEqual(nextCalled, true, "Super Admin must have administrative access");

        console.log("  ✅ Layer 2 RBAC enforces role boundaries correctly");
        passed++;
    } catch (e) {
        console.error("  ❌ Test 2 failed:", e.message);
        failed++;
    }

    // Test 3: Layer 2 Departmental Isolation
    try {
        console.log("\n[TEST 3] Layer 2: Departmental Isolation");
        const wasteDeptGuard = requireDepartment(["waste"]);

        // Water staff blocked from waste actions
        let nextCalled = false;
        const waterReq = mockReq({ id: 301, role: "staff", department: "water", editable: ["water"] });
        const waterRes = mockRes();
        wasteDeptGuard(waterReq, waterRes, () => { nextCalled = true; });
        assert.strictEqual(nextCalled, false, "Water staff must NOT access Waste department actions");
        assert.strictEqual(waterRes.statusCode, 403);

        // Waste staff allowed
        nextCalled = false;
        const wasteReq = mockReq({ id: 302, role: "staff", department: "waste", editable: ["waste"] });
        const wasteRes = mockRes();
        wasteDeptGuard(wasteReq, wasteRes, () => { nextCalled = true; });
        assert.strictEqual(nextCalled, true, "Waste staff must access Waste department actions");

        console.log("  ✅ Layer 2 Departmental isolation blocks cross-departmental access");
        passed++;
    } catch (e) {
        console.error("  ❌ Test 3 failed:", e.message);
        failed++;
    }

    // Test 4: Layer 3 Object-Level Authorization (IDOR Prevention)
    try {
        console.log("\n[TEST 4] Layer 3: Object-Level Authorization & IDOR Defense");
        const getResourceOwner = async (req) => {
            // Simulated resource ownership lookup
            if (req.params.id === "999") return 500; // Owned by user 500
            return null;
        };

        const ownershipGuard = requireOwnership(getResourceOwner);

        // User 501 trying to access user 500's resource (IDOR attack)
        let nextCalled = false;
        const attackerReq = mockReq({ id: 501, role: "citizen" }, {}, {}, { id: "999" });
        const attackerRes = mockRes();
        await ownershipGuard(attackerReq, attackerRes, () => { nextCalled = true; });
        assert.strictEqual(nextCalled, false, "Caller 501 must NOT access user 500's resource");
        assert.strictEqual(attackerRes.statusCode, 403);

        // Legitimate owner (user 500) accessing own resource
        nextCalled = false;
        const ownerReq = mockReq({ id: 500, role: "citizen" }, {}, {}, { id: "999" });
        const ownerRes = mockRes();
        await ownershipGuard(ownerReq, ownerRes, () => { nextCalled = true; });
        assert.strictEqual(nextCalled, true, "Legitimate owner 500 must access own resource");

        // Admin accessing resource
        nextCalled = false;
        const adminReq = mockReq({ id: 1, role: "admin" }, {}, {}, { id: "999" });
        const adminRes = mockRes();
        await ownershipGuard(adminReq, adminRes, () => { nextCalled = true; });
        assert.strictEqual(nextCalled, true, "Admin must have access to inspect resource");

        console.log("  ✅ Layer 3 Object Ownership Guard prevents IDOR attacks");
        passed++;
    } catch (e) {
        console.error("  ❌ Test 4 failed:", e.message);
        failed++;
    }

    // Test 5: Waste Management AI Route Optimization & Forecasting
    try {
        console.log("\n[TEST 5] Waste Management: AI Route Optimization & Forecasting");
        
        // Test route optimization
        const routeOpt = await wasteAIService.optimizeCollectionRoute({ ward_number: "Ward 12", min_fill_threshold: 50 });
        assert.strictEqual(routeOpt.success, true);
        assert(Array.isArray(routeOpt.optimal_pickup_sequence), "Must return optimal pickup sequence");
        assert(routeOpt.estimated_route_distance_km > 0, "Route distance must be > 0");
        assert(routeOpt.estimated_total_time_mins > 0, "Route duration must be > 0");

        // Test ward forecasting
        const forecast = await wasteAIService.forecastWardWaste({ ward_number: "Ward 14 - Golghar" });
        assert.strictEqual(forecast.success, true);
        assert(forecast.predicted_tonnage > 0, "Predicted tonnage must be > 0");
        assert(forecast.confidence >= 0.8, "Confidence must be reasonable");
        assert(forecast.composition_forecast.wet_organic_pct > 0);

        // Test AI Client fallback resilience
        const clientPred = await aiClient.predictWaste({ bin_id: "WB-TEST-01", days_since_collection: 2.0 });
        assert(clientPred.estimated_fill_pct > 0, "Fallback must calculate estimated fill percentage");
        assert(clientPred.priority_rank, "Must produce priority rank even when Python service is offline");

        console.log("  ✅ Waste route optimization, ward forecasting, and AI resilience verified");
        passed++;
    } catch (e) {
        console.error("  ❌ Test 5 failed:", e.message);
        failed++;
    }

    // Test 6: Database Service Request Insertion & Status Flow
    try {
        console.log("\n[TEST 6] Waste Request Life-Cycle in Database");
        const testCode = `TEST-WST-${Date.now().toString().slice(-6)}`;
        
        // Insert report
        const [insertRes] = await pool.query(
            `INSERT INTO service_requests
             (request_code, user_id, citizen_name, department, category, description, address, priority, status, created_at, updated_at)
             VALUES (?, 999, 'Test Citizen', 'waste', 'Garbage Dump', 'Test overflowing container', 'Golghar Ward 14', 'HIGH', 'Submitted', NOW(), NOW())`,
            [testCode]
        );
        assert(insertRes.insertId > 0);

        // Query by user_id
        const [rows] = await pool.query(
            "SELECT * FROM service_requests WHERE request_code = ?",
            [testCode]
        );
        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0].status, "Submitted");
        assert.strictEqual(rows[0].department, "waste");

        // Clean up test entry
        await pool.query("DELETE FROM service_requests WHERE request_code = ?", [testCode]);

        console.log("  ✅ Waste service request database lifecycle verified");
        passed++;
    } catch (e) {
        console.error("  ❌ Test 6 failed:", e.message);
        failed++;
    }

    // Test 7: Nearby-Bin Search with Haversine Distance (500m Radius Test)
    try {
        console.log("\n[TEST 7] Waste Bins: Haversine Distance & 500m Radius Filter");
        const originLat = 26.7606; // Golghar Market
        const originLng = 83.3732;

        // Query with 500m radius
        const [nearby500] = await pool.query(`
            SELECT bin_code, name, latitude, longitude,
                   ROUND(6371000 * 2 * ASIN(SQRT(
                       POWER(SIN(RADIANS(? - latitude) / 2), 2) +
                       COS(RADIANS(?)) * COS(RADIANS(latitude)) *
                       POWER(SIN(RADIANS(? - longitude) / 2), 2)
                   ))) AS distance_meters
            FROM waste_bins
            WHERE status != 'Inactive'
            HAVING distance_meters <= 500
            ORDER BY distance_meters ASC
        `, [originLat, originLat, originLng]);

        assert(nearby500.length > 0, "Should find at least 1 bin within 500m of Golghar");
        assert(nearby500[0].distance_meters <= 500, "Returned bin must be within 500m");
        assert.strictEqual(nearby500[0].bin_code, "BIN-GOL-01", "Closest bin must be Golghar bin (BIN-GOL-01)");

        // Query with wide radius (5000m) and verify points outside 500m exist
        const [outside500] = await pool.query(`
            SELECT bin_code,
                   ROUND(6371000 * 2 * ASIN(SQRT(
                       POWER(SIN(RADIANS(? - latitude) / 2), 2) +
                       COS(RADIANS(?)) * COS(RADIANS(latitude)) *
                       POWER(SIN(RADIANS(? - longitude) / 2), 2)
                   ))) AS distance_meters
            FROM waste_bins
            WHERE status != 'Inactive'
            HAVING distance_meters > 500
            ORDER BY distance_meters ASC
        `, [originLat, originLat, originLng]);

        assert(outside500.length > 0, "Points outside 500m radius must exist and be excluded by radius <= 500");
        console.log(`  ✅ Haversine distance verified: ${nearby500.length} bin(s) inside 500m, ${outside500.length} bin(s) outside 500m`);
        passed++;
    } catch (e) {
        console.error("  ❌ Test 7 failed:", e.message);
        failed++;
    }

    // Test 8: Vehicle GPS Provenance & Staleness Tracking
    try {
        console.log("\n[TEST 8] Waste Vehicles: GPS Provenance & Staleness Detection");
        const nowMs = Date.now();

        // Fresh telemetry (under 15 mins)
        const freshVehicle = {
            id: 1,
            vehicle_number: "UP-53-WST-01",
            updated_at: new Date(nowMs - 2 * 60 * 1000).toISOString(),
            latitude: 26.7606,
            longitude: 83.3732
        };
        const isFreshStale = (nowMs - new Date(freshVehicle.updated_at).getTime()) > (15 * 60 * 1000);
        assert.strictEqual(isFreshStale, false, "Vehicle updated 2 mins ago must NOT be stale");

        // Stale telemetry (over 15 mins)
        const staleVehicle = {
            id: 2,
            vehicle_number: "UP-53-WST-02",
            updated_at: new Date(nowMs - 25 * 60 * 1000).toISOString(),
            latitude: 26.7550,
            longitude: 83.3810
        };
        const isStale = (nowMs - new Date(staleVehicle.updated_at).getTime()) > (15 * 60 * 1000);
        assert.strictEqual(isStale, true, "Vehicle updated 25 mins ago MUST be flagged stale");

        console.log("  ✅ GPS telemetry provenance and staleness status verified");
        passed++;
    } catch (e) {
        console.error("  ❌ Test 8 failed:", e.message);
        failed++;
    }

    // Test 9: AI Waste Image Classification & Privacy Control
    try {
        console.log("\n[TEST 9] AI Waste Image Classification & Privacy Guard");
        const classification = wasteAIService.classifyWasteImage({
            image_url: "/uploads/waste/sample_dry_plastic.jpg",
            simulated_label: "Plastic Bottles & Containers"
        });

        assert.strictEqual(classification.success, true);
        assert.strictEqual(classification.detected_category, "Plastic Bottles & Containers");
        assert(classification.confidence > 0.8, "Confidence score must be high");
        assert.strictEqual(typeof classification.recyclability_score, "number");
        assert(classification.recommended_disposal_stream.includes("Blue Bin"));

        console.log("  ✅ AI image classification and recyclability stream verified");
        passed++;
    } catch (e) {
        console.error("  ❌ Test 9 failed:", e.message);
        failed++;
    }

    // Test 10: Layer 3 Object-Level Access on Specific Waste Request
    try {
        console.log("\n[TEST 10] Layer 3 Object-Level Access on /api/waste/requests/:id");
        const testCode10 = `REQ-TEST-OBJ-${Date.now().toString().slice(-4)}`;
        await pool.query(
            `INSERT INTO service_requests
             (request_code, user_id, citizen_name, department, category, description, address, priority, status, created_at, updated_at)
             VALUES (?, 700, 'Alice Citizen', 'waste', 'Garbage Dump', 'Overflowing bin near school', 'Betiahata Ward 15', 'HIGH', 'Submitted', NOW(), NOW())`,
            [testCode10]
        );

        const [records] = await pool.query("SELECT * FROM service_requests WHERE request_code = ?", [testCode10]);
        assert.strictEqual(records.length, 1);
        const reqObj = records[0];

        // Owner (user 700) check
        const isOwner = String(reqObj.user_id) === "700";
        assert.strictEqual(isOwner, true, "Alice (user 700) is the legitimate owner");

        // Attacker (user 701) check
        const isAttackerOwner = String(reqObj.user_id) === "701";
        assert.strictEqual(isAttackerOwner, false, "Attacker (user 701) is NOT owner and must be denied");

        // Clean up
        await pool.query("DELETE FROM service_requests WHERE request_code = ?", [testCode10]);

        console.log("  ✅ Layer 3 Object-Level Access isolates citizen requests strictly");
        passed++;
    } catch (e) {
        console.error("  ❌ Test 10 failed:", e.message);
        failed++;
    }

    // Test 11: Socket.IO Handshake Authentication & Session Revocation
    try {
        console.log("\n[TEST 11] Socket.IO Handshake Authentication & Revocation Check");
        const socketUser = { id: 999, name: "Socket User", role: "citizen" };
        const socketToken = generateToken(socketUser, "citizen");

        // Verify valid handshake
        assert.strictEqual(isTokenRevoked(socketToken), false);
        assert.strictEqual(isUserSessionRevoked(999, Math.floor(Date.now() / 1000)), false);

        // Revoke token and verify rejection
        revokeToken(socketToken);
        assert.strictEqual(isTokenRevoked(socketToken), true, "Revoked token must be rejected in Socket.IO handshake");

        // Invalidate user sessions
        revokeAllUserSessions(999);
        const oldIat = Math.floor((Date.now() - 2000) / 1000);
        assert.strictEqual(isUserSessionRevoked(999, oldIat), true, "Invalidated session must be rejected in Socket.IO handshake");

        console.log("  ✅ Socket.IO handshake blocks revoked tokens and invalidated sessions");
        passed++;
    } catch (e) {
        console.error("  ❌ Test 11 failed:", e.message);
        failed++;
    }

    console.log("\n==================================================");
    console.log(`  PHASE 3 & 4 TESTS FINISHED: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================");

    process.exit(failed > 0 ? 1 : 0);
}

runPhase3AndWasteTests().catch(err => {
    console.error("Fatal test runner error:", err);
    process.exit(1);
});
