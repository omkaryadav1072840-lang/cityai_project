const endpoints = [
  '/api/traffic/junctions',
  '/api/traffic/signals',
  '/api/traffic/parking-lots',
  '/api/parking',
  '/api/traffic/incidents',
  '/api/traffic/analytics/summary',
  '/api/traffic/cameras',
  '/api/traffic/violations',
  '/api/traffic/movement-rules',
  '/api/traffic/admin/users',
  '/api/traffic/admin/ai-settings',
  '/api/traffic/admin/audit-logs',
  '/api/traffic/waterlogging',
  '/api/traffic/vms-boards',
  '/api/traffic/ambulances/live'
];

async function testAll() {
  console.log('Testing traffic API endpoints on http://localhost:5000...');
  for (const ep of endpoints) {
    try {
      const res = await fetch('http://localhost:5000' + ep);
      const data = await res.json().catch(() => null);
      console.log(`Endpoint ${ep}: Status ${res.status} | Success: ${data ? (data.success !== undefined ? data.success : true) : 'No JSON'}`);
    } catch (e) {
      console.error(`Endpoint ${ep}: FAILED (${e.message})`);
    }
  }
}

testAll();
