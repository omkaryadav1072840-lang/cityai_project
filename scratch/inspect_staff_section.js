const fs = require('fs');
const html = fs.readFileSync('frontend/pages/traffic/traffic.html', 'utf8');
const staffStart = html.indexOf('id="section-staff"');
const adminStart = html.indexOf('id="section-admin"');
const staffSection = html.substring(staffStart, adminStart);
const ids = [...staffSection.matchAll(/id="([^"]+)"/g)].map(m => m[1]);
console.log('IDs in staffSection:', ids.filter(id => id.includes('map') || id.includes('cam') || id.includes('canvas')));

