const http = require('http');

async function request(options, payload) {
  return new Promise((resolve) => {
    const data = payload ? JSON.stringify(payload) : null;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };
    if (data) {
      headers['Content-Length'] = Buffer.byteLength(data);
    }

    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: options.path,
      method: options.method,
      headers
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, json: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, raw: body }); }
      });
    });
    req.on('error', err => resolve({ status: 500, error: err.message }));
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  // 1. Login as HOSP-PHARM
  const login = await request({ path: '/api/staff-login', method: 'POST' }, { staffId: 'HOSP-PHARM', password: 'admin' });
  const token = login.json?.token;
  console.log('1. Login status:', login.status, 'Token exists:', !!token);

  const authHeaders = { 'Authorization': 'Bearer ' + token };

  // 2. Add New Medicine
  const addRes = await request({
    path: '/api/pharmacy',
    method: 'POST',
    headers: authHeaders
  }, {
    medicineName: 'Test Augmentin 1000mg Duo',
    category: 'Antibiotic',
    quantity: 150,
    price: 245.50,
    availability: 'In Stock'
  });
  console.log('2. Add Medicine status:', addRes.status, 'Message:', addRes.json?.message, 'ID:', addRes.json?.medicineId);
  const medId = addRes.json?.medicineId;

  // 3. Edit Medicine
  const editRes = await request({
    path: '/api/pharmacy/' + medId,
    method: 'PUT',
    headers: authHeaders
  }, {
    medicineName: 'Test Augmentin 1000mg Duo Extra',
    category: 'Broad-Spectrum Antibiotic',
    quantity: 145,
    price: 250.00,
    availability: 'In Stock'
  });
  console.log('3. Edit Medicine status:', editRes.status, 'Message:', editRes.json?.message);

  // 4. Dispense 5 units
  const dispRes = await request({
    path: '/api/pharmacy/' + medId + '/dispense',
    method: 'POST',
    headers: authHeaders
  }, { units: 5, patientId: 'PAT-2026-TEST' });
  console.log('4. Dispense status:', dispRes.status, 'Remaining:', dispRes.json?.remainingStock, 'Msg:', dispRes.json?.message);

  // 5. Delete Medicine
  const delRes = await request({
    path: '/api/pharmacy/' + medId,
    method: 'DELETE',
    headers: authHeaders
  });
  console.log('5. Delete status:', delRes.status, 'Message:', delRes.json?.message);

  // 6. Verify Fetch All
  const listRes = await request({ path: '/api/pharmacy', method: 'GET' });
  console.log('6. List medicines status:', listRes.status, 'Count:', listRes.json?.medicines?.length);
  process.exit(0);
})();
