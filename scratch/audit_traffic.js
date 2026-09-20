const fs = require('fs');

const html = fs.readFileSync('frontend/pages/traffic/traffic.html', 'utf8');
const trafficJs = fs.readFileSync('frontend/pages/traffic/traffic.js', 'utf8');
const mapJs = fs.readFileSync('frontend/pages/traffic/openlayers_map.js', 'utf8');
const visionJs = fs.readFileSync('frontend/pages/traffic/traffic_ai_vision.js', 'utf8');
const authJs = fs.readFileSync('frontend/auth.js', 'utf8');
const allJs = [trafficJs, mapJs, visionJs, authJs].join('\n');

// 1. Check event handlers in HTML
const eventAttrRegex = /on(click|change|input|submit)="([^"]+)"/g;
let match;
const calledFns = new Set();
while ((match = eventAttrRegex.exec(html)) !== null) {
  const code = match[2];
  code.split(';').forEach(stmt => {
    stmt = stmt.trim();
    if (stmt.includes('(')) {
      let fn = stmt.split('(')[0].trim();
      fn = fn.replace(/^(window|trafficMap|trafficVision)\./, '');
      if (fn && !fn.startsWith('event') && !fn.startsWith('this') && !fn.includes('.')) {
        calledFns.add(fn);
      }
    }
  });
}

console.log('--- CHECKING HTML EVENT HANDLERS IN JS ---');
const missingFns = [];
for (const fn of calledFns) {
  const re = new RegExp('\\b' + fn + '\\b');
  if (!re.test(allJs)) {
    missingFns.push(fn);
  }
}
console.log('Total event functions in HTML:', calledFns.size);
console.log('Missing functions in JS:', missingFns);

// 2. Check getElementById in JS vs HTML
console.log('\n--- CHECKING getElementById IN JS VS HTML ---');
const getElemRegex = /document\.getElementById\(["']([^"']+)["']\)/g;
const jsIds = new Set();
while ((match = getElemRegex.exec(allJs)) !== null) {
  jsIds.add(match[1]);
}

const missingIds = [];
for (const id of jsIds) {
  if (!html.includes('id="' + id + '"') && !html.includes("id='" + id + "'")) {
    missingIds.push(id);
  }
}
console.log('Total document.getElementById queried in JS:', jsIds.size);
console.log('Missing IDs in HTML:', missingIds);

// 3. Check fetch URLs in traffic.js vs backend
console.log('\n--- CHECKING API ENDPOINTS IN JS ---');
const fetchRegex = /fetch\(["']([^"']+)["']/g;
const apiUrls = new Set();
while ((match = fetchRegex.exec(trafficJs)) !== null) {
  if (match[1].startsWith('/api/')) {
    apiUrls.add(match[1]);
  }
}
console.log('Total unique API endpoints fetched in traffic.js:', apiUrls.size);
console.log('API endpoints:', Array.from(apiUrls));
