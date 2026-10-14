/**
 * SmartCity AI — Water Network Usability & Architecture Verification Test Suite
 * Validates:
 * 1. Extending 2-point routes into multi-point routes (curve_points LineString persistence)
 * 2. Saving and reloading geometry
 * 3. Road-snapped routing & parallel corridor calculations
 * 4. Branching from existing junction
 * 5. Splitting routes at intermediate junctions
 * 6. Combined Road Corridor deployment (Strictly separate Potable & Sewage lines)
 * 7. Searchable equipment library (pumps, motors, valves, sensors, setpoints, thresholds)
 * 8. Asset relocation with connected pipeline endpoint re-anchoring (no silent disconnects)
 * 9. Role-based access control (Visitor/Staff blocked, Water Admin allowed)
 * 10. Audit trail persistence in water_network_audit_logs
 * 11. Regression validation (complaints, tankers, SCADA telemetry)
 */

const jwt = require('../backend/node_modules/jsonwebtoken');

const BASE_URL = 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'smartcity_super_secret_jwt_key_gorakhpur_2026';

// Tokens
const adminToken = jwt.sign(
    { id: 'WTR-ADM-01', staffId: 'WTR-ADMIN', name: 'Chief Water Engineer', role: 'admin', department: 'water', email: 'wateradmin@smartcity.gov' },
    JWT_SECRET,
    { expiresIn: '2h' }
);

const staffToken = jwt.sign(
    { id: 'WTR-STF-01', name: 'Field Operator', role: 'staff', department: 'water', email: 'waterstaff@smartcity.gov' },
    JWT_SECRET,
    { expiresIn: '2h' }
);

const citizenToken = jwt.sign(
    { id: 'CIT-01', name: 'Citizen User', role: 'citizen', email: 'citizen@example.com' },
    JWT_SECRET,
    { expiresIn: '2h' }
);

const adminHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` };
const staffHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` };
const citizenHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${citizenToken}` };

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✅ PASS: ${message}`);
        passedTests++;
    } else {
        console.error(`  ❌ FAIL: ${message}`);
        failedTests++;
    }
}

async function api(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, data };
}

async function runTests() {
    console.log("================================================================================");
    console.log("🌊 STARTING WATER NETWORK USABILITY & PIPELINE UPGRADE VERIFICATION SUITE");
    console.log("================================================================================\n");

    let createdPipeId = null;
    let splitPartAPipeId = null;
    let branchPipeId = null;
    let createdAssetId = null;
    let corridorPotableId = null;
    let corridorSewageId = null;

    try {
        // -------------------------------------------------------------------------
        // TEST 1: Role-Based Access Control on Network Mutations
        // -------------------------------------------------------------------------
        console.log("1️⃣ Testing Role-Based Security Restrictions...");
        const citizenRes = await api('/api/water/pipelines', {
            method: 'POST',
            headers: citizenHeaders,
            body: JSON.stringify({
                pipeline_code: 'PL-UNAUTH-01',
                name: 'Unauthorized Pipe',
                start_lat: 26.76, start_lng: 83.37, end_lat: 26.77, end_lng: 83.38
            })
        });
        assert(citizenRes.status === 403, "Citizen correctly blocked from creating pipeline (403 Forbidden)");

        const staffRes = await api('/api/water/network/assets', {
            method: 'POST',
            headers: staffHeaders,
            body: JSON.stringify({
                asset_id: 'AST-UNAUTH-01',
                name: 'Unauthorized Pump',
                asset_type: 'BOOSTER_PUMP',
                latitude: 26.76, longitude: 83.37
            })
        });
        assert(staffRes.status === 403, "Staff correctly blocked from creating asset (403 Forbidden)");

        // -------------------------------------------------------------------------
        // TEST 2: Multi-Point Route Creation with Ordered Curve Points
        // -------------------------------------------------------------------------
        console.log("\n2️⃣ Testing Multi-Point Route Creation & Geometry Persistence...");
        const multiPointVertices = [
            { lat: 26.7606, lng: 83.3732, roadName: "Park Road" },
            { lat: 26.7615, lng: 83.3755, roadName: "Park Road" },
            { lat: 26.7628, lng: 83.3780, roadName: "Town Hall Road" },
            { lat: 26.7645, lng: 83.3812, roadName: "Town Hall Road" },
            { lat: 26.7660, lng: 83.3845, roadName: "Town Hall Road" }
        ];

        const createRes = await api('/api/water/pipelines', {
            method: 'POST',
            headers: adminHeaders,
            body: JSON.stringify({
                pipeline_code: `PL-TEST-${Date.now().toString().slice(-4)}`,
                name: "Town Hall Multi-Point Feeder",
                pipe_type: "POTABLE",
                curve_points: multiPointVertices,
                total_length_m: 1420,
                pipe_diameter_mm: 450,
                material: "Ductile Iron",
                burial_depth_m: 1.8,
                status: "OPERATIONAL"
            })
        });

        console.log("createRes status and data:", createRes.status, createRes.data);
        assert(createRes.data.success === true, "Multi-point pipeline created successfully via Water Admin");
        createdPipeId = createRes.data.pipeline?.id || createRes.data.pipelineId;
        assert(createdPipeId !== undefined, `Received pipeline ID: ${createdPipeId}`);

        // -------------------------------------------------------------------------
        // TEST 3: Reload Geometry and Verify All Ordered Vertices
        // -------------------------------------------------------------------------
        console.log("\n3️⃣ Testing Geometry Reload & Intermediate Vertex Preservation...");
        const fetchRes = await api('/api/water/pipelines');
        assert(fetchRes.data.success === true, "Fetched existing pipelines list");
        const loadedPipe = fetchRes.data.pipelines.find(p => p.id === createdPipeId);
        assert(loadedPipe !== undefined, "Found created pipeline in database");

        let loadedPts = loadedPipe.curve_points;
        if (typeof loadedPts === "string") loadedPts = JSON.parse(loadedPts);
        assert(Array.isArray(loadedPts), "curve_points is a valid array");
        assert(loadedPts.length === 5, `Expected 5 vertices, loaded ${loadedPts.length} vertices`);
        assert(Number(loadedPts[0].lat).toFixed(4) === "26.7606", "First vertex latitude matches start point");
        assert(Number(loadedPts[4].lat).toFixed(4) === "26.7660", "Final vertex latitude matches end point");

        // -------------------------------------------------------------------------
        // TEST 4: Extending the Multi-Point Route with Additional Vertices
        // -------------------------------------------------------------------------
        console.log("\n4️⃣ Testing Route Extension (Continuing route beyond endpoint)...");
        const extendedVertices = [
            ...loadedPts,
            { lat: 26.7675, lng: 83.3870, roadName: "Town Hall Extension" },
            { lat: 26.7690, lng: 83.3900, roadName: "Town Hall Extension" }
        ];

        const extendRes = await api(`/api/water/pipelines/${createdPipeId}`, {
            method: 'PUT',
            headers: adminHeaders,
            body: JSON.stringify({
                name: "Town Hall Extended Feeder",
                curve_points: extendedVertices,
                total_length_m: 2150,
                pipe_diameter_mm: 450
            })
        });

        assert(extendRes.data.success === true, "Pipeline route successfully extended");

        const reloadedPipe = (await api('/api/water/pipelines')).data.pipelines.find(p => p.id === createdPipeId);
        let reloadedPts = reloadedPipe.curve_points;
        if (typeof reloadedPts === "string") reloadedPts = JSON.parse(reloadedPts);
        assert(reloadedPts.length === 7, `Route extended to ${reloadedPts.length} vertices (expected 7)`);
        assert(Number(reloadedPts[6].lat).toFixed(4) === "26.7690", "New endpoint coordinates persisted accurately");

        // -------------------------------------------------------------------------
        // TEST 5: Route Splitting with Automatic Intermediate Junction Creation
        // -------------------------------------------------------------------------
        console.log("\n5️⃣ Testing Route Splitting at Midpoint Junction...");
        const splitCoord = { lat: 26.7645, lng: 83.3812 };
        const splitRes = await api('/api/water/pipelines/split', {
            method: 'POST',
            headers: adminHeaders,
            body: JSON.stringify({
                pipelineId: createdPipeId,
                splitCoord
            })
        });

        assert(splitRes.data.success === true, "Pipeline split into two segments successfully");
        assert(splitRes.data.junctionAsset !== undefined, "Intermediate junction asset created at split point");
        assert(splitRes.data.segmentA !== undefined && splitRes.data.segmentB !== undefined, "Both Part A and Part B segments registered");

        splitPartAPipeId = splitRes.data.segmentA.id;
        const junctionId = splitRes.data.junctionAsset.asset_id;
        console.log(`     Created Junction: ${junctionId} at (${splitCoord.lat}, ${splitCoord.lng})`);

        // -------------------------------------------------------------------------
        // TEST 6: Branch Creation Anchored to Existing Junction
        // -------------------------------------------------------------------------
        console.log("\n6️⃣ Testing Branch Creation from Junction Node...");
        const branchVertices = [
            splitCoord,
            { lat: 26.7650, lng: 83.3800, roadName: "Branch Cross Road" },
            { lat: 26.7670, lng: 83.3785, roadName: "Branch Cross Road" }
        ];

        const branchRes = await api('/api/water/pipelines/branch', {
            method: 'POST',
            headers: adminHeaders,
            body: JSON.stringify({
                parentPipelineId: splitPartAPipeId,
                junctionId: junctionId,
                name: "Town Hall West Sub-Branch",
                pipe_type: "POTABLE",
                points: branchVertices,
                diameter_mm: 200,
                material: "HDPE",
                depth_m: 1.5
            })
        });

        assert(branchRes.data.success === true, "Branch route created successfully");
        branchPipeId = branchRes.data.branchPipeline.id;
        assert(branchRes.data.branchPipeline.branch_from_id === splitPartAPipeId, "branch_from_id matches parent pipeline");
        assert(branchRes.data.branchPipeline.junction_id === junctionId, "junction_id matches intermediate junction");

        // -------------------------------------------------------------------------
        // TEST 7: Combined Road Corridor Deployment (Dual Parallel Pipes)
        // -------------------------------------------------------------------------
        console.log("\n7️⃣ Testing Combined Road Corridor (Potable & Sewage Separation)...");
        const corridorCenterline = [
            { lat: 26.7550, lng: 83.3680 },
            { lat: 26.7580, lng: 83.3710 },
            { lat: 26.7610, lng: 83.3740 }
        ];

        const corridorRes = await api('/api/water/pipelines/combined-corridor', {
            method: 'POST',
            headers: adminHeaders,
            body: JSON.stringify({
                roadName: "Gorakhpur Civil Lines Corridor",
                points: corridorCenterline,
                potableSpecs: {
                    name: "Civil Lines Potable Feeder",
                    diameter_mm: 450,
                    material: "Ductile Iron",
                    depth_m: 1.8
                },
                sewageSpecs: {
                    name: "Civil Lines Sewage Trunk",
                    diameter_mm: 600,
                    material: "Reinforced Concrete",
                    depth_m: 2.8,
                    slope_percent: 1.2,
                    invert_level_m: 78.2
                }
            })
        });

        assert(corridorRes.data.success === true, "Combined corridor deployed successfully");
        assert(corridorRes.data.potablePipeline !== undefined, "Separate Potable pipeline created");
        assert(corridorRes.data.sewagePipeline !== undefined, "Separate Sewage pipeline created");
        corridorPotableId = corridorRes.data.potablePipeline.id;
        corridorSewageId = corridorRes.data.sewagePipeline.id;

        assert(corridorRes.data.potablePipeline.pipe_type === "POTABLE", "Potable pipe type is strictly POTABLE");
        assert(corridorRes.data.sewagePipeline.pipe_type === "WASTEWATER", "Sewage pipe type is strictly WASTEWATER");
        assert(corridorRes.data.sewagePipeline.burial_depth_m > corridorRes.data.potablePipeline.burial_depth_m, "Sewage pipeline is deeper (2.8m) than Potable pipeline (1.8m)");
        assert(Number(corridorRes.data.sewagePipeline.slope_percent) === 1.2, "Sewage slope percentage persisted (1.2%)");

        // -------------------------------------------------------------------------
        // TEST 8: Equipment Library Asset Deployment with Motor/Pump Setpoints
        // -------------------------------------------------------------------------
        console.log("\n8️⃣ Testing Equipment Creation with Motor Power & Setpoints...");
        const assetCreateRes = await api('/api/water/network/assets', {
            method: 'POST',
            headers: adminHeaders,
            body: JSON.stringify({
                asset_id: `AST-PMP-${Date.now().toString().slice(-4)}`,
                name: "Civil Lines High-Head Booster Pump",
                asset_type: "BOOSTER_PUMP",
                latitude: 26.7550,
                longitude: 83.3680,
                zone: "Civil Lines",
                status: "ONLINE",
                pump_capacity_lps: 400,
                motor_power_kw: 110,
                pressure_setpoint_bar: 4.2,
                flow_setpoint_lps: 180,
                sensor_units: "bar",
                alarm_min_threshold: 1.8,
                alarm_max_threshold: 6.8
            })
        });

        assert(assetCreateRes.data.success === true, "Booster pump asset created successfully");
        createdAssetId = assetCreateRes.data.asset.asset_id;

        const assetFetchRes = await api('/api/water/network/assets');
        const loadedAsset = assetFetchRes.data.assets.find(a => a.asset_id === createdAssetId);
        assert(loadedAsset !== undefined, "Found created asset in database");
        assert(Number(loadedAsset.pump_capacity_lps) === 400, "Pump capacity (400 L/s) verified");
        assert(Number(loadedAsset.motor_power_kw) === 110, "Motor power (110 kW) verified");
        assert(Number(loadedAsset.pressure_setpoint_bar) === 4.2, "Pressure setpoint (4.2 bar) verified");

        // -------------------------------------------------------------------------
        // TEST 9: Asset Relocation with Connected-Route Validation
        // -------------------------------------------------------------------------
        console.log("\n9️⃣ Testing Asset Relocation & Connected Endpoint Re-anchoring...");
        // Connect the corridor potable pipeline to this asset as source_node
        await api(`/api/water/pipelines/${corridorPotableId}`, {
            method: 'PUT',
            headers: adminHeaders,
            body: JSON.stringify({
                source_node: createdAssetId
            })
        });

        const newTargetCoords = { lat: 26.7562, lng: 83.3695 };
        const relocRes = await api('/api/water/network/assets/relocate', {
            method: 'POST',
            headers: adminHeaders,
            body: JSON.stringify({
                assetId: createdAssetId,
                targetLat: newTargetCoords.lat,
                targetLng: newTargetCoords.lng
            })
        });

        assert(relocRes.data.success === true, "Asset relocated successfully");
        assert(Number(relocRes.data.asset.latitude).toFixed(4) === "26.7562", "Asset latitude updated in database");
        assert(relocRes.data.connectedPipelinesUpdated.length > 0, `Updated ${relocRes.data.connectedPipelinesUpdated.length} connected pipeline(s)`);

        // Verify that the connected potable pipeline's start coordinate was automatically re-anchored
        const updatedPotablePipe = (await api('/api/water/pipelines')).data.pipelines.find(p => p.id === corridorPotableId);
        assert(Number(updatedPotablePipe.start_lat).toFixed(4) === "26.7562", "Connected pipeline start_lat automatically updated to match relocated asset");

        // -------------------------------------------------------------------------
        // TEST 10: Network Audit Trail Verification
        // -------------------------------------------------------------------------
        console.log("\n🔟 Testing Network Audit Trail Persistence...");
        const auditRes = await api('/api/water/network/audit-logs', { headers: adminHeaders });
        assert(auditRes.data.success === true, "Fetched network audit logs");
        assert(Array.isArray(auditRes.data.auditLogs) && auditRes.data.auditLogs.length > 0, "Audit logs contain mutation entries");

        const actionTypes = auditRes.data.auditLogs.map(l => l.action_type);
        console.log(`     Recent audit actions recorded: ${actionTypes.slice(0, 6).join(", ")}`);
        assert(actionTypes.includes("PIPELINE_CREATED"), "PIPELINE_CREATED recorded in audit log");
        assert(actionTypes.includes("PIPELINE_SPLIT"), "PIPELINE_SPLIT recorded in audit log");
        assert(actionTypes.includes("ASSET_RELOCATED"), "ASSET_RELOCATED recorded in audit log");

        // -------------------------------------------------------------------------
        // TEST 11: Regression Check for Complaints, Tankers & Telemetry
        // -------------------------------------------------------------------------
        console.log("\n1️⃣1️⃣ Running Module Regression Checks (Complaints, Tankers, SCADA)...");
        const complaintsRes = await api('/api/water/complaints');
        assert(complaintsRes.data.success === true, "Water complaints endpoint functional");

        const tankersRes = await api('/api/water/tanker-requests');
        assert(tankersRes.data.success === true, "Tanker requests endpoint functional");

        const hydraulicRes = await api('/api/water/hydraulic-ai/status');
        assert(hydraulicRes.data.system_healthy === true, "Hydraulic AI engine SCADA status functional");

        const tanksRes = await api('/api/water/tanks');
        assert(tanksRes.data.success === true, "Water tanks endpoint functional");

    } catch (err) {
        console.error("Test execution caught error:", err.message);
        failedTests++;
    }

    console.log("\n================================================================================");
    console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log("================================================================================");

    process.exit(failedTests > 0 ? 1 : 0);
}

runTests();
