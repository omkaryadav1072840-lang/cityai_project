const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');
const BACKEND_DIR = path.join(ROOT_DIR, 'backend');

// 1. Collect all registered backend endpoints from backend/server.js and backend/routes/*.js
const routeFiles = fs.readdirSync(path.join(BACKEND_DIR, 'routes'))
    .filter(f => f.endsWith('.js'))
    .map(f => path.join(BACKEND_DIR, 'routes', f));
routeFiles.push(path.join(BACKEND_DIR, 'server.js'));

const backendEndpoints = [];

for (const rf of routeFiles) {
    const content = fs.readFileSync(rf, 'utf8');
    // Match router.get('/api/...', ...) or app.get('/api/...', ...)
    const routeRegex = /(?:router|app)\.(get|post|put|delete|patch|all)\(\s*(\[[^\]]+\]|["'`][^"'`]+["'`])/g;
    let match;
    while ((match = routeRegex.exec(content)) !== null) {
        const method = match[1].toUpperCase();
        let pathExpr = match[2].trim();
        if (pathExpr.startsWith('[')) {
            // Array of paths e.g. ["/api/health", "/health"]
            const items = pathExpr.replace(/[\[\]"'\s]/g, '').split(',');
            for (const item of items) {
                if (item.startsWith('/api')) {
                    backendEndpoints.push({ method, path: item, file: path.relative(ROOT_DIR, rf) });
                }
            }
        } else {
            let p = pathExpr.replace(/["'`]/g, '');
            if (p.startsWith('/api')) {
                backendEndpoints.push({ method, path: p, file: path.relative(ROOT_DIR, rf) });
            }
        }
    }
}

console.log(`Discovered ${backendEndpoints.length} registered backend API endpoints.`);

// 2. Extract all API calls from frontend JS
function getFiles(dir, exts) {
    let files = [];
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, item.name);
        if (item.isDirectory()) files.push(...getFiles(full, exts));
        else if (exts.some(e => item.name.endsWith(e))) files.push(full);
    }
    return files;
}

const frontendJs = getFiles(FRONTEND_DIR, ['.js']);
const frontendCalls = [];

for (const f of frontendJs) {
    const content = fs.readFileSync(f, 'utf8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Match fetch("/api/...", ...) or fetch(`${API_BASE}/api/...`, ...) or fetch(BACKEND_URL + "/api/...", ...)
        const match = line.match(/(?:fetch|fetchWithAuth|axios\.(?:get|post|put|delete))\s*\(\s*[`"']([^`"']*\/api\/[^`"']*)[`"']/i) ||
                      line.match(/[`"'](\/api\/[^`"']+)["'`]/i);
        if (match) {
            let endpoint = match[1];
            // Remove leading variable if any, e.g. ${API_BASE}/api/... -> /api/...
            endpoint = endpoint.replace(/^.*(\/api\/.*)$/, '$1');
            const cleanEndpoint = endpoint.split('?')[0].trim();
            frontendCalls.push({
                file: path.relative(ROOT_DIR, f),
                line: i + 1,
                raw: match[0],
                cleanEndpoint
            });
        }
    }
}

console.log(`Discovered ${frontendCalls.length} frontend API calls.`);

// 3. Match each frontend call against backend endpoints
const brokenCalls = [];

for (const call of frontendCalls) {
    // Ignore external APIs like google maps, etc.
    if (!call.cleanEndpoint.startsWith('/api/')) continue;
    
    // Normalize frontend call: replace ${...} with dummy param
    const testPath = call.cleanEndpoint.replace(/\$\{[^}]+\}/g, 'x123');

    const matched = backendEndpoints.some(be => {
        // Convert express route param :paramName or * to regex
        const pattern = '^' + be.path
            .replace(/:[a-zA-Z0-9_]+/g, '[^/]+')
            .replace(/\*/g, '.*') + '$';
        const regex = new RegExp(pattern);
        return regex.test(testPath) || regex.test(call.cleanEndpoint);
    });

    if (!matched) {
        brokenCalls.push(call);
    }
}

// Group broken calls by endpoint
const groupedBroken = {};
for (const b of brokenCalls) {
    if (!groupedBroken[b.cleanEndpoint]) groupedBroken[b.cleanEndpoint] = [];
    groupedBroken[b.cleanEndpoint].push(`${b.file}:${b.line}`);
}

console.log(`\n======================================================`);
console.log(`GENUINE UNMATCHED API ENDPOINTS: ${Object.keys(groupedBroken).length}`);
console.log(`======================================================`);
for (const [ep, locations] of Object.entries(groupedBroken)) {
    console.log(`\n❌ Endpoint: ${ep}`);
    console.log(`   Called from ${locations.length} location(s):`);
    for (const loc of locations.slice(0, 3)) console.log(`     - ${loc}`);
    if (locations.length > 3) console.log(`     ... and ${locations.length - 3} more`);
}

fs.writeFileSync(path.join(ROOT_DIR, 'scratch', 'real_api_mismatches.json'), JSON.stringify(groupedBroken, null, 2));
