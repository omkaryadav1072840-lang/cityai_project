const fs = require('fs');
const content = fs.readFileSync('frontend/pages/hospital/doctor_dashboard.js', 'utf8');
const wardMatches = [...content.matchAll(/(?:ward|bed|admission)/gi)].map(m => m[0]);
console.log('Matches in doctor_dashboard.js:', wardMatches.length);
if (wardMatches.length > 0) {
    const lines = content.split('\n');
    lines.forEach((l, i) => {
        if (/ward|bed|admission/i.test(l)) {
            console.log(`Line ${i+1}: ${l.trim()}`);
        }
    });
}
