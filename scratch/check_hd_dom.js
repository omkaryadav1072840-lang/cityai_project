const fs = require('fs');
const htmlContent = fs.readFileSync('frontend/pages/hospital/hospital_dashboard.html', 'utf8');
const jsContent = fs.readFileSync('frontend/pages/hospital/hospital_dashboard.js', 'utf8');
const re = /document\.getElementById\(['"]([^'"]+)['"]\)/g;
const matches = [];
let m;
while ((m = re.exec(jsContent)) !== null) { matches.push(m[1]); }
const uniqueIds = Array.from(new Set(matches));
const missing = uniqueIds.filter(id => !htmlContent.includes('id="' + id + '"') && !htmlContent.includes("id='" + id + "'"));
console.log('hospital_dashboard.html missing ' + missing.length + ' IDs:');
console.log(missing);
