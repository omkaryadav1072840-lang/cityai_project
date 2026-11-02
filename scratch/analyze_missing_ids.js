const fs = require('fs');
const js = fs.readFileSync('frontend/pages/traffic/traffic.js', 'utf8');
const html = fs.readFileSync('frontend/pages/traffic/traffic.html', 'utf8');

// Find all functions in traffic.js that query missing IDs
const regex = /document\.getElementById\(["']([^"']+)["']\)\s*\.\s*([a-zA-Z0-9_]+)/g;
let match;
const missing = new Map();

while ((match = regex.exec(js)) !== null) {
  const id = match[1];
  const prop = match[2];
  const exists = html.includes(`id="${id}"`) || html.includes(`id='${id}'`);
  if (!exists) {
    if (!missing.has(id)) {
      // Find line number
      const lineNo = js.substring(0, match.index).split('\n').length;
      missing.set(id, { prop, lineNo });
    }
  }
}

console.log(`Found ${missing.size} missing element queries:`);
for (const [id, info] of missing.entries()) {
  console.log(`- ID: "${id}" (prop: .${info.prop}) at line ${info.lineNo}`);
}

