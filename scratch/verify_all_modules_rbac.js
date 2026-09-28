const fs = require('fs');
const path = require('path');

const modules = [
    { name: 'Parking', html: 'frontend/pages/parking/parking.html', js: 'frontend/pages/parking/parking.js' },
    { name: 'Traffic', html: 'frontend/pages/traffic/traffic.html', js: 'frontend/pages/traffic/traffic.js' },
    { name: 'Police', html: 'frontend/pages/police/police.html', js: 'frontend/pages/police/police.js' },
    { name: 'Emergency', html: 'frontend/pages/emergency/emergency.html', js: 'frontend/pages/emergency/emergency.js' },
    { name: 'Hospital', html: 'frontend/pages/hospital/hospital.html', js: 'frontend/pages/hospital/hospital.js' },
    { name: 'Famous Places', html: 'frontend/pages/famous/famous.html', js: 'frontend/pages/famous/famous.js' },
    { name: 'Water', html: 'frontend/pages/water/water.html', js: 'frontend/pages/water/water.js' },
    { name: 'Waste', html: 'frontend/pages/waste/waste.html', js: 'frontend/pages/waste/waste.js' }
];

console.log('=== VERIFYING 3-LAYER RBAC & GATEKEEPER IMPLEMENTATION ACROSS ALL MODULES ===\n');

let allPassed = true;

for (const mod of modules) {
    console.log(`Checking [${mod.name}]...`);
    const htmlPath = path.resolve(__dirname, '..', mod.html);
    const jsPath = path.resolve(__dirname, '..', mod.js);

    if (!fs.existsSync(htmlPath)) {
        console.error(`  ❌ HTML file missing: ${mod.html}`);
        allPassed = false;
        continue;
    }
    if (!fs.existsSync(jsPath)) {
        console.error(`  ❌ JS file missing: ${mod.js}`);
        allPassed = false;
        continue;
    }

    const html = fs.readFileSync(htmlPath, 'utf8');
    const js = fs.readFileSync(jsPath, 'utf8');

    // 1. Layer tabs container
    const hasTabs = html.includes('layer-tabs-container') && html.includes('layer-tab-btn');
    // 2. Role banner
    const hasRoleBanner = html.includes('roleBanner') && html.includes('roleTitle') && html.includes('rolePill');
    // 3. Staff gatekeeper
    const hasStaffGatekeeper = html.includes('staffGatekeeper') && html.includes('staffOperationsMain');
    // 4. Admin gatekeeper
    const hasAdminGatekeeper = html.includes('adminGatekeeper') && html.includes('adminAssetsMain');
    // 5. Layer containers
    const hasLayers = html.includes('layer-citizen-content') &&
                      (html.includes('layer-staff-content') || html.includes('layer-control-content')) &&
                      html.includes('layer-admin-content');
    // 6. JS role UI & gatekeeper logic
    const hasRoleJS = (js.includes('applyRoleUI') || js.includes('applyWasteRoleUI') || js.includes('applyWaterRoleUI')) &&
                      (js.includes('Gatekeeper') || js.includes('staffGatekeeper'));

    const checks = [
        { label: '3-Layer Tabs Container', ok: hasTabs },
        { label: 'Role Banner with Title & Pill', ok: hasRoleBanner },
        { label: 'Layer Containers (1, 2, 3)', ok: hasLayers },
        { label: 'Staff Gatekeeper Card & Lock UI', ok: hasStaffGatekeeper },
        { label: 'Admin Gatekeeper Card & Lock UI', ok: hasAdminGatekeeper },
        { label: 'JS Role UI & Gatekeeper Logic', ok: hasRoleJS }
    ];

    let modOk = true;
    for (const c of checks) {
        if (!c.ok) {
            console.error(`  ❌ Failed: ${c.label}`);
            modOk = false;
            allPassed = false;
        } else {
            console.log(`  ✓ ${c.label}`);
        }
    }

    if (modOk) {
        console.log(`  🎉 ${mod.name}: 100% compliant with RBAC gatekeeper & 3-layer architecture.\n`);
    } else {
        console.log(`  ⚠️ ${mod.name}: Has missing components.\n`);
    }
}

if (allPassed) {
    console.log('✅ ALL 8 MODULES PASSED VERIFICATION AUDIT!');
} else {
    console.error('❌ SOME MODULES FAILED VERIFICATION AUDIT.');
    process.exit(1);
}
