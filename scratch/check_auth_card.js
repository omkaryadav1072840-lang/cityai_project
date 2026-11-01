const fs = require('fs');
const html = fs.readFileSync('frontend/pages/waste/waste.html', 'utf8');
const cardIdx = html.indexOf('id="dustbinAuthCard"');
console.log(html.substring(cardIdx + 2800, cardIdx + 4500));
