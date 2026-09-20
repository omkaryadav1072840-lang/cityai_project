const fs = require('fs');

console.log("=== STARTING DEEP PARKING MODULE AUDIT ===");

const html = fs.readFileSync('./frontend/pages/parking/parking.html', 'utf8');
const js = fs.readFileSync('./frontend/pages/parking/parking.js', 'utf8');
const routes = fs.readFileSync('./backend/routes/parking.routes.js', 'utf8');

// 1. Check all getElementById calls in parking.js
const idMatches = [...js.matchAll(/document\.getElementById\(['"]([^'"]+)['"]\)/g)].map(m => m[1]);
const uniqueIds = Array.from(new Set(idMatches));
const missingInHtml = [];

for (const id of uniqueIds) {
    const hasId = html.includes(`id="${id}"`) || html.includes(`id='${id}'`);
    if (!hasId) {
        missingInHtml.push(id);
    }
}

console.log(`\n[1] getElementById check: Checked ${uniqueIds.length} unique element IDs.`);
if (missingInHtml.length > 0) {
    console.log(`⚠️ Found ${missingInHtml.length} IDs referenced in parking.js that do NOT exist in parking.html:`);
    console.log(missingInHtml);
} else {
    console.log("✓ All getElementById targets exist in parking.html!");
}

// 2. Check fetch/API endpoints called in parking.js vs parking.routes.js
const fetchMatches = [...js.matchAll(/fetch\([`'"](\/api\/parking[^`'"?]+)/g)].map(m => m[1]);
const uniqueFetches = Array.from(new Set(fetchMatches));
console.log(`\n[2] API Endpoints called from parking.js:`);
for (const endpoint of uniqueFetches) {
    console.log(`- ${endpoint}`);
}

// 3. Check for potential unclosed tags or syntax issues in HTML
const scriptTags = [...html.matchAll(/<script/g)].length;
const endScriptTags = [...html.matchAll(/<\/script>/g)].length;
console.log(`\n[3] HTML check: <script> tags: ${scriptTags}, </script> tags: ${endScriptTags}`);

// 4. Check for console errors or common JS typos
const possibleTypos = [
    'undefined', 'NaN', 'null.', 'activeSlotLotId', 'submitSlotBooking', 'calculateBookingAmount'
];
console.log(`\n[4] Common checks:`);
for (const key of possibleTypos) {
    const count = (js.match(new RegExp(key, 'g')) || []).length;
    console.log(`- ${key}: ${count} occurrences`);
}
