const fs = require('fs');
const html = fs.readFileSync('frontend/pages/hospital/hospital.html', 'utf8');

const matches = [];
const regex = /id=["']([^"']+)["'][^>]*class=["'][^"']*modal[^"']*["']|class=["'][^"']*modal[^"']*["'][^>]*id=["']([^"']+)["']/g;
let m;
while ((m = regex.exec(html)) !== null) {
  matches.push(m[1] || m[2]);
}

console.log('Modals in hospital.html:', matches);
