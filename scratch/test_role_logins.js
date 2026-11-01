const assert = require('assert');
const path = require('path');
const express = require(path.join(__dirname, '..', 'backend', 'node_modules', 'express'));
const authRouter = require(path.join(__dirname, '..', 'backend', 'routes', 'auth.routes'));

console.log('=== TESTING ROLE LOGINS IN MEMORY ===');

function testLogin(staffId, password, expectedRole, expectedDashboardPrefix) {
  const req = {
    method: 'POST',
    url: '/api/staff-login',
    headers: { 'content-type': 'application/json' },
    body: { staffId, password }
  };
  let resStatus = 200;
  let resData = null;
  const res = {
    status(c) { resStatus = c; return this; },
    json(d) { resData = d; return this; }
  };

  authRouter.handle(req, res, () => {});

  setTimeout(() => {
    assert.strictEqual(resStatus, 200, `Expected 200 for ${staffId}, got ${resStatus}`);
    assert.ok(resData.token, `Token missing for ${staffId}`);
    assert.strictEqual(resData.role, expectedRole, `Role mismatch for ${staffId}: expected ${expectedRole}, got ${resData.role}`);
    assert.ok(resData.targetDashboard.startsWith(expectedDashboardPrefix), `Dashboard prefix mismatch for ${staffId}: ${resData.targetDashboard}`);
    console.log(`✅ [${staffId}] Role: ${resData.role} -> Target: ${resData.targetDashboard}`);
  }, 200);
}

// 1. Control Center
testLogin('WST-CC-01', 'admin123', 'control_center', 'pages/waste/control_center.html');

// 2. Working Staff
setTimeout(() => {
  testLogin('WRK-001', 'worker123', 'working_staff', 'pages/waste/worker_dashboard.html');
}, 300);

// 3. Bin Staff
setTimeout(() => {
  testLogin('BIN-GOL-01', 'BIN@2026', 'bin_staff', 'pages/waste/bin_dashboard.html');
}, 600);

// 4. Waste Admin
setTimeout(() => {
  testLogin('WST-ADMIN', 'admin123', 'admin', 'pages/waste/waste.html?tab=admin');
}, 900);

