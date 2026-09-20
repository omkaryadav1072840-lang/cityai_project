const fs = require('fs');
const html = fs.readFileSync('frontend/pages/traffic/traffic.html', 'utf8');
const lines = html.split('\n');
lines.forEach((l, i) => {
  if (l.includes('ctrl-') || l.includes('Junction Controller') || l.includes('Traffic Staff Controls')) {
    console.log((i+1) + ': ' + l.trim());
  }
});
