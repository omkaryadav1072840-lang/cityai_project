const fs = require('fs');
const path = require('path');

const modulesToCheck = [
  'frontend/pages/police/police.js',
  'frontend/pages/waste/waste.js',
  'frontend/pages/water/water.js',
  'frontend/pages/emergency/emergency.js',
  'frontend/pages/famous/famous.js',
  'frontend/pages/hospital/doctor_dashboard.js',
  'frontend/pages/hospital/hospital_dashboard.js'
];

modulesToCheck.forEach(m => {
  if (!fs.existsSync(m)) {
    console.log('Missing file:', m);
    return;
  }
  const content = fs.readFileSync(m, 'utf8');
  console.log(`\n=== CHECKING ${m} ===`);
  console.log(`Lines: ${content.split('\n').length}, Size: ${(content.length / 1024).toFixed(1)} KB`);

  // Check syntax
  try {
    new Function(content);
    console.log('✅ Syntax valid');
  } catch (e) {
    console.log('❌ Syntax Error:', e.message);
  }

  // Check duplicate functions
  const fns = [...content.matchAll(/function\s+([a-zA-Z0-9_$]+)\s*\(/g)].map(x => x[1]);
  const counts = {};
  fns.forEach(f => counts[f] = (counts[f] || 0) + 1);
  const dups = Object.entries(counts).filter(([_, c]) => c > 1);
  if (dups.length > 0) {
    console.log('⚠️ Duplicate functions:', dups.map(([f, c]) => `${f} (${c}x)`).join(', '));
  } else {
    console.log('✅ No duplicate functions');
  }

  // Check API calls
  const apiCalls = [...content.matchAll(/(?:fetch|apiRequest)\s*\(\s*[`'"]([^`'"]+)[`'"]/g)].map(x => x[1]);
  console.log(`API calls count: ${apiCalls.length}`);
});
