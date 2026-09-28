const fs = require('fs');
const path = require('path');

const frontendDir = path.join(__dirname, '..', 'frontend');

function getFiles(dir, exts) {
    let files = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
        const full = path.join(dir, item.name);
        if (item.isDirectory()) {
            if (item.name !== 'node_modules' && item.name !== '.git') {
                files = files.concat(getFiles(full, exts));
            }
        } else if (exts.some(ext => item.name.endsWith(ext))) {
            files.push(full);
        }
    }
    return files;
}

const jsFiles = getFiles(frontendDir, ['.js', '.html']);

// Regex to capture fetch('/api/...'), axios.get('/api/...'), etc.
const apiRegex = /["'`]((\/api\/[a-zA-Z0-9_\-\/${}]+))["'`]/g;

const frontendCalls = {};

for (const f of jsFiles) {
    const content = fs.readFileSync(f, 'utf8');
    let match;
    const rel = path.relative(path.join(__dirname, '..'), f);
    while ((match = apiRegex.exec(content)) !== null) {
        const endpoint = match[1];
        if (!frontendCalls[endpoint]) {
            frontendCalls[endpoint] = [];
        }
        if (!frontendCalls[endpoint].includes(rel)) {
            frontendCalls[endpoint].push(rel);
        }
    }
}

console.log("=== FRONTEND API CALLS DETECTED ===");
console.log(`Unique API Endpoints: ${Object.keys(frontendCalls).length}`);
for (const [ep, callers] of Object.entries(frontendCalls).sort()) {
    console.log(`${ep.padEnd(50)} -> [${callers.join(', ')}]`);
}

fs.writeFileSync(path.join(__dirname, 'frontend_api_calls.json'), JSON.stringify(frontendCalls, null, 2));
