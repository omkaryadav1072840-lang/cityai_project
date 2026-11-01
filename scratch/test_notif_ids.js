const fs = require('fs');

const html = fs.readFileSync('frontend/pages/waste/waste.html', 'utf8');
const js = fs.readFileSync('frontend/pages/waste/waste.js', 'utf8');

const notifIdx = js.indexOf('function renderDustbinNotificationTable');
const notifCode = js.substring(notifIdx, notifIdx + 2500);

const ids = [];
const regex = /document\.getElementById\("([^"]+)"\)/g;
let m;
while ((m = regex.exec(notifCode)) !== null) {
  ids.push(m[1]);
}

console.log('IDs queried in renderDustbinNotificationTable and mini map:');
const missing = [];
ids.forEach(id => {
  const exists = html.includes(`id="${id}"`);
  console.log(` - ${id}: ${exists ? 'EXISTS' : 'MISSING ❌'}`);
  if (!exists) missing.push(id);
});

console.log('\nTotal queried:', ids.length, '| Missing:', missing.length);

