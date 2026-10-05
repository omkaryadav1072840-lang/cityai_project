const fs = require('fs');

console.log("=========================================");
console.log("🔍 COMPREHENSIVE BUG & ERROR HUNT");
console.log("=========================================");

// 1. Audit DOM Element IDs between hospital.js and hospital.html
const hospitalHtml = fs.readFileSync('frontend/pages/hospital/hospital.html', 'utf8');
const hospitalJs = fs.readFileSync('frontend/pages/hospital/hospital.js', 'utf8');

// Extract getElementById calls
const getElemRegex = /getElementById\s*\(\s*["']([^"']+)["']\s*\)/g;
let match;
const jsElementsInHospital = new Set();
while ((match = getElemRegex.exec(hospitalJs)) !== null) {
    jsElementsInHospital.add(match[1]);
}

const missingInHospitalHtml = [];
for (const id of jsElementsInHospital) {
    if (!hospitalHtml.includes(`id="${id}"`) && !hospitalHtml.includes(`id='${id}'`)) {
        missingInHospitalHtml.push(id);
    }
}
console.log(`\n[CHECK 1] hospital.js -> hospital.html DOM Element Check:`);
console.log(`Total getElementById IDs referenced: ${jsElementsInHospital.size}`);
console.log(`Missing in HTML (potential null pointers): ${missingInHospitalHtml.length}`);
if (missingInHospitalHtml.length > 0) {
    console.log(`Potentially missing IDs:`, missingInHospitalHtml.slice(0, 20));
}

// 2. Audit DOM Element IDs between hospital_dashboard.js and hospital_dashboard.html
const dashHtml = fs.readFileSync('frontend/pages/hospital/hospital_dashboard.html', 'utf8');
const dashJs = fs.readFileSync('frontend/pages/hospital/hospital_dashboard.js', 'utf8');

const dashElements = new Set();
while ((match = getElemRegex.exec(dashJs)) !== null) {
    dashElements.add(match[1]);
}

const missingInDashHtml = [];
for (const id of dashElements) {
    if (!dashHtml.includes(`id="${id}"`) && !dashHtml.includes(`id='${id}'`)) {
        missingInDashHtml.push(id);
    }
}
console.log(`\n[CHECK 2] hospital_dashboard.js -> hospital_dashboard.html DOM Element Check:`);
console.log(`Total getElementById IDs referenced: ${dashElements.size}`);
console.log(`Missing in HTML: ${missingInDashHtml.length}`);
if (missingInDashHtml.length > 0) {
    console.log(`Potentially missing IDs:`, missingInDashHtml.slice(0, 20));
}

// 3. Search for alert() in dashboard
const alertMatches = [...dashJs.matchAll(/alert\s*\(/g)];
console.log(`\n[CHECK 3] alert() calls in hospital_dashboard.js: ${alertMatches.length}`);

