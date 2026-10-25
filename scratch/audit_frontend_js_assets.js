const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');

const findings = [];

function getAllJsFiles(dir) {
    let results = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            results = results.concat(getAllJsFiles(full));
        } else if (ent.name.endsWith('.js')) {
            results.push(full);
        }
    }
    return results;
}

const jsFiles = getAllJsFiles(FRONTEND_DIR);

// Regex for string literals ending in .html, .png, .jpg, .svg, .ico, .gif, .gltf, .bin, .mp3, .wav, .json
const assetRegex = /['"]([^'"]+\.(?:html|png|jpg|jpeg|svg|ico|gif|gltf|bin|mp3|wav|json|css))['"]/gi;

for (const f of jsFiles) {
    const content = fs.readFileSync(f, 'utf8');
    const relFile = path.relative(ROOT_DIR, f);
    let match;
    while ((match = assetRegex.exec(content)) !== null) {
        const str = match[1].trim();
        // Skip externals, data, protocol
        if (str.startsWith('http://') || str.startsWith('https://') || str.startsWith('//') || str.startsWith('data:')) {
            continue;
        }
        // Skip common pure mime or format tokens like 'application/json' or 'text/html'
        if (str === 'application/json' || str === 'text/html' || str === 'text/css' || str === 'image/png' || str === 'image/svg+xml') {
            continue;
        }

        // Clean query/hash
        const cleanStr = str.split('?')[0].split('#')[0];
        if (!cleanStr) continue;

        let candidate;
        if (cleanStr.startsWith('/')) {
            candidate = path.join(FRONTEND_DIR, cleanStr);
        } else {
            // could be relative to file or relative to frontend root
            const relToFile = path.resolve(path.dirname(f), cleanStr);
            const relToRoot = path.resolve(FRONTEND_DIR, cleanStr);
            if (fs.existsSync(relToFile)) {
                candidate = relToFile;
            } else if (fs.existsSync(relToRoot)) {
                candidate = relToRoot;
            } else {
                candidate = relToFile; // failed
            }
        }

        if (!fs.existsSync(candidate)) {
            // Also check if it's an uploaded file in backend/uploads or similar
            const backendUpload = path.resolve(ROOT_DIR, 'backend', cleanStr.startsWith('/') ? cleanStr.slice(1) : cleanStr);
            if (!fs.existsSync(backendUpload)) {
                findings.push({
                    sourceFile: relFile,
                    referenced: str,
                    resolvedCandidate: path.relative(ROOT_DIR, candidate)
                });
            }
        }
    }
}

console.log('Total unresolved asset string literals found in frontend js:', findings.length);
for (const f of findings) {
    console.log(`[${f.sourceFile}] -> "${f.referenced}" (attempted: ${f.resolvedCandidate})`);
}

fs.writeFileSync(path.join(ROOT_DIR, 'scratch', 'frontend_js_asset_audit.json'), JSON.stringify(findings, null, 2), 'utf8');
