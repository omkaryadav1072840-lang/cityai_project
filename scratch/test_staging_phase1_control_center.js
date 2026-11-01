// scratch/test_staging_phase1_control_center.js - Phase 1: Multi-Employee Control Center Concurrency Suite

const path = require('path');
const express = require(path.join(__dirname, '../backend/node_modules/express'));
const workforceRouter = require(path.join(__dirname, '../backend/routes/waste_workforce.routes'));
const { generateToken } = require(path.join(__dirname, '../backend/middleware/auth.middleware'));

const app = express();
app.use(express.json());
app.use(workforceRouter);

let passed = 0;
let failed = 0;

function assert(cond, msg) {
    if (cond) {
        passed++;
        console.log(`  🏢 PASS: ${msg}`);
    } else {
        failed++;
        console.error(`  🚨 FAIL: ${msg}`);
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

async function runMultiEmployeeStagingTest() {
    console.log("===============================================================================");
    console.log("🏢 PHASE 1: MULTI-EMPLOYEE CONTROL CENTER CONCURRENCY STAGING AUDIT");
    console.log("===============================================================================\n");

    // Provision 10 simultaneous Control Center employee tokens
    const ccTokens = [];
    for (let i = 1; i <= 10; i++) {
        const staffId = `CC-EMP-${String(i).padStart(2, '0')}`;
        const name = `Control Operator ${i}`;
        const token = generateToken({
            id: 200 + i,
            staffId,
            name,
            department: 'waste',
            role: 'control_center'
        }, 'control_center');
        ccTokens.push({ staffId, name, token });
    }

    console.log("--- 1. Simultaneous Complaint Access (5 & 10 Employees) ---");
    // 10 simultaneous read requests to map data & complaints queue
    const simultaneousReads = await Promise.all(
        ccTokens.map(emp => dispatch('GET', '/api/waste/control-center/complaints', null, emp.token))
    );
    const all200 = simultaneousReads.every(r => r.status === 200 && r.body.success);
    assert(all200, "10 simultaneous Control Center employees accessed complaints list concurrently without deadlock");

    const counts = simultaneousReads.map(r => r.body.count);
    const allCountsMatch = counts.every(c => c === counts[0]);
    assert(allCountsMatch, "Read consistency verified: All 10 employees see identical complaint queue count");
    console.log();

    console.log("--- 2. Two Simultaneous Employees: Race for Unassigned Complaint ---");
    // Ensure complaint 504 is unassigned
    let comp504 = workforceRouter.inMemoryTasks.find(t => t.id === 504);
    if (!comp504) {
        comp504 = {
            id: 504,
            request_code: "REQ-WST-2026-004",
            category: "Unattended Dustbin Overflow",
            address: "Railway Colony Gate 2, Ward 03",
            latitude: 26.7545,
            longitude: 83.3810,
            priority: "HIGH",
            status: "Submitted",
            assigned_worker_id: null,
            assigned_worker_name: null,
            version: 1,
            created_at: new Date().toISOString()
        };
        workforceRouter.inMemoryTasks.push(comp504);
    } else {
        comp504.assigned_worker_id = null;
        comp504.assigned_worker_name = null;
        comp504.status = "Submitted";
        comp504.version = 1;
    }

    // CC-EMP-01 assigns to Worker 1; CC-EMP-02 assigns to Worker 2 at the exact same millisecond
    const p1 = dispatch('POST', '/api/waste/control-center/assign-complaint', {
        complaintId: 504,
        workerId: 1,
        assignmentType: 'MANUAL',
        reason: 'Operator 1 immediate commercial dispatch'
    }, ccTokens[0].token);

    const p2 = dispatch('POST', '/api/waste/control-center/assign-complaint', {
        complaintId: 504,
        workerId: 2,
        assignmentType: 'MANUAL',
        reason: 'Operator 2 alternate routing dispatch'
    }, ccTokens[1].token);

    const [resP1, resP2] = await Promise.all([p1, p2]);
    const successCount = (resP1.status === 200 ? 1 : 0) + (resP2.status === 200 ? 1 : 0);
    const conflictCount = (resP1.status === 409 ? 1 : 0) + (resP2.status === 409 ? 1 : 0);

    assert(successCount === 1, "Exactly one concurrent assignment succeeded (HTTP 200)");
    assert(conflictCount === 1, "The competing concurrent assignment was rejected with HTTP 409 Conflict");
    assert(comp504.assigned_worker_id !== null, "Task 504 has exactly one assigned worker (no conflicting dual-state)");
    assert(
        (resP1.body.message?.includes("already assigned") || resP2.body.message?.includes("already assigned")),
        "Rejection message explicitly informs second operator of existing assignment"
    );
    console.log();

    console.log("--- 3. Five Simultaneous Employees: Optimistic Versioning Guard ---");
    // Reset or pick Task 502
    const task502 = workforceRouter.inMemoryTasks.find(t => t.id === 502);
    task502.version = 5; // known base version
    task502.status = "Assigned";
    task502.assigned_worker_id = 2;

    // 5 operators read version 5 and simultaneously submit updates with expectedVersion = 5
    const fivePromises = ccTokens.slice(0, 5).map((emp, idx) => {
        return dispatch('POST', '/api/waste/control-center/assign-complaint', {
            complaintId: 502,
            workerId: (idx % 3) + 1,
            expectedVersion: 5,
            allowReassignment: true,
            reason: `Concurrent shift reallocation by ${emp.name}`
        }, emp.token);
    });

    const fiveResults = await Promise.all(fivePromises);
    const fiveSuccess = fiveResults.filter(r => r.status === 200);
    const fiveConflict = fiveResults.filter(r => r.status === 409);

    assert(fiveSuccess.length === 1, "Optimistic Versioning: Exactly 1 of 5 simultaneous updates succeeded");
    assert(fiveConflict.length === 4, "Optimistic Versioning: Remaining 4 requests received HTTP 409 (version mismatch/lock contention)");
    assert(task502.version === 6, "Task version incremented monotonically from 5 to 6 (no lost updates)");
    console.log();

    console.log("--- 4. Ten Simultaneous Employees: Concurrent Proof Verification ---");
    // Prepare Task 503 with submitted proof
    const task503 = workforceRouter.inMemoryTasks.find(t => t.id === 503);
    task503.status = "Under Verification";
    task503.assigned_worker_id = 3;
    task503.proof = {
        task_id: 503,
        request_code: "REQ-WST-2026-003",
        after_image: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
        latitude: 26.7485,
        longitude: 83.3655,
        waste_weight_kg: 42.5,
        verification_status: "UNDER_VERIFICATION",
        submitted_by_worker_id: 3
    };

    // 10 operators all simultaneously click "Approve Proof"
    const tenVerifyPromises = ccTokens.map((emp, idx) => {
        return dispatch('POST', '/api/waste/control-center/verify-proof', {
            complaintId: 503,
            decision: 'APPROVED',
            remarks: `Verified by ${emp.name} at triage desk`
        }, emp.token);
    });

    const tenVerifyResults = await Promise.all(tenVerifyPromises);
    const verifySuccess = tenVerifyResults.filter(r => r.status === 200);
    const verifyConflict = tenVerifyResults.filter(r => r.status === 409);

    assert(verifySuccess.length === 1, "Concurrent Proof Verification: Exactly 1 approval succeeded (HTTP 200)");
    assert(verifyConflict.length === 9, "Concurrent Proof Verification: Remaining 9 duplicate verification requests rejected (HTTP 409)");
    assert(task503.status === "Completed", "Task status set to Completed exactly once");
    assert(task503.proof.verification_status === "VERIFIED", "Proof verification status is VERIFIED");
    console.log();

    console.log("--- 5. Manual Reassignment with Audit Consistency ---");
    const reassignRes = await dispatch('POST', '/api/waste/control-center/assign-complaint', {
        complaintId: 501,
        workerId: 3,
        allowReassignment: true,
        assignmentType: 'MANUAL_OVERRIDE',
        reason: 'Emergency biohazard crew deployment per supervisor order'
    }, ccTokens[0].token);

    assert(reassignRes.status === 200 && reassignRes.body.success, "Manual reassignment succeeded with explicit reason");
    const updated501 = workforceRouter.inMemoryTasks.find(t => t.id === 501);
    assert(updated501.assigned_worker_id === 3, "Task 501 assigned worker updated to Worker 3");

    // Verify audit trail consistency
    const recentAudits = workforceRouter.inMemoryAudits.filter(a => a.request_id === 501);
    assert(recentAudits.length > 0, "Audit trail logged manual reassignment");
    const lastAudit = recentAudits[recentAudits.length - 1];
    assert(lastAudit.new_worker_id === 3, "Audit entry records new worker ID (3)");
    assert(lastAudit.reason.includes("Emergency biohazard"), "Audit entry preserves verbatim justification reason");

    // Monotonicity check on all audits
    let monotonic = true;
    for (let i = 1; i < workforceRouter.inMemoryAudits.length; i++) {
        if (workforceRouter.inMemoryAudits[i].id !== workforceRouter.inMemoryAudits[i - 1].id + 1) {
            monotonic = false;
            break;
        }
    }
    assert(monotonic, "Administrative audit log IDs are strictly monotonic sequential integers");
    console.log();

    console.log("===============================================================================");
    console.log(`🏢 PHASE 1 CONCURRENCY SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("===============================================================================");

    if (failed > 0) process.exit(1);
    else process.exit(0);
}

runMultiEmployeeStagingTest().catch(err => {
    console.error("Fatal Phase 1 error:", err);
    process.exit(1);
});
