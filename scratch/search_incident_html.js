const fs = require('fs');
const html = fs.readFileSync('frontend/pages/traffic/traffic.html', 'utf8');
const lines = html.split('\n');
lines.forEach((l, idx) => {
  if (l.toLowerCase().includes('incident')) {
    console.log(`Line ${idx+1}: ${l.trim()}`);
  }
});

