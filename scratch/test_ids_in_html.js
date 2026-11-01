const fs = require('fs');

const html = fs.readFileSync('frontend/pages/waste/waste.html', 'utf8');
const js = fs.readFileSync('frontend/pages/waste/waste.js', 'utf8');

// Check every getElementById inside renderActiveDustbinDashboard
const ids = [];
const regex = /document\.getElementById\("([^"]+)"\)/g;
const fnIdx = js.indexOf('function renderActiveDustbinDashboard');
const fnCode = js.substring(fnIdx, fnIdx + 3000);

let m;
while ((m = regex.exec(fnCode)) !== null) {
  ids.push(m[1]);
}

console.log('IDs queried in renderActiveDustbinDashboard:');
const missing = [];
ids.forEach(id => {
  const exists = html.includes(`id="${id}"`);
  console.log(` - ${id}: ${exists ? 'EXISTS' : 'MISSING ❌'}`);
  if (!exists) missing.push(id);
});

console.log('\nTotal queried:', ids.length, '| Missing:', missing.length);

