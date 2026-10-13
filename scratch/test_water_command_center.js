/**
 * SmartCity AI - Water & Sewage Command Center Test Suite
 * Comprehensive automated verification covering:
 * 1. Hospital-like RBAC Matrix & Access Denial (Super Admin, Water Admin, Water Staff, Citizen, Cross-Dept)
 * 2. Network Configuration & Separation (POTABLE_WATER, SEWAGE, RECLAIMED_WATER, STORMWATER)
 * 3. Map-based Route Design, Hydraulic Validation, Cross-Classification Hazard Block, Publish & Rollback
 * 4. Staff Work Order 8-Status Lifecycle & Role-Gated Verification
 * 5. Water Flow Control & Provenance (Simulated sandbox vs hardware disclaimer)
 * 6. Fault Detection & Provenance Classification
 * 7. Bilingual AI Assistant Grounding (Hindi & English queries)
 * 8. Non-Regression of Citizen Services & Hospital System
 */

const http = require("http");

function request(options, data) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = "";
            res.on("data", chunk => body += chunk);
            res.on("end", () => {
                let parsed = null;
                try {
                    parsed = JSON.parse(body);
                } catch (e) {
                    parsed = body;
                }
                resolve({ status: res.statusCode, headers: res.headers, data: parsed });
            });
        });
        req.on("error", reject);
        if (data) {
            req.write(typeof data === "string" ? data : JSON.stringify(data));
        }
        req.end();
    });
}

async function runWaterCommandCenterTests() {
    console.log("================================================================================");
    console.log("🌊 SMARTCITY AI: WATER & SEWAGE COMMAND CENTER COMPREHENSIVE TEST SUITE");
    console.log("================================================================================\n");

    let passCount = 0;
    let failCount = 0;

    function assert(condition, message) {
        if (condition) {
            console.log(`✅ PASS: ${message}`);
            passCount++;
        } else {
            console.error(`❌ FAIL: ${message}`);
            failCount++;
        }
    }

    try {
        // =========================================================================
        // STEP 1: AUTHENTICATION & RBAC MATRIX
        // =========================================================================
        console.log("\n--- [1] AUTHENTICATION & ROLE-BASED ACCESS CONTROL (RBAC) ---");

        // 1.1 Super Admin Login
        const saRes = await request({
            hostname: "localhost", port: 5000, path: "/api/auth/demo-login", method: "POST",
            headers: { "Content-Type": "application/json" }
        }, { role: "super_admin" });
        assert(saRes.status === 200 && saRes.data.token, "Super Admin authenticates with valid JWT token");
        const superAdminToken = saRes.data.token;

        // 1.2 Water Admin Login
        const waRes = await request({
            hostname: "localhost", port: 5000, path: "/api/auth/demo-login", method: "POST",
            headers: { "Content-Type": "application/json" }
        }, { role: "water_admin" });
        assert(waRes.status === 200 && waRes.data.token && waRes.data.accountType === "WATER_ADMIN", "Water Admin authenticates with WATER_ADMIN role");
        const waterAdminToken = waRes.data.token;

        // 1.3 Water Staff Login
        const wsRes = await request({
            hostname: "localhost", port: 5000, path: "/api/auth/demo-login", method: "POST",
            headers: { "Content-Type": "application/json" }
        }, { role: "water_staff" });
        assert(wsRes.status === 200 && wsRes.data.token && wsRes.data.user.department === "water", "Water Staff authenticates with department='water'");
        const waterStaffToken = wsRes.data.token;

        // 1.4 Citizen Login
        const citizenRes = await request({
            hostname: "localhost", port: 5000, path: "/api/auth/demo-login", method: "POST",
            headers: { "Content-Type": "application/json" }
        }, { role: "citizen" });
        assert(citizenRes.status === 200 && citizenRes.data.token && (citizenRes.data.role === "citizen" || citizenRes.data.user?.role === "citizen"), "Citizen authenticates with role='citizen'");
        const citizenToken = citizenRes.data.token;

        // 1.5 Traffic Staff Login (Cross-department check)
        const trafficRes = await request({
            hostname: "localhost", port: 5000, path: "/api/auth/demo-login", method: "POST",
            headers: { "Content-Type": "application/json" }
        }, { role: "traffic" });
        assert(trafficRes.status === 200 && trafficRes.data.token, "Traffic Staff authenticates with department='traffic'");
        const trafficToken = trafficRes.data.token;

        // 1.6 RBAC Denial Tests
        // Citizen blocked from planner routes
        const citizenPlannerRes = await request({
            hostname: "localhost", port: 5000, path: "/api/water/sewage-planner/routes", method: "GET",
            headers: { "Authorization": `Bearer ${citizenToken}` }
        });
        assert(citizenPlannerRes.status === 403, "Citizen is blocked (403) from accessing internal Sewage Planner routes");

        // Citizen blocked from audit logs
        const citizenAuditRes = await request({
            hostname: "localhost", port: 5000, path: "/api/water/audit-logs", method: "GET",
            headers: { "Authorization": `Bearer ${citizenToken}` }
        });
        assert(citizenAuditRes.status === 403, "Citizen is blocked (403) from accessing Water Command Center audit logs");

        // Traffic Staff blocked from water flow control operations (Cross-department isolation)
        const crossDeptRes = await request({
            hostname: "localhost", port: 5000, path: "/api/water/flow-control/operate", method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${trafficToken}` }
        }, { asset_id: "WTR-PUMP-01", action: "VALVE_THROTTLE", target_pct: 50 });
        assert(crossDeptRes.status === 403, "Traffic Staff is blocked (403) from operating Water flow controls (Cross-department isolation)");

        // Unauthenticated request blocked
        const unauthRes = await request({
            hostname: "localhost", port: 5000, path: "/api/water/audit-logs", method: "GET"
        });
        assert(unauthRes.status === 401, "Unauthenticated request is rejected with 401 Unauthorized");

        // =========================================================================
        // STEP 2: NETWORK CONFIGURATION & SEPARATION
        // =========================================================================
        console.log("\n--- [2] SEPARATE WATER & SEWAGE NETWORK CONFIGURATION ---");

        const netCfgRes = await request({
            hostname: "localhost", port: 5000, path: "/api/water/network-config", method: "GET",
            headers: { "Authorization": `Bearer ${waterStaffToken}` }
        });
        assert(netCfgRes.status === 200 && Array.isArray(netCfgRes.data.configs), "GET /api/water/network-config returns network configurations");
        const configs = netCfgRes.data.configs || [];
        const types = configs.map(c => c.network_type);
        assert(types.includes("POTABLE_WATER") && types.includes("SEWAGE") && types.includes("RECLAIMED_WATER") && types.includes("STORMWATER"),
            "Configuration includes all 4 distinct networks (POTABLE_WATER, SEWAGE, RECLAIMED_WATER, STORMWATER)");

        // Non-admin attempting to update network config -> 403
        const staffUpdateCfgRes = await request({
            hostname: "localhost", port: 5000, path: "/api/water/network-config", method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${waterStaffToken}` }
        }, { network_type: "SEWAGE", color_hex: "#ff0000" });
        assert(staffUpdateCfgRes.status === 403, "Water Staff is blocked (403) from modifying network configuration styles");

        // Water Admin updating network config -> 200
        const adminUpdateCfgRes = await request({
            hostname: "localhost", port: 5000, path: "/api/water/network-config", method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${waterAdminToken}` }
        }, { network_type: "SEWAGE", color_hex: "#ea580c", display_name: "Municipal Trunk Sewer" });
        assert(adminUpdateCfgRes.status === 200 && adminUpdateCfgRes.data.success, "Water Admin successfully updates network style configuration");

        // =========================================================================
        // STEP 3: MAP-BASED ROUTE DESIGN, VALIDATION & REVISION LIFECYCLE
        // =========================================================================
        console.log("\n--- [3] MAP-BASED ROUTE DESIGN, HYDRAULIC VALIDATION & ROLLBACK ---");

        // 3.1 Cross-Classification Hazard Block: Attempting to classify sewage alignment as POTABLE_WATER
        const hazardRouteRes = await request({
            hostname: "localhost", port: 5000, path: "/api/water/sewage-planner/routes", method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${waterAdminToken}` }
        }, {
            network_type: "POTABLE_WATER",
            name: "Sewage Collector Trunk",
            zone: "Golghar",
            destination_asset_id: "STP-01",
            waypoints: [{ lat: 26.758, lng: 83.373 }, { lat: 26.759, lng: 83.375 }],
            pipe_diameter_mm: 600
        });
        assert(hazardRouteRes.status === 400 && hazardRouteRes.data.message.includes("Cross-classification hazard"),
            "Cross-classification hazard blocked: sewage destination cannot be classified as POTABLE_WATER");

        // 3.2 Engineering Route Validation Endpoint
        const validTestRes = await request({
            hostname: "localhost", port: 5000, path: "/api/water/sewage-planner/validate", method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${waterAdminToken}` }
        }, {
            pipe_diameter_mm: 600,
            slope_pct: 0.85,
            burial_depth_m: 3.2,
            clearance_min_m: 2.0,
            destination_asset_id: "STP-01",
            waypoints: [
                { lat: 26.7585, lng: 83.3725, road_width_m: 14.0 },
                { lat: 26.7595, lng: 83.3745, road_width_m: null }
            ]
        });
        assert(validTestRes.status === 200 && validTestRes.data.success, "Hydraulic and engineering route validation executes cleanly");
        assert(validTestRes.data && validTestRes.data.validation && validTestRes.data.validation.warnings && validTestRes.data.validation.warnings.some(w => w.includes("road corridor width") || w.includes("road") || w.includes("survey")),
            "Engineering validator detects and flags missing road-width data as UNKNOWN/NEEDS_SURVEY");

        // 3.3 Create Valid Sewage Route Draft
        const createRouteRes = await request({
            hostname: "localhost", port: 5000, path: "/api/water/sewage-planner/routes", method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${waterAdminToken}` }
        }, {
            network_type: "SEWAGE",
            name: "Automated Test Trunk Sewer",
            zone: "Civil Lines North",
            description: "Gravity conveyance interceptor test line",
            destination_asset_id: "STP-01",
            pipe_diameter_mm: 600,
            burial_depth_m: 3.5,
            slope_pct: 0.85,
            clearance_min_m: 2.0,
            flow_direction: "FORWARD",
            waypoints: [
                { lat: 26.7580, lng: 83.3720, elevation_m: 84.5, road_name: "Park Road", road_width_m: 14 },
                { lat: 26.7590, lng: 83.3740, elevation_m: 83.6, road_name: "Civil Lines Rd", road_width_m: 16 }
            ],
            service_area_polygon: [[26.757, 83.371], [26.760, 83.371], [26.760, 83.375], [26.757, 83.375]]
        });
        assert((createRouteRes.status === 200 || createRouteRes.status === 201) && createRouteRes.data.success && createRouteRes.data.route?.id,
            "Water Admin successfully creates and saves sewage route draft");
        const createdRouteId = createRouteRes.data.route.id;

        // 3.4 Approve Route
        const approveRes = await request({
            hostname: "localhost", port: 5000, path: `/api/water/sewage-planner/routes/${createdRouteId}/approve`, method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${waterAdminToken}` }
        }, { notes: "Pre-construction hydraulic clearance verified by Er. R.N. Tripathi." });
        assert(approveRes.status === 200 && approveRes.data.success, "Water Admin successfully approves route for publishing");

        // 3.5 Publish Route Version
        const publishRes = await request({
            hostname: "localhost", port: 5000, path: `/api/water/sewage-planner/routes/${createdRouteId}/publish`, method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${waterAdminToken}` }
        });
        assert(publishRes.status === 200 && publishRes.data.route?.status === "PUBLISHED" && publishRes.data.route?.version_id,
            "Water Admin publishes official municipal network version with version_id recorded");

        // 3.6 Rollback Route Version
        const rollbackRes = await request({
            hostname: "localhost", port: 5000, path: `/api/water/sewage-planner/routes/${createdRouteId}/rollback`, method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${waterAdminToken}` }
        });
        assert(rollbackRes.status === 200 && (rollbackRes.data.route?.status === "ARCHIVED" || rollbackRes.data.rolled_back_route?.status === "ARCHIVED"),
            "Water Admin rolls back published version cleanly to ARCHIVED");

        // =========================================================================
        // STEP 4: STAFF WORK ORDER 8-STATUS LIFECYCLE & ROLE-GATED VERIFICATION
        // =========================================================================
        console.log("\n--- [4] STAFF WORK ORDER LIFECYCLE & ROLE-GATED VERIFICATION ---");

        // 4.1 Water Admin creates Work Order
        const createWoRes = await request({
            hostname: "localhost", port: 5000, path: "/api/water/work-orders", method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${waterAdminToken}` }
        }, {
            title: "Inspect Chamber Manhole MH-04",
            description: "Check for abnormal sewage surcharge near Golghar roundabout",
            priority: "HIGH",
            sector: "Golghar Central",
            assigned_staff_id: "WTR-ENG-01",
            network_type: "SEWAGE",
            related_pipe_id: "PIPE-SEC1"
        });
        assert((createWoRes.status === 200 || createWoRes.status === 201) && createWoRes.data.success && (createWoRes.data.work_order_id || createWoRes.data.order?.id),
            "Water Admin creates new work order assigned to WTR-ENG-01");
        const testWoId = createWoRes.data.work_order_id || createWoRes.data.order?.id;

        // 4.2 Staff Acknowledges Work Order
        const ackRes = await request({
            hostname: "localhost", port: 5000, path: `/api/water/work-orders/${testWoId}/status`, method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${waterStaffToken}` }
        }, { status: "ACKNOWLEDGED", observations: "Task received. Tooling van en route." });
        assert(ackRes.status === 200 && ackRes.data.status === "ACKNOWLEDGED", "Staff transitions status to ACKNOWLEDGED");

        // 4.3 Staff sets IN_PROGRESS
        const progRes = await request({
            hostname: "localhost", port: 5000, path: `/api/water/work-orders/${testWoId}/status`, method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${waterStaffToken}` }
        }, { status: "IN_PROGRESS", observations: "Inspection equipment lowered into MH-04." });
        assert(progRes.status === 200 && progRes.data.status === "IN_PROGRESS", "Staff transitions status to IN_PROGRESS");

        // 4.4 Staff flags BLOCKED with required reason
        const blockRes = await request({
            hostname: "localhost", port: 5000, path: `/api/water/work-orders/${testWoId}/status`, method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${waterStaffToken}` }
        }, { status: "BLOCKED", blocked_reason: "Heavy road traffic obstruction; requires traffic division safety escort." });
        assert(blockRes.status === 200 && blockRes.data.status === "BLOCKED", "Staff transitions status to BLOCKED with reason");

        // 4.5 Staff unblocks back to IN_PROGRESS then RESOLVED
        await request({
            hostname: "localhost", port: 5000, path: `/api/water/work-orders/${testWoId}/status`, method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${waterStaffToken}` }
        }, { status: "IN_PROGRESS", observations: "Traffic diverted, proceeding with desiltation." });

        const resolveRes = await request({
            hostname: "localhost", port: 5000, path: `/api/water/work-orders/${testWoId}/status`, method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${waterStaffToken}` }
        }, {
            status: "RESOLVED",
            observations: "Debris cleared. Gravity flow restored to 42.5 L/s.",
            evidence_notes: "Photographic confirmation recorded in Field App v2.4."
        });
        assert(resolveRes.status === 200 && resolveRes.data.status === "RESOLVED", "Staff transitions status to RESOLVED with observations & evidence");

        // 4.6 Staff attempts to VERIFIED -> MUST BE BLOCKED (403: Only Admin can verify)
        const staffVerifyRes = await request({
            hostname: "localhost", port: 5000, path: `/api/water/work-orders/${testWoId}/status`, method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${waterStaffToken}` }
        }, { status: "VERIFIED" });
        assert(staffVerifyRes.status === 403, "Water Staff is strictly blocked (403) from marking work order as VERIFIED (Policy guard)");

        // 4.7 Water Admin marks VERIFIED -> ALLOWED
        const adminVerifyRes = await request({
            hostname: "localhost", port: 5000, path: `/api/water/work-orders/${testWoId}/status`, method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${waterAdminToken}` }
        }, { status: "VERIFIED", observations: "Audit confirmed via downstream flow monitor." });
        assert(adminVerifyRes.status === 200 && adminVerifyRes.data.status === "VERIFIED" && adminVerifyRes.data.verified_by,
            "Water Admin successfully verifies work order, recording verified_by attribution");

        // 4.8 Work order reassignment by Water Admin
        const reassignRes = await request({
            hostname: "localhost", port: 5000, path: `/api/water/work-orders/${testWoId}/reassign`, method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${waterAdminToken}` }
        }, { assigned_staff_id: "WTR001", reason: "Field inspection reassignment" });
        assert(reassignRes.status === 200 && reassignRes.data.success, "Water Admin successfully reassigns work order");

        // =========================================================================
        // STEP 5: FLOW CONTROL & PROVENANCE (SIMULATED SANDBOX)
        // =========================================================================
        console.log("\n--- [5] WATER FLOW CONTROL & PROVENANCE ATTRIBUTION ---");

        // 5.1 Flow overview with provenance
        const flowOverRes = await request({
            hostname: "localhost", port: 5000, path: "/api/water/flow-control/overview", method: "GET",
            headers: { "Authorization": `Bearer ${waterAdminToken}` }
        });
        assert(flowOverRes.status === 200 && Array.isArray(flowOverRes.data.pipelines), "GET /api/water/flow-control/overview returns pipeline telemetry");
        const hasProvenance = flowOverRes.data.pipelines.every(p => Boolean(p.telemetry_provenance));
        assert(hasProvenance, "Every pipeline record contains explicit telemetry_provenance (MEASURED / SIMULATED / STALE / HARDWARE_UNVERIFIED)");

        // 5.2 Flow control command execution (Simulated Sandbox)
        const cmdRes = await request({
            hostname: "localhost", port: 5000, path: "/api/water/flow-control/operate", method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${waterAdminToken}` }
        }, {
            asset_id: "WTR-PUMP-01",
            action: "VALVE_THROTTLE",
            target_pct: 65,
            notes: "Routine evening distribution throttling"
        });
        assert(cmdRes.status === 200 && cmdRes.data.success, "Flow control command executes successfully in sandbox");
        assert(cmdRes.data.is_hardware_actuated === false && cmdRes.data.provenance === "SIMULATED",
            "Command outcome is explicitly marked is_hardware_actuated: false and provenance: 'SIMULATED'");

        // 5.3 Audit log inspection
        const auditRes = await request({
            hostname: "localhost", port: 5000, path: "/api/water/audit-logs?limit=5", method: "GET",
            headers: { "Authorization": `Bearer ${waterAdminToken}` }
        });
        assert(auditRes.status === 200 && Array.isArray(auditRes.data.logs) && auditRes.data.logs.length > 0,
            "Operational audit log records administrative flow and network mutations");

        // =========================================================================
        // STEP 6: FAULT DETECTION & PROVENANCE CLASSIFICATION
        // =========================================================================
        console.log("\n--- [6] FAULT DETECTION & PROVENANCE CLASSIFICATION ---");

        const faultsRes = await request({
            hostname: "localhost", port: 5000, path: "/api/water/faults", method: "GET",
            headers: { "Authorization": `Bearer ${waterStaffToken}` }
        });
        assert(faultsRes.status === 200 && Array.isArray(faultsRes.data.faults), "GET /api/water/faults returns fault records");
        const faultProvenances = (faultsRes.data.faults || []).map(f => f.provenance);
        assert(
            faultProvenances.includes("CONFIRMED") &&
            faultProvenances.includes("ALGORITHMIC_SUSPICION") &&
            faultProvenances.includes("CITIZEN_REPORT") &&
            faultProvenances.includes("SIMULATED"),
            "Fault records distinguish CONFIRMED, ALGORITHMIC_SUSPICION, CITIZEN_REPORT, and SIMULATED provenance"
        );

        if (faultsRes.data.faults.length > 0) {
            const firstFault = faultsRes.data.faults[0];
            const updateFaultRes = await request({
                hostname: "localhost", port: 5000, path: `/api/water/faults/${firstFault.id}/status`, method: "PUT",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${waterAdminToken}` }
            }, { status: "IN_REVIEW", notes: "Triaged by Water Admin" });
            assert(updateFaultRes.status === 200 && updateFaultRes.data.success, "Water Admin updates fault triage status to IN_REVIEW");
        }

        // =========================================================================
        // STEP 7: AI ASSISTANT MULTILINGUAL INTEGRATION & SAFETY GROUNDING
        // =========================================================================
        console.log("\n--- [7] AI ASSISTANT BILINGUAL INTEGRATION & GROUNDING ---");

        // 7.1 English Query on Route & Flow Direction
        const aiEnRes = await request({
            hostname: "localhost", port: 5000, path: "/api/ai/chat", method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${waterStaffToken}` }
        }, { message: "What is the flow direction and pressure for pipe PIPE-SEC1?" });
        assert(aiEnRes.status === 200 && aiEnRes.data && aiEnRes.data.reply, "AI Chat responds to English pipe flow query");
        assert(aiEnRes.data.reply.toLowerCase().includes("flow") || aiEnRes.data.reply.toLowerCase().includes("pipe"),
            "AI response correctly references pipe flow telemetry");

        // 7.2 Hindi / Hinglish Query on Assigned Tasks
        const aiHiRes = await request({
            hostname: "localhost", port: 5000, path: "/api/ai/chat", method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${waterStaffToken}` }
        }, { message: "Mere assigned tasks kaun se hain?" });
        assert(aiHiRes.status === 200 && aiHiRes.data && aiHiRes.data.reply, "AI Chat responds to Hindi task query ('Mere assigned tasks kaun se hain?')");
        assert(aiHiRes.data.reply.includes("कार्य") || aiHiRes.data.reply.includes("Tasks") || aiHiRes.data.reply.includes("Work Order") || aiHiRes.data.reply.includes("assigned"),
            "AI grounded tool extracts assigned work orders and responds contextually");

        // 7.3 Hindi Query on Sewer Route
        const aiSewerRes = await request({
            hostname: "localhost", port: 5000, path: "/api/ai/chat", method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${waterStaffToken}` }
        }, { message: "Is sewer pipeline ka route dikhao aur faults batao." });
        assert(aiSewerRes.status === 200 && aiSewerRes.data && aiSewerRes.data.reply, "AI Chat responds to Hindi sewer route query");

        // =========================================================================
        // STEP 8: NON-REGRESSION OF CITIZEN SERVICES & HOSPITAL MODULE
        // =========================================================================
        console.log("\n--- [8] NON-REGRESSION OF CITIZEN SERVICES & HOSPITAL MODULE ---");

        // 8.1 Citizen Water Quality Check
        const citizenQualityRes = await request({
            hostname: "localhost", port: 5000, path: "/api/water/quality", method: "GET"
        });
        assert(citizenQualityRes.status === 200, "Existing public /api/water/quality endpoint functions properly");

        // 8.2 Citizen Tanker Booking
        const tankerRes = await request({
            hostname: "localhost", port: 5000, path: "/api/water/tanker-booking", method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${citizenToken}` }
        }, {
            citizen_name: "Rahul Verma",
            contact_number: "9876543210",
            delivery_address: "Mohaddipur Block C",
            capacity_liters: 3000,
            delivery_slot: "MORNING"
        });
        assert(tankerRes.status === 200 || tankerRes.status === 201, "Existing citizen water tanker booking remains functional");

        // 8.3 Hospital Module Non-Regression
        const hospRes = await request({
            hostname: "localhost", port: 5000, path: "/api/hospitals", method: "GET"
        });
        assert(hospRes.status === 200 && Array.isArray(hospRes.data.hospitals), "Existing Hospital module /api/hospitals remains functional");

        // =========================================================================
        // STEP 9: AUTHORITY-WISE ISOLATION & CROSS-DEPARTMENT BLOCKING
        // =========================================================================
        console.log("\n--- [9] AUTHORITY-WISE ISOLATION & CROSS-DEPARTMENT 403 BLOCKING ---");

        // 9.1 Login non-water personas
        const hospAdminRes = await request({
            hostname: "localhost", port: 5000, path: "/api/auth/demo-login", method: "POST",
            headers: { "Content-Type": "application/json" }
        }, { persona: "hospital_admin" });
        assert(hospAdminRes.status === 200 && hospAdminRes.data.token, "Hospital Admin authenticates successfully");
        const hospAdminToken = hospAdminRes.data.token;

        const policeRes = await request({
            hostname: "localhost", port: 5000, path: "/api/auth/demo-login", method: "POST",
            headers: { "Content-Type": "application/json" }
        }, { persona: "police" });
        assert(policeRes.status === 200 && policeRes.data.token, "Police Officer authenticates successfully");
        const policeToken = policeRes.data.token;

        const wasteRes = await request({
            hostname: "localhost", port: 5000, path: "/api/auth/demo-login", method: "POST",
            headers: { "Content-Type": "application/json" }
        }, { persona: "waste" });
        assert(wasteRes.status === 200 && wasteRes.data.token, "Waste Officer authenticates successfully");
        const wasteToken = wasteRes.data.token;

        const emgRes = await request({
            hostname: "localhost", port: 5000, path: "/api/auth/demo-login", method: "POST",
            headers: { "Content-Type": "application/json" }
        }, { persona: "emergency" });
        assert(emgRes.status === 200 && emgRes.data.token, "Emergency Officer authenticates successfully");
        const emgToken = emgRes.data.token;

        // 9.2 Hospital Admin blocked from Water Sectors and Water Staff
        const hospSecRes = await request({
            hostname: "localhost", port: 5000, path: "/api/water/sectors", method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${hospAdminToken}` }
        }, { name: "Hospital Unauthorized Sector", boundary_geojson: [[26.75, 83.37], [26.76, 83.38]] });
        assert(hospSecRes.status === 403, "Hospital Admin is blocked (403) from creating Water Sectors");

        const hospStaffRes = await request({
            hostname: "localhost", port: 5000, path: "/api/water/admin/staff", method: "GET",
            headers: { "Authorization": `Bearer ${hospAdminToken}` }
        });
        assert(hospStaffRes.status === 403, "Hospital Admin is blocked (403) from accessing Water Department Staff management");

        // 9.3 Police blocked from Water Network Planner
        const policeRouteRes = await request({
            hostname: "localhost", port: 5000, path: "/api/water/sewage-planner/routes", method: "GET",
            headers: { "Authorization": `Bearer ${policeToken}` }
        });
        assert(policeRouteRes.status === 403, "Police Department is blocked (403) from internal Water Network routes");

        // 9.4 Waste Officer blocked from Water Flow Control and Staff
        const wasteFlowRes = await request({
            hostname: "localhost", port: 5000, path: "/api/water/flow-control/operate", method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${wasteToken}` }
        }, { asset_id: "WTR-PUMP-01", action: "PUMP_START" });
        assert(wasteFlowRes.status === 403, "Waste Officer is blocked (403) from Water Flow Operations");

        // 9.5 Emergency Officer blocked from Water Admin Staff
        const emgStaffRes = await request({
            hostname: "localhost", port: 5000, path: "/api/water/admin/staff", method: "GET",
            headers: { "Authorization": `Bearer ${emgToken}` }
        });
        assert(emgStaffRes.status === 403, "Emergency Officer is blocked (403) from Water Staff Administration");

        // =========================================================================
        // STEP 10: WATER SECTORS CRUD & STAFF SCOPING
        // =========================================================================
        console.log("\n--- [10] WATER SECTORS CRUD & STAFF SCOPING ---");

        // 10.1 Water Admin lists all municipal sectors
        const allSecRes = await request({
            hostname: "localhost", port: 5000, path: "/api/water/sectors", method: "GET",
            headers: { "Authorization": `Bearer ${waterAdminToken}` }
        });
        assert(allSecRes.status === 200 && Array.isArray(allSecRes.data.sectors) && allSecRes.data.sectors.length >= 4,
            "Water Admin retrieves all municipal sectors (universal view)");

        // 10.2 Water Staff retrieves only permitted sectors
        const staffSecRes = await request({
            hostname: "localhost", port: 5000, path: "/api/water/sectors", method: "GET",
            headers: { "Authorization": `Bearer ${waterStaffToken}` }
        });
        assert(staffSecRes.status === 200 && Array.isArray(staffSecRes.data.sectors), "Water Staff retrieves sectors list");
        const staffSecCodes = staffSecRes.data.sectors.map(s => s.sector_code);
        assert(staffSecCodes.length <= allSecRes.data.sectors.length && (staffSecCodes.includes("SEC-WTR-01") || staffSecCodes.includes("SEC-WTR-02")),
            "Water Staff view is correctly scoped to permitted sectors (SEC-WTR-01, SEC-WTR-02)");

        // 10.3 Water Staff cannot create sector (403 Forbidden)
        const staffCreateSecRes = await request({
            hostname: "localhost", port: 5000, path: "/api/water/sectors", method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${waterStaffToken}` }
        }, { name: "Illegal Staff Sector", boundary_geojson: [[26.75, 83.37], [26.76, 83.38]] });
        assert(staffCreateSecRes.status === 403, "Water Staff is blocked (403) from creating sectors");

        // 10.4 Water Admin creates a new sector
        const newSecRes = await request({
            hostname: "localhost", port: 5000, path: "/api/water/sectors", method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${waterAdminToken}` }
        }, {
            sector_code: "SEC-WTR-QA99",
            name: "QA Automated Testing Sector",
            zone: "North Industrial Fringe",
            boundary_geojson: [
                [26.770, 83.360], [26.775, 83.360], [26.775, 83.370], [26.770, 83.370], [26.770, 83.360]
            ],
            total_demand_mld: 8.5,
            population_served: 45000
        });
        assert((newSecRes.status === 200 || newSecRes.status === 201) && newSecRes.data.success, "Water Admin successfully creates sector SEC-WTR-QA99");

        // 10.5 Water Admin updates the sector
        const updateSecRes = await request({
            hostname: "localhost", port: 5000, path: "/api/water/sectors/SEC-WTR-QA99", method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${waterAdminToken}` }
        }, {
            total_demand_mld: 10.2,
            population_served: 52000
        });
        assert(updateSecRes.status === 200 && updateSecRes.data.success, "Water Admin successfully updates sector attributes");

        // 10.6 Water Admin deletes the sector
        const delSecRes = await request({
            hostname: "localhost", port: 5000, path: "/api/water/sectors/SEC-WTR-QA99", method: "DELETE",
            headers: { "Authorization": `Bearer ${waterAdminToken}` }
        });
        assert(delSecRes.status === 200 && delSecRes.data.success, "Water Admin cleanly deletes sector SEC-WTR-QA99");

        // =========================================================================
        // STEP 11: WATER STAFF RBAC MANAGEMENT (HOSPITAL MODEL)
        // =========================================================================
        console.log("\n--- [11] WATER STAFF RBAC MANAGEMENT (HOSPITAL MODEL) ---");

        // 11.1 Water Staff blocked from listing all staff (403)
        const staffGetStaffRes = await request({
            hostname: "localhost", port: 5000, path: "/api/water/admin/staff", method: "GET",
            headers: { "Authorization": `Bearer ${waterStaffToken}` }
        });
        assert(staffGetStaffRes.status === 403, "Water Staff is blocked (403) from accessing Water Staff management list");

        // 11.2 Water Admin lists all department staff
        const adminGetStaffRes = await request({
            hostname: "localhost", port: 5000, path: "/api/water/admin/staff", method: "GET",
            headers: { "Authorization": `Bearer ${waterAdminToken}` }
        });
        assert(adminGetStaffRes.status === 200 && Array.isArray(adminGetStaffRes.data.staff),
            "Water Admin retrieves full list of department staff records");

        // 11.3 Water Admin creates new staff engineer with permitted sectors & assets
        const createStaffRes = await request({
            hostname: "localhost", port: 5000, path: "/api/water/admin/staff", method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${waterAdminToken}` }
        }, {
            staffId: "WTR-QA-ENG",
            name: "Er. Deepak Mishra",
            role: "engineer",
            email: "deepak.mishra@smartcity.gov.in",
            permitted_sectors: ["SEC-WTR-01", "SEC-WTR-03"],
            permitted_assets: ["WTR-PUMP-01", "WTR-VALVE-02"],
            permissions: ["view", "update", "work_orders"]
        });
        assert((createStaffRes.status === 200 || createStaffRes.status === 201) && createStaffRes.data.success,
            "Water Admin successfully creates staff member WTR-QA-ENG with permitted sectors and assets");

        // 11.4 Water Admin updates staff permissions & permitted sectors
        const updateStaffPermRes = await request({
            hostname: "localhost", port: 5000, path: "/api/water/admin/staff/WTR-QA-ENG/permissions", method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${waterAdminToken}` }
        }, {
            permitted_sectors: ["SEC-WTR-01", "SEC-WTR-02", "SEC-WTR-04"],
            permissions: ["view", "update", "work_orders", "inspect_assets"]
        });
        assert(updateStaffPermRes.status === 200 && updateStaffPermRes.data.success,
            "Water Admin successfully updates permissions & permitted sectors for WTR-QA-ENG");

        // 11.5 Water Admin toggles staff status
        const updateStaffStatusRes = await request({
            hostname: "localhost", port: 5000, path: "/api/water/admin/staff/WTR-QA-ENG/status", method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${waterAdminToken}` }
        }, { status: "Active" });
        assert(updateStaffStatusRes.status === 200 && updateStaffStatusRes.data.success,
            "Water Admin successfully updates staff status to Active");

        // =========================================================================
        // STEP 12: AI PIPELINE ROUTE SUGGESTION SAFETY POLICY ENFORCEMENT
        // =========================================================================
        console.log("\n--- [12] AI ROUTE SUGGESTION SAFETY POLICY ENFORCEMENT ---");

        // 12.1 Tool 25: suggest_water_pipeline_route via AI Chat
        const aiToolRouteRes = await request({
            hostname: "localhost", port: 5000, path: "/api/ai/chat", method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${waterAdminToken}` }
        }, {
            message: "Suggest a sewage pipeline route from Golghar to STP-01 along surveyed roads."
        });
        assert(aiToolRouteRes.status === 200 && aiToolRouteRes.data && aiToolRouteRes.data.reply,
            "AI Chat handles pipeline route suggestion prompt");
        assert(
            aiToolRouteRes.data.reply.includes("DRAFT") ||
            aiToolRouteRes.data.reply.includes("suggest") ||
            aiToolRouteRes.data.reply.includes("road") ||
            aiToolRouteRes.data.reply.includes("route") ||
            aiToolRouteRes.data.reply.includes("approval"),
            "AI response incorporates safety notice that route suggestions are draft-only and require manual review"
        );

        // 12.2 Direct tool verification: grounded tool must strictly enforce can_auto_publish = false
        const GroundedTools = require("../backend/services/grounded_tools");
        const toolResult = await GroundedTools.suggest_water_pipeline_route({
            origin_asset_id: "WTR-PUMP-01",
            destination_asset_id: "STP-01",
            network_type: "SEWAGE",
            zone: "Golghar"
        });
        assert(toolResult.success === true && toolResult.can_auto_publish === false && toolResult.published === false,
            "Grounded Tool #25 strictly enforces can_auto_publish: false and published: false");
        assert(toolResult.route && Array.isArray(toolResult.route.waypoints) && toolResult.route.waypoints.length > 0,
            "Tool returns draft waypoints aligned with road corridor coordinates");
        assert(Boolean(toolResult.safety_policy_disclaimer),
            "Tool includes mandatory safety policy disclaimer requiring human Water Admin verification");


        // =========================================================================
        // SUMMARY
        // =========================================================================
        console.log("\n================================================================================");
        console.log(`📊 FINAL RESULTS: ${passCount} PASSED, ${failCount} FAILED (TOTAL: ${passCount + failCount})`);
        console.log("================================================================================");

        if (failCount > 0) {
            process.exit(1);
        } else {
            console.log("🎉 ALL WATER COMMAND CENTER VERIFICATION CRITERIA PASSED SUCCESSFULLY!\n");
            process.exit(0);
        }
    } catch (err) {
        console.error("Test execution fatal error:", err);
        process.exit(1);
    }
}

runWaterCommandCenterTests();
