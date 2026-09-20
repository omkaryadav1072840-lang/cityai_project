const fs = require('fs');

const html = fs.readFileSync('frontend/index.html', 'utf8');
const js = fs.readFileSync('frontend/script.js', 'utf8') + 
           fs.readFileSync('frontend/auth.js', 'utf8') + 
           fs.readFileSync('frontend/realtime.js', 'utf8');

const regex = /on(?:click|change|input)=["']([a-zA-Z0-9_$]+)\s*\(/g;
const onclicks = new Set();
let m;
while ((m = regex.exec(html)) !== null) {
  onclicks.add(m[1]);
}

const missing = [];
onclicks.forEach(fn => {
  const defined = js.includes('function ' + fn) || js.includes(fn + ' =') || html.includes('function ' + fn);
  if (!defined) missing.push(fn);
});

console.log(`Total onclicks in index.html: ${onclicks.size}`);
console.log('Missing function definitions in index.html scripts:', missing);
