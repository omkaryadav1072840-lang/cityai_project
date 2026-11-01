const fs = require('fs');

const html = fs.readFileSync('frontend/pages/waste/waste.html', 'utf8');

const staffMainStart = html.indexOf('id="staffOperationsMain"');
const staffMainEnd = html.indexOf('id="layer-admin-content"');

const staffContent = html.substring(staffMainStart, staffMainEnd);

// Find all sections or headers inside staffContent
const sections = staffContent.match(/<section[^>]*>/gi);
console.log('Sections inside staffOperationsMain:', sections);

const h2s = staffContent.match(/<h2[^>]*>[\s\S]*?<\/h2>/gi);
console.log('\nH2 headings inside staffOperationsMain:');
if (h2s) h2s.forEach(h => console.log(' - ' + h.replace(/<[^>]+>/g, '').trim()));

