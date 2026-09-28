const fs = require('fs');
const path = require('path');

const files = [
    'frontend/pages/waste/waste.js',
    'frontend/pages/water/water.js',
    'frontend/pages/hospital/hospital.js',
    'frontend/pages/hospital/hospital_dashboard.js',
    'frontend/pages/hospital/doctor_dashboard.js',
    'frontend/pages/emergency/emergency.js',
    'frontend/pages/police/police.js',
    'frontend/script.js'
];

for (const rel of files) {
    const full = path.join(__dirname, '..', rel);
    if (!fs.existsSync(full)) continue;
    const content = fs.readFileSync(full, 'utf8');
    
    // Find all fetch( or authFetch( or axios( occurrences
    const lines = content.split('\n');
    console.log(`\n=== Calls in ${rel} ===`);
    const found = [];
    lines.forEach((line, idx) => {
        if (/fetch\(|axios\./.test(line)) {
            found.push(`Line ${idx + 1}: ${line.trim().substring(0, 90)}`);
        }
    });
    console.log(`Total calls found: ${found.length}`);
    found.slice(0, 15).forEach(f => console.log('  ' + f));
}
