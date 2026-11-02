const fs = require('fs');
const js = fs.readFileSync('frontend/pages/traffic/traffic.js', 'utf8');
const html = fs.readFileSync('frontend/pages/traffic/traffic.html', 'utf8');

const regex = /openModal\(["']([^"']+)["']\)/g;
let match;
const modals = new Map();

while ((match = regex.exec(js)) !== null) {
  const id = match[1];
  const lineNo = js.substring(0, match.index).split('\n').length;
  if (!modals.has(id)) {
    modals.set(id, []);
  }
  modals.get(id).push(lineNo);
}

console.log('=== MODAL IDS CALLED IN traffic.js ===');
for (const [id, lines] of modals.entries()) {
  const exists = html.includes(`id="${id}"`) || html.includes(`id='${id}'`);
  console.log(`Modal ID: "${id}" | Exists in HTML: ${exists} | Called at line(s): ${lines.join(', ')}`);
}

