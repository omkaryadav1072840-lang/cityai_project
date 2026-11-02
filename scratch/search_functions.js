const fs = require('fs');
const js = fs.readFileSync('frontend/pages/traffic/traffic.js', 'utf8');
const lines = js.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('function openAddJunctionModal') || 
      l.includes('function openAddCameraModal') || 
      l.includes('function openAddSignalModal') || 
      l.includes('function openAddStaffModal') ||
      l.includes('function submitAddJunction') ||
      l.includes('function submitAddCamera') ||
      l.includes('function submitAddSignal') ||
      l.includes('function submitAddStaff') ||
      l.includes('function submitCreateStaff')) {
    console.log(`Line ${idx+1}: ${l}`);
  }
});

