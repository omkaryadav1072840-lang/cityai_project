const fs = require('fs');
const html = fs.readFileSync('frontend/pages/hospital/hospital_dashboard.html', 'utf8');

const profIdx = html.indexOf('id="admin-subtab-profile"');
console.log('Profile & logo snippet:', html.slice(profIdx, profIdx + 1600));
