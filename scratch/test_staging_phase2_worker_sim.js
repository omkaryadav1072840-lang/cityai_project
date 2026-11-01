// scratch/test_staging_phase2_worker_sim.js - Phase 2: Worker Assignment AI Staging Simulation

const path = require('path');
const express = require(path.join(__dirname, '../backend/node_modules/express'));
const workforceRouter = require(path.join(__dirname, '../backend/routes/waste_workforce.routes'));
const { inMemoryStaff, inMemoryTasks } = workforceRouter;
const { generateToken } = require(path.join(__dirname, '../backend/middleware/auth.middleware'));

const app = express();
app.use(express.json());
app.use(workforceRouter);

const ccToken = generateToken({
    id: 201,
    staffId: 'WST-CC-01',
    name: 'Amitabh Sen',
    department: 'waste',
    role: 'control_center'
}, 'control_center');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
    if (cond) {
        passed++;
        console.log(`  🤖 PASS: ${msg}`);
    } else {
        failed++;
        console.error(`  🚨 FAIL: ${msg}`);
    }
}

function dispatch(method, url, body = null) {
    return new Promise((resolve) => {
        const headers = { 'content-type': 'application/json', authorization: `Bearer ${ccToken}` };
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

// Reproducible PRNG with Fixed Seed (LCG)
class DeterministicPRNG {
    constructor(seed = 133742) {
        this.m = 0x80000000;
        this.a = 1103515245;
        this.c = 12345;
        this.state = seed;
    }
    nextFloat() {
        this.state = (this.a * this.state + this.c) % this.m;
        return this.state / (this.m - 1);
    }
    nextInt(min, max) {
        return Math.floor(min + this.nextFloat() * (max - min + 1));
    }
}

async function runWorkerAssignmentSimulation() {
    console.log("===============================================================================");
    console.log("🤖 PHASE 2: SYNTHETIC WORKER ASSIGNMENT & AI DISPATCH STAGING SIMULATION");
    console.log("===============================================================================\n");

    const prng = new DeterministicPRNG(133742);

    // Save baseline records to restore later
    const originalStaff = JSON.parse(JSON.stringify(inMemoryStaff));
    const originalTasks = JSON.parse(JSON.stringify(inMemoryTasks));

    // 1. Create 15 clearly marked Synthetic Workers
    console.log("--- 1. Provisioning 15 Synthetic Field Workers with Diverse Attributes ---");
    const sectors = [
        { name: "Golghar Central", lat: 26.7606, lng: 83.3732 },
        { name: "Civil Lines Belt", lat: 26.7720, lng: 83.3805 },
        { name: "Medical College BRD", lat: 26.7480, lng: 83.3650 },
        { name: "Rapti Nagar Commercial", lat: 26.7690, lng: 83.3610 },
        { name: "Railway Station Gateway", lat: 26.7545, lng: 83.3810 },
        { name: "Mohaddipur East", lat: 26.7495, lng: 83.3920 },
        { name: "Gorakhnath Sector", lat: 26.7850, lng: 83.3550 },
        { name: "Alinagar Old City", lat: 26.7530, lng: 83.3690 }
    ];

    const skillSets = [
        ["Mixed Waste", "Organic/Wet"],
        ["Hazardous Waste", "Medical"],
        ["Dry/Recyclable", "Commercial Waste"],
        ["Street Sweeping", "Bulk Scrap"],
        ["Hazardous Waste", "Emergency Spills", "Biohazard"]
    ];

    inMemoryStaff.length = 0;
    const syntheticWorkers = [];

    for (let i = 1; i <= 15; i++) {
        const sector = sectors[(i - 1) % sectors.length];
        const skills = skillSets[(i - 1) % skillSets.length];
        const isOffDuty = (i === 14); // Worker 14 is off-duty
        const workerObj = {
            id: 1000 + i,
            worker_id: 1000 + i,
            staff_id: `SYN-WRK-${String(i).padStart(3, '0')}`,
            name: `Synthetic Worker ${i}`,
            role: "working_staff",
            department: "waste",
            status: isOffDuty ? "Off Duty" : "Active",
            is_active: true,
            is_synthetic_staging: true,
            assigned_area: sector.name,
            latitude: sector.lat,
            longitude: sector.lng,
            skills,
            phone: `99990${String(i).padStart(5, '0')}`
        };
        inMemoryStaff.push(workerObj);
        syntheticWorkers.push(workerObj);
    }

    assert(syntheticWorkers.length === 15, "15 clearly marked synthetic worker accounts provisioned");
    assert(syntheticWorkers.some(w => w.skills.includes("Medical")), "Specialized biohazard/medical skill workers present");
    assert(syntheticWorkers.some(w => w.status === "Off Duty"), "Off-duty worker availability boundary present");

    // Pre-populate controlled workloads for workers 3 and 4 (overloaded)
    inMemoryTasks.length = 0;
    for (let t = 1; t <= 4; t++) {
        inMemoryTasks.push({ id: 2000 + t, assigned_worker_id: 1003, status: "In Progress", is_synthetic_staging: true });
    }
    for (let t = 1; t <= 5; t++) {
        inMemoryTasks.push({ id: 2010 + t, assigned_worker_id: 1004, status: "In Progress", is_synthetic_staging: true });
    }

    assert(inMemoryTasks.filter(t => t.assigned_worker_id === 1003).length === 4, "Worker SYN-WRK-003 initialized with 4 active tasks (overloaded)");
    assert(inMemoryTasks.filter(t => t.assigned_worker_id === 1004).length === 5, "Worker SYN-WRK-004 initialized with 5 active tasks (heavily overloaded)");
    console.log();

    // 2. Simulate 25 Complaints & Run AI Assignment
    console.log("--- 2. Executing Reproducible Staging AI Assignment Simulation (25 Complaints) ---");
    const complaintTemplates = [
        { cat: "Hazardous Bio-Waste", prio: "CRITICAL", sectorIdx: 2 }, // BRD Medical
        { cat: "Garbage Overflow", prio: "HIGH", sectorIdx: 0 },         // Golghar
        { cat: "Illegal Dry Dumping", prio: "MEDIUM", sectorIdx: 1 },    // Civil Lines
        { cat: "Railway Gate Spillage", prio: "HIGH", sectorIdx: 4 },    // Railway
        { cat: "Commercial Carton Waste", prio: "MEDIUM", sectorIdx: 3 },// Rapti Nagar
        { cat: "Chemical Spill", prio: "CRITICAL", sectorIdx: 2 },       // BRD Medical
        { cat: "Street Litter Surge", prio: "LOW", sectorIdx: 7 }        // Alinagar
    ];

    let assignedCount = 0;
    let unassignedCount = 0;
    const assignmentLatencies = [];
    const workerTaskCounts = {};
    syntheticWorkers.forEach(w => { workerTaskCounts[w.worker_id] = 0; });

    for (let c = 1; c <= 25; c++) {
        const tmpl = complaintTemplates[(c - 1) % complaintTemplates.length];
        const sec = sectors[tmpl.sectorIdx];
        const complaintId = 3000 + c;

        // Register synthetic complaint
        const complaint = {
            id: complaintId,
            request_code: `STG-CMP-2026-${String(c).padStart(3, '0')}`,
            category: tmpl.cat,
            priority: tmpl.prio,
            address: `${sec.name} Staging Point`,
            latitude: sec.lat + (prng.nextFloat() - 0.5) * 0.005,
            longitude: sec.lng + (prng.nextFloat() - 0.5) * 0.005,
            status: "Submitted",
            assigned_worker_id: null,
            is_synthetic_staging: true,
            version: 1
        };
        inMemoryTasks.push(complaint);

        const startT = Date.now();
        const aiRes = await dispatch('POST', '/api/waste/control-center/ai-recommend-worker', {
            complaintId: complaint.id,
            category: complaint.category,
            priority: complaint.priority,
            latitude: complaint.latitude,
            longitude: complaint.longitude
        });
        const duration = Date.now() - startT;
        assignmentLatencies.push(duration);

        if (aiRes.status === 200 && aiRes.body.recommended_worker) {
            const recWorker = aiRes.body.recommended_worker;
            // Execute actual assignment
            const assignRes = await dispatch('POST', '/api/waste/control-center/assign-complaint', {
                complaintId: complaint.id,
                workerId: recWorker.worker_id,
                assignmentType: 'AI_RECOMMENDED',
                reason: `Staging AI optimal match: Score ${recWorker.score_breakdown.composite_score}/100`
            });

            if (assignRes.status === 200) {
                assignedCount++;
                workerTaskCounts[recWorker.worker_id] = (workerTaskCounts[recWorker.worker_id] || 0) + 1;
            } else {
                unassignedCount++;
            }
        } else {
            unassignedCount++;
        }
    }

    const successRate = (assignedCount / 25) * 100;
    const avgLatency = Number((assignmentLatencies.reduce((a, b) => a + b, 0) / assignmentLatencies.length).toFixed(2));

    console.log(`  📊 Staging Metrics:`);
    console.log(`     Total Complaints Simulated: 25`);
    console.log(`     Successful AI Assignments: ${assignedCount} (${successRate}%)`);
    console.log(`     Unassigned Complaints: ${unassignedCount}`);
    console.log(`     Average Assignment Latency: ${avgLatency} ms`);
    console.log();

    assert(successRate >= 95, `Assignment success rate is >= 95% (Actual: ${successRate}%)`);
    assert(avgLatency < 50, `Average assignment latency is under 50ms (Actual: ${avgLatency}ms)`);
    assert(workerTaskCounts[1014] === 0, "Off-duty worker SYN-WRK-014 received 0 assignments (Availability guard confirmed)");
    assert(workerTaskCounts[1003] <= 2, "Overloaded worker SYN-WRK-003 received balanced tasks (Workload penalty confirmed)");
    assert(workerTaskCounts[1004] <= 1, "Heavily overloaded worker SYN-WRK-004 received balanced tasks (Workload penalty confirmed)");

    // 3. Specialized Biohazard Skill Verification
    console.log("--- 3. Verifying Biohazard Complaints Assigned Exclusively to Skilled Workers ---");
    const biohazardTasks = inMemoryTasks.filter(t => t.category === "Hazardous Bio-Waste" && t.assigned_worker_id);
    const allBiohazardSkilled = biohazardTasks.every(t => {
        const w = syntheticWorkers.find(sw => sw.worker_id === t.assigned_worker_id);
        return w && (w.skills.includes("Medical") || w.skills.includes("Hazardous Waste"));
    });
    assert(allBiohazardSkilled, "100% of Critical Biohazard complaints routed exclusively to specialized certified personnel");
    console.log();

    // 4. Cleanup synthetic staging records
    console.log("--- 4. Safe Isolated Cleanup of Synthetic Staging Records ---");
    // Purge only records tagged with is_synthetic_staging: true
    inMemoryStaff.length = 0;
    originalStaff.forEach(s => inMemoryStaff.push(s));

    inMemoryTasks.length = 0;
    originalTasks.forEach(t => inMemoryTasks.push(t));

    assert(inMemoryStaff.every(s => !s.is_synthetic_staging), "All synthetic workers cleaned up cleanly without touching baseline");
    assert(inMemoryTasks.every(t => !t.is_synthetic_staging), "All synthetic complaints cleaned up cleanly without touching baseline");
    console.log();

    console.log("===============================================================================");
    console.log(`🤖 PHASE 2 AI SIMULATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("===============================================================================");

    if (failed > 0) process.exit(1);
    else process.exit(0);
}

runWorkerAssignmentSimulation().catch(err => {
    console.error("Fatal Phase 2 error:", err);
    process.exit(1);
});

