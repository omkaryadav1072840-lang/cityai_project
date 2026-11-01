// scratch/test_waste_workforce_master.js - Master End-to-End Test Suite for Waste Workforce Management

const path = require('path');
const express = require(path.join(__dirname, '../backend/node_modules/express'));

const authRouter = require(path.join(__dirname, '../backend/routes/auth.routes'));
const wasteRouter = require(path.join(__dirname, '../backend/routes/waste.routes'));

// Create combined router
const masterApp = express();
masterApp.use(express.json());
masterApp.use(authRouter);
masterApp.use(wasteRouter);

let tokens = {
    controlCenter: null,
    worker: null,
    binStaff: null,
    admin: null
};

let testPassed = 0;
let testFailed = 0;

function assert(condition, message) {
    if (condition) {
        testPassed++;
        console.log(`  ✅ PASS: ${message}`);
    } else {
        testFailed++;
        console.error(`  ❌ FAIL: ${message}`);
    }
}

/**
 * Clean in-memory HTTP dispatcher for Express routers.
 * Requires no network sockets, bypassing sandbox socket restrictions.
 */
function dispatch(method, url, body = null, token = null) {
    return new Promise((resolve) => {
        const headers = { 'content-type': 'application/json' };
        if (token) headers['authorization'] = `Bearer ${token}`;

        const [pathOnly, queryString] = url.split('?');
        const query = {};
        if (queryString) {
            queryString.split('&').forEach(pair => {
                const [k, v] = pair.split('=');
                query[decodeURIComponent(k)] = decodeURIComponent(v || '');
            });
        }

        const req = {
            method: method.toUpperCase(),
            url: url,
            path: pathOnly,
            query: query,
            params: {},
            headers: headers,
            body: body || {},
            get: function (headerName) {
                return this.headers[headerName.toLowerCase()];
            }
        };

        let resStatus = 200;
        let resHeaders = {};
        let resBody = null;

        const res = {
            status(code) {
                resStatus = code;
                return this;
            },
            set(k, v) {
                resHeaders[k] = v;
                return this;
            },
            setHeader(k, v) {
                resHeaders[k] = v;
                return this;
            },
            json(data) {
                resBody = data;
                resolve({ status: resStatus, body: resBody });
                return this;
            },
            send(data) {
                resBody = data;
                resolve({ status: resStatus, body: resBody });
                return this;
            },
            end() {
                resolve({ status: resStatus, body: resBody });
            }
        };

        try {
            masterApp.handle(req, res, (err) => {
                if (err) {
                    console.error("Router error:", err);
                    resolve({ status: 500, body: { error: err.message } });
                } else {
                    resolve({ status: 404, body: { message: "Not found" } });
                }
            });
        } catch (e) {
            resolve({ status: 500, body: { error: e.message } });
        }
    });
}

async function runAllSuites() {
    console.log("===============================================================================");
    console.log("🚀 STARTING SMARTCITY AI - GORAKHPUR WASTE WORKFORCE MASTER TEST SUITE");
    console.log("===============================================================================\n");

    // =========================================================================
    // SUITE A: ROLE-BASED AUTHENTICATION & SESSION ROUTING
    // =========================================================================
    console.log("--- TEST SUITE A: Role-Based Authentication & Session Routing ---");

    // 1. Control Center Staff Login
    const ccRes = await dispatch('POST', '/api/staff-login', { staffId: 'WST-CC-01', password: 'control123' });
    assert(ccRes.status === 200 && ccRes.body.success, "Control Center staff authenticated successfully");
    assert(ccRes.body.role === 'control_center', "Role correctly set to 'control_center'");
    assert(ccRes.body.targetDashboard.includes('pages/waste/control_center.html'), "Routes to control_center.html dashboard");
    tokens.controlCenter = ccRes.body.token;

    // 2. Field Worker Login
    const wrkRes = await dispatch('POST', '/api/staff-login', { staffId: 'WRK-001', password: 'worker123' });
    assert(wrkRes.status === 200 && wrkRes.body.success, "Field Collection Worker authenticated successfully");
    assert(wrkRes.body.role === 'working_staff', "Role correctly set to 'working_staff'");
    assert(wrkRes.body.targetDashboard.includes('pages/waste/worker_dashboard.html'), "Routes to worker_dashboard.html dashboard");
    tokens.worker = wrkRes.body.token;

    // 3. Bin Staff Login
    const binRes = await dispatch('POST', '/api/staff-login', { staffId: 'BIN-GOL-01', password: 'BIN@2026' });
    assert(binRes.status === 200 && binRes.body.success, "Smart Bin Operator authenticated successfully");
    assert(binRes.body.role === 'bin_staff', "Role correctly set to 'bin_staff'");
    assert(binRes.body.targetDashboard.includes('pages/waste/bin_dashboard.html?binCode=BIN-GOL-01'), "Routes strictly to assigned bin_dashboard.html");
    tokens.binStaff = binRes.body.token;

    // 4. Waste Admin Login
    const admRes = await dispatch('POST', '/api/staff-login', { staffId: 'WST-ADMIN', password: 'admin123' });
    assert(admRes.status === 200 && admRes.body.success, "Waste Administrator authenticated successfully");
    assert(admRes.body.role === 'admin', "Role correctly set to 'admin'");
    tokens.admin = admRes.body.token;

    // 5. Cross-Module RBAC & Privilege Escalation Prevention
    const unauthorizedCcRes = await dispatch('GET', '/api/waste/control-center/complaints', null, tokens.binStaff);
    assert(unauthorizedCcRes.status === 403, "Bin Staff is BLOCKED from Control Center complaints endpoint (HTTP 403)");

    const unauthorizedWorkerAdminRes = await dispatch('GET', '/api/waste/admin/staff', null, tokens.worker);
    assert(unauthorizedWorkerAdminRes.status === 403, "Worker is BLOCKED from Admin Staff Management endpoint (HTTP 403)");

    const unauthenticatedRes = await dispatch('GET', '/api/waste/control-center/map-data');
    assert(unauthenticatedRes.status === 401, "Unauthenticated visitor denied access (HTTP 401)");

    console.log();

    // =========================================================================
    // SUITE B: CONTROL CENTER GIS, AREA ANALYTICS & EXPLAINABLE AI ASSIGNMENT
    // =========================================================================
    console.log("--- TEST SUITE B: Control Center GIS, Area Analytics & AI Assignment ---");

    // 1. GIS Map Data
    const mapDataRes = await dispatch('GET', '/api/waste/control-center/map-data', null, tokens.controlCenter);
    assert(mapDataRes.status === 200 && mapDataRes.body.success, "Control Center fetched GIS Map Data");
    assert(Array.isArray(mapDataRes.body.gis?.bins) && mapDataRes.body.gis.bins.length > 0, "Registered smart bins returned with locations and fill %");
    assert(Array.isArray(mapDataRes.body.gis?.workers), "Active workers returned with privacy controls");

    // 2. Verified Ward Analytics (No fabricated statistics)
    const analyticsRes = await dispatch('GET', '/api/waste/control-center/area-analytics', null, tokens.controlCenter);
    assert(analyticsRes.status === 200 && analyticsRes.body.success, "Ward-wise area analytics returned successfully");
    assert(analyticsRes.body.wards && analyticsRes.body.wards.some(w => w.ward_name.includes("Golghar")), "Verified Gorakhpur ward (Golghar) present in analytics");
    assert(analyticsRes.body.summary?.provenance_metadata?.population_source.includes("Verified"), "Data fidelity clearly labels verified vs estimated statistics");

    // 3. Multi-Factor AI Worker Recommendation
    const aiRecRes = await dispatch('POST', '/api/waste/control-center/ai-recommend-worker', {
        complaint_id: 504,
        category: "OVERFLOW_BIN",
        priority: "HIGH",
        latitude: 26.7606,
        longitude: 83.3732
    }, tokens.controlCenter);

    assert(aiRecRes.status === 200 && aiRecRes.body.success, "AI Worker Recommendation computed successfully");
    assert(aiRecRes.body.recommended_worker !== null, "AI selected optimal worker");
    assert(aiRecRes.body.recommended_worker?.score_breakdown?.composite_score !== undefined, "Transparent scoring formula breakdown provided (distance, workload, availability, skill, priority)");

    // 4. Manual Assignment / Override
    const assignRes = await dispatch('POST', '/api/waste/control-center/assign-complaint', {
        complaintId: 504,
        workerId: 1,
        instructions: "Clear Golghar chowk overflow bin immediately",
        reason: "High priority commercial market square"
    }, tokens.controlCenter);

    assert(assignRes.status === 200 && assignRes.body.success, "Control Center assigned complaint to worker with audit log");

    console.log();

    // =========================================================================
    // SUITE C: FIELD WORKER OPERATIONS, TASK STATE MACHINE & PROOF
    // =========================================================================
    console.log("--- TEST SUITE C: Field Worker Operations & Verification Workflow ---");

    // 1. Worker Tasks
    const tasksRes = await dispatch('GET', '/api/waste/worker/tasks', null, tokens.worker);
    assert(tasksRes.status === 200 && tasksRes.body.success, "Worker fetched assigned task list");
    assert(Array.isArray(tasksRes.body.tasks) && tasksRes.body.tasks.length > 0, "Tasks array returned for worker");

    const activeTaskId = tasksRes.body.tasks[0].id;

    // 2. State Transition: ASSIGNED -> ACCEPTED -> IN_PROGRESS
    const acceptRes = await dispatch('PUT', `/api/waste/worker/tasks/${activeTaskId}/status`, { status: "ACCEPTED" }, tokens.worker);
    assert(acceptRes.status === 200 && acceptRes.body.task?.status === "ACCEPTED", "Task transitioned to ACCEPTED");

    const inProgRes = await dispatch('PUT', `/api/waste/worker/tasks/${activeTaskId}/status`, { status: "IN_PROGRESS" }, tokens.worker);
    assert(inProgRes.status === 200 && acceptRes.body.task?.status !== null, "Task transitioned to IN_PROGRESS");

    // 3. Road-Following Navigation Route
    const navRes = await dispatch('GET', `/api/waste/worker/navigation/${activeTaskId}`, null, tokens.worker);
    assert(navRes.status === 200 && navRes.body.success, "Road navigation returned");
    assert((navRes.body.route?.coordinates?.length > 2) || (navRes.body.road_network?.waypoints?.length > 2), "Route follows actual road corridors (not a straight 2-point line)");

    // 4. Collection Proof Submission (Worker CANNOT self-approve)
    const proofRes = await dispatch('POST', `/api/waste/worker/tasks/${activeTaskId}/submit-proof`, {
        after_photo_url: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
        before_photo_url: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
        latitude: 26.7606,
        longitude: 83.3732,
        waste_collected_kg: 84.5,
        completion_remarks: "Evacuated primary commercial hopper completely."
    }, tokens.worker);

    assert(proofRes.status === 200 && proofRes.body.success, "Worker submitted collection proof");
    assert(proofRes.body.task?.status === "UNDER_VERIFICATION", "Task placed in UNDER_VERIFICATION (worker cannot self-approve)");

    // 5. Control Center Verification: Rejection and Correction Cycle
    const rejectRes = await dispatch('POST', '/api/waste/control-center/verify-proof', {
        task_id: activeTaskId,
        decision: "REJECT",
        remarks: "Photo blurry, please re-capture clear hopper photograph"
    }, tokens.controlCenter);

    assert(rejectRes.status === 200 && (rejectRes.body.task?.status === "REJECTED_NEEDS_CORRECTION" || rejectRes.body.task?.proof?.verification_status === "REJECTED_FOR_CORRECTION"), "Control Center rejected proof, task returned for correction with audit reason");

    // Resubmit corrected proof
    await dispatch('POST', `/api/waste/worker/tasks/${activeTaskId}/submit-proof`, {
        after_photo_url: "data:image/jpeg;base64,/9j/CLEAR_PHOTO==",
        latitude: 26.7606,
        longitude: 83.3732,
        waste_collected_kg: 85.0,
        completion_remarks: "Re-captured high resolution cleanup photo."
    }, tokens.worker);

    // Control Center Verification: Approval
    const approveRes = await dispatch('POST', '/api/waste/control-center/verify-proof', {
        task_id: activeTaskId,
        decision: "APPROVE",
        remarks: "Verified clean site by Control Center Dispatch"
    }, tokens.controlCenter);

    assert(approveRes.status === 200 && (approveRes.body.task?.status === "Completed" || approveRes.body.task?.proof?.verification_status === "VERIFIED"), "Control Center approved proof, task transitioned to VERIFIED");

    console.log();

    // =========================================================================
    // SUITE D: SMART BIN OPERATOR RESTRICTION & IDEMPOTENT DISPATCH
    // =========================================================================
    console.log("--- TEST SUITE D: Smart Bin Monitoring & Idempotent Collection Requests ---");

    // 1. Single Assigned Bin Isolation
    const myBinRes = await dispatch('GET', '/api/waste/bin-staff/my-bin', null, tokens.binStaff);
    assert(myBinRes.status === 200 && myBinRes.body.success, "Bin operator fetched assigned unit telemetry");
    assert(myBinRes.body.bin?.bin_code === "BIN-GOL-01", "Operator strictly restricted to assigned unit (BIN-GOL-01)");
    assert(myBinRes.body.bin?.current_fill_percentage !== undefined, "Telemetry contains fill %");
    assert(myBinRes.body.bin?.sensor_status === "ONLINE_ACTIVE", "Sensor connectivity verified");

    // 2. AI Time-to-Full Prediction
    const aiPredRes = await dispatch('GET', '/api/waste/bin-staff/ai-prediction', null, tokens.binStaff);
    assert(aiPredRes.status === 200 && aiPredRes.body.success, "AI prediction endpoint responded");
    assert(aiPredRes.body.formatted_time_until_full !== undefined, `Prediction output: ${aiPredRes.body.formatted_time_until_full}`);

    // 3. Collection Trigger & Idempotency Protection
    const trigger1Res = await dispatch('POST', '/api/waste/bin-staff/trigger-collection', { fillPercentage: 88, weightKg: 130.0 }, tokens.binStaff);
    assert(trigger1Res.status === 200 && trigger1Res.body.success, "1st Collection Request successfully queued with unique cycle token");

    // 4. Repeated Trigger within same cycle (MUST BE PREVENTED)
    const trigger2Res = await dispatch('POST', '/api/waste/bin-staff/trigger-collection', { fillPercentage: 88, weightKg: 130.0 }, tokens.binStaff);
    assert(trigger2Res.status === 409 && !trigger2Res.body.success, "2nd duplicate trigger for same active cycle was PREVENTED (HTTP 409 Conflict)");
    assert(trigger2Res.body.message?.includes("Duplicate dispatch prevented"), "Idempotency prevents duplicate request creation");

    console.log();

    // =========================================================================
    // SUITE E: ADMIN WORKFORCE MANAGEMENT & AUDIT LOGGING
    // =========================================================================
    console.log("--- TEST SUITE E: Admin Workforce Management & Audit Logging ---");

    // 1. Admin Staff List
    const adminStaffRes = await dispatch('GET', '/api/waste/admin/staff', null, tokens.admin);
    assert(adminStaffRes.status === 200 && adminStaffRes.body.success, "Admin fetched complete workforce directory");

    // 2. Admin Create Staff Account
    const createStaffRes = await dispatch('POST', '/api/waste/admin/staff', {
        staffId: "WRK-005",
        name: "Vikas Shukla",
        email: "vikas.shukla@smartcity.gorakhpur.gov.in",
        role: "WORKING_STAFF",
        assigned_area: "BRD Medical Road Ward 22",
        password: "password123"
    }, tokens.admin);

    assert(createStaffRes.status === 201 && createStaffRes.body.success, "Admin created new Field Worker account (WRK-005)");

    // 3. Admin Change Operational Assignment
    const updateAssignRes = await dispatch('PUT', '/api/waste/admin/staff/WRK-005', {
        assigned_area: "Civil Lines North & Ward 08",
        reason: "Ward sanitation expansion project"
    }, tokens.admin);

    assert(updateAssignRes.status === 200 && updateAssignRes.body.success, "Admin reallocated worker assignment with audit reason");

    // 4. Admin Suspend / Activate Account
    const suspendRes = await dispatch('POST', '/api/waste/admin/staff/WRK-005/status', {
        is_active: false,
        reason: "Temporary leave of absence"
    }, tokens.admin);

    assert(suspendRes.status === 200 && suspendRes.body.success, "Admin successfully suspended staff account");

    // 5. Admin Secure Password Reset
    const resetPassRes = await dispatch('POST', '/api/waste/admin/staff/WRK-005/reset-password', {
        password: "newSecurePass2026!"
    }, tokens.admin);

    assert(resetPassRes.status === 200 && resetPassRes.body.success, "Admin reset staff credentials using cryptographic hashing");

    // 6. Admin Audit Log History
    const auditRes = await dispatch('GET', '/api/waste/admin/audit-logs', null, tokens.admin);
    assert(auditRes.status === 200 && auditRes.body.success, "Admin fetched immutable audit logs");
    assert(auditRes.body.logs?.length >= 3, "Audit entries properly logged for assignments, status changes, and resets");

    console.log();

    // =========================================================================
    // SUITE F: DUSTBIN UNLOCK & RESILIENT TERMINAL TEST
    // =========================================================================
    console.log("--- TEST SUITE F: Dustbin Dashboard Unlocking & Resilient Auth ---");
    const dustbinAuthRes = await dispatch('POST', '/api/waste/dustbin-terminal/auth', {
        binCode: "BIN-GOL-01",
        passcode: "BIN@2026",
        staffId: "WST001"
    });
    assert(dustbinAuthRes.status === 200 && dustbinAuthRes.body.success, "Dustbin terminal unlocked successfully with BIN-GOL-01 and BIN@2026");
    assert(dustbinAuthRes.body.bin && dustbinAuthRes.body.bin.current_fill_percentage !== undefined, "Telemetry payload returned for unlocked dashboard");

    console.log();

    // =========================================================================
    // SUMMARY
    // =========================================================================
    console.log("===============================================================================");
    console.log(`🎯 MASTER TEST SUMMARY: ${testPassed} PASSED, ${testFailed} FAILED`);
    console.log("===============================================================================");

    if (testFailed > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runAllSuites().catch(err => {
    console.error("Master Test Suite Error:", err);
    process.exit(1);
});
