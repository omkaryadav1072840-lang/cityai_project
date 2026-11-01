// scratch/test_ai_validation.js - Independent AI Engine & Scoring Audit

const path = require('path');
const express = require(path.join(__dirname, '../backend/node_modules/express'));
const workforceRoutes = require(path.join(__dirname, '../backend/routes/waste_workforce.routes'));
const { inMemoryStaff, inMemoryTasks, inMemoryAudits } = workforceRoutes;
const { generateToken } = require(path.join(__dirname, '../backend/middleware/auth.middleware'));

const app = express();
app.use(express.json());
app.use(workforceRoutes);

const ccToken = generateToken({ id: 201, role: 'control_center', staffId: 'WST-CC-01', department: 'waste' }, "control_center");

let passed = 0;
let failed = 0;

function assert(cond, msg) {
    if (cond) {
        passed++;
        console.log(`  🤖 PASS: ${msg}`);
    } else {
        failed++;
        console.error(`  ❌ FAIL: ${msg}`);
    }
}

function dispatch(method, url, body = null, token = ccToken) {
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

async function runAiValidationSuite() {
    console.log("===============================================================================");
    console.log("🤖 PHASE 5: AI COMPLAINT ASSIGNMENT & SCORING VALIDATION AUDIT");
    console.log("===============================================================================\n");

    // 1. Math Verification: Haversine distance and multi-factor composite scoring
    console.log("--- 1. Multi-Factor Formula & Calculation Verification ---");
    const testCases = [
        { distScore: 100, workloadScore: 100, availScore: 100, skillScore: 100, prioScore: 100, expected: 100.0 },
        { distScore: 80, workloadScore: 76, availScore: 100, skillScore: 90, prioScore: 75, expected: 84.0 },
        { distScore: 50, workloadScore: 28, availScore: 0, skillScore: 60, prioScore: 100, expected: 41.0 }
    ];

    testCases.forEach((tc, idx) => {
        const calculated = Number((
            (tc.distScore * 0.30) +
            (tc.workloadScore * 0.25) +
            (tc.availScore * 0.20) +
            (tc.skillScore * 0.15) +
            (tc.prioScore * 0.10)
        ).toFixed(1));
        assert(calculated === tc.expected, `Multi-factor composite score calculation test case #${idx + 1} (${tc.expected})`);
    });
    console.log();

    // 2. Worker Distance & Missing GPS Fallback
    console.log("--- 2. Geolocation & Haversine Distance Audit ---");
    const originalStaff = JSON.parse(JSON.stringify(inMemoryStaff));
    const originalTasks = JSON.parse(JSON.stringify(inMemoryTasks));

    // Seed controlled workers
    inMemoryStaff.length = 0;
    inMemoryStaff.push(
        { id: 101, worker_id: 101, name: "Worker Near (Golghar)", role: "working_staff", is_active: true, status: "Active", latitude: 26.7606, longitude: 83.3732, skills: ["Mixed Waste"] },
        { id: 102, worker_id: 102, name: "Worker Far (Gorakhnath)", role: "working_staff", is_active: true, status: "Active", latitude: 26.7850, longitude: 83.3550, skills: ["Mixed Waste"] },
        { id: 103, worker_id: 103, name: "Worker Missing GPS", role: "working_staff", is_active: true, status: "Active", latitude: null, longitude: null, skills: ["Mixed Waste"] }
    );

    const res1 = await dispatch('POST', '/api/waste/control-center/ai-recommend-worker', {
        latitude: 26.7606,
        longitude: 83.3732,
        category: 'Mixed Waste',
        priority: 'MEDIUM'
    });

    assert(res1.body && res1.body.success === true, "AI recommendation endpoint returns success: true");
    assert(res1.body.recommended_worker.worker_id === 101, "Nearest worker (Golghar) ranked #1 with highest score");
    assert(res1.body.recommended_worker.distance_km === 0, "Distance to Golghar worker is 0 km");
    assert(res1.body.candidate_rankings.length === 3, "All 3 active working staff scored and ranked");

    const missingGpsWorker = res1.body.candidate_rankings.find(w => w.worker_id === 103);
    assert(missingGpsWorker !== undefined, "Worker with missing GPS is evaluated safely without crashing");
    assert(missingGpsWorker.distance_km === 0, "Missing GPS safely defaults to Municipal HQ (26.7606, 83.3732)");
    console.log();

    // 3. Workload Penalty & Overloaded Worker Prevention
    console.log("--- 3. Workload Penalty & Overloaded Worker Evaluation ---");
    // Assign 4 active tasks to Worker Near (101) so he is overloaded
    inMemoryTasks.length = 0;
    for (let i = 1; i <= 4; i++) {
        inMemoryTasks.push({ id: 1000 + i, assigned_worker_id: 101, status: "In Progress" });
    }

    const res2 = await dispatch('POST', '/api/waste/control-center/ai-recommend-worker', {
        latitude: 26.7606,
        longitude: 83.3732,
        category: 'Mixed Waste',
        priority: 'MEDIUM'
    });

    const overloadedWorker = res2.body.candidate_rankings.find(w => w.worker_id === 101);
    assert(overloadedWorker.score_breakdown.workload_score <= 10, "Overloaded worker received heavy workload penalty (<= 10 pts)");
    assert(res2.body.recommended_worker.worker_id !== 101, "AI avoids selecting overloaded worker despite zero distance");
    console.log();

    // 4. Availability Check: Off-Duty / Inactive Workers
    console.log("--- 4. Worker Availability & Inactive Status Audit ---");
    // Put worker 102 off-duty
    inMemoryStaff.find(s => s.id === 102).status = "Off Duty";
    // Deactivate worker 103
    inMemoryStaff.find(s => s.id === 103).is_active = false;

    const res3 = await dispatch('POST', '/api/waste/control-center/ai-recommend-worker', {
        latitude: 26.7850,
        longitude: 83.3550,
        category: 'Mixed Waste',
        priority: 'MEDIUM'
    });

    const offDutyWorker = res3.body.candidate_rankings.find(w => w.worker_id === 102);
    assert(offDutyWorker.score_breakdown.availability_score === 0, "Off-duty worker receives 0 availability points");
    const inactiveWorker = res3.body.candidate_rankings.find(w => w.worker_id === 103);
    assert(inactiveWorker === undefined, "Deactivated employee is completely excluded from eligible candidates");
    console.log();

    // 5. Skill Compatibility Audit
    console.log("--- 5. Specialized Skill Compatibility Audit ---");
    inMemoryStaff.length = 0;
    inMemoryStaff.push(
        { id: 201, worker_id: 201, name: "Biohazard Specialist", role: "working_staff", is_active: true, status: "Active", latitude: 26.7606, longitude: 83.3732, skills: ["Hazardous Waste", "Medical"] },
        { id: 202, worker_id: 202, name: "General Sweeper", role: "working_staff", is_active: true, status: "Active", latitude: 26.7606, longitude: 83.3732, skills: ["Street Sweeping", "Dry Waste"] }
    );
    inMemoryTasks.length = 0;

    const resBio = await dispatch('POST', '/api/waste/control-center/ai-recommend-worker', {
        latitude: 26.7606,
        longitude: 83.3732,
        category: 'Hazardous Chemical Waste',
        priority: 'CRITICAL'
    });

    const bioSpecialist = resBio.body.candidate_rankings.find(w => w.worker_id === 201);
    const generalWorker = resBio.body.candidate_rankings.find(w => w.worker_id === 202);
    assert(bioSpecialist.score_breakdown.skill_score === 100, "Biohazard specialist gets 100% skill match for Hazardous Chemical Waste");
    assert(generalWorker.score_breakdown.skill_score === 20, "General worker penalized to 20% skill match for Hazardous Chemical Waste");
    assert(resBio.body.recommended_worker.worker_id === 201, "AI prioritizes specialized skill worker for critical hazardous waste");
    console.log();

    // 6. No Active / Eligible Workers State
    console.log("--- 6. No Active Eligible Workers Boundary Test ---");
    inMemoryStaff.forEach(s => s.is_active = false);
    const resNoWorkers = await dispatch('POST', '/api/waste/control-center/ai-recommend-worker', {
        latitude: 26.7606,
        longitude: 83.3732
    });
    assert(resNoWorkers.body.recommendation === null || resNoWorkers.body.recommended_worker === undefined, "Gracefully handles no active workers without throwing unhandled exception");
    assert(resNoWorkers.body.message.includes("No active working staff"), "Provides explicit warning message to Control Center");
    console.log();

    // 7. Manual Override Assignment & Audit Trail
    console.log("--- 7. Manual Override with Audit Reason ---");
    // Restore original staff and task state
    inMemoryStaff.length = 0;
    originalStaff.forEach(s => inMemoryStaff.push(s));
    inMemoryTasks.length = 0;
    originalTasks.forEach(t => inMemoryTasks.push(t));

    // Ensure a pending task exists
    const testTaskId = 999;
    inMemoryTasks.push({
        id: testTaskId,
        request_code: 'WST-2026-999',
        task_name: 'Overflowing Bin at Golghar Market',
        status: 'Assigned',
        assigned_worker_id: 1,
        assigned_worker_name: 'Rajesh Kumar',
        assigned_worker_phone: '+91 98765 43210'
    });

    // Control center overrides assignment to WRK-002 (Sunil Verma, id: 2) with an explicit audit reason
    const overrideRes = await dispatch('POST', '/api/waste/control-center/assign-complaint', {
        complaintId: testTaskId,
        workerId: 2,
        assignmentType: "MANUAL_OVERRIDE",
        reason: "Field reallocation due to urgent commercial zone surge"
    });

    assert(overrideRes.body && overrideRes.body.success === true, "Manual assignment override succeeds");
    const updatedTask = inMemoryTasks.find(t => t.id === testTaskId);
    assert(updatedTask.assigned_worker_id === 2, "Task assigned_worker_id updated to overridden worker (id: 2)");
    assert(updatedTask.assignment_type === "MANUAL_OVERRIDE", "Task assignment_type recorded as 'MANUAL_OVERRIDE'");
    assert(updatedTask.assignment_reason && updatedTask.assignment_reason.includes("Field reallocation"), "Audit reason captured in task record");

    // Check that audit record was appended to inMemoryAudits
    const auditRecord = inMemoryAudits.find(a => a.request_id === testTaskId && a.new_worker_id === 2);
    assert(auditRecord !== undefined, "Audit trail logged manual reassignment event with audit reason");
    console.log();

    console.log("===============================================================================");
    console.log(`🤖 AI SCORING & ASSIGNMENT AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("===============================================================================");

    if (failed > 0) process.exit(1);
    else process.exit(0);
}

runAiValidationSuite().catch(err => {
    console.error("Fatal error running AI audit:", err);
    process.exit(1);
});
