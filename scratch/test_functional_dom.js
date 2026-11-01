// scratch/test_functional_dom.js - Functional Browser DOM & UI Element Verification

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
    if (cond) {
        passed++;
        console.log(`  🖥️ PASS: ${msg}`);
    } else {
        failed++;
        console.error(`  ❌ FAIL: ${msg}`);
    }
}

function verifyFileElements(filePath, requiredIds, requiredHandlers = []) {
    const content = fs.readFileSync(filePath, 'utf8');
    const baseName = path.basename(filePath);

    requiredIds.forEach(id => {
        const hasId = content.includes(`id="${id}"`) || content.includes(`id='${id}'`);
        assert(hasId, `[${baseName}] Required DOM ID present: #${id}`);
    });

    requiredHandlers.forEach(handler => {
        const hasHandler = content.includes(handler);
        assert(hasHandler, `[${baseName}] Required interaction handler wired: ${handler}`);
    });
}

function runFunctionalAudit() {
    console.log("===============================================================================");
    console.log("🖥️ FUNCTIONAL BROWSER DOM & INTERACTION AUDIT");
    console.log("===============================================================================\n");

    // 1. Control Center Dashboard (Role 1)
    console.log("--- 1. Control Center Dashboard (pages/waste/control_center.html) ---");
    verifyFileElements('frontend/pages/waste/control_center.html', [
        'ccGisMap',
        'ccOperatorName',
        'ccOperatorId',
        'kpiBinsCount',
        'kpiWorkersCount',
        'kpiComplaintsCount',
        'kpiWasteTons',
        'kpiEfficiency',
        'ccWardAnalyticsTbody',
        'ccComplaintsTbody',
        'ccProofCardsContainer',
        'ccAssignmentModal',
        'assignmentModalContent'
    ], [
        'logoutControlCenter()',
        'closeAssignmentModal()'
    ]);
    // Also verify control_center.js handlers
    const ccJsContent = fs.readFileSync('frontend/pages/waste/control_center.js', 'utf8');
    ['openAIRecommendModal', 'confirmWorkerAssignment', 'verifyProof'].forEach(fn => {
        assert(ccJsContent.includes(fn), `[control_center.js] Interaction function defined: ${fn}`);
    });
    console.log();

    // 2. Working Staff Dashboard (Role 2)
    console.log("--- 2. Working Staff Dashboard (pages/waste/worker_dashboard.html) ---");
    verifyFileElements('frontend/pages/waste/worker_dashboard.html', [
        'workerFieldMap',
        'workerNameEl',
        'workerIdEl',
        'kpiWorkerAssigned',
        'kpiWorkerInProgress',
        'kpiWorkerUnderReview',
        'kpiWorkerCompleted',
        'kpiWorkerWasteWeight',
        'routeBanner',
        'workerTaskList',
        'proofModal',
        'proofAfterImg',
        'proofCoordinates',
        'proofWeight',
        'proofRemarks'
    ], [
        'logoutWorker()',
        'locateWorkerGPS()',
        'loadWorkerTasks',
        'filterTasks',
        'clearNavigation()',
        'handleProofSubmit'
    ]);
    console.log();

    // 3. Bin Staff Dashboard (Role 3)
    console.log("--- 3. Bin Staff Dashboard (pages/waste/bin_dashboard.html) ---");
    verifyFileElements('frontend/pages/waste/bin_dashboard.html', [
        'headerBinCode',
        'headerBinLocation',
        'guardBinCode',
        'fillLiquid',
        'metricFillPct',
        'thresholdStatusPill',
        'metricWeightKg',
        'metricDistanceCm',
        'metricBatteryPct',
        'metricTempC',
        'metricLidStatus',
        'metricLastPing',
        'binMiniMap',
        'aiEstimatedTime',
        'aiFillRate',
        'aiOverflowTime',
        'activeRequestBanner',
        'btnTriggerCollection'
    ], [
        'logoutBinStaff()',
        'triggerCollectionRequest()'
    ]);
    console.log();

    // 4. Admin Workforce Management UI (Role 4 in waste.html)
    console.log("--- 4. Admin Workforce Governance (pages/waste/waste.html) ---");
    verifyFileElements('frontend/pages/waste/waste.html', [
        'tab-workforce',
        'workforceStaffTable',
        'workforceStaffTableBody',
        'addStaffModal',
        'editAssignmentModal',
        'resetPasswordModal',
        'auditLogModal',
        'dtBtnOpenDedicated'
    ], [
        "switchWasteTab('tab-workforce')",
        'openAddStaffModal()',
        'openAuditLogModal()',
        'loadAdminStaffTable'
    ]);
    console.log();

    // 5. Android Assets Directory Parity
    console.log("--- 5. Android Assets Synchronization Parity ---");
    const requiredAndroidFiles = [
        'control_center.html', 'control_center.css', 'control_center.js',
        'worker_dashboard.html', 'worker_dashboard.css', 'worker_dashboard.js',
        'bin_dashboard.html', 'bin_dashboard.css', 'bin_dashboard.js',
        'waste.html', 'waste.css', 'waste.js'
    ];

    requiredAndroidFiles.forEach(f => {
        const fullP = path.join('android/app/src/main/assets/public/pages/waste', f);
        const exists = fs.existsSync(fullP);
        assert(exists, `Android asset present: ${f}`);
    });
    console.log();

    console.log("===============================================================================");
    console.log(`🖥️ FUNCTIONAL UI AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("===============================================================================");

    if (failed > 0) process.exit(1);
    else process.exit(0);
}

runFunctionalAudit();
