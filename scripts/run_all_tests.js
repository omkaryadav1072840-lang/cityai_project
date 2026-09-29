/**
 * SmartCity AI - Master Automated Test Runner
 * Runs all unit, integration, and security test suites in a loop and aggregates results.
 */

const { spawn } = require('child_process');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');

const TEST_SUITES = [
    { name: "Master Backend Routes Suite", file: "scratch/test_master_backend_routes.js" },
    { name: "Bug Fixes & Security Verification", file: "scratch/verify_bug_fixes.js" },
    { name: "Traffic Enhancements & Webster Optimization", file: "backend/test_all_traffic_enhancements.js" },
    { name: "Ambulance Corridors & Real Parking Integration", file: "backend/test_ambulance_and_parking_integration.js" },
    { name: "Signal Location Modification & Heatmap Assets", file: "backend/test_signal_location_and_heatmap.js" },
    { name: "Staff Auth Enforcement & Camera Congestion", file: "backend/test_staff_auth_and_camera_congestion.js" },
    { name: "Traffic API Full System Integration", file: "backend/test_traffic_api.js" },
    { name: "AI Intelligence Layer Integration", file: "scratch/test_ai_intelligence_integration.js" },
    { name: "SmartCity Phases 2 to 6 Suite", file: "scratch/test_phases_2_to_6.js" },
    { name: "SmartCity Phases 7 to 11 Suite", file: "scratch/test_phases_7_to_11.js" },
    { name: "SmartCity Phases 12 and 13 Suite", file: "scratch/test_phases_12_13.js" },
    { name: "Hospital Upgrade & Multi-Tenant Diagnostics", file: "scratch/test_hospital_upgrade.js" },
    { name: "Doctor Authentication & UI Verification", file: "scratch/test_doctor_login.js" },
    { name: "Doctor Clinical Portal & Consultation EHR", file: "scratch/test_doctor_portal.js" },
    { name: "Waste Management & Staff RBAC", file: "scratch/test_waste_module.js" },
    { name: "Citizen & Staff Auth & Profiles", file: "scratch/test_auth_system.js" },
    { name: "Production Hardening, SEO & Legal Compliance", file: "scratch/test_hardening_and_compliance.js" }
];

async function runSingleTest(suite) {
    return new Promise((resolve) => {
        const fullPath = path.join(ROOT_DIR, suite.file);
        const startTime = Date.now();
        console.log(`\n▶️ Running: ${suite.name} (${suite.file})...`);

        const proc = spawn('node', [fullPath], {
            cwd: ROOT_DIR,
            env: { ...process.env, FORCE_COLOR: '1' }
        });

        let output = '';
        proc.stdout.on('data', d => {
            process.stdout.write(d);
            output += d.toString();
        });
        proc.stderr.on('data', d => {
            process.stderr.write(d);
            output += d.toString();
        });

        proc.on('close', (code) => {
            const durationMs = Date.now() - startTime;
            const passed = code === 0;
            if (passed) {
                console.log(`✅ [SUITE PASSED] ${suite.name} in ${(durationMs / 1000).toFixed(2)}s`);
            } else {
                console.error(`❌ [SUITE FAILED] ${suite.name} exited with code ${code}`);
            }
            resolve({ suite: suite.name, file: suite.file, passed, code, durationMs });
        });
    });
}

async function runAll() {
    console.log('========================================================');
    console.log('  🧪 SMARTCITY AI MASTER VERIFICATION TEST RUNNER');
    console.log(`  Executing ${TEST_SUITES.length} comprehensive test suites in loop`);
    console.log('========================================================');

    const results = [];
    for (const suite of TEST_SUITES) {
        const res = await runSingleTest(suite);
        results.push(res);
    }

    console.log('\n========================================================');
    console.log('  📊 FINAL SCORECARD');
    console.log('========================================================');

    let totalPassed = 0;
    let totalFailed = 0;

    for (const r of results) {
        const icon = r.passed ? '✅ PASS' : '❌ FAIL';
        const time = `${(r.durationMs / 1000).toFixed(1)}s`;
        console.log(`  ${icon} | ${r.suite.padEnd(48)} | ${time}`);
        if (r.passed) totalPassed++;
        else totalFailed++;
    }

    console.log('========================================================');
    console.log(`  TOTAL: ${results.length} SUITES | ${totalPassed} PASSED | ${totalFailed} FAILED`);
    console.log('========================================================\n');

    process.exit(totalFailed === 0 ? 0 : 1);
}

runAll();
