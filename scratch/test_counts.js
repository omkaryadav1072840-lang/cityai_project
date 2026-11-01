const fs = require('fs');
const html = fs.readFileSync('frontend/pages/waste/waste.html', 'utf8');
console.log('auth count:', (html.split('id="dustbinAuthCard"').length - 1));
console.log('dash count:', (html.split('id="dustbinActiveDashboard"').length - 1));
console.log('terminal count:', (html.split('id="dustbinTerminalSection"').length - 1));

