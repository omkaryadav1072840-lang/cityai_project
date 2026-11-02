const fs = require('fs');
const html = fs.readFileSync('frontend/pages/traffic/traffic.html', 'utf8');

// Find all elements with class containing 'modal' or id starting with 'modal' or 'm-'
const idRegex = /id="([^"]+)"/g;
let match;
const allIds = [];
while ((match = idRegex.exec(html)) !== null) {
  allIds.push(match[1]);
}

console.log('--- ALL MODAL-RELATED IDs IN traffic.html ---');
const modalRelated = allIds.filter(id => id.startsWith('modal') || id.startsWith('m-') || id.startsWith('m') || id.includes('modal'));
console.log(modalRelated);

