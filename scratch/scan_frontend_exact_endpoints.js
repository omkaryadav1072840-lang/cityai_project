const fs = require('fs');
const path = require('path');

const frontendDir = path.join(__dirname, '..', 'frontend');

function scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const apiCalls = [];
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
        // match any string containing /api/
        const m = line.match(/(['"`])(\/api\/[a-zA-Z0-9_\-/${}]+)\1/);
        if (m) {
            apiCalls.push({ line: idx + 1, endpoint: m[2], fullLine: line.trim() });
        }
        // also check template literals with `${...}/api/...`
        const m2 = line.match(/`([^`]*\/api\/[^`]+)`/);
        if (m2 && !m) {
            apiCalls.push({ line: idx + 1, endpoint: m2[1], fullLine: line.trim() });
        }
    });
    return apiCalls;
}

const htmlAndJs = [];
function findFiles(dir) {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, f.name);
        if (f.isDirectory() && f.name !== 'node_modules') {
            findFiles(full);
        } else if (f.name.endsWith('.js') || f.name.endsWith('.html')) {
            htmlAndJs.push(full);
        }
    }
}
findFiles(frontendDir);

const allEndpoints = [];
for (const file of htmlAndJs) {
    const rel = path.relative(path.join(__dirname, '..'), file);
    const calls = scanFile(file);
    if (calls.length > 0) {
        allEndpoints.push({ file: rel, calls });
    }
}

console.log("=== ALL DETECTED FRONTEND CALLS BY FILE ===");
for (const item of allEndpoints) {
    console.log(`\n📄 ${item.file} (${item.calls.length} calls)`);
    for (const c of item.calls) {
        console.log(`   L${c.line.toString().padEnd(4)}: ${c.endpoint}`);
    }
}
