const fs = require('fs');

const html = fs.readFileSync('frontend/pages/water/water.html', 'utf8');
const js = fs.readFileSync('frontend/pages/water/water.js', 'utf8');

const matches = [...html.matchAll(/onclick=["']([a-zA-Z0-9_]+)\(/g)];
const uniqueOnclicks = [...new Set(matches.map(m => m[1]))];
console.log('=== WATER ONCLICKS ===');
uniqueOnclicks.forEach(fn => {
    const inJs = js.includes('function ' + fn) || js.includes(fn + ' =') || js.includes('window.' + fn) || js.includes(fn + ':');
    console.log(`${fn}: ${inJs ? 'EXISTS' : '❌ MISSING!'}`);
});

const forms = [...html.matchAll(/<form [^>]*id=["']([^"']+)["']/g)].map(m => m[1]);
console.log('\n=== WATER FORMS ===');
forms.forEach(f => {
    const listened = js.includes(`"${f}"`) || js.includes(`'${f}'`);
    console.log(`${f}: ${listened ? 'LISTENED' : '❌ MISSING LISTENER!'}`);
});

const buttons = [...html.matchAll(/id=["']([^"']+)["']/g)].map(m => m[1]);
console.log('\n=== TOTAL IDS FOUND ===', buttons.length);
