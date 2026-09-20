const http = require('http');

function check(url) {
  return new Promise((resolve) => {
    http.get('http://localhost:5000' + url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ url, status: res.statusCode, data }));
    }).on('error', err => resolve({ url, status: 'ERROR', error: err.message }));
  });
}

async function testAll() {
  const urls = [
    '/api/ambulances',
    '/api/appointments',
    '/api/doctors',
    '/api/hospitals',
    '/api/hospitals/HOSP-001',
    '/api/hospitals/HOSP-001/beds',
    '/api/hospitals/HOSP-001/doctors',
    '/api/hospitals/HOSP-001/treatments',
    '/api/hospitals/nearby/search?lat=26.76&lng=83.37&limit=5',
    '/api/ambulances/nearby/search?lat=26.76&lng=83.37&limit=5',
    '/api/patients',
    '/api/pharmacy',
    '/api/diagnostics/tests?hospital_id=HOSP-001'
  ];

  console.log('Testing GET endpoints:');
  for (const u of urls) {
    const r = await check(u);
    console.log(`${r.status === 200 ? '✅' : '❌'} [${r.status}] ${u}`);
    if (r.status !== 200) {
      console.log('   Response:', r.data);
    }
  }
  process.exit(0);
}

testAll();
