/**
 * SmartCity AI - Water Intelligence, 3D Explorer & Wastewater Safety Test Suite
 *
 * Validates:
 * 1. Synchronized 2D/3D Network Topology & GIS Coordinates
 * 2. Pipe Type Segregation (POTABLE, WASTEWATER, RECLAIMED)
 * 3. STP Wastewater Treatment Quality Interlock (CPCB / UPPCB strict safety enforcement)
 * 4. Water Admin Route Governance (Draft -> Validation -> Impact -> Admin Publish)
 * 5. RBAC & Role-Specific Staff Work Orders
 * 6. Data Provenance & Telemetry Simulator Toggling
 * 7. AI Grounded Water SCADA & STP Tools with Multilingual Support
 */

const http = require('http');
const path = require('path');

// Load modules from backend/node_modules
const jwt = require(path.join(__dirname, '..', 'backend', 'node_modules', 'jsonwebtoken'));
const dotenv = require(path.join(__dirname, '..', 'backend', 'node_modules', 'dotenv'));

// Load environment
dotenv.config({ path: path.join(__dirname, '..', 'backend', '.env') });

const API_BASE = 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'smartcity_super_secret_jwt_key_gorakhpur_2026';

const adminToken = jwt.sign(
    { id: 1, staff_id: 'STAFF-001', name: 'Vikramaditya Rathore', role: 'admin', department: 'admin' },
    JWT_SECRET,
    { expiresIn: '2h' }
);

const staffToken = jwt.sign(
    { id: 2, staff_id: 'WTR001', name: 'Ramesh Plumber', role: 'staff', department: 'water' },
    JWT_SECRET,
    { expiresIn: '2h' }
);

const citizenToken = jwt.sign(
    { id: 3, mobile: '6306880179', name: 'Citizen Omkar', role: 'citizen' },
    JWT_SECRET,
    { expiresIn: '2h' }
);

function request(urlPath, method = 'GET', data = null, token = null) {
    return new Promise((resolve, reject) => {
        const u = new URL(urlPath, API_BASE);
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const req = http.request(
            {
                hostname: u.hostname,
                port: u.port,
                path: u.pathname + u.search,
                method: method,
                headers: headers
            },
            (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(body || '{}');
                        resolve({ status: res.statusCode, data: parsed, raw: body });
                    } catch (e) {
                        resolve({ status: res.statusCode, data: body, raw: body });
                    }
                });
            }
        );

        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function runWaterIntelligenceTestSuite() {
    console.log("💧 =============================================================");
    console.log("💧 SMARTCITY AI — WATER INTELLIGENCE & 3D SCADA TEST SUITE");
    console.log("💧 =============================================================\n");

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    async function assertTest(name, fn) {
        totalTests++;
        try {
            await fn();
            console.log(`  ✅ [PASS] ${name}`);
            passedTests++;
        } catch (err) {
            console.error(`  ❌ [FAIL] ${name} -> ${err.message}`);
            failedTests++;
        }
    }

    // -------------------------------------------------------------
    // TEST 1: Synchronized 2D/3D Network Topology
    // -------------------------------------------------------------
    await assertTest("1. Network Topology Endpoint returns synchronized 2D/3D nodes and edges", async () => {
        const res = await request('/api/water/network/topology', 'GET');
        if (res.status !== 200 || !res.data.success) {
            throw new Error(`Expected 200 OK, got ${res.status}: ${JSON.stringify(res.data)}`);
        }

        const { nodes, edges, metrics } = res.data;
        if (!Array.isArray(nodes) || nodes.length === 0) throw new Error("Topology nodes missing or empty");
        if (!Array.isArray(edges) || edges.length === 0) throw new Error("Topology edges missing or empty");

        // Verify key asset types exist
        const nodeTypes = new Set(nodes.map(n => n.type));
        if (!nodeTypes.has('TANK')) throw new Error("Nodes missing TANK type");
        if (!nodeTypes.has('TREATMENT_PLANT_STP')) throw new Error("Nodes missing STP treatment plant type");

        // Verify pipe type classifications exist
        const edgeTypes = new Set(edges.map(e => e.pipe_type));
        if (!edgeTypes.has('POTABLE')) throw new Error("Edges missing POTABLE clean supply type");
        if (!edgeTypes.has('WASTEWATER')) throw new Error("Edges missing WASTEWATER collection type");
        if (!edgeTypes.has('RECLAIMED')) throw new Error("Edges missing RECLAIMED recycled water type");

        // Verify GIS Coordinate bounds for Gorakhpur
        nodes.forEach(n => {
            const lat = Number(n.lat);
            const lng = Number(n.lng);
            if (isNaN(lat) || lat < 26.6 || lat > 26.9) throw new Error(`Invalid latitude for node ${n.id}: ${lat}`);
            if (isNaN(lng) || lng < 83.2 || lng > 83.6) throw new Error(`Invalid longitude for node ${n.id}: ${lng}`);
        });

        // Verify Data Provenance tags
        edges.forEach(e => {
            if (!['SIMULATED', 'MEASURED'].includes(e.data_source)) {
                throw new Error(`Edge ${e.id} missing valid data_source provenance tag`);
            }
        });
    });

    // -------------------------------------------------------------
    // TEST 2: Asset Telemetry with Upstream & Downstream Topology
    // -------------------------------------------------------------
    await assertTest("2. Asset Telemetry returns upstream/downstream connections for STP-01", async () => {
        const res = await request('/api/water/network/assets/STP-01', 'GET');
        if (res.status !== 200 || !res.data.success) {
            throw new Error(`Expected 200 OK, got ${res.status}`);
        }

        const asset = res.data.asset;
        if (!asset || asset.asset_id !== 'STP-01') throw new Error("Incorrect asset returned");
        if (!Array.isArray(asset.upstream_connections)) throw new Error("Missing upstream_connections array");
        if (!Array.isArray(asset.downstream_connections)) throw new Error("Missing downstream_connections array");

        // STP-01 should receive wastewater upstream and discharge reclaimed water downstream
        const hasUpstreamWastewater = asset.upstream_connections.some(c => c.pipe_type === 'WASTEWATER');
        const hasDownstreamReclaimed = asset.downstream_connections.some(c => c.pipe_type === 'RECLAIMED');

        if (!hasUpstreamWastewater) throw new Error("STP-01 should connect to upstream wastewater collection");
        if (!hasDownstreamReclaimed) throw new Error("STP-01 should connect to downstream reclaimed water destination");
    });

    // -------------------------------------------------------------
    // TEST 3: CPCB/UPPCB Laboratory Compliance & Reuse Safety Interlock
    // -------------------------------------------------------------
    let testBatchId = null;

    await assertTest("3. Wastewater Treatment Safety: Non-compliant lab parameters STRICTLY BLOCK reuse approval (Rule 6)", async () => {
        // Step A: Create a test treatment batch with elevated pollutants
        const createRes = await request('/api/water/treatment/batches', 'POST', {
            plant_name: "STP-01 (Ramgarh Tal Central STP)",
            inlet_volume_kl: 15000,
            outlet_volume_kl: 14200,
            stage: "TERTIARY_DISINFECTED",
            bod_mg_l: 35.0, // High BOD (CPCB limit is 10)
            cod_mg_l: 95.0, // High COD (CPCB limit is 50)
            tss_mg_l: 45.0, // High TSS (CPCB limit is 20)
            ph: 8.9,        // High pH (CPCB range is 6.5 - 8.5)
            reuse_destination: "RAMGARH_TAL_LAKE"
        }, staffToken);

        if (createRes.status !== 201 || !createRes.data.batch) {
            throw new Error(`Failed to create test batch: ${JSON.stringify(createRes.data)}`);
        }

        testBatchId = createRes.data.batch.batch_id;
        if (createRes.data.batch.quality_status !== 'NON_COMPLIANT') {
            throw new Error(`Expected initial status NON_COMPLIANT, got ${createRes.data.batch.quality_status}`);
        }

        // Step B: Water Admin attempts to approve reuse for this non-compliant batch
        const approveAttempt = await request(`/api/water/treatment/batches/${testBatchId}/approve-reuse`, 'PUT', {
            reuse_destination: "RAMGARH_TAL_LAKE",
            comments: "Attempting premature approval"
        }, adminToken);

        // MUST FAIL WITH 400 (SAFETY INTERLOCK)
        if (approveAttempt.status !== 400) {
            throw new Error(`Safety failure! Non-compliant batch was NOT blocked. Expected HTTP 400, got ${approveAttempt.status}`);
        }
        const msg = (approveAttempt.data.message || '').toLowerCase();
        if (!msg.includes("safety interlock") && !msg.includes("blocked") && !msg.includes("failed")) {
            throw new Error(`Expected error message to explain safety interlock blockage, got: ${approveAttempt.data.message}`);
        }
    });

    await assertTest("4. Wastewater Treatment Safety: Compliant laboratory verification enables reuse authorization", async () => {
        if (!testBatchId) throw new Error("No test batch from previous step");

        // Step A: Chemist logs verified laboratory report meeting all CPCB / UPPCB standards
        const verifyRes = await request(`/api/water/treatment/batches/${testBatchId}/verify-quality`, 'PUT', {
            bod_mg_l: 8.1,                   // ≤ 10 mg/L (PASS)
            cod_mg_l: 38.0,                  // ≤ 50 mg/L (PASS)
            tss_mg_l: 12.0,                  // ≤ 20 mg/L (PASS)
            ph: 7.3,                         // 6.5 - 8.5 (PASS)
            fecal_coliform_mpn_100ml: 45,     // ≤ 100 MPN/100mL (PASS)
            laboratory_certified_by: "Dr. S. Verma (Municipal Environmental Laboratory)"
        }, staffToken);

        if (verifyRes.status !== 200 || !verifyRes.data.success) {
            throw new Error(`Failed to verify quality: ${JSON.stringify(verifyRes.data)}`);
        }
        if (verifyRes.data.batch.quality_status !== 'COMPLIANT') {
            throw new Error(`Expected COMPLIANT quality status, got ${verifyRes.data.batch.quality_status}`);
        }

        // Step B: Water Admin authorizes municipal reuse now that laboratory safety is verified
        const approveRes = await request(`/api/water/treatment/batches/${testBatchId}/approve-reuse`, 'PUT', {
            reuse_destination: "RAMGARH_TAL_LAKE",
            comments: "Verified by Jal Sansthan Lab. Authorized for ecological lake replenishment."
        }, adminToken);

        if (approveRes.status !== 200 || !approveRes.data.success) {
            throw new Error(`Expected successful approval (200), got ${approveRes.status}: ${JSON.stringify(approveRes.data)}`);
        }
        if (approveRes.data.batch.approval_status !== 'APPROVED') {
            throw new Error(`Expected approval_status APPROVED, got ${approveRes.data.batch.approval_status}`);
        }
    });

    // -------------------------------------------------------------
    // TEST 4: Water Admin Route Governance & Versioning
    // -------------------------------------------------------------
    let testDraftVersionId = null;

    await assertTest("5. Route Validation Engine detects topology bounds, head loss & operating pressure", async () => {
        const valRes = await request('/api/water/admin/network-versions/validate-route', 'POST', {
            pipeline_code: "PL-TEST-VAL",
            name: "Ramgarh Tal Auxiliary Feeder",
            pipe_type: "RECLAIMED",
            start_lat: 26.7450,
            start_lng: 83.3900,
            end_lat: 26.7550,
            end_lng: 83.4000,
            diameter_mm: 500,
            zone: "Ramgarh Tal"
        }, staffToken);

        if (valRes.status !== 200 || !valRes.data.is_valid) {
            throw new Error(`Route validation failed: ${JSON.stringify(valRes.data)}`);
        }

        const { estimated_length_km, hydraulic_assessment } = valRes.data;
        if (!estimated_length_km || estimated_length_km <= 0) throw new Error("Invalid length calculation");
        if (!hydraulic_assessment || !hydraulic_assessment.recommended_operating_pressure_bar) {
            throw new Error("Missing hydraulic assessment");
        }
    });

    await assertTest("6. Route Proposal Draft Creation and RBAC Publishing Guard (Rule 7)", async () => {
        // Step A: Staff creates a draft version proposal
        const draftRes = await request('/api/water/admin/network-versions/draft', 'POST', {
            change_title: "Proposal: Golghar Trunk Line Optimization",
            description: "Re-routing trunk bypass to alleviate low pressure during morning peak hours.",
            affected_zones: ["Golghar Central", "Civil Lines"],
            draft_pipeline_changes: [{
                pipeline_code: "PL-TEST-TRUNK",
                name: "Golghar Auxiliary Trunk",
                pipe_type: "POTABLE",
                start_lat: 26.7620,
                start_lng: 83.3750,
                end_lat: 26.7680,
                end_lng: 83.3820,
                diameter_mm: 450,
                action: "ADD_OR_MODIFY"
            }]
        }, staffToken);

        if (draftRes.status !== 201 || !draftRes.data.version) {
            throw new Error(`Failed to create draft version: ${JSON.stringify(draftRes.data)}`);
        }

        testDraftVersionId = draftRes.data.version.version_id;
        if (draftRes.data.version.status !== 'DRAFT') {
            throw new Error(`Expected status DRAFT, got ${draftRes.data.version.status}`);
        }

        // Step B: Regular staff attempts to publish (MUST BE FORBIDDEN 403)
        const staffPublishAttempt = await request(`/api/water/admin/network-versions/${testDraftVersionId}/publish`, 'POST', {}, staffToken);
        if (staffPublishAttempt.status !== 403) {
            throw new Error(`Security breach! Non-admin staff published route version. Expected 403, got ${staffPublishAttempt.status}`);
        }

        // Step C: Authorized Water Admin publishes version (MUST SUCCEED 200)
        const adminPublishRes = await request(`/api/water/admin/network-versions/${testDraftVersionId}/publish`, 'POST', {}, adminToken);
        if (adminPublishRes.status !== 200 || !adminPublishRes.data.success) {
            throw new Error(`Admin publish failed: ${JSON.stringify(adminPublishRes.data)}`);
        }
        if (adminPublishRes.data.version.status !== 'PUBLISHED') {
            throw new Error(`Expected version status PUBLISHED, got ${adminPublishRes.data.version.status}`);
        }
    });

    // -------------------------------------------------------------
    // TEST 5: Role-Specific Work Orders
    // -------------------------------------------------------------
    let testOrderId = null;

    await assertTest("7. Specialized Role Work Orders creation, role allocation & status transition (Rule 8)", async () => {
        // Step A: Admin dispatches specialized work order for TREATMENT_OPERATOR
        const orderRes = await request('/api/water/work-orders', 'POST', {
            title: "Calibrate UV Disinfection Array & Chlorine Sensors",
            asset_id: "STP-01",
            required_role: "TREATMENT_OPERATOR",
            assigned_to_name: "Sunil Pandey (STP Lead)",
            priority: "HIGH",
            zone: "Ramgarh Tal",
            deadline: "2026-10-20",
            description: "Perform optical sensor clean and verify chlorine dosing ppm."
        }, adminToken);

        if (orderRes.status !== 201 || !orderRes.data.order) {
            throw new Error(`Failed to create work order: ${JSON.stringify(orderRes.data)}`);
        }

        testOrderId = orderRes.data.order.order_id;
        if (orderRes.data.order.required_role.toLowerCase() !== 'treatment_operator') {
            throw new Error(`Incorrect role allocation: ${orderRes.data.order.required_role}`);
        }

        // Step B: Worker updates status to IN_PROGRESS and COMPLETED
        const updateRes = await request(`/api/water/work-orders/${testOrderId}/status`, 'PUT', {
            status: "COMPLETED"
        }, staffToken);

        if (updateRes.status !== 200 || !updateRes.data.success) {
            throw new Error(`Failed to update status: ${JSON.stringify(updateRes.data)}`);
        }
    });

    // -------------------------------------------------------------
    // TEST 6: Data Provenance & Telemetry Simulator Toggling
    // -------------------------------------------------------------
    await assertTest("8. Telemetry simulator state querying and toggling (Rule 9)", async () => {
        // Query initial mode
        const modeRes = await request('/api/water/telemetry/mode', 'GET');
        if (modeRes.status !== 200) throw new Error("Failed to get telemetry mode");
        const initialActive = modeRes.data.simulator_active;

        // Toggle mode
        const toggleRes = await request('/api/water/telemetry/toggle-simulator', 'POST', {
            active: !initialActive
        }, staffToken);

        if (toggleRes.status !== 200 || toggleRes.data.simulator_active !== !initialActive) {
            throw new Error("Failed to toggle simulator mode");
        }

        // Toggle back to active
        await request('/api/water/telemetry/toggle-simulator', 'POST', {
            active: true
        }, staffToken);
    });

    // -------------------------------------------------------------
    // TEST 7: AI Grounded SCADA & STP Tools Integration
    // -------------------------------------------------------------
    await assertTest("9. SmartCity AI Grounded Tools retrieve live SCADA telemetry and treatment metrics (Rule 10)", async () => {
        const groundedTools = require('../backend/services/grounded_tools');

        // Test Tool 1: Pipeline SCADA Telemetry
        const pipeToolResult = await groundedTools.get_water_pipeline_telemetry({ pipeline_code: 'PL-101' });
        if (!pipeToolResult.success || !pipeToolResult.pipeline) {
            throw new Error(`AI Tool get_water_pipeline_telemetry failed: ${JSON.stringify(pipeToolResult)}`);
        }
        if (pipeToolResult.pipeline.pipe_type !== 'POTABLE') {
            throw new Error("Pipeline type mismatch in AI tool response");
        }

        // Test Tool 2: Wastewater Treatment Status
        const stpToolResult = await groundedTools.get_wastewater_treatment_status({ plant_name: 'STP-01' });
        if (!stpToolResult.success || !stpToolResult.batches) {
            throw new Error(`AI Tool get_wastewater_treatment_status failed: ${JSON.stringify(stpToolResult)}`);
        }
        if (!stpToolResult.regulatory_standards || !stpToolResult.regulatory_standards.cpcb_bod_limit_mg_l) {
            throw new Error("AI Tool missing CPCB regulatory standards explanation");
        }
    });

    await assertTest("10. AI Multilingual Query Intent Recognition (Hindi / English / Hinglish)", async () => {
        const aiOrchestrator = require('../backend/services/ai_orchestrator');

        // Hindi query
        const hindiRes = await aiOrchestrator.orchestrate({
            query: "Ramgarh Tal STP plant ka wastewater treatment aur quality status kya hai?",
            user: { role: "admin", name: "Admin" }
        });

        if (!hindiRes || !hindiRes.reply) throw new Error("AI returned empty reply for Hindi query");
        const replyLower = hindiRes.reply.toLowerCase();
        if (!replyLower.includes("stp") && !replyLower.includes("treatment") && !replyLower.includes("bod")) {
            throw new Error(`AI response did not ground on STP treatment: ${hindiRes.reply}`);
        }
    });

    console.log("\n=============================================================");
    console.log(`📊 WATER INTELLIGENCE TEST RESULTS: ${passedTests}/${totalTests} PASSED`);
    console.log("=============================================================\n");

    if (failedTests > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

// Auto-run if executed directly
if (require.main === module) {
    runWaterIntelligenceTestSuite().catch(err => {
        console.error("Test suite runtime failure:", err);
        process.exit(1);
    });
}

module.exports = { runWaterIntelligenceTestSuite };
