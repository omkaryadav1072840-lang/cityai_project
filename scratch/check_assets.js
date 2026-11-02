const fs = require('fs');
const path = require('path');

function checkFile(relPath) {
    const fullHtmlPath = path.join(__dirname, '..', relPath);
    if (!fs.existsSync(fullHtmlPath)) return;
    const dir = path.dirname(fullHtmlPath);
    const html = fs.readFileSync(fullHtmlPath, 'utf8');

    const scriptRegex = /<script[^>]+src=["']([^"']+)["']/g;
    const linkRegex = /<link[^>]+href=["']([^"']+)["']/g;

    let match;
    const missing = [];

    while ((match = scriptRegex.exec(html)) !== null) {
        const src = match[1];
        if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//')) continue;
        const clean = src.split('?')[0];
        const target = path.resolve(dir, clean);
        if (!fs.existsSync(target)) {
            missing.push({ type: 'script', ref: src, resolved: target });
        }
    }

    while ((match = linkRegex.exec(html)) !== null) {
        const href = match[1];
        if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) continue;
        const clean = href.split('?')[0];
        const target = path.resolve(dir, clean);
        if (!fs.existsSync(target)) {
            missing.push({ type: 'link', ref: href, resolved: target });
        }
    }

    if (missing.length > 0) {
        console.log(`❌ ${relPath}: ${missing.length} broken assets found:`);
        missing.forEach(m => console.log(`   [${m.type}] ${m.ref} -> ${m.resolved}`));
    } else {
        console.log(`✅ ${relPath}: all script & link assets exist.`);
    }
}

const htmlFiles = [
    'frontend/index.html',
    'frontend/pages/admin/gkp_admin.html',
    'frontend/pages/hospital/hospital.html',
    'frontend/pages/hospital/doctor_dashboard.html',
    'frontend/pages/hospital/hospital_dashboard.html',
    'frontend/pages/hospital/superadmin_hospital.html',
    'frontend/pages/hospital/blood_bank.html',
    'frontend/pages/emergency/emergency.html',
    'frontend/pages/parking/parking.html',
    'frontend/pages/police/police.html',
    'frontend/pages/traffic/traffic.html',
    'frontend/pages/waste/waste.html',
    'frontend/pages/waste/control_center.html',
    'frontend/pages/waste/worker_dashboard.html',
    'frontend/pages/waste/bin_dashboard.html',
    'frontend/pages/water/water.html',
    'frontend/pages/famous/famous.html'
];

htmlFiles.forEach(checkFile);

