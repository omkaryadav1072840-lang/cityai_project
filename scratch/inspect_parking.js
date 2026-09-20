const fs = require('fs');

const html = fs.readFileSync('frontend/pages/parking/parking.html', 'utf8');
const js = fs.readFileSync('frontend/pages/parking/parking.js', 'utf8');

console.log('=== PARKING HTML ANALYSIS ===');
console.log('Total HTML lines:', html.split('\n').length);
console.log('Includes layer-tabs-container:', html.includes('layer-tabs-container'));

// Check comments or headings
const headings = [...html.matchAll(/<!-- =+\s*([A-Z0-9\s—–\(\)]+)\s*=+ -->/gi)].map(m => m[1].trim());
console.log('\nHTML Major Sections/Comments:');
headings.forEach(h => console.log(' - ' + h));

// Check Onclicks
const matches = [...html.matchAll(/onclick=["']([a-zA-Z0-9_]+)\(/g)];
const uniqueOnclicks = [...new Set(matches.map(m => m[1]))];
console.log(`\nHTML Onclicks found (${uniqueOnclicks.length}):`);
let missingOnclicks = 0;
uniqueOnclicks.forEach(fn => {
    const inJs = js.includes('function ' + fn) || js.includes(fn + ' =') || js.includes('window.' + fn) || js.includes(fn + ':');
    if (!inJs) {
        console.log(`  ❌ MISSING: ${fn}`);
        missingOnclicks++;
    } else {
        console.log(`  ✅ ${fn}`);
    }
});

// Check Forms
const forms = [...html.matchAll(/<form [^>]*id=["']([^"']+)["']/g)].map(m => m[1]);
console.log(`\nForms found (${forms.length}):`);
forms.forEach(f => {
    const listened = js.includes(`"${f}"`) || js.includes(`'${f}'`);
    console.log(`  ${listened ? '✅' : '❌'} ${f}`);
});

// Check Modals
const modals = [...html.matchAll(/id=["']([a-zA-Z0-9_-]*Modal[a-zA-Z0-9_-]*)["']/g)].map(m => m[1]);
console.log(`\nModals found (${modals.length}):`);
[...new Set(modals)].forEach(m => console.log('  🏢 ' + m));

console.log(`\nTotal missing onclicks: ${missingOnclicks}`);
