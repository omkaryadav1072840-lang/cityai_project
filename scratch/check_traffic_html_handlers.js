const fs = require('fs');
const html = fs.readFileSync('frontend/pages/traffic/traffic.html', 'utf8');
const js = fs.readFileSync('frontend/pages/traffic/traffic.js', 'utf8');

const regex = /(on[a-z]+)=["']([^"']+)["']/g;
let match;
const handlers = [];
while ((match = regex.exec(html)) !== null) {
  handlers.push({ event: match[1], call: match[2] });
}

console.log('Total event attributes in traffic.html:', handlers.length);
handlers.forEach((h, i) => {
  const fnName = h.call.split('(')[0].trim();
  const isFound = js.includes(fnName);
  console.log(`${i+1}. ${h.event}="${h.call}" -> ${fnName} in traffic.js: ${isFound ? 'YES' : 'NO'}`);
});

