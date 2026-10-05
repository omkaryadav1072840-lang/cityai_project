const fs = require('fs');

const html = fs.readFileSync('frontend/pages/hospital/hospital_dashboard.html', 'utf8');
const panels = [...html.matchAll(/id="(panel-[^"]+)"/g)].map(m => m[1]);
console.log('Panels found:', panels);

const modals = [...html.matchAll(/id="(modal[^"]+)"/g)].map(m => m[1]);
console.log('Modals found:', modals);

const wardSections = [...html.matchAll(/id="([^"]*ward[^"]*)"/gi)].map(m => m[1]);
console.log('Ward related IDs:', wardSections);

const bedSections = [...html.matchAll(/id="([^"]*bed[^"]*)"/gi)].map(m => m[1]);
console.log('Bed related IDs:', bedSections);
