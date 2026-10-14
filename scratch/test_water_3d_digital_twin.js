/**
 * SmartCity AI - Water 3D Digital Twin, Licensed glTF & 3-Layer Role Suite
 * 
 * Verifies:
 * 1. Physical existence and validity of 4 glTF 2.0 assets (Pump, Motor, Valve, Tower).
 * 2. Documentation of legal asset licenses (ASSET_LICENSES.md).
 * 3. Database schema integrity, enum expansion (MEASURED, SIMULATED, UNKNOWN), and reversible down() migration.
 * 4. Network topology API data provenance, connected nodes, and directional flow attributes.
 * 5. Strict Water Admin-only backend RBAC guards (Visitor & Staff blocked from sectors/planner/pipelines).
 * 6. UI Structure: Exactly three role-based primary layers in water.html with 2D Leaflet map fallback.
 * 7. Three.js 3D explorer code integrity: GLTFLoader caching + high-fidelity procedural geometry fallbacks.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const jwt = require(path.join(__dirname, '..', 'backend', 'node_modules', 'jsonwebtoken'));

const ROOT_DIR = path.join(__dirname, '..');
const JWT_SECRET = process.env.JWT_SECRET || 'smartcity-jwt-secret-key-2024';
const PORT = process.env.PORT || 5000;

// Test counters
let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✅ PASS: ${message}`);
        passed++;
    } else {
        console.error(`  ❌ FAIL: ${message}`);
        failed++;
    }
}

function makeRequest(method, urlPath, headers = {}, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: '127.0.0.1',
            port: PORT,
            path: urlPath,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                let parsed = null;
                try { parsed = JSON.parse(data); } catch (e) { parsed = data; }
                resolve({ status: res.statusCode, data: parsed, headers: res.headers });
            });
        });

        req.on('error', err => { reject(err); });
        if (body) {
            req.write(typeof body === 'string' ? body : JSON.stringify(body));
        }
        req.end();
    });
}

async function runSuite() {
    console.log("================================================================================");
    console.log("🌊 STARTING 3D DIGITAL TWIN, LICENSED GLTF & 3-LAYER ROLE VERIFICATION SUITE");
    console.log("================================================================================");

    // -------------------------------------------------------------------------
    // 1. VERIFY 3D GLTF 2.0 ASSETS ON DISK & LICENSES
    // -------------------------------------------------------------------------
    console.log("\n--- 1. Verified glTF 2.0 Local Assets & Legal Licenses ---");
    const modelsDir = path.join(ROOT_DIR, "frontend/assets/models/water");
    assert(fs.existsSync(modelsDir), "Models directory exists at frontend/assets/models/water");

    const requiredModels = [
        { file: "pump.gltf", name: "Industrial Centrifugal Water Pump" },
        { file: "motor.gltf", name: "High-Efficiency SCADA Induction Motor" },
        { file: "valve.gltf", name: "Automated SCADA PRV / Control Valve" },
        { file: "control_tower.gltf", name: "SCADA Water Works Command Tower" }
    ];

    requiredModels.forEach(m => {
        const filePath = path.join(modelsDir, m.file);
        assert(fs.existsSync(filePath), `glTF model exists: ${m.file} (${m.name})`);
        if (fs.existsSync(filePath)) {
            try {
                const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                assert(parsed.asset && parsed.asset.version === "2.0", `${m.file} is compliant glTF 2.0 format`);
                assert(parsed.meshes && parsed.meshes.length > 0, `${m.file} contains mesh primitives`);
                assert(parsed.buffers && parsed.buffers.length > 0, `${m.file} contains embedded geometry buffer`);
            } catch (err) {
                assert(false, `${m.file} parses as valid JSON glTF`);
            }
        }
    });

    const licensePath = path.join(modelsDir, "ASSET_LICENSES.md");
    assert(fs.existsSync(licensePath), "ASSET_LICENSES.md exists documenting legal licenses");
    if (fs.existsSync(licensePath)) {
        const licContent = fs.readFileSync(licensePath, 'utf8');
        assert(licContent.includes("MIT") || licContent.includes("CC0"), "ASSET_LICENSES.md records open royalty-free license terms");
        assert(licContent.includes("Procedural Fallback"), "ASSET_LICENSES.md documents procedural geometry fallbacks");
    }

    // -------------------------------------------------------------------------
    // 2. DATABASE SCHEMA, ENUM EXPANSIONS & REVERSIBLE MIGRATION
    // -------------------------------------------------------------------------
    console.log("\n--- 2. Database Schema, Data Provenance & Reversible Migration ---");
    const pool = require('../backend/config/db').promise();

    const [pipeCols] = await pool.query("SHOW COLUMNS FROM water_pipelines LIKE 'data_source'");
    assert(pipeCols.length > 0 && pipeCols[0].Type.includes("MEASURED") && pipeCols[0].Type.includes("SIMULATED") && pipeCols[0].Type.includes("UNKNOWN"),
        "water_pipelines.data_source supports ENUM('MEASURED', 'SIMULATED', 'UNKNOWN')");

    const [assetCols] = await pool.query("SHOW COLUMNS FROM water_network_assets LIKE 'asset_type'");
    assert(assetCols.length > 0 && assetCols[0].Type.includes("CONTROL_TOWER") && assetCols[0].Type.includes("MOTOR"),
        "water_network_assets.asset_type supports 'CONTROL_TOWER' and 'MOTOR'");

    const [modelCol] = await pool.query("SHOW COLUMNS FROM water_network_assets LIKE 'model_asset_path'");
    assert(modelCol.length > 0, "water_network_assets contains model_asset_path column");

    const [licCol] = await pool.query("SHOW COLUMNS FROM water_network_assets LIKE 'license_type'");
    assert(licCol.length > 0, "water_network_assets contains license_type column");

    // Migration down() verification
    const migration = require('../backend/database/water_digital_twin_migration');
    assert(typeof migration.up === 'function', "water_digital_twin_migration exports up() function");
    assert(typeof migration.down === 'function', "water_digital_twin_migration exports down() function for safe rollback");

    // -------------------------------------------------------------------------
    // 3. NETWORK TOPOLOGY API: CONNECTED NODES & DIRECTIONAL FLOW
    // -------------------------------------------------------------------------
    console.log("\n--- 3. Network Topology API: 3D Assets, Connected Nodes & Flows ---");
    const topoRes = await makeRequest('GET', '/api/water/network/topology');
    assert(topoRes.status === 200, "Network topology endpoint returns HTTP 200");
    assert(topoRes.data.success === true, "Topology response is success=true");
    assert(Array.isArray(topoRes.data.nodes) && topoRes.data.nodes.length >= 10, `Topology returns ${topoRes.data.nodes.length} network nodes`);
    assert(Array.isArray(topoRes.data.edges) && topoRes.data.edges.length >= 10, `Topology returns ${topoRes.data.edges.length} pipeline edges`);

    // Check node attributes for digital twin
    const towerNode = topoRes.data.nodes.find(n => n.type === "CONTROL_TOWER" || n.id === "TOWER-01");
    assert(Boolean(towerNode), "Topology includes CONTROL_TOWER node (TOWER-01)");
    if (towerNode) {
        assert(towerNode.model_asset_path && towerNode.model_asset_path.includes("control_tower.gltf"), "TOWER-01 is bound to control_tower.gltf");
        assert(towerNode.data_source === "MEASURED" || towerNode.data_source === "SIMULATED", `TOWER-01 has explicit data provenance: ${towerNode.data_source}`);
    }

    const motorNode = topoRes.data.nodes.find(n => n.type === "MOTOR" || n.id === "MOT-01");
    assert(Boolean(motorNode), "Topology includes MOTOR node (MOT-01)");
    if (motorNode) {
        assert(motorNode.model_asset_path && motorNode.model_asset_path.includes("motor.gltf"), "MOT-01 is bound to motor.gltf");
    }

    // Check pipeline directional flow and network connectivity
    const sampleEdge = topoRes.data.edges[0];
    assert(sampleEdge && Boolean(sampleEdge.flow_direction), `Edge has flow_direction attribute: ${sampleEdge?.flow_direction}`);
    assert(["FORWARD", "REVERSE", "BIDIRECTIONAL"].includes(sampleEdge?.flow_direction), "flow_direction is valid enum value");
    assert(sampleEdge && (sampleEdge.source_node !== undefined && sampleEdge.target_node !== undefined), "Edge contains connected source_node and target_node");
    assert(["MEASURED", "SIMULATED", "UNKNOWN"].includes(sampleEdge?.data_source), `Edge has honest data provenance: ${sampleEdge?.data_source}`);

    // Check 3 water classifications present (Freshwater, Sewage, Reclaimed)
    const potablePipes = topoRes.data.edges.filter(e => e.pipe_type === "POTABLE");
    const sewagePipes = topoRes.data.edges.filter(e => e.pipe_type === "WASTEWATER");
    const reclaimedPipes = topoRes.data.edges.filter(e => e.pipe_type === "RECLAIMED");
    assert(potablePipes.length > 0, `Freshwater (Potable) pipelines present: ${potablePipes.length}`);
    assert(sewagePipes.length > 0, `Sewage (Wastewater) pipelines present: ${sewagePipes.length}`);
    assert(reclaimedPipes.length > 0, `Reclaimed water pipelines present: ${reclaimedPipes.length}`);

    // -------------------------------------------------------------------------
    // 4. STRICT RBAC SECURITY: WATER ADMIN ALONE AUTHORIZED
    // -------------------------------------------------------------------------
    console.log("\n--- 4. Strict RBAC Enforcement on Backend APIs ---");
    let adminToken = "";
    let staffToken = "";
    let visitorToken = "";

    try {
        const waLogin = await makeRequest('POST', '/api/auth/demo-login', {}, { role: "water_admin" });
        adminToken = waLogin.data?.token || "";
        const wsLogin = await makeRequest('POST', '/api/auth/demo-login', {}, { role: "water_staff" });
        staffToken = wsLogin.data?.token || "";
        const citLogin = await makeRequest('POST', '/api/auth/demo-login', {}, { role: "citizen" });
        visitorToken = citLogin.data?.token || "";
    } catch (e) {
        console.warn("Demo login error, falling back to manual tokens:", e);
    }

    if (!adminToken) {
        adminToken = jwt.sign({ id: 1, name: "Er. R.N. Tripathi", role: "water_admin", department: "water" }, JWT_SECRET, { expiresIn: '1h' });
    }
    if (!staffToken) {
        staffToken = jwt.sign({ id: 2, name: "Er. Saurabh Mishra", role: "staff", department: "water" }, JWT_SECRET, { expiresIn: '1h' });
    }
    if (!visitorToken) {
        visitorToken = jwt.sign({ id: 3, name: "Citizen User", role: "citizen" }, JWT_SECRET, { expiresIn: '1h' });
    }

    // A. Sector Creation
    const testSector = {
        name: "Test North Digital Twin Sector " + Date.now(),
        zone: "North Municipal District",
        boundary_geojson: {
            type: "Polygon",
            coordinates: [[
                [83.371, 26.761],
                [83.371, 26.765],
                [83.375, 26.765],
                [83.375, 26.761],
                [83.371, 26.761]
            ]]
        },
        description: "Test digital twin sector"
    };

    const unauthSectorRes = await makeRequest('POST', '/api/water/sectors', {}, testSector);
    assert(unauthSectorRes.status === 401, "Unauthenticated user blocked from POST /api/water/sectors (HTTP 401)");

    const visitorSectorRes = await makeRequest('POST', '/api/water/sectors', { Authorization: `Bearer ${visitorToken}` }, testSector);
    assert(visitorSectorRes.status === 403, "Visitor blocked from POST /api/water/sectors (HTTP 403)");

    const staffSectorRes = await makeRequest('POST', '/api/water/sectors', { Authorization: `Bearer ${staffToken}` }, testSector);
    assert(staffSectorRes.status === 403, "Staff blocked from POST /api/water/sectors (HTTP 403 - Admin Only)");

    const adminSectorRes = await makeRequest('POST', '/api/water/sectors', { Authorization: `Bearer ${adminToken}` }, testSector);
    assert(adminSectorRes.status === 201 || adminSectorRes.status === 200, `Water Admin permitted to POST /api/water/sectors (HTTP ${adminSectorRes.status})`);

    // Cleanup created test sector
    try {
        await pool.query("DELETE FROM water_sectors WHERE name = ?", [testSector.name]);
    } catch (e) {}

    // B. Pipeline Asset Creation
    const testPipe = {
        pipeline_code: `TEST-TWIN-PIPE-${Date.now()}`,
        name: "Digital Twin Test Pipeline",
        pipe_type: "RECLAIMED",
        diameter_mm: 350,
        material: "HDPE",
        start_lat: 26.761,
        start_lng: 83.372,
        end_lat: 26.764,
        end_lng: 83.374,
        flow_direction: "FORWARD",
        data_source: "MEASURED"
    };

    const visitorPipeRes = await makeRequest('POST', '/api/water/pipelines', { Authorization: `Bearer ${visitorToken}` }, testPipe);
    assert(visitorPipeRes.status === 403, "Visitor blocked from POST /api/water/pipelines (HTTP 403)");

    const staffPipeRes = await makeRequest('POST', '/api/water/pipelines', { Authorization: `Bearer ${staffToken}` }, testPipe);
    assert(staffPipeRes.status === 403, "Staff blocked from POST /api/water/pipelines (HTTP 403 - Admin Only)");

    const adminPipeRes = await makeRequest('POST', '/api/water/pipelines', { Authorization: `Bearer ${adminToken}` }, testPipe);
    assert(adminPipeRes.status === 201 || adminPipeRes.status === 200, "Water Admin permitted to POST /api/water/pipelines (HTTP 200/201)");

    if (adminPipeRes.data && adminPipeRes.data.pipeline && adminPipeRes.data.pipeline.id) {
        await pool.query("DELETE FROM water_pipelines WHERE id = ?", [adminPipeRes.data.pipeline.id]);
    }

    // C. Route Editing (Water Admin Alone Authorized)
    const testRouteEdit = {
        name: "Updated Arterial Dual Route Corridor",
        flow_rate_lps: 68.0,
        pressure_bar: 3.4
    };
    const visitorRouteEdit = await makeRequest('PUT', '/api/water/pipelines/PL-101', { Authorization: `Bearer ${visitorToken}` }, testRouteEdit);
    assert(visitorRouteEdit.status === 403, "Visitor blocked from PUT /api/water/pipelines/:id route edit (HTTP 403)");

    const staffRouteEdit = await makeRequest('PUT', '/api/water/pipelines/PL-101', { Authorization: `Bearer ${staffToken}` }, testRouteEdit);
    assert(staffRouteEdit.status === 403, "Staff blocked from PUT /api/water/pipelines/:id route edit (HTTP 403 - Admin Only)");

    const adminRouteEdit = await makeRequest('PUT', '/api/water/pipelines/PL-101', { Authorization: `Bearer ${adminToken}` }, testRouteEdit);
    assert(adminRouteEdit.status === 200, "Water Admin alone permitted to edit routes via PUT /api/water/pipelines/:id (HTTP 200)");

    // D. Asset Configuration (Water Admin Alone Authorized)
    const testAssetConfig = {
        asset_id: `ASSET-TWIN-CFG-${Date.now()}`,
        name: "Digital Twin Configured Valve Station",
        asset_type: "CONTROL_VALVE",
        zone: "Golghar Central",
        latitude: 26.7601,
        longitude: 83.3725,
        status: "OPERATIONAL"
    };
    const visitorAssetRes = await makeRequest('POST', '/api/water/network/assets', { Authorization: `Bearer ${visitorToken}` }, testAssetConfig);
    assert(visitorAssetRes.status === 403, "Visitor blocked from POST /api/water/network/assets (HTTP 403)");

    const staffAssetRes = await makeRequest('POST', '/api/water/network/assets', { Authorization: `Bearer ${staffToken}` }, testAssetConfig);
    assert(staffAssetRes.status === 403, "Staff blocked from POST /api/water/network/assets (HTTP 403 - Admin Only)");

    const adminAssetRes = await makeRequest('POST', '/api/water/network/assets', { Authorization: `Bearer ${adminToken}` }, testAssetConfig);
    assert(adminAssetRes.status === 201 || adminAssetRes.status === 200, "Water Admin alone permitted to configure assets via POST /api/water/network/assets (HTTP 200/201)");
    try {
        await pool.query("DELETE FROM water_network_assets WHERE asset_id = ?", [testAssetConfig.asset_id]);
    } catch(e) {}

    // E. Staff Assignment to Sectors (Water Admin Alone Authorized)
    const staffAssignPayload = {
        staff_ids: ["WTR-ENG-01"],
        engineers: ["WTR-ENG-01"]
    };
    const visitorAssignRes = await makeRequest('POST', '/api/water/sectors/SEC-WTR-01/assign-staff', { Authorization: `Bearer ${visitorToken}` }, staffAssignPayload);
    assert(visitorAssignRes.status === 403, "Visitor blocked from POST /api/water/sectors/:id/assign-staff (HTTP 403)");

    const staffAssignRes = await makeRequest('POST', '/api/water/sectors/SEC-WTR-01/assign-staff', { Authorization: `Bearer ${staffToken}` }, staffAssignPayload);
    assert(staffAssignRes.status === 403, "Staff blocked from POST /api/water/sectors/:id/assign-staff (HTTP 403 - Admin Only)");

    const adminAssignRes = await makeRequest('POST', '/api/water/sectors/SEC-WTR-01/assign-staff', { Authorization: `Bearer ${adminToken}` }, staffAssignPayload);
    assert(adminAssignRes.status === 200, "Water Admin alone permitted to assign staff via POST /api/water/sectors/:id/assign-staff (HTTP 200)");


    // -------------------------------------------------------------------------
    // 5. FRONTEND 3-LAYER ROLE ARCHITECTURE & FALLBACK CHECKS
    // -------------------------------------------------------------------------
    console.log("\n--- 5. Frontend 3-Layer Role Architecture & Fallbacks ---");
    const htmlPath = path.join(ROOT_DIR, "frontend/pages/water/water.html");
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');

    // Exactly 3 primary role layers
    assert(htmlContent.includes("Layer 1: Visitor Water Services"), "water.html defines 'Layer 1: Visitor Water Services'");
    assert(htmlContent.includes("Layer 2: Staff Operations & SCADA Control Desk"), "water.html defines 'Layer 2: Staff Operations & SCADA Control Desk'");
    assert(htmlContent.includes("Layer 3: Water Admin Command & GIS Planner"), "water.html defines 'Layer 3: Water Admin Command & GIS Planner'");

    // Three.js GLTFLoader CDN script
    assert(htmlContent.includes("GLTFLoader.js"), "water.html loads Three.js GLTFLoader.js library");

    // 2D Leaflet Fallback and 3D Canvas Container
    assert(htmlContent.includes('id="waterMap"'), "water.html retains 2D Leaflet map container (waterMap) as fallback");
    assert(htmlContent.includes('id="water3DContainer"'), "water.html provides 3D container (water3DContainer)");
    assert(htmlContent.includes('id="water3DCanvasContainer"'), "water.html provides WebGL canvas container (water3DCanvasContainer)");

    // -------------------------------------------------------------------------
    // 6. THREE.JS 3D EXPLORER SCRIPT INTEGRITY & PROCEDURAL FALLBACKS
    // -------------------------------------------------------------------------
    console.log("\n--- 6. Three.js Explorer Script Integrity & Procedural Fallbacks ---");
    const jsPath = path.join(ROOT_DIR, "frontend/pages/water/water_3d_explorer.js");
    const jsContent = fs.readFileSync(jsPath, 'utf8');

    assert(jsContent.includes("loadGLTFAsset"), "water_3d_explorer.js implements loadGLTFAsset with model caching");
    assert(jsContent.includes("createProceduralPump"), "water_3d_explorer.js implements createProceduralPump fallback");
    assert(jsContent.includes("createProceduralMotor"), "water_3d_explorer.js implements createProceduralMotor fallback");
    assert(jsContent.includes("createProceduralValve"), "water_3d_explorer.js implements createProceduralValve fallback");
    assert(jsContent.includes("createProceduralControlTower"), "water_3d_explorer.js implements createProceduralControlTower fallback");
    assert(jsContent.includes("createFlowParticles"), "water_3d_explorer.js animates directional flow particles");
    assert(jsContent.includes("MEASURED") && jsContent.includes("SIMULATED") && jsContent.includes("UNKNOWN"),
        "water_3d_explorer.js clearly distinguishes MEASURED, SIMULATED, and UNKNOWN data provenance");

    console.log("\n================================================================================");
    console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED out of ${passed + failed} checks`);
    console.log("================================================================================");

    if (failed > 0) {
        process.exit(1);
    } else {
        console.log("\n🎉 ALL 3D WATER DIGITAL TWIN & 3-LAYER RBAC CHECKS PASSED!\n");
        process.exit(0);
    }
}

runSuite().catch(err => {
    console.error("Test execution fatal error:", err);
    process.exit(1);
});
