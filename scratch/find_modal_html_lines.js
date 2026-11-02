const fs = require('fs');
const html = fs.readFileSync('frontend/pages/traffic/traffic.html', 'utf8');
const lines = html.split('\n');

lines.forEach((l, idx) => {
  if (l.includes('modal-add-junction') || l.includes('modal-add-signal') || l.includes('modal-add-camera') || l.includes('modal-add-staff')) {
    console.log(`Line ${idx+1}: ${l}`);
  }
});

