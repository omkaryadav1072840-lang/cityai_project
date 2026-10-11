const fs = require('fs');
const html = fs.readFileSync('frontend/pages/hospital/hospital.html', 'utf8');
const regex = /<section[^>]+id=["']([^"']+)["']/g;
let match;
const ids = [];
while ((match = regex.exec(html)) !== null) {
    ids.push(match[1]);
}
console.log('Hospital section IDs:', ids);
