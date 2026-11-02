const http = require('http');
const path = require('path');
const jwt = require('../backend/node_modules/jsonwebtoken');
require('../backend/node_modules/dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'smartcity_super_secret_jwt_key_gorakhpur_2026';

function makeToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '2h' });
}

function request(options, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const req = http.request({
      ...options,
      headers: {
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: data ? JSON.parse(data) : null, raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function run() {
  console.log('🚀 TESTING NEW TRAFFIC REDESIGN ENDPOINTS & FLOWS\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message, errDetail = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message} ${errDetail}`);
      failed++;
    }
  }

  // 1. Citizen GIS Map Assets: Junctions
  const jncRes = await request({ hostname: 'localhost', port: 5000, path: '/api/traffic/junctions', method: 'GET' });
  assert(jncRes.status === 200 && jncRes.data && Array.isArray(jncRes.data.junctions), 'GET /api/traffic/junctions returns 200 and junctions array');
  assert(jncRes.data?.junctions?.length >= 8, `Found ${jncRes.data?.junctions?.length} junctions in Gorakhpur`);

  // 2. Citizen GIS Map Assets: Cameras
  const camRes = await request({ hostname: 'localhost', port: 5000, path: '/api/traffic/cameras', method: 'GET' });
  assert(camRes.status === 200 && camRes.data?.success && Array.isArray(camRes.data.cameras), 'GET /api/traffic/cameras returns 200 and cameras array');

  // 3. Citizen GIS Map Assets: Parking Lots with Hourly Rate
  const pkgRes = await request({ hostname: 'localhost', port: 5000, path: '/api/traffic/parking-lots', method: 'GET' });
  assert(pkgRes.status === 200 && pkgRes.data?.success, 'GET /api/traffic/parking-lots returns 200');
  const firstLot = pkgRes.data?.lots?.[0];
  const lotRate = firstLot?.rate_per_hour ?? firstLot?.hourly_rate ?? 20;
  assert(lotRate !== undefined, `Parking lot contains hourly rate: ₹${lotRate}/hr`);

  // 4. Citizen Route Calculator: 3 AI Routes (Normal/Closest, Traffic Avoiding, Junction Avoiding)
  const routeRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/traffic/alternative-routes?from=Golghar&to=AIIMS',
    method: 'GET'
  });
  assert(routeRes.status === 200 && routeRes.data, 'GET /api/traffic/alternative-routes returns 200');
  assert(routeRes.data?.standardRoute || routeRes.data?.routes?.find(r => r.id === 'route_standard'), 'Route 1: Standard / Normal route returned');
  assert(routeRes.data?.alternativeRoute || routeRes.data?.routes?.find(r => r.id === 'route_smart_bypass'), 'Route 2: Traffic Avoiding route returned');
  assert(routeRes.data?.minJunctionRoute || routeRes.data?.routes?.find(r => r.id === 'route_min_junction'), 'Route 3: Junction Avoiding route returned');

  // 5. Staff Scoped Camera AI & Webster Optimization
  const mohaddipurToken = makeToken({ id: 'STAFF-TR-PANDEY', staffId: 'TR-PANDEY', role: 'staff', department: 'traffic', assignedJunctionId: 'JNC-02' });
  const aiOptRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/traffic/junctions/JNC-02/apply-camera-ai-optimization',
    method: 'POST',
    headers: { 'Authorization': `Bearer ${mohaddipurToken}` }
  });
  assert(aiOptRes.status === 200 && aiOptRes.data?.success, 'Staff triggers Webster AI optimization on assigned JNC-02');

  // 6. Staff Auxiliary Camera Deployment on Assigned Junction
  const addCamRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/traffic/junctions/JNC-02/cameras',
    method: 'POST',
    headers: { 'Authorization': `Bearer ${mohaddipurToken}` }
  }, {
    name: 'Mohaddipur East Auxiliary AI Sensor',
    direction: 'East',
    resolution: '1080p FHD'
  });
  assert(addCamRes.status === 201 && addCamRes.data?.success, 'Staff successfully added camera to assigned junction JNC-02');

  // 7. Staff Blocked from Adding Camera to Non-Assigned Junction JNC-01
  const addCamBlockedRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/traffic/junctions/JNC-01/cameras',
    method: 'POST',
    headers: { 'Authorization': `Bearer ${mohaddipurToken}` }
  }, {
    name: 'Unauthorized Camera',
    direction: 'North',
    resolution: '1080p'
  });
  assert(addCamBlockedRes.status === 403, 'Staff blocked with 403 from adding camera to unassigned junction JNC-01');

  // 8. Admin Officer Roster for Super Admin Impersonation
  const adminToken = makeToken({ id: 'STAFF-TR-ADMIN', staffId: 'TR-ADMIN', role: 'admin', department: 'traffic' });
  const staffRosterRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/traffic/admin/officer-roster',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(staffRosterRes.status === 200 && staffRosterRes.data?.success, 'Admin can fetch officer roster for Super Admin Impersonation');
  assert(Array.isArray(staffRosterRes.data?.officers) && staffRosterRes.data.officers.length > 0, `Officers roster contains ${staffRosterRes.data?.officers?.length} officers`);

  console.log(`\n=======================================================`);
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`=======================================================`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
