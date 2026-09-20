const fs = require('fs');
const c = fs.readFileSync('frontend/pages/hospital/hospital.js', 'utf8');

const regex = /apiRequest\s*\(\s*([`'"])(.*?)\1/g;
let m;
const eps = new Set();
while ((m = regex.exec(c)) !== null) {
  eps.add(m[2]);
}

console.log('Endpoints in hospital.js:');
Array.from(eps).sort().forEach(e => console.log(' -', e));
