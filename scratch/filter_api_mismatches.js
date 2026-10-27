const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const findings = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'scratch', 'comprehensive_audit_findings.json'), 'utf8'));

// Load registered backend routes
const serverJsContent = fs.readFileSync(path.join(ROOT_DIR, 'backend', 'server.js'), 'utf8');
const registered = [];

// Base mounts
const mountRegex = /app\.use\(["'](\/api[^"']*)["'],\s*require\(["']([^"']+)["']\)/g;
let m;
const mounts = [];
while ((m = mountRegex.exec(serverJsContent)) !== null) {
    let reqPath = m[2];
    if (!reqPath.endsWith('.js')) reqPath += '.js';
    mounts.push({ prefix: m[1], file: path.resolve(ROOT_DIR, 'backend', reqPath) });
}

// Direct routes
const directRegex = /app\.(all|get|post|put|delete|patch)\(["'](\/api[^"']*)["']/g;
while ((m = directRegex.exec(serverJsContent)) !== null) {
    registered.push({ method: m[1].toUpperCase(), path: m[2] });
}

for (const mount of mounts) {
    if (!fs.existsSync(mount.file)) continue;
    const content = fs.readFileSync(mount.file, 'utf8');
    const rRegex = /router\.(all|get|post|put|delete|patch)\(["']([^"']*)["']/g;
    let rm;
    while ((rm = rRegex.exec(content)) !== null) {
        let sub = rm[2];
        if (sub === '/') sub = '';
        const full = (mount.prefix + sub).replace(/\/+/g, '/');
        registered.push({ method: rm[1].toUpperCase(), path: full });
    }
}

console.log(`Total backend routes found: ${registered.length}`);

// Check each mismatch
const genuineMismatches = [];
for (const item of findings.apiRouteMismatches) {
    let rawEp = item.endpoint.split('?')[0].trim();
    // Strip leading ${...}
    rawEp = rawEp.replace(/^\$\{[^}]+\}/, '');
    if (!rawEp.startsWith('/api')) continue;

    // Check if any registered route matches
    const isMatched = registered.some(r => {
        // convert route params :id, etc to wildcard
        const rPattern = '^' + r.path.replace(/:[a-zA-Z0-9_]+/g, '[^/]+').replace(/\*/g, '.*') + '$';
        const regex = new RegExp(rPattern);
        const testPath = rawEp.replace(/\$\{[^}]+\}/g, 'test123').replace(/\/\d+/g, '/123');
        return regex.test(testPath) || regex.test(rawEp);
    });

    if (!isMatched) {
        genuineMismatches.push({
            file: item.frontendFile,
            line: item.lineNumber,
            endpoint: rawEp
        });
    }
}

// Group by endpoint
const grouped = {};
for (const gm of genuineMismatches) {
    if (!grouped[gm.endpoint]) grouped[gm.endpoint] = [];
    grouped[gm.endpoint].push(`${gm.file}:${gm.line}`);
}

console.log(`Genuine unmatched API endpoints: ${Object.keys(grouped).length}`);
fs.writeFileSync(path.join(ROOT_DIR, 'scratch', 'filtered_api_mismatches.json'), JSON.stringify(grouped, null, 2));
console.log(JSON.stringify(grouped, null, 2));
