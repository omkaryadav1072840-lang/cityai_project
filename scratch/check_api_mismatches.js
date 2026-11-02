const fs = require('fs');
const path = require('path');

// 1. Get all registered backend routes from Express app
const { app } = require('../backend/server');

const registeredRoutes = new Set();

function extractRoutes(stack, prefix = '') {
    stack.forEach(layer => {
        if (layer.route) {
            const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase());
            const paths = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path];
            paths.forEach(p => {
                const fullPath = (prefix + p).replace(/\/+/g, '/');
                methods.forEach(method => {
                    registeredRoutes.add(`${method} ${fullPath}`);
                });
            });
        } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
            extractRoutes(layer.handle.stack, prefix);
        }
    });
}

const router = app.router || app._router;
if (router && router.stack) {
    extractRoutes(router.stack);
}

console.log(`Registered ${registeredRoutes.size} backend routes in Express.`);

// 2. Scan all frontend js/html files for API fetch/client calls
const frontendDir = path.join(__dirname, '..', 'frontend');

function getAllFiles(dir, exts = ['.js', '.html']) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const full = path.join(dir, file);
        const stat = fs.statSync(full);
        if (stat && stat.isDirectory()) {
            results = results.concat(getAllFiles(full, exts));
        } else if (exts.includes(path.extname(full))) {
            results.push(full);
        }
    });
    return results;
}

const files = getAllFiles(frontendDir);
const foundApiEndpoints = [];

const apiRegex = /["'`](\/api\/[a-zA-Z0-9_\-\/:\?=&${}]+)["'`]/g;

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    let m;
    while ((m = apiRegex.exec(content)) !== null) {
        let ep = m[1].split('?')[0]; // strip query string
        // Strip template string expressions like ${id} -> :id
        ep = ep.replace(/\$\{[^}]+\}/g, ':param');
        foundApiEndpoints.push({ file: path.relative(frontendDir, file), endpoint: ep });
    }
});

console.log(`Found ${foundApiEndpoints.length} API calls in frontend.`);

// Normalize routes for matching
function normalize(r) {
    return r.replace(/\/+$/, '')
            .replace(/:[a-zA-Z0-9_]+/g, ':param');
}

const normalizedBackend = new Set([...registeredRoutes].map(r => {
    const parts = r.split(' ');
    return normalize(parts[1]);
}));

const mismatches = [];

foundApiEndpoints.forEach(item => {
    const norm = normalize(item.endpoint);
    // Ignore dynamic query or sub-endpoints that end with slash or incomplete
    if (norm.endsWith('/') || norm === '/api') return;
    
    // Check direct match or parameter match
    let matched = false;
    for (const b of normalizedBackend) {
        if (b === norm) {
            matched = true;
            break;
        }
        // Check regex if route had params
        const pattern = '^' + b.replace(/:param/g, '[^/]+') + '$';
        if (new RegExp(pattern).test(norm)) {
            matched = true;
            break;
        }
    }
    if (!matched) {
        mismatches.push(item);
    }
});

// Deduplicate
const uniqueMismatches = {};
mismatches.forEach(m => {
    const key = m.endpoint;
    if (!uniqueMismatches[key]) uniqueMismatches[key] = [];
    uniqueMismatches[key].push(m.file);
});

console.log(`\nPotential API Mismatches (${Object.keys(uniqueMismatches).length}):`);
for (const [ep, files] of Object.entries(uniqueMismatches)) {
    console.log(`  ❌ ${ep}`);
    console.log(`     in: ${files.slice(0, 3).join(', ')}${files.length > 3 ? '...' : ''}`);
}

process.exit(0);
