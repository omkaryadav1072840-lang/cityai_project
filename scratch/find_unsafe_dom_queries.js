const fs = require('fs');
const js = fs.readFileSync('frontend/pages/traffic/traffic.js', 'utf8');
const html = fs.readFileSync('frontend/pages/traffic/traffic.html', 'utf8');

const regex = /document\.getElementById\(["']([^"']+)["']\)\s*\.\s*([a-zA-Z0-9_]+)/g;
let match;
const missing = [];
const checked = new Set();

while ((match = regex.exec(js)) !== null) {
  const id = match[1];
  const prop = match[2];
  if (checked.has(id)) continue;
  checked.add(id);

  const exists = html.includes(`id="${id}"`) || html.includes(`id='${id}'`);
  if (!exists) {
    missing.push({ id, prop });
  }
}

console.log('--- ELEMENT IDs QUERIED DIRECTLY IN traffic.js BUT MISSING IN traffic.html ---');
missing.forEach(m => console.log(`Missing ID: "${m.id}" accessed with .${m.prop}`));
console.log(`Total missing: ${missing.length}`);

