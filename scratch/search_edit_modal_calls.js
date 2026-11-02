const fs = require('fs');
const js = fs.readFileSync('frontend/pages/traffic/traffic.js', 'utf8');
const lines = js.split('\n');

lines.forEach((l, idx) => {
  if (l.includes('openEditJunctionModal') || l.includes('openEditCameraModal') || l.includes('openEditSignalModal')) {
    console.log(`Line ${idx+1}: ${l.trim()}`);
  }
});

