/**
 * Verification Suite: Traffic Role-Based Jurisdiction, Camera AI Automation, and Admin GIS Management
 */

const jwt = require('jsonwebtoken');

const BASE_URL = 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || "smartcity_super_secret_jwt_key_gorakhpur_2026";

function createToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

async function request(url, options = {}) {
    const res = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        },
        method: options.method || 'GET',
        body: options.body ? JSON.stringify(options.body) : undefined
    });

    let data = null;
    try {
        data = await res.json();
    } catch (e) {
        data = {};
    }

    return { status: res.status, ok: res.ok, data };
}

async function runTests() {
    console.log("🚦 STARTING TRAFFIC JURISDICTION & CAMERA AI VERIFICATION SUITE\n");
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

    // Tokens
    const mohaddipurOfficerToken = createToken({
        id: 991,
        staffId: 'TR-PANDEY',
        name: 'Sub-Insp. Amit Pandey',
        role: 'staff',
        department: 'traffic',
        assigned_junction_id: 'JNC-02',
        assigned_junction_name: 'Mohaddipur Junction'
    });

    const golgharOfficerToken = createToken({
        id: 992,
        staffId: 'TR-VERMA',
        name: 'Insp. R.K. Verma',
        role: 'staff',
        department: 'traffic',
        assigned_junction_id: 'JNC-01',
        assigned_junction_name: 'Golghar Central Crossing'
    });

    const adminToken = createToken({
        id: 990,
        staffId: 'TR-ADMIN',
        name: 'ICCC Traffic Admin',
        role: 'admin',
        department: 'traffic',
        assigned_junction_id: null,
        assigned_junction_name: 'All Citywide Junctions'
    });

    const citizenToken = createToken({
        id: 555,
        name: 'Rahul Citizen',
        role: 'citizen',
        type: 'citizen'
    });

    // 1. Citizen Gatekeeping
    console.log("--- 1. Gatekeeping: Visitor / Citizen Blocked from Staff & Admin ---");
    const citOverride = await request(`${BASE_URL}/api/traffic/junctions/JNC-02/override`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${citizenToken}` },
        body: { action: 'FORCE_GREEN', approach: 'North' }
    });
    assert(citOverride.status === 403, "Citizen blocked with 403 Forbidden on junction override");

    const citAssign = await request(`${BASE_URL}/api/traffic/admin/assign-officer`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${citizenToken}` },
        body: { staff_id: 'TR-PANDEY', junction_id: 'JNC-01' }
    });
    assert(citAssign.status === 403, "Citizen blocked with 403 Forbidden on admin assign officer");

    // 2. Mohaddipur Officer Jurisdiction
    console.log("\n--- 2. Mohaddipur Officer Jurisdiction Enforcement ---");
    // Should succeed on JNC-02 (Mohaddipur)
    const mohAiRes = await request(`${BASE_URL}/api/traffic/junctions/JNC-02/apply-camera-ai-optimization`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${mohaddipurOfficerToken}` },
        body: {}
    });
    assert(mohAiRes.status === 200 && mohAiRes.data.success, "Mohaddipur officer can manage traffic automatically via Camera AI for Mohaddipur (JNC-02)");
    assert(mohAiRes.data.optimalCycleTime > 0, `Webster cycle calculated: ${mohAiRes.data.optimalCycleTime}s`);

    // Should FAIL on JNC-01 (Golghar)
    const mohOnGolgharAi = await request(`${BASE_URL}/api/traffic/junctions/JNC-01/apply-camera-ai-optimization`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${mohaddipurOfficerToken}` },
        body: {}
    });
    assert(mohOnGolgharAi.status === 403, "Mohaddipur officer blocked with 403 on JNC-01 Camera AI optimization");

    const mohOnGolgharOverride = await request(`${BASE_URL}/api/traffic/junctions/JNC-01/override`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${mohaddipurOfficerToken}` },
        body: { action: 'FORCE_GREEN', approach: 'East' }
    });
    assert(mohOnGolgharOverride.status === 403, "Mohaddipur officer blocked with 403 on JNC-01 manual override");

    // Scoped cameras for Mohaddipur
    const camRes = await request(`${BASE_URL}/api/traffic/cameras`, {
        headers: { Authorization: `Bearer ${mohaddipurOfficerToken}` }
    });
    assert(camRes.status === 200 && camRes.data.cameras.length > 0, "Mohaddipur officer receives cameras");
    const allMohaddipur = camRes.data.cameras.every(c => c.junction_id === 'JNC-02' || c.junction_id === 'JNC-09');
    assert(allMohaddipur, "Mohaddipur officer ONLY receives cameras for Mohaddipur Junction");

    // Mohaddipur officer blocked from viewing Golghar cameras
    const golCams = await request(`${BASE_URL}/api/traffic/junctions/JNC-01/cameras`, {
        headers: { Authorization: `Bearer ${mohaddipurOfficerToken}` }
    });
    assert(golCams.status === 403, "Mohaddipur officer blocked with 403 on JNC-01 cameras");

    // 3. Admin Full Citywide Control & GIS Relocation
    console.log("\n--- 3. Admin Full Citywide Control, Map Relocation & Officer Assignment ---");
    const relRes = await request(`${BASE_URL}/api/traffic/junctions/JNC-02/location`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { latitude: 26.745678, longitude: 83.398765 }
    });
    assert(relRes.status === 200 && relRes.data.success, "Admin successfully relocated Mohaddipur Junction coordinates on GIS map");

    // Staff cannot relocate junction on map
    const staffRel = await request(`${BASE_URL}/api/traffic/junctions/JNC-02/location`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${mohaddipurOfficerToken}` },
        body: { latitude: 26.745678, longitude: 83.398765 }
    });
    assert(staffRel.status === 403, "Staff officer blocked with 403 from relocating junction on map");

    // Admin Officer Roster
    const rosterRes = await request(`${BASE_URL}/api/traffic/admin/officer-roster`, {
        headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(rosterRes.status === 200 && rosterRes.data.officers.length > 0, "Admin can retrieve officer roster");

    // Admin Assign Officer
    const assignRes = await request(`${BASE_URL}/api/traffic/admin/assign-officer`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
            staff_id: 'TR-PANDEY',
            junction_id: 'JNC-02',
            junction_name: 'Mohaddipur Junction'
        }
    });
    assert(assignRes.status === 200 && assignRes.data.success, "Admin successfully assigned Sub-Insp. Amit Pandey to Mohaddipur Junction");

    // 4. CCTV Camera Management: Strictly Admin Only (Staff Blocked from Add/Move/Remove)
    console.log("\n--- 4. Camera Provisioning, GIS Relocation & Decommissioning: Strictly Admin ---");

    // Staff officer blocked from adding camera
    const staffAddCam = await request(`${BASE_URL}/api/traffic/cameras`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${mohaddipurOfficerToken}` },
        body: {
            junction_id: 'JNC-02',
            camera_name: 'Unauthorized Staff Camera',
            direction: 'North',
            stream_url: 'http://test/stream'
        }
    });
    assert(staffAddCam.status === 403, "Staff officer strictly blocked with 403 from creating/adding CCTV cameras");

    // Staff officer blocked from relocating camera on GIS map
    const staffMoveCam = await request(`${BASE_URL}/api/traffic/cameras/CAM-02-E/location`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${mohaddipurOfficerToken}` },
        body: { latitude: 26.745678, longitude: 83.398765 }
    });
    assert(staffMoveCam.status === 403, "Staff officer strictly blocked with 403 from relocating CCTV cameras on map");

    // Staff officer blocked from deleting camera
    const staffDelCam = await request(`${BASE_URL}/api/traffic/cameras/CAM-02-E`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${mohaddipurOfficerToken}` }
    });
    assert(staffDelCam.status === 403, "Staff officer strictly blocked with 403 from deleting/removing CCTV cameras");

    // Admin successfully creates a new camera
    const adminAddCam = await request(`${BASE_URL}/api/traffic/cameras`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
            junction_id: 'JNC-02',
            camera_name: 'Admin Added Optical Unit',
            direction: 'South',
            stream_url: 'http://192.168.1.50:8080/video',
            latitude: 26.746100,
            longitude: 83.398200
        }
    });
    assert(adminAddCam.status === 201 && adminAddCam.data.success, "Traffic Admin successfully added new CCTV camera");
    const testAdminCamId = adminAddCam.data.cameraId;

    // Admin successfully relocates camera on GIS map
    const adminMoveCam = await request(`${BASE_URL}/api/traffic/cameras/${testAdminCamId}/location`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { latitude: 26.747000, longitude: 83.399000 }
    });
    assert(adminMoveCam.status === 200 && adminMoveCam.data.success, "Traffic Admin successfully relocated camera coordinates on GIS map");

    // Admin successfully deletes camera
    const adminDelCam = await request(`${BASE_URL}/api/traffic/cameras/${testAdminCamId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminDelCam.status === 200 && adminDelCam.data.success, "Traffic Admin successfully decommissioned/deleted camera");

    console.log(`\n=======================================================`);
    console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`=======================================================`);
    process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
