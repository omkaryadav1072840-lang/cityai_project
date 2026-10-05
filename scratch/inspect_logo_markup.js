const fs = require('fs');
const html = fs.readFileSync('frontend/pages/hospital/hospital_dashboard.html', 'utf8');

const profIdx = html.indexOf('<!-- OFFICIAL PNG LOGO PREVIEW & SELECTOR (STRICT PNG ONLY) -->');
console.log('Logo snippet:', html.slice(profIdx, profIdx + 1600));
