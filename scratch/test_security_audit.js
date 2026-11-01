// scratch/test_security_audit.js - Dedicated Security & Production Hardening Test Suite

const path = require('path');
const express = require(path.join(__dirname, '../backend/node_modules/express'));

const authRouter = require(path.join(__dirname, '../backend/routes/auth.routes'));
const wasteRouter = require(path.join(__dirname, '../backend/routes/waste.routes'));

const app = express();
app.use(express.json());
app.use(authRouter);
app.use(wasteRouter);

let passed = 0;
let failed = 0;

function assert(cond, msg) {
    if (cond) {
        passed++;
        console.log(`  🔒 PASS: ${msg}`);
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
            get: function(h) { return this.headers[h.toLowerCase()]; }
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

async function runSecurityAudit() {
    console.log("===============================================================================");
    console.log("🛡️ RUNNING SMARTCITY AI - SECURITY HARDENING & PRODUCTION INTEGRITY AUDIT");
    console.log("===============================================================================\n");

    // -------------------------------------------------------------------------
    // 1. PRODUCTION MODE CREDENTIAL BYPASS TEST
    // -------------------------------------------------------------------------
    console.log("--- 1. Production Mode Credential Bypass Verification ---");
    const originalEnv = process.env.NODE_ENV;
    const originalDemo = process.env.ALLOW_OFFLINE_DEMO_AUTH;

    process.env.NODE_ENV = "production";
    delete process.env.ALLOW_OFFLINE_DEMO_AUTH;

    // In production, demo credentials MUST be rejected
    const prodCcRes = await dispatch('POST', '/api/staff-login', { staffId: 'WST-CC-01', password: 'control123' });
    assert(prodCcRes.status !== 200, "In production mode, demo password 'control123' is REJECTED (HTTP 401/500)");

    const prodWrkRes = await dispatch('POST', '/api/staff-login', { staffId: 'WRK-001', password: 'worker123' });
    assert(prodWrkRes.status !== 200, "In production mode, demo password 'worker123' is REJECTED (HTTP 401/500)");

    const prodBinRes = await dispatch('POST', '/api/staff-login', { staffId: 'BIN-GOL-01', password: 'BIN@2026' });
    assert(prodBinRes.status !== 200, "In production mode, demo password 'BIN@2026' is REJECTED (HTTP 401/500)");

    const prodTerminalRes = await dispatch('POST', '/api/waste/dustbin-terminal/auth', {
        binCode: "BIN-GOL-01",
        passcode: "123456"
    });
    assert(prodTerminalRes.status === 401, "In production mode, terminal auth bypass key '123456' is REJECTED (HTTP 401)");

    // Restore test environment
    process.env.NODE_ENV = originalEnv;
    if (originalDemo) process.env.ALLOW_OFFLINE_DEMO_AUTH = originalDemo;
    else process.env.ALLOW_OFFLINE_DEMO_AUTH = "true";

    console.log();

    // -------------------------------------------------------------------------
    // 2. IDOR, OWNERSHIP & SELF-APPROVAL PREVENTION
    // -------------------------------------------------------------------------
    console.log("--- 2. IDOR & Access Control Integrity ---");

    // Get authentic tokens for testing
    const ccAuth = await dispatch('POST', '/api/staff-login', { staffId: 'WST-CC-01', password: 'control123' });
    const wrkAuth = await dispatch('POST', '/api/staff-login', { staffId: 'WRK-001', password: 'worker123' });
    const binAuth = await dispatch('POST', '/api/staff-login', { staffId: 'BIN-GOL-01', password: 'BIN@2026' });

    // Worker trying to update task 502 (assigned to Worker 2 Suresh Kumar)
    const idorTaskRes = await dispatch('PUT', '/api/waste/worker/tasks/502/status', { status: 'ACCEPTED' }, wrkAuth.body.token);
    assert(idorTaskRes.status === 403, "Worker 1 is FORBIDDEN from updating Worker 2's task status (HTTP 403 IDOR blocked)");

    // Worker trying to submit proof for task 502
    const idorProofRes = await dispatch('POST', '/api/waste/worker/tasks/502/submit-proof', {
        afterImage: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
        collectedWeightKg: 50
    }, wrkAuth.body.token);
    assert(idorProofRes.status === 403, "Worker 1 is FORBIDDEN from submitting proof for Worker 2's task (HTTP 403 IDOR blocked)");

    // Self-approval prevention: Assigned worker attempts to approve their own task
    const selfApproveRes = await dispatch('POST', '/api/waste/control-center/verify-proof', {
        complaintId: 501,
        decision: 'APPROVED',
        remarks: 'Self approval attempt'
    }, wrkAuth.body.token); // Worker token used on verification endpoint
    assert(selfApproveRes.status === 403, "Field Worker cannot verify or approve their own task (HTTP 403 Self-approval blocked)");

    // Bin Staff attempting cross-bin access
    const binCrossRes = await dispatch('GET', '/api/waste/control-center/map-data', null, binAuth.body.token);
    assert(binCrossRes.status === 403, "Bin Staff cannot access Control Center GIS data (HTTP 403 Cross-Role blocked)");

    console.log();

    // -------------------------------------------------------------------------
    // 3. FILE UPLOAD & PAYLOAD VALIDATION SECURITY
    // -------------------------------------------------------------------------
    console.log("--- 3. File Upload & Input Sanitization Security ---");

    // 3.1 Oversized image bomb (> 5MB)
    const largePayload = "data:image/jpeg;base64," + "A".repeat(6 * 1024 * 1024);
    const bombRes = await dispatch('POST', '/api/waste/worker/tasks/501/submit-proof', {
        afterImage: largePayload,
        collectedWeightKg: 50
    }, wrkAuth.body.token);
    assert(bombRes.status === 400 && bombRes.body.message.includes("5MB"), "Oversized proof image (>5MB) REJECTED with HTTP 400");

    // 3.2 Non-image malicious MIME format (e.g. data:text/html or executable)
    const scriptPayload = "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==";
    const xssRes = await dispatch('POST', '/api/waste/worker/tasks/501/submit-proof', {
        afterImage: scriptPayload,
        collectedWeightKg: 50
    }, wrkAuth.body.token);
    assert(xssRes.status === 400 && xssRes.body.message.includes("Invalid image format"), "Non-image MIME payload REJECTED with HTTP 400");

    // 3.3 Out of range GPS coordinates (latitude 999)
    const gpsRes = await dispatch('POST', '/api/waste/worker/tasks/501/submit-proof', {
        afterImage: "data:image/jpeg;base64,/9j/VALID==",
        latitude: 999.0,
        longitude: 83.37,
        collectedWeightKg: 50
    }, wrkAuth.body.token);
    assert(gpsRes.status === 400 && gpsRes.body.message.includes("GPS coordinates"), "Out-of-range GPS coordinates (999.0) REJECTED with HTTP 400");

    // 3.4 Negative or insane waste weight (-500 kg or 999999 kg)
    const weightRes = await dispatch('POST', '/api/waste/worker/tasks/501/submit-proof', {
        afterImage: "data:image/jpeg;base64,/9j/VALID==",
        latitude: 26.76,
        longitude: 83.37,
        collectedWeightKg: -25
    }, wrkAuth.body.token);
    assert(weightRes.status === 400 && weightRes.body.message.includes("weight"), "Negative waste weight (-25 kg) REJECTED with HTTP 400");

    console.log();

    // -------------------------------------------------------------------------
    // 4. CONCURRENCY & IDEMPOTENCY INTEGRITY
    // -------------------------------------------------------------------------
    console.log("--- 4. Concurrency & Idempotency Integrity ---");

    // Idempotent bin collection requests
    const binReq1 = await dispatch('POST', '/api/waste/bin-staff/trigger-collection', { fillPercentage: 85 }, binAuth.body.token);
    const binReq2 = await dispatch('POST', '/api/waste/bin-staff/trigger-collection', { fillPercentage: 85 }, binAuth.body.token);
    assert(binReq2.status === 409, "Concurrent/duplicate collection trigger for active bin cycle blocked with HTTP 409");

    console.log();
    console.log("===============================================================================");
    console.log(`🛡️ SECURITY AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("===============================================================================");

    if (failed > 0) process.exit(1);
    else process.exit(0);
}

runSecurityAudit().catch(err => {
    console.error("Security Audit Error:", err);
    process.exit(1);
});

