const fs = require('fs');
const path = require('path');
const http = require('http');

const frontendDir = path.join(__dirname, '..', 'frontend');
const backendDir = path.join(__dirname, '..', 'backend');

// 1. Extract backend routes
const backendRoutes = [];
const routeFiles = fs.readdirSync(path.join(backendDir, 'routes')).filter(f => f.endsWith('.js'));
for (const rf of routeFiles) {
    const code = fs.readFileSync(path.join(backendDir, 'routes', rf), 'utf8');
    const regex = /router\.(get|post|put|delete|patch)\(\s*["']([^"']+)["']/gi;
    let m;
    while ((m = regex.exec(code)) !== null) {
        backendRoutes.push({
            file: rf,
            method: m[1].toUpperCase(),
            path: m[2]
        });
    }
}

// 2. Extract frontend endpoints from each file
const frontendModules = [
    { name: 'traffic', file: 'pages/traffic/traffic.js' },
    { name: 'parking', file: 'pages/parking/parking.js' },
    { name: 'hospital', file: 'pages/hospital/hospital.js' },
    { name: 'hospital_dash', file: 'pages/hospital/hospital_dashboard.js' },
    { name: 'doctor_dash', file: 'pages/hospital/doctor_dashboard.js' },
    { name: 'waste', file: 'pages/waste/waste.js' },
    { name: 'water', file: 'pages/water/water.js' },
    { name: 'emergency', file: 'pages/emergency/emergency.js' },
    { name: 'police', file: 'pages/police/police.js' },
    { name: 'famous', file: 'pages/famous/famous.js' },
    { name: 'main', file: 'script.js' },
    { name: 'auth', file: 'auth.js' }
];

function routePatternToRegex(routePath) {
    // Replace :param with [^/]+
    const p = routePath.replace(/:[a-zA-Z0-9_]+/g, '[^/]+');
    return new RegExp(`^${p}$`);
}

const auditReport = [];

for (const mod of frontendModules) {
    const fullPath = path.join(frontendDir, mod.file);
    if (!fs.existsSync(fullPath)) continue;
    const code = fs.readFileSync(fullPath, 'utf8');

    // Find all strings containing /api/
    const apiMatches = code.match(/["'`](\/api\/[^"'`\s?#]+)["'`]/g) || [];
    const endpoints = new Set();
    for (const m of apiMatches) {
        // clean up
        let ep = m.replace(/^["'`]|["'`]$/g, '');
        // normalize template strings like ${foo} to a placeholder :param
        ep = ep.replace(/\$\{[^}]+\}/g, ':param');
        endpoints.add(ep);
    }

    // Check each endpoint against backend routes
    for (const ep of endpoints) {
        // Strip trailing slash
        const cleanEp = ep.replace(/\/$/, '');
        // Test if matches any backend route
        const matched = backendRoutes.filter(br => {
            const regex = routePatternToRegex(br.path);
            const testPath = cleanEp.replace(/:param/g, 'dummy');
            return regex.test(testPath);
        });

        if (matched.length === 0) {
            auditReport.push({
                module: mod.name,
                file: mod.file,
                frontendEndpoint: ep,
                status: 'BACKEND_ROUTE_MISSING',
                detail: `Frontend calls "${ep}" but no matching backend route exists!`
            });
        }
    }
}

console.log("=== FRONTEND-TO-BACKEND MISMATCHES ===");
console.log(`Total Mismatches Found: ${auditReport.length}`);
for (const item of auditReport) {
    console.log(`[${item.module}] ${item.frontendEndpoint}`);
    console.log(`   File: ${item.file}`);
}

fs.writeFileSync(path.join(__dirname, 'frontend_backend_mismatches.json'), JSON.stringify(auditReport, null, 2));
