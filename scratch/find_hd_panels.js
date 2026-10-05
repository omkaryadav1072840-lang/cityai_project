const fs = require('fs');
const content = fs.readFileSync('./frontend/pages/hospital/hospital_dashboard.html', 'utf8');
const lines = content.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('class="hd-panel"')) {
    console.log(`Line ${idx+1}: ${l.trim()}`);
  }
});
