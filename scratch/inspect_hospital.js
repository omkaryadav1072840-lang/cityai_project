const fs = require('fs');
const html = fs.readFileSync('frontend/pages/hospital/hospital.html', 'utf8');
const re = /id=['"]([^'"]+)['"]/g;
const ids = [];
let m;
while ((m = re.exec(html)) !== null) ids.push(m[1]);
console.log('Total IDs in hospital.html:', ids.length);
console.log(ids);
