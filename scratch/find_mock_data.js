const fs = require('fs');
const path = require('path');

const files = [
  'frontend/script.js',
  'frontend/pages/hospital/hospital.js',
  'frontend/pages/hospital/doctor_dashboard.js',
  'frontend/pages/hospital/hospital_dashboard.js',
  'frontend/pages/traffic/traffic.js',
  'frontend/pages/parking/parking.js',
  'frontend/pages/police/police.js',
  'frontend/pages/waste/waste.js',
  'frontend/pages/water/water.js',
  'frontend/pages/emergency/emergency.js',
  'frontend/pages/famous/famous.js'
];

files.forEach(f => {
  if (!fs.existsSync(f)) return;
  const content = fs.readFileSync(f, 'utf8');
  console.log(`\n========================================`);
  console.log(`FILE: ${f}`);
  console.log(`========================================`);

  // 1. Check for localStorage mocks
  const lsMatches = [...content.matchAll(/localStorage\.(?:getItem|setItem)\(["']([^"']+)["']/g)].map(m => m[1]);
  const uniqueLs = [...new Set(lsMatches)];
  console.log('localStorage keys:', uniqueLs.join(', '));

  // 2. Check for hardcoded mock arrays / static fallback data
  const mockMatches = [...content.matchAll(/(?:const|let|var)\s+([a-zA-Z0-9_]*(?:mock|dummy|fake|sample|static|fallback|initial|data)[a-zA-Z0-9_]*)\s*=/gi)].map(m => m[1]);
  console.log('Mock/Sample variable matches:', [...new Set(mockMatches)].join(', '));

  // 3. Count fetch/apiRequest vs static arrays
  const fetchCount = (content.match(/fetch\s*\(/g) || []).length + (content.match(/apiRequest\s*\(/g) || []).length;
  console.log('Backend API fetch calls count:', fetchCount);
});
