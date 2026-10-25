const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const suites = [
    { name: 'test_phase2_otp_and_auth.js', file: 'backend/test_phase2_otp_and_auth.js' },
    { name: 'test_phase3_and_waste_security.js', file: 'backend/test_phase3_and_waste_security.js' },
    { name: 'test_all_traffic_enhancements.js', file: 'backend/test_all_traffic_enhancements.js' },
    { name: 'test_enhanced_traffic.js', file: 'backend/test_enhanced_traffic.js' },
    { name: 'test_ambulance_and_parking_integration.js', file: 'backend/test_ambulance_and_parking_integration.js' },
    { name: 'test_staff_auth_and_camera_congestion.js', file: 'backend/test_staff_auth_and_camera_congestion.js' },
    { name: 'test_traffic_jurisdiction_and_ai.js', file: 'backend/test_traffic_jurisdiction_and_ai.js' }
];

const results = [];

console.log('===============================================================');
console.log('AUDIT STEP 1: INDEPENDENT VERIFICATION OF ALL 7 TEST SUITES');
console.log('===============================================================');

for (const suite of suites) {
    const fullPath = path.join(__dirname, '..', suite.file);
    const exists = fs.existsSync(fullPath);
    console.log(`\nChecking suite: ${suite.name} (File exists: ${exists})`);
    
    if (!exists) {
        results.push({ name: suite.name, exists: false, exitCode: -1, status: 'FILE_NOT_FOUND' });
        continue;
    }

    const startTime = Date.now();
    let exitCode = 0;
    let stdout = '';
    let stderr = '';
    try {
        stdout = execSync(`node ${suite.name}`, {
            cwd: path.join(__dirname, '..', 'backend'),
            timeout: 60000,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe']
        });
    } catch (err) {
        exitCode = err.status || 1;
        stdout = err.stdout ? err.stdout.toString() : '';
        stderr = err.stderr ? err.stderr.toString() : err.message;
    }
    const durationMs = Date.now() - startTime;

    console.log(`- Exit Code: ${exitCode}`);
    console.log(`- Duration: ${durationMs}ms`);

    results.push({
        name: suite.name,
        file: suite.file,
        exists: true,
        exitCode,
        durationMs,
        stdoutPreview: stdout.slice(-400).trim(),
        stderrPreview: stderr ? stderr.slice(-300).trim() : ''
    });
}

fs.writeFileSync(
    path.join(__dirname, 'audit_step1_test_execution_log.json'),
    JSON.stringify(results, null, 2)
);

console.log('\n===============================================================');
console.log('SUMMARY OF AUDIT STEP 1 TEST VERIFICATION:');
results.forEach(r => {
    console.log(`  ${r.exitCode === 0 ? '✅ PASS' : '❌ FAIL'} | ${r.name.padEnd(42)} | Exit: ${r.exitCode} | Duration: ${r.durationMs}ms`);
});
console.log('===============================================================');
