/**
 * Route & Function Discovery Tool
 * Introspects express app and all route files to extract every route, method, and handler.
 */
const fs = require('fs');
const path = require('path');

// Mock or require routes
const routeFiles = [
    'city.routes.js',
    'auth.routes.js',
    'patient.routes.js',
    'appointment.routes.js',
    'doctor.routes.js',
    'hospital.routes.js',
    'diagnostics.routes.js',
    'ambulance.routes.js',
    'emergency.routes.js',
    'pharmacy.routes.js',
    'waste.routes.js',
    'parking.routes.js',
    'water.routes.js',
    'police.routes.js',
    'ai.routes.js',
    'famous_places.routes.js',
    'traffic.routes.js',
    'requests.routes.js',
    'notifications.routes.js',
    'street_lights.routes.js',
    'environment.routes.js',
    'admin.routes.js',
    'search.routes.js',
    'map.routes.js',
    'analytics.routes.js'
];

const results = [];

for (const file of routeFiles) {
    const fullPath = path.join(__dirname, '..', 'backend', 'routes', file);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, 'utf8');
    
    // Regex to match router.get/post/put/delete/patch
    const routeRegex = /router\.(get|post|put|patch|delete)\s*\(\s*(['"][^'"]+['"]|\[[^\]]+\])([\s\S]*?)(?=\n\s*router\.|\n\s*module\.exports|$)/g;
    let match;
    while ((match = routeRegex.exec(content)) !== null) {
        const method = match[1].toUpperCase();
        let rawPaths = match[2];
        const rest = match[3];
        
        let paths = [];
        if (rawPaths.startsWith('[')) {
            paths = rawPaths.replace(/[\[\]'"]/g, '').split(',').map(s => s.trim());
        } else {
            paths = [rawPaths.replace(/['"]/g, '').trim()];
        }
        
        const hasAuth = rest.includes('verifyToken') || rest.includes('requireAuth') || rest.includes('authenticate');
        const hasRole = rest.includes('authorizeRole') || rest.includes('requireRole') || rest.includes('checkRole') || rest.includes('roles.');
        
        for (const p of paths) {
            results.push({
                file,
                method,
                path: p,
                hasAuth,
                hasRole,
                snippet: rest.slice(0, 150).replace(/\r?\n/g, ' ')
            });
        }
    }
}

console.log(`Total API endpoints discovered: ${results.length}`);
fs.writeFileSync(path.join(__dirname, 'discovered_routes.json'), JSON.stringify(results, null, 2));
