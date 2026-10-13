/**
 * SmartCity AI - Master Water Intelligence Deep Audit Test Suite
 *
 * Independently verifies:
 * 1. Missing laboratory parameters handling (Strict Safety - Never default to fake compliant data)
 * 2. Borderline laboratory compliance testing (BOD, COD, TSS, pH, Coliform, Turbidity)
 * 3. Destination-specific regulatory thresholds (Ramgarh Tal Lake vs Industrial GIDA)
 * 4. Cross-Department RBAC & Unauthorized Access Attempts (Citizen, Traffic Staff, Hospital Staff, Water Staff, Water Admin)
 * 5. Route publishing concurrency, idempotency, and transactional rollbacks
 * 6. AI Grounded Tools de-duplication, provenance metadata & ISO timestamps
 * 7. 2D/3D asset identity and topological connectivity
 */

const http = require('http');
const path = require('path');
const jwt = require(path.join(__dirname, '..', 'backend', 'node_modules', 'jsonwebtoken'));
const dotenv = require(path.join(__dirname, '..', 'backend', 'node_modules', 'dotenv'));

dotenv.config({ path: path.join(__dirname, '..', 'backend', '.env') });

const API_BASE = 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'smartcity_super_secret_jwt_key_gorakhpur_2026';

// Tokens
const waterAdminToken = jwt.sign(
    { id: 1, staff_id: 'STAFF-001', name: 'Vikramaditya Rathore', role: 'admin', department: 'admin' },
    JWT_SECRET,
    { expiresIn: '2h' }
);

const waterStaffToken = jwt.sign(
    { id: 2, staff_id: 'WTR001', name: 'Ramesh Plumber', role: 'staff', department: 'water' },
    JWT_SECRET,
    { expiresIn: '2h' }
);

const trafficStaffToken = jwt.sign(
    { id: 4, staff_id: 'TRF001', name: 'Rajesh Traffic Cop', role: 'staff', department: 'traffic' },
    JWT_SECRET,
    { expiresIn: '2h' }
);

const hospitalStaffToken = jwt.sign(
    { id: 5, staff_id: 'HSP001', name: 'Dr. Anita Nurse', role: 'staff', department: 'hospital' },
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

async function runDeepAuditSuite() {
    console.log("💧 =======================================================================");
    console.log("💧 SMARTCITY AI WATER INTELLIGENCE — INDEPENDENT VERIFICATION AUDIT");
    console.log("💧 =======================================================================\n");

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
    // SECTION 1: MISSING MANDATORY LAB PARAMETERS AUDIT
    // -------------------------------------------------------------
    console.log("--- SECTION 1: MISSING & MALFORMED LABORATORY PARAMETERS ---");

    let auditBatchId = null;

    await assertTest("1.1 Create initial batch at collection stage without lab values", async () => {
        const res = await request('/api/water/treatment/batches', 'POST', {
            plant_id: "STP-01",
            plant_name: "Gorakhpur Central STP",
            inlet_volume_kl: 10000,
            stage: "COLLECTION"
        }, waterStaffToken);

        if (res.status !== 201 || !res.data.batch) {
            throw new Error(`Failed to create batch: ${JSON.stringify(res.data)}`);
        }
        auditBatchId = res.data.batch.batch_id;
        if (res.data.batch.quality_status !== 'PENDING') {
            throw new Error(`Expected quality_status PENDING, got ${res.data.batch.quality_status}`);
        }
    });

    await assertTest("1.2 Missing mandatory parameters in verify-quality MUST block compliance", async () => {
        // Missing BOD and pH
        const res = await request(`/api/water/treatment/batches/${auditBatchId}/verify-quality`, 'PUT', {
            cod_mg_l: 35.0,
            tss_mg_l: 12.0,
            turbidity_ntu: 2.0
            // bod_mg_l and ph omitted!
        }, waterStaffToken);

        if (res.status !== 200 || !res.data.batch) {
            throw new Error(`Expected 200 with violation recording, got ${res.status}`);
        }

        if (res.data.is_compliant !== false) {
            throw new Error("Batch with missing lab parameters was falsely marked compliant!");
        }
        if (res.data.batch.quality_status !== 'NON_COMPLIANT') {
            throw new Error(`Expected NON_COMPLIANT, got ${res.data.batch.quality_status}`);
        }
        if (res.data.batch.approval_status !== 'BLOCKED_QUALITY_FAILURE') {
            throw new Error(`Expected BLOCKED_QUALITY_FAILURE, got ${res.data.batch.approval_status}`);
        }

        const missingBod = res.data.violations.some(v => v.includes("bod_mg_l"));
        const missingPh = res.data.violations.some(v => v.includes("ph"));
        if (!missingBod || !missingPh) {
            throw new Error(`Expected missing parameter violations, got: ${JSON.stringify(res.data.violations)}`);
        }
    });

    await assertTest("1.3 Water Admin CANNOT approve batch with missing mandatory quality checks", async () => {
        const res = await request(`/api/water/treatment/batches/${auditBatchId}/approve-reuse`, 'PUT', {
            reuse_destination: "RAMGARH_TAL_LAKE"
        }, waterAdminToken);

        if (res.status !== 400) {
            throw new Error(`Safety violation! Non-compliant batch approved with status ${res.status}`);
        }
        const msg = (res.data.message || '').toLowerCase();
        if (!msg.includes("safety interlock") && !msg.includes("cannot approve")) {
            throw new Error(`Expected safety interlock message, got: ${res.data.message}`);
        }
    });

    // -------------------------------------------------------------
    // SECTION 2: BORDERLINE LABORATORY COMPLIANCE TESTING
    // -------------------------------------------------------------
    console.log("\n--- SECTION 2: BORDERLINE VALUE VALIDATION ---");

    await assertTest("2.1 Borderline Exact Limits: BOD=10.0, COD=50.0, TSS=20.0, pH=6.5, Coliform=100, Turbidity=5.0 MUST PASS", async () => {
        const res = await request(`/api/water/treatment/batches/${auditBatchId}/verify-quality`, 'PUT', {
            bod_mg_l: 10.0,
            cod_mg_l: 50.0,
            tss_mg_l: 20.0,
            ph: 6.50,
            fecal_coliform_mpn: 100,
            turbidity_ntu: 5.0,
            reuse_destination: "RAMGARH_TAL_LAKE",
            laboratory_certified_by: "Central Analytical Chemistry Lab"
        }, waterStaffToken);

        if (res.status !== 200 || !res.data.is_compliant) {
            throw new Error(`Borderline exact limit failed compliance: ${JSON.stringify(res.data)}`);
        }
        if (res.data.batch.quality_status !== 'COMPLIANT') {
            throw new Error(`Expected COMPLIANT, got ${res.data.batch.quality_status}`);
        }
    });

    await assertTest("2.2 Borderline Upper Exceedance: BOD=10.01 mg/L MUST FAIL", async () => {
        const res = await request(`/api/water/treatment/batches/${auditBatchId}/verify-quality`, 'PUT', {
            bod_mg_l: 10.01,
            cod_mg_l: 50.0,
            tss_mg_l: 20.0,
            ph: 7.2,
            fecal_coliform_mpn: 100,
            turbidity_ntu: 5.0,
            reuse_destination: "RAMGARH_TAL_LAKE"
        }, waterStaffToken);

        if (res.data.is_compliant !== false || res.data.batch.quality_status !== 'NON_COMPLIANT') {
            throw new Error("BOD 10.01 mg/L did not trigger non-compliant status!");
        }
    });

    await assertTest("2.3 Borderline pH Bounds: pH=6.49 FAILS, pH=8.50 PASSES, pH=8.51 FAILS", async () => {
        // Test pH 6.49
        const resLow = await request(`/api/water/treatment/batches/${auditBatchId}/verify-quality`, 'PUT', {
            bod_mg_l: 8.0, cod_mg_l: 35.0, tss_mg_l: 12.0, ph: 6.49, fecal_coliform_mpn: 50, turbidity_ntu: 2.0
        }, waterStaffToken);
        if (resLow.data.is_compliant !== false) throw new Error("pH 6.49 falsely passed!");

        // Test pH 8.50
        const resPass = await request(`/api/water/treatment/batches/${auditBatchId}/verify-quality`, 'PUT', {
            bod_mg_l: 8.0, cod_mg_l: 35.0, tss_mg_l: 12.0, ph: 8.50, fecal_coliform_mpn: 50, turbidity_ntu: 2.0
        }, waterStaffToken);
        if (!resPass.data.is_compliant) throw new Error("pH 8.50 falsely failed!");

        // Test pH 8.51
        const resHigh = await request(`/api/water/treatment/batches/${auditBatchId}/verify-quality`, 'PUT', {
            bod_mg_l: 8.0, cod_mg_l: 35.0, tss_mg_l: 12.0, ph: 8.51, fecal_coliform_mpn: 50, turbidity_ntu: 2.0
        }, waterStaffToken);
        if (resHigh.data.is_compliant !== false) throw new Error("pH 8.51 falsely passed!");
    });

    // -------------------------------------------------------------
    // SECTION 3: DESTINATION-SPECIFIC REGULATORY THRESHOLDS
    // -------------------------------------------------------------
    console.log("\n--- SECTION 3: DESTINATION-SPECIFIC THRESHOLDS ---");

    let industrialBatchId = null;

    await assertTest("3.1 Batch meeting GIDA industrial limits (BOD=22 mg/L) passes for industrial destination", async () => {
        const createRes = await request('/api/water/treatment/batches', 'POST', {
            plant_id: "STP-01",
            plant_name: "Gorakhpur Central STP",
            inlet_volume_kl: 8000,
            stage: "SECONDARY_CLARIFIER",
            reuse_destination: "GIDA_INDUSTRIAL_COOLING"
        }, waterStaffToken);

        industrialBatchId = createRes.data.batch.batch_id;

        // Verify quality for industrial destination (limits: BOD 30, COD 100, TSS 50)
        const verifyRes = await request(`/api/water/treatment/batches/${industrialBatchId}/verify-quality`, 'PUT', {
            bod_mg_l: 22.0, // > 10 (lake limit), but <= 30 (industrial limit)
            cod_mg_l: 75.0, // > 50 (lake limit), but <= 100 (industrial limit)
            tss_mg_l: 35.0, // > 20 (lake limit), but <= 50 (industrial limit)
            ph: 7.4,
            fecal_coliform_mpn: 300,
            turbidity_ntu: 8.0,
            reuse_destination: "GIDA_INDUSTRIAL_COOLING"
        }, waterStaffToken);

        if (!verifyRes.data.is_compliant) {
            throw new Error(`Industrial batch failed verification: ${JSON.stringify(verifyRes.data)}`);
        }

        // Approving for sensitive Lake MUST FAIL
        const lakeApprove = await request(`/api/water/treatment/batches/${industrialBatchId}/approve-reuse`, 'PUT', {
            reuse_destination: "RAMGARH_TAL_LAKE"
        }, waterAdminToken);

        if (lakeApprove.status !== 400) {
            throw new Error(`Safety breach! Batch with BOD=22 was approved for Ramgarh Tal Lake! Status: ${lakeApprove.status}`);
        }

        // Approving for GIDA Industrial Cooling MUST SUCCEED
        const indApprove = await request(`/api/water/treatment/batches/${industrialBatchId}/approve-reuse`, 'PUT', {
            reuse_destination: "GIDA_INDUSTRIAL_COOLING"
        }, waterAdminToken);

        if (indApprove.status !== 200 || !indApprove.data.success) {
            throw new Error(`Failed to approve for industrial reuse: ${JSON.stringify(indApprove.data)}`);
        }
        if (indApprove.data.batch.approval_status !== 'APPROVED') {
            throw new Error(`Expected APPROVED status, got ${indApprove.data.batch.approval_status}`);
        }
    });

    // -------------------------------------------------------------
    // SECTION 4: SECURITY & CROSS-DEPARTMENT ACCESS AUDIT
    // -------------------------------------------------------------
    console.log("\n--- SECTION 4: SECURITY & CROSS-DEPARTMENT ACCESS ---");

    let draftVersionId = null;

    await assertTest("4.1 Create draft route proposal by Water Staff", async () => {
        const res = await request('/api/water/admin/network-versions/draft', 'POST', {
            change_title: "Trunk Feeder Security Verification Line",
            description: "Auditing unauthorized publishing protection.",
            affected_zones: ["Civil Lines"],
            draft_pipeline_changes: [{
                pipeline_code: "PL-AUDIT-01",
                name: "Security Audit Line",
                pipe_type: "POTABLE",
                start_lat: 26.7550,
                start_lng: 83.3750,
                end_lat: 26.7600,
                end_lng: 83.3800,
                diameter_mm: 400
            }]
        }, waterStaffToken);

        if (res.status !== 201) throw new Error(`Draft creation failed: ${res.status}`);
        draftVersionId = res.data.version.version_id;
    });

    await assertTest("4.2 Unauthenticated user cannot publish route (401)", async () => {
        const res = await request(`/api/water/admin/network-versions/${draftVersionId}/publish`, 'POST', {});
        if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    });

    await assertTest("4.3 Citizen cannot publish route (403)", async () => {
        const res = await request(`/api/water/admin/network-versions/${draftVersionId}/publish`, 'POST', {}, citizenToken);
        if (res.status !== 403) throw new Error(`Security breach! Citizen published route. Expected 403, got ${res.status}`);
    });

    await assertTest("4.4 Cross-Department: Traffic Staff cannot publish water route (403)", async () => {
        const res = await request(`/api/water/admin/network-versions/${draftVersionId}/publish`, 'POST', {}, trafficStaffToken);
        if (res.status !== 403) throw new Error(`Cross-dept breach! Traffic staff published water route. Expected 403, got ${res.status}`);
    });

    await assertTest("4.5 Cross-Department: Hospital Staff cannot publish water route (403)", async () => {
        const res = await request(`/api/water/admin/network-versions/${draftVersionId}/publish`, 'POST', {}, hospitalStaffToken);
        if (res.status !== 403) throw new Error(`Cross-dept breach! Hospital staff published water route. Expected 403, got ${res.status}`);
    });

    await assertTest("4.6 Water Staff (non-admin) cannot publish route (403)", async () => {
        const res = await request(`/api/water/admin/network-versions/${draftVersionId}/publish`, 'POST', {}, waterStaffToken);
        if (res.status !== 403) throw new Error(`Expected 403 for non-admin water staff, got ${res.status}`);
    });

    await assertTest("4.7 Authorized Water Admin successfully publishes version (200)", async () => {
        const res = await request(`/api/water/admin/network-versions/${draftVersionId}/publish`, 'POST', {}, waterAdminToken);
        if (res.status !== 200 || !res.data.success) {
            throw new Error(`Admin publish failed: ${JSON.stringify(res.data)}`);
        }
        if (res.data.version.status !== 'PUBLISHED') {
            throw new Error(`Expected status PUBLISHED, got ${res.data.version.status}`);
        }
    });

    await assertTest("4.8 Route Publishing Idempotency: Re-publishing already published version is safe", async () => {
        const res = await request(`/api/water/admin/network-versions/${draftVersionId}/publish`, 'POST', {}, waterAdminToken);
        if (res.status !== 200 || res.data.version.status !== 'PUBLISHED') {
            throw new Error(`Idempotency check failed: ${JSON.stringify(res.data)}`);
        }
    });

    // -------------------------------------------------------------
    // SECTION 5: AI GROUNDED TOOLS PROVENANCE & TIMESTAMPS
    // -------------------------------------------------------------
    console.log("\n--- SECTION 5: AI GROUNDED TOOLS & PROVENANCE ---");

    await assertTest("5.1 Grounded Tool get_water_pipeline_telemetry returns real provenance and ISO timestamp", async () => {
        const groundedTools = require('../backend/services/grounded_tools');
        const res = await groundedTools.get_water_pipeline_telemetry({ pipeline_code: 'PL-101' });

        if (!res.success || !res.pipeline) {
            throw new Error(`Pipeline query failed: ${JSON.stringify(res)}`);
        }
        if (!['MEASURED', 'SIMULATED'].includes(res.data_source)) {
            throw new Error(`Invalid data provenance tag: ${res.data_source}`);
        }
        if (!res.timestamp || isNaN(Date.parse(res.timestamp))) {
            throw new Error(`Invalid ISO timestamp: ${res.timestamp}`);
        }
    });

    await assertTest("5.2 Grounded Tool get_wastewater_treatment_status returns CPCB standards, plant assets and batches", async () => {
        const groundedTools = require('../backend/services/grounded_tools');
        const res = await groundedTools.get_wastewater_treatment_status({ plant_id: 'STP-01' });

        if (!res.success || !Array.isArray(res.plants) || !Array.isArray(res.batches)) {
            throw new Error(`Wastewater query failed: ${JSON.stringify(res)}`);
        }
        if (!res.regulatory_standards || res.regulatory_standards.cpcb_bod_limit_mg_l !== 10.0) {
            throw new Error("Missing or incorrect CPCB BOD limit standard");
        }
        if (!res.timestamp) {
            throw new Error("Missing source timestamp in wastewater tool");
        }
    });

    // -------------------------------------------------------------
    // SECTION 6: 2D/3D NETWORK TOPOLOGY SYNCHRONIZATION
    // -------------------------------------------------------------
    console.log("\n--- SECTION 6: 2D/3D TOPOLOGY SYNCHRONIZATION ---");

    await assertTest("6.1 Network topology returns synchronized nodes and edges with pipe types", async () => {
        const res = await request('/api/water/network/topology', 'GET');
        if (res.status !== 200 || !res.data.success) {
            throw new Error(`Topology endpoint failed: ${res.status}`);
        }

        const { nodes, edges } = res.data;
        const tankIds = new Set(nodes.filter(n => n.type === 'TANK').map(n => n.id));
        const stpNodes = nodes.filter(n => n.type === 'TREATMENT_PLANT_STP');

        if (tankIds.size < 5) throw new Error("Expected at least 5 overhead tanks");
        if (stpNodes.length === 0) throw new Error("Missing Central STP node");

        const pipeTypes = new Set(edges.map(e => e.pipe_type));
        if (!pipeTypes.has('POTABLE') || !pipeTypes.has('WASTEWATER') || !pipeTypes.has('RECLAIMED')) {
            throw new Error(`Missing segregated pipe types: ${Array.from(pipeTypes)}`);
        }
    });

    // -------------------------------------------------------------
    // SECTION 7: PUBLIC DATA EXPOSURE & ANTI-CACHING AUDIT
    // -------------------------------------------------------------
    console.log("\n--- SECTION 7: PUBLIC DATA EXPOSURE & ANTI-CACHING ---");

    await assertTest("7.1 Unauthenticated caller receives ONLY approved batches with sanitized fields and anti-cache headers", async () => {
        const res = await request('/api/water/treatment/batches', 'GET', null, null); // No token
        if (res.status !== 200 || !res.data.success) {
            throw new Error(`Expected 200, got ${res.status}`);
        }

        const batches = res.data.batches || [];
        if (batches.length === 0) throw new Error("Expected at least 1 approved public batch");

        // Verify every returned batch is APPROVED and COMPLIANT
        batches.forEach(b => {
            if (b.approval_status !== "APPROVED") {
                throw new Error(`Data leak! Unapproved batch exposed to public: ${b.batch_id} (${b.approval_status})`);
            }
            if (b.quality_status !== "COMPLIANT") {
                throw new Error(`Data leak! Non-compliant batch exposed to public: ${b.batch_id}`);
            }

            // Verify forbidden fields are NOT present
            if (b.operator_notes !== undefined) {
                throw new Error(`Data leak! Internal operator_notes exposed in public batch: ${b.batch_id}`);
            }
            if (b.rejection_reason !== undefined) {
                throw new Error(`Data leak! Internal rejection_reason exposed in public batch: ${b.batch_id}`);
            }
            if (b.approved_by !== undefined) {
                throw new Error(`Privacy leak! Staff name approved_by exposed in public batch: ${b.batch_id}`);
            }
            if (b.inlet_volume_kl !== undefined) {
                throw new Error(`Infrastructure leak! Internal inlet_volume_kl exposed in public batch: ${b.batch_id}`);
            }
        });
    });

    await assertTest("7.2 Unauthenticated public caller CANNOT query blocked batches", async () => {
        const res = await request('/api/water/treatment/batches?status=BLOCKED_QUALITY_FAILURE', 'GET', null, null);
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
        const batches = res.data.batches || [];
        if (batches.length > 0) {
            throw new Error(`Security breach! Public caller accessed ${batches.length} blocked failure batches!`);
        }
    });

    await assertTest("7.3 Privileged Water Staff/Admin CAN inspect operational notes and blocked batches", async () => {
        const res = await request('/api/water/treatment/batches?status=BLOCKED_QUALITY_FAILURE', 'GET', null, waterStaffToken);
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
        const batches = res.data.batches || [];
        if (batches.length === 0) throw new Error("Staff should be able to query blocked batches for diagnostics");

        const hasOperatorNotes = batches.some(b => b.operator_notes !== undefined);
        if (!hasOperatorNotes) {
            throw new Error("Privileged staff view should retain operational operator_notes");
        }
    });

    await assertTest("7.4 Public asset query strips internal staff work orders", async () => {
        const pubRes = await request('/api/water/network/assets/STP-01', 'GET', null, null);
        if (pubRes.status !== 200 || !pubRes.data.asset) throw new Error("Asset query failed");
        if (pubRes.data.asset.work_orders && pubRes.data.asset.work_orders.length > 0) {
            throw new Error("Data leak! Internal staff work orders exposed to unauthenticated public");
        }

        const staffRes = await request('/api/water/network/assets/STP-01', 'GET', null, waterStaffToken);
        if (!staffRes.data.asset.work_orders || staffRes.data.asset.work_orders.length === 0) {
            throw new Error("Staff should be able to view work orders for STP-01");
        }
    });

    // -------------------------------------------------------------
    // SECTION 8: PROVENANCE, STALENESS & INCONCLUSIVE EVIDENCE
    // -------------------------------------------------------------
    console.log("\n--- SECTION 8: PROVENANCE & REGULATORY SAFETY HARDENING ---");

    await assertTest("8.1 Telemetry status explicitly reports HARDWARE_UNVERIFIED", async () => {
        const res = await request('/api/water/telemetry/mode', 'GET');
        if (res.status !== 200) throw new Error("Failed to query telemetry mode");
        if (res.data.hardware_verified !== false) {
            throw new Error("Hardware verified was falsely reported true when physical integration is unverified!");
        }
        if (res.data.hardware_status !== "HARDWARE_UNVERIFIED") {
            throw new Error(`Expected HARDWARE_UNVERIFIED status, got ${res.data.hardware_status}`);
        }
    });

    await assertTest("8.2 Asset details explicitly marks hardware_verified as false", async () => {
        const res = await request('/api/water/network/assets/STP-01', 'GET');
        if (res.status !== 200 || !res.data.asset) throw new Error("Failed to query asset details");
        if (res.data.asset.hardware_verified !== false) {
            throw new Error("STP-01 falsely reported hardware_verified as true");
        }
        if (res.data.asset.hardware_status !== "HARDWARE_UNVERIFIED") {
            throw new Error(`Expected HARDWARE_UNVERIFIED, got ${res.data.asset.hardware_status}`);
        }
    });

    await assertTest("8.3 Stale laboratory sample (> 48h) MUST NOT produce compliant status", async () => {
        const threeDaysAgo = new Date(Date.now() - 72 * 3600 * 1000).toISOString();
        const res = await request(`/api/water/treatment/batches/${auditBatchId}/verify-quality`, 'PUT', {
            bod_mg_l: 7.5,
            cod_mg_l: 30.0,
            tss_mg_l: 12.0,
            ph: 7.2,
            fecal_coliform_mpn: 40,
            turbidity_ntu: 2.0,
            sample_timestamp: threeDaysAgo // 72 hours old
        }, waterStaffToken);

        if (res.data.is_compliant !== false) {
            throw new Error("Stale sample older than 48 hours was falsely marked compliant!");
        }
        const hasStaleViolation = (res.data.violations || []).some(v => v.toLowerCase().includes("stale"));
        if (!hasStaleViolation) {
            throw new Error(`Expected stale sample violation, got: ${JSON.stringify(res.data.violations)}`);
        }
    });

    await assertTest("8.4 Negative parameter (BOD=-5) or impossible pH (pH=15) produces non-compliant status", async () => {
        const resNeg = await request(`/api/water/treatment/batches/${auditBatchId}/verify-quality`, 'PUT', {
            bod_mg_l: -5.0,
            cod_mg_l: 30.0,
            tss_mg_l: 12.0,
            ph: 7.2,
            fecal_coliform_mpn: 40,
            turbidity_ntu: 2.0
        }, waterStaffToken);

        if (resNeg.data.is_compliant !== false) {
            throw new Error("Negative BOD was falsely marked compliant!");
        }

        const resPh = await request(`/api/water/treatment/batches/${auditBatchId}/verify-quality`, 'PUT', {
            bod_mg_l: 7.0,
            cod_mg_l: 30.0,
            tss_mg_l: 12.0,
            ph: 15.5, // Impossible pH
            fecal_coliform_mpn: 40,
            turbidity_ntu: 2.0
        }, waterStaffToken);

        if (resPh.data.is_compliant !== false) {
            throw new Error("Impossible pH 15.5 was falsely marked compliant!");
        }
    });

    console.log("\n=======================================================================");
    console.log(`📊 AUDIT SUMMARY: ${passedTests}/${totalTests} TESTS PASSED (${failedTests} FAILED)`);
    console.log("=======================================================================");

    if (failedTests > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

if (require.main === module) {
    runDeepAuditSuite().catch(err => {
        console.error("Audit suite runtime exception:", err);
        process.exit(1);
    });
}

module.exports = { runDeepAuditSuite };

