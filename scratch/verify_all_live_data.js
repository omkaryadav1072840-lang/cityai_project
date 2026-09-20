const http = require('http');

const endpoints = [
  { name: 'City Status KPI', url: '/api/city-status', key: 'hospitals' },
  { name: 'City Map Live Layers', url: '/api/map/incidents', key: 'features' },
  { name: 'Healthcare Hospitals', url: '/api/hospitals', key: 'hospitals' },
  { name: 'Healthcare Doctors', url: '/api/doctors', key: 'doctors' },
  { name: 'Healthcare Pharmacy', url: '/api/pharmacy', key: 'medicines' },
  { name: 'Emergency Departments', url: '/api/emergency/departments', key: 'emergencyDepartments' },
  { name: 'Emergency Incidents', url: '/api/emergency/incidents', key: 'incidents' },
  { name: 'Live Ambulances', url: '/api/ambulances', key: 'ambulances' },
  { name: 'Police Stations', url: '/api/police/stations', key: 'stations' },
  { name: 'Police Monthly Stats', url: '/api/police/stats', key: 'monthly' },
  { name: 'Police Complaints', url: '/api/police/complaints', key: 'complaints' },
  { name: 'Traffic Junctions', url: '/api/traffic/junctions', key: 'junctions' },
  { name: 'Traffic Signals', url: '/api/traffic/signals', key: 'signals' },
  { name: 'Traffic Cameras', url: '/api/traffic/cameras', key: 'cameras' },
  { name: 'Smart Parking Lots', url: '/api/parking', key: 'parkingLots' },
  { name: 'Waste Bins', url: '/api/waste/bins', key: 'bins' },
  { name: 'Water Tanks', url: '/api/water/tanks', key: 'tanks' },
  { name: 'Tourism Famous Places', url: '/api/famous-places', key: 'places' }
];

function testEndpoint(ep) {
  return new Promise((resolve) => {
    http.get(`http://localhost:5000${ep.url}`, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(b);
          const count = Array.isArray(json[ep.key]) ? json[ep.key].length : (json[ep.key] !== undefined ? json[ep.key] : 'OK');
          resolve({ name: ep.name, status: res.statusCode, count, success: true });
        } catch (e) {
          resolve({ name: ep.name, status: res.statusCode, count: 'Parse error', success: false });
        }
      });
    }).on('error', err => resolve({ name: ep.name, status: 'ERROR', count: err.message, success: false }));
  });
}

async function run() {
  console.log('================================================================');
  console.log('🚀 TESTING ALL FRONTEND MODULE BACKEND DATA SOURCES (LIVE TEST)');
  console.log('================================================================\n');

  let passed = 0;
  for (const ep of endpoints) {
    const res = await testEndpoint(ep);
    if (res.status === 200) {
      passed++;
      console.log(`✅ [200 OK] ${res.name.padEnd(25)} -> ${ep.url} (Data Count: ${res.count})`);
    } else {
      console.log(`❌ [${res.status}] ${res.name.padEnd(25)} -> ${ep.url}`);
    }
  }

  console.log(`\nResults: ${passed} of ${endpoints.length} backend data sources verified and active!`);
  process.exit(0);
}

run();
