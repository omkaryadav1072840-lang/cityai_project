const http = require('http');

function testEndpoint(path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: { 'Content-Type': 'application/json', ...headers }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ path, status: res.statusCode, body: JSON.parse(body) });
        } catch {
          resolve({ path, status: res.statusCode, body });
        }
      });
    });
    req.on('error', (err) => resolve({ path, status: 'ERROR', error: err.message }));
    if (data) req.write(typeof data === 'string' ? data : JSON.stringify(data));
    req.end();
  });
}

async function runAudit() {
  console.log('=== AUDITING ALL HOSPITAL PAGE ENDPOINTS ===\n');

  const endpoints = [
    '/api/hospitals',
    '/api/hospital/beds',
    '/api/doctors',
    '/api/pharmacy',
    '/api/ambulances',
    '/api/emergency/departments',
    '/api/diagnostics/categories',
    '/api/diagnostics/tests',
    '/api/diagnostics/tests?hospital_id=HOSP-001',
    '/api/diagnostics/queue?hospital_id=HOSP-001',
    '/api/patients',
    '/api/hospitals/HOSP-001/wards',
    '/api/hospitals/HOSP-001/ward-beds'
  ];

  for (const ep of endpoints) {
    const res = await testEndpoint(ep);
    const ok = res.status >= 200 && res.status < 400;
    console.log(`${ok ? '✅' : '❌'} [${res.status}] ${ep}`);
    if (!ok) {
      console.log('   Error response:', res.body);
    }
  }

  // Test doctor slots
  const docsRes = await testEndpoint('/api/doctors');
  if (docsRes.body && docsRes.body.doctors && docsRes.body.doctors.length > 0) {
    const firstDoc = docsRes.body.doctors[0];
    const docId = firstDoc.doctor_id || firstDoc.id;
    const slotsRes = await testEndpoint(`/api/doctors/${docId}/slots`);
    console.log(`${slotsRes.status === 200 ? '✅' : '❌'} [${slotsRes.status}] /api/doctors/${docId}/slots`);
    if (slotsRes.status !== 200) console.log('   Error:', slotsRes.body);
  }

  process.exit(0);
}

runAudit();
