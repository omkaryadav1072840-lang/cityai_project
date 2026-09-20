const fs = require('fs');

function analyzeModule(name, htmlPath, jsPath) {
    console.log(`\n========================================`);
    console.log(`      ANALYSIS: ${name.toUpperCase()} MODULE`);
    console.log(`========================================`);

    const html = fs.readFileSync(htmlPath, 'utf8');
    const js = fs.readFileSync(jsPath, 'utf8');

    // 1. Check Onclicks
    const matches = [...html.matchAll(/onclick=["']([a-zA-Z0-9_]+)\(/g)];
    const uniqueOnclicks = [...new Set(matches.map(m => m[1]))];
    let missingOnclicks = 0;
    console.log(`\n--- HTML Onclick Handlers (${uniqueOnclicks.length} found) ---`);
    uniqueOnclicks.forEach(fn => {
        const inJs = js.includes('function ' + fn) || js.includes(fn + ' =') || js.includes('window.' + fn) || js.includes(fn + ':');
        if (!inJs) {
            console.log(`❌ MISSING: ${fn}`);
            missingOnclicks++;
        } else {
            console.log(`✅ ${fn}`);
        }
    });

    // 2. Check Form Event Listeners
    const forms = [...html.matchAll(/<form [^>]*id=["']([^"']+)["']/g)].map(m => m[1]);
    let missingForms = 0;
    console.log(`\n--- Form Listeners (${forms.length} found) ---`);
    forms.forEach(f => {
        const listened = js.includes(`"${f}"`) || js.includes(`'${f}'`);
        if (!listened) {
            console.log(`❌ UNLISTENED FORM: ${f}`);
            missingForms++;
        } else {
            console.log(`✅ ${f}`);
        }
    });

    // 3. Check 3-Layer System
    const hasLayerTabs = html.includes('layer-tabs-container');
    const hasCitizen = html.includes('layer-citizen-content');
    const hasStaff = html.includes('layer-staff-content');
    const hasAdmin = html.includes('layer-admin-content');
    const hasGatekeeper = html.includes('staffGatekeeper');
    console.log(`\n--- 3-Layer Architecture Check ---`);
    console.log(`Tabs Container: ${hasLayerTabs ? '✅ PRESENT' : '❌ MISSING'}`);
    console.log(`Layer 1 (Citizen): ${hasCitizen ? '✅ PRESENT' : '❌ MISSING'}`);
    console.log(`Layer 2 (Staff): ${hasStaff ? '✅ PRESENT' : '❌ MISSING'}`);
    console.log(`Layer 3 (Admin): ${hasAdmin ? '✅ PRESENT' : '❌ MISSING'}`);
    console.log(`Staff Gatekeeper: ${hasGatekeeper ? '✅ PRESENT' : '❌ MISSING'}`);

    console.log(`\nSummary: ${missingOnclicks} missing functions, ${missingForms} missing forms.`);
}

analyzeModule('Waste Management', 'frontend/pages/waste/waste.html', 'frontend/pages/waste/waste.js');
analyzeModule('Water Management', 'frontend/pages/water/water.html', 'frontend/pages/water/water.js');
