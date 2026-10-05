const fs = require('fs');

const html = fs.readFileSync('frontend/pages/hospital/hospital.html', 'utf8');
const lines = html.split('\n');
console.log('--- hospital.html bed elements ---');
lines.forEach((l, i) => {
    if (/modal.*bed|bed.*modal|book.*bed|reserve.*bed|id=".*bed.*"/i.test(l)) {
        console.log(`Line ${i+1}: ${l.trim().slice(0, 140)}`);
    }
});

const js = fs.readFileSync('frontend/pages/hospital/hospital.js', 'utf8');
const jsLines = js.split('\n');
console.log('--- hospital.js bed booking handlers ---');
jsLines.forEach((l, i) => {
    if (/function.*bed.*book|function.*book.*bed|handle.*bed|open.*bed/i.test(l)) {
        console.log(`Line ${i+1}: ${l.trim().slice(0, 140)}`);
    }
});
