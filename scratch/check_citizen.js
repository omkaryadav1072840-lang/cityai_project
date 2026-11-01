const fs = require('fs');
const html = fs.readFileSync('frontend/pages/waste/waste.html', 'utf8');
const citizenStart = html.indexOf('<div class="citizen-stats">');
console.log(html.substring(citizenStart, citizenStart + 1200));
