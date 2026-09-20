const fs = require('fs');

const html = fs.readFileSync('frontend/pages/hospital/hospital.html', 'utf8');
const js = fs.readFileSync('frontend/pages/hospital/hospital.js', 'utf8');

// Find all onclick/oninput/onchange in html
const eventRegex = /on(?:click|input|change|submit)=["']([a-zA-Z0-9_$]+)\s*\(/g;
const eventCalls = new Set();
let m;

while ((m = eventRegex.exec(html)) !== null) {
  eventCalls.add(m[1]);
}

// Also find in template literals in js
const jsEventRegex = /on(?:click|input|change|submit)=["']([a-zA-Z0-9_$]+)\s*\(/g;
while ((m = jsEventRegex.exec(js)) !== null) {
  eventCalls.add(m[1]);
}

console.log('Total event handler functions found:', eventCalls.size);

// Check if each function is in window export block or defined
const winBlock = js.substring(js.indexOf('Object.assign(window,'));
const missingInWindow = [];

eventCalls.forEach(fn => {
  if (!winBlock.includes(fn)) {
    missingInWindow.push(fn);
  }
});

console.log('\nFunctions called in HTML/templates but NOT in Object.assign(window, ...):');
console.log(missingInWindow);
