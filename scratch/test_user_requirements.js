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
  console.log('🧪 TESTING STRICT ACCESS CONTROL, 4-CAM FEEDS, JUNCTION DELETION, AND STAFF REGISTRATION\n');
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

  // 1. Visitor / Citizen Blocked from Staff Controls & Admin
  const citToken = makeToken({ id: 'CITIZEN-001', role: 'citizen' });
  const citOverrideRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/traffic/junctions/JNC-01/override',
    method: 'POST',
    headers: { 'Authorization': `Bearer ${citToken}` }
  }, { mode: 'Manual', phase: 'NS_Green' });
  assert(citOverrideRes.status === 403, 'Visitor / Citizen strictly blocked (403) from staff signal override');

  const citAdminAssignRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/traffic/admin/assign-officer',
    method: 'POST',
    headers: { 'Authorization': `Bearer ${citToken}` }
  }, { junction_id: 'JNC-01', staff_id: 'TR-VERMA' });
  assert(citAdminAssignRes.status === 403, 'Visitor / Citizen strictly blocked (403) from admin assign officer');

  // 2. Staff Blocked from Admin Features (Junction Relocation, Deletion, Officer Assignment)
  const staffToken = makeToken({ id: 'STAFF-TR-PANDEY', staffId: 'TR-PANDEY', role: 'staff', department: 'traffic', assignedJunctionId: 'JNC-02' });
  const staffRelocateRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/traffic/junctions/JNC-02/location',
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${staffToken}` }
  }, { latitude: 26.7588, longitude: 83.3731 });
  assert(staffRelocateRes.status === 403, 'Staff officer strictly blocked (403) from admin junction relocation');

  const staffAssignOfficerRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/traffic/admin/assign-officer',
    method: 'POST',
    headers: { 'Authorization': `Bearer ${staffToken}` }
  }, { junction_id: 'JNC-02', staff_id: 'TR-PANDEY' });
  assert(staffAssignOfficerRes.status === 403, 'Staff officer strictly blocked (403) from admin assign officer');

  // 3. Staff Can Add Camera to Assigned Junction JNC-02
  const staffAddCamRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/traffic/junctions/JNC-02/cameras',
    method: 'POST',
    headers: { 'Authorization': `Bearer ${staffToken}` }
  }, {
    camera_name: 'Mohaddipur North High-Res Radar Cam',
    direction: 'North',
    resolution: '1080p FHD'
  });
  assert(staffAddCamRes.status === 201 && staffAddCamRes.data?.success, 'Staff successfully added camera to assigned junction JNC-02');

  // 4. Staff Blocked from Adding Camera to Unassigned Junction JNC-01
  const staffAddCamBlocked = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/traffic/junctions/JNC-01/cameras',
    method: 'POST',
    headers: { 'Authorization': `Bearer ${staffToken}` }
  }, {
    camera_name: 'Unauthorized Camera',
    direction: 'North',
    resolution: '1080p'
  });
  assert(staffAddCamBlocked.status === 403, 'Staff strictly blocked (403) from adding camera to unassigned junction JNC-01');

  // 5. Admin can Add and Delete Old Junctions
  const adminToken = makeToken({ id: 'STAFF-TR-ADMIN', staffId: 'TR-ADMIN', role: 'admin', department: 'traffic' });
  const testJncId = 'JNC-TEST-' + Date.now().toString().slice(-4);
  const createJncRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/traffic/junctions',
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  }, {
    junction_id: testJncId,
    junction_name: 'Temporary Old Crossing Test',
    landmark: 'Test Area',
    latitude: 26.7500,
    longitude: 83.3800
  });
  assert(createJncRes.status === 201 && createJncRes.data?.success, `Admin successfully created junction ${testJncId}`);

  // Now delete the junction:
  const deleteJncRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/traffic/junctions/${testJncId}`,
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert(deleteJncRes.status === 200 && deleteJncRes.data?.success, `Admin successfully deleted junction ${testJncId}`);

  // 6. Admin can Register New Staff Officers
  const testStaffId = 'TR-TEST-' + Date.now().toString().slice(-4);
  const createStaffRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/traffic/admin/users',
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  }, {
    name: 'Insp. Vikram Pratap Singh',
    staff_id: testStaffId,
    department: 'traffic',
    role: 'staff',
    assigned_junction_id: 'JNC-02'
  });
  assert((createStaffRes.status === 200 || createStaffRes.status === 201) && createStaffRes.data?.success, `Admin successfully registered new officer ${testStaffId}`);

  console.log(`\n=======================================================`);
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`=======================================================`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
