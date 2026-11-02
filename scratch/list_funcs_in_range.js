const fs = require('fs');
const js = fs.readFileSync('frontend/pages/traffic/traffic.js', 'utf8');
const lines = js.split('\n');
for (let i = 2400; i < 3300; i++) {
  const line = lines[i];
  if (line && (line.trim().startsWith('function ') || line.trim().startsWith('async function ') || line.trim().startsWith('window.'))) {
    console.log(`Line ${i+1}: ${line.trim()}`);
  }
}

