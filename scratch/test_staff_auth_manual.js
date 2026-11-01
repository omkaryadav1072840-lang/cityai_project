const path = require('path');
process.env.NODE_PATH = path.join(__dirname, '..', 'backend', 'node_modules');
require('module').Module._initPaths();

const express = require('express');
const authRoutes = require('../backend/routes/auth.routes');
const app = express();
app.use(express.json());
app.use(authRoutes);

async function testLogin(staffId, password) {
  return new Promise((resolve) => {
    const req = {
      method: 'POST',
      url: '/api/staff-login',
      headers: { 'content-type': 'application/json' },
      body: { staffId, password }
    };

    const res = {
      statusCode: 200,
      status: function(code) { this.statusCode = code; return this; },
      json: function(data) { resolve({ status: this.statusCode, data }); },
      send: function(data) { resolve({ status: this.statusCode, data }); },
      setHeader: function() {},
      getHeader: function() {}
    };

    app.handle(req, res);
  });
}

(async () => {
  const staffList = [
    { id: 'WST-CC-01', pass: 'control123' },
    { id: 'WST-CC-02', pass: 'control123' },
    { id: 'WRK-001', pass: 'worker123' },
    { id: 'WRK-002', pass: 'worker123' },
    { id: 'WRK-003', pass: 'worker123' },
    { id: 'BIN-GOL-01', pass: 'BIN@2026' },
    { id: 'STAFF-001', pass: 'admin123' },
    { id: 'STAFF-002', pass: 'admin123' },
    { id: 'DOC-101', pass: 'admin' },
    { id: 'HOSP-ADMIN', pass: 'admin' },
    { id: 'WTR-ADMIN', pass: 'smartcity2026' },
    { id: 'TR-VERMA', pass: 'traffic123' },
    { id: 'POL-SHO-01', pass: 'police123' },
    { id: 'PRK-STAFF-01', pass: 'parking123' },
    { id: 'EMG-01', pass: 'emergency123' },
    { id: 'AMB-01', pass: 'ambulance123' },
    { id: 'ELE-01', pass: 'electric123' },
    { id: 'ENV-01', pass: 'enviro123' }
  ];

  for (const s of staffList) {
    const res = await testLogin(s.id, s.pass);
    console.log(`${s.id} (${s.pass}) -> Status: ${res.status}, Success: ${res.data.success}, Role: ${res.data.role || res.data.accountType || res.data.message}`);
  }
  process.exit(0);
})();

