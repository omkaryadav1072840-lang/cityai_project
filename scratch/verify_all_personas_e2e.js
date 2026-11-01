// scratch/verify_all_personas_e2e.js - End-to-End Persona Verification Suite

const path = require('path');
const express = require(path.join(__dirname, '../backend/node_modules/express'));
const authRouter = require(path.join(__dirname, '../backend/routes/auth.routes'));
const wasteRouter = require(path.join(__dirname, '../backend/routes/waste.routes'));
const workforceRouter = require(path.join(__dirname, '../backend/routes/waste_workforce.routes'));

const app = express();
app.use(express.json());
app.use(authRouter);
app.use(wasteRouter);
app.use(workforceRouter);

let passed = 0;
let failed = 0;

function assert(cond, msg) {
    if (cond) {
        passed++;
        console.log(`  🌟 PASS: ${msg}`);
    } else {
        failed++;
        console.error(`  ❌ FAIL: ${msg}`);
    }
}

function dispatch(method, url, body = null, token = null) {
    return new Promise((resolve) => {
        const headers = { 'content-type': 'application/json' };
        if (token) headers['authorization'] = `Bearer ${token}`;

        const [pathOnly, queryString] = url.split('?');
        const query = {};
        if (queryString) {
            queryString.split('&').forEach(p => {
                const [k, v] = p.split('=');
                query[decodeURIComponent(k)] = decodeURIComponent(v || '');
            });
        }

        const req = {
            method: method.toUpperCase(),
            url,
            path: pathOnly,
            query,
            params: {},
            headers,
            body: body || {},
            get: function(h) { return this.headers[h.toLowerCase()]; },
            app: { get: () => null }
        };

        let status = 200;
        let resBody = null;

        const res = {
            status(c) { status = c; return this; },
            set() { return this; },
            setHeader() { return this; },
            json(d) { resBody = d; resolve({ status, body: resBody }); return this; },
            send(d) { resBody = d; resolve({ status, body: resBody }); return this; },
            end() { resolve({ status, body: resBody }); }
        };

        try {
            app.handle(req, res, () => {
                resolve({ status: 404, body: { message: "Not found" } });
            });
        } catch (e) {
            resolve({ status: 500, body: { error: e.message } });
        }
    });
}

async function runAllPersonasE2E() {
    console.log("===============================================================================");
    console.log("🌟 END-TO-END PERSONA VERIFICATION AUDIT");
    console.log("===============================================================================\n");

    // PERSONA 1: ADMIN GOVERNANCE
    console.log("--- Persona 1: Municipal Waste Administrator (WST-ADMIN) ---");
    const adminLogin = await dispatch('POST', '/api/staff-login', { staffId: 'WST-ADMIN', password: 'admin' });
    assert(adminLogin.status === 200, "Admin login successful");
    assert(adminLogin.body.user.role === 'admin', "Admin role verified");
    const adminToken = adminLogin.body.token;

    // View workforce directory
    const dirRes = await dispatch('GET', '/api/waste/admin/staff', null, adminToken);
    assert(dirRes.status === 200 && Array.isArray(dirRes.body.staff), "Admin retrieved staff directory");

    // Provision new staff member
    const newStaff = {
        staffId: 'WRK-E2E-99',
        name: 'Dharmendra Yadav',
        email: 'dharmendra.y@smartcity.gov.in',
        role: 'WORKING_STAFF',
        assignedArea: 'Gorakhnath & Ward 09',
        password: 'password123'
    };
    const addRes = await dispatch('POST', '/api/waste/admin/staff', newStaff, adminToken);
    assert(addRes.status === 201 && addRes.body.success, "Admin provisioned new field worker account");

    // View immutable audit logs
    const auditRes = await dispatch('GET', '/api/waste/admin/audit-logs', null, adminToken);
    assert(auditRes.status === 200 && (auditRes.body.logs?.length > 0 || auditRes.body.audits?.length > 0), "Admin accessed tamper-evident audit logs");
    console.log();

    // PERSONA 2: CONTROL CENTER SUPERVISOR
    console.log("--- Persona 2: Control Center Supervisor (WST-CC-01) ---");
    const ccLogin = await dispatch('POST', '/api/staff-login', { staffId: 'WST-CC-01', password: 'control123' });
    assert(ccLogin.status === 200, "Control Center login successful");
    assert(ccLogin.body.targetDashboard.includes('control_center.html'), "Redirects strictly to Control Center Dashboard");
    const ccToken = ccLogin.body.token;

    // Fetch GIS Map Data
    const mapRes = await dispatch('GET', '/api/waste/control-center/map-data', null, ccToken);
    assert(mapRes.status === 200 && (mapRes.body.gis?.bins?.length > 0 || mapRes.body.bins?.length > 0), "Control center loaded all smart bins and GIS data");

    // Fetch Area Analytics
    const analyticsRes = await dispatch('GET', '/api/waste/control-center/area-analytics', null, ccToken);
    assert(analyticsRes.status === 200 && analyticsRes.body.wards?.length > 0, "Control center loaded verified Gorakhpur wards");

    // Run AI recommendation for complaint
    const aiRecRes = await dispatch('POST', '/api/waste/control-center/ai-recommend-worker', {
        complaintId: 501,
        category: 'Mixed Waste',
        priority: 'HIGH'
    }, ccToken);
    assert(aiRecRes.status === 200 && aiRecRes.body.recommended_worker !== undefined, "AI complaint assignment computed successfully");

    // Explicitly assign complaint 501 to worker 1 (WRK-001) for field operational testing
    const assignRes = await dispatch('POST', '/api/waste/control-center/assign-complaint', {
        complaintId: 501,
        workerId: 1,
        assignmentType: 'AI_RECOMMENDED',
        reason: 'Optimal multi-factor score match for Golghar corridor'
    }, ccToken);
    assert(assignRes.status === 200 && assignRes.body.success, "Control Center assigned complaint to worker 1 (WRK-001)");
    console.log();

    // PERSONA 3: WORKING STAFF / FIELD CREW
    console.log("--- Persona 3: Working Staff / Field Crew (WRK-001) ---");
    const wrkLogin = await dispatch('POST', '/api/staff-login', { staffId: 'WRK-001', password: 'worker123' });
    assert(wrkLogin.status === 200, "Working staff login successful");
    assert(wrkLogin.body.targetDashboard.includes('worker_dashboard.html'), "Redirects strictly to Field Worker Dashboard");
    const wrkToken = wrkLogin.body.token;

    // Load assigned tasks
    const tasksRes = await dispatch('GET', '/api/waste/worker/tasks', null, wrkToken);
    assert(tasksRes.status === 200 && Array.isArray(tasksRes.body.tasks), "Field worker retrieved assigned task queue");

    const activeTaskId = 501;

    // Transition task: ASSIGNED -> ACCEPTED -> IN_PROGRESS
    const acceptRes = await dispatch('PUT', `/api/waste/worker/tasks/${activeTaskId}/status`, { status: "ACCEPTED" }, wrkToken);
    assert(acceptRes.status === 200 && (acceptRes.body.task?.status === "ACCEPTED" || acceptRes.body.task?.status === "Accepted"), "Task transitioned to ACCEPTED");

    const progressRes = await dispatch('PUT', `/api/waste/worker/tasks/${activeTaskId}/status`, { status: "IN_PROGRESS" }, wrkToken);
    assert(progressRes.status === 200 && (progressRes.body.task?.status === "IN_PROGRESS" || progressRes.body.task?.status === "In Progress"), "Task transitioned to IN_PROGRESS");

    // Fetch road navigation
    const navRes = await dispatch('GET', `/api/waste/worker/navigation/${activeTaskId}`, null, wrkToken);
    assert(navRes.status === 200 && (navRes.body.route?.coordinates?.length > 2 || navRes.body.road_network?.waypoints?.length > 2), "Real road navigation corridor generated");

    // Submit Proof of completion (Worker CANNOT self-approve)
    const proofRes = await dispatch('POST', `/api/waste/worker/tasks/${activeTaskId}/submit-proof`, {
        after_photo_url: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
        latitude: 26.7606,
        longitude: 83.3732,
        waste_collected_kg: 48.5,
        completion_remarks: "Market waste completely cleared and transported to transfer station"
    }, wrkToken);
    assert(proofRes.status === 200 && (proofRes.body.task?.status === "UNDER_VERIFICATION" || proofRes.body.task?.status === "Under Verification"), "Task moved to UNDER_VERIFICATION (worker cannot self-approve)");

    // Control center verifies proof
    const verifyRes = await dispatch('POST', '/api/waste/control-center/verify-proof', {
        complaintId: 501,
        decision: 'APPROVED',
        remarks: 'Photo and weighbridge ticket verified'
    }, ccToken);
    assert(verifyRes.status === 200 && (verifyRes.body.task?.status === 'Completed' || verifyRes.body.task?.proof?.verification_status === 'VERIFIED'), "Control Center verified proof and marked task VERIFIED/COMPLETED");
    console.log();

    // PERSONA 4: SMART BIN OPERATOR
    console.log("--- Persona 4: Smart Bin Operator (BIN-GOL-01) ---");
    const binLogin = await dispatch('POST', '/api/staff-login', { staffId: 'BIN-GOL-01', password: 'BIN@2026' });
    assert(binLogin.status === 200, "Bin Operator login successful");
    assert(binLogin.body.targetDashboard.includes('bin_dashboard.html'), "Redirects strictly to Dedicated Bin Dashboard");
    assert(binLogin.body.user.assigned_bin_code === 'BIN-GOL-01', "Restricted exclusively to BIN-GOL-01");
    const binToken = binLogin.body.token;

    // View assigned telemetry
    const binRes = await dispatch('GET', '/api/waste/bin-staff/my-bin', null, binToken);
    assert(binRes.status === 200 && binRes.body.bin?.bin_code === 'BIN-GOL-01', "Bin operator retrieved live telemetry for BIN-GOL-01");
    assert(binRes.body.bin?.current_fill_percentage !== undefined, "Telemetry includes fill percentage");

    // AI time-to-full prediction
    const aiPredRes = await dispatch('GET', '/api/waste/bin-staff/ai-prediction', null, binToken);
    assert(aiPredRes.status === 200 && aiPredRes.body.formatted_time_until_full !== undefined, "AI time-to-full prediction computed");

    // Trigger collection request
    const trigRes = await dispatch('POST', '/api/waste/bin-staff/trigger-collection', { fillPercentage: 88.0 }, binToken);
    assert(trigRes.status === 200 && trigRes.body.cycle_token !== undefined, "1st Collection request queued with idempotency cycle token");

    // Duplicate trigger blocked
    const dupRes = await dispatch('POST', '/api/waste/bin-staff/trigger-collection', { fillPercentage: 88.0 }, binToken);
    assert(dupRes.status === 409, "Duplicate trigger for active collection cycle blocked with HTTP 409 Conflict");
    console.log();

    // DUSTBIN DASHBOARD UNLOCK
    console.log("--- Dustbin Terminal Unlock Verification ---");
    const unlockRes = await dispatch('POST', '/api/waste/dustbin-terminal/auth', {
        binCode: 'BIN-GOL-01',
        passcode: 'BIN@2026'
    });
    assert(unlockRes.status === 200 && unlockRes.body.success, "Dustbin terminal unlocked successfully with official credentials");
    console.log();

    // PERSONA 5: VISITOR / UNAUTHENTICATED ACCESS
    console.log("--- Persona 5: Visitor / Unauthenticated Direct Access Defense ---");
    const unauthCc = await dispatch('GET', '/api/waste/control-center/map-data', null, null);
    assert(unauthCc.status === 401, "Unauthenticated access to Control Center GIS map blocked (HTTP 401)");

    const unauthWrk = await dispatch('GET', '/api/waste/worker/tasks', null, null);
    assert(unauthWrk.status === 401, "Unauthenticated access to Worker tasks blocked (HTTP 401)");

    const unauthBin = await dispatch('GET', '/api/waste/bin-staff/my-bin', null, null);
    assert(unauthBin.status === 401, "Unauthenticated access to Bin Staff telemetry blocked (HTTP 401)");

    const unauthAdmin = await dispatch('GET', '/api/waste/admin/staff', null, null);
    assert(unauthAdmin.status === 401, "Unauthenticated access to Admin Staff directory blocked (HTTP 401)");
    console.log();

    console.log("===============================================================================");
    console.log(`🌟 END-TO-END PERSONA AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("===============================================================================");

    if (failed > 0) process.exit(1);
    else process.exit(0);
}

runAllPersonasE2E().catch(err => {
    console.error("Fatal E2E error:", err);
    process.exit(1);
});
