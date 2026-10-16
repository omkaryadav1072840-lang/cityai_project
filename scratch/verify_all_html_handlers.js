const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');

function findHtmlFiles(dir) {
    let results = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            if (ent.name !== 'node_modules' && !ent.name.startsWith('.')) {
                results = results.concat(findHtmlFiles(full));
            }
        } else if (ent.name.endsWith('.html')) {
            results.push(full);
        }
    }
    return results;
}

const htmlFiles = findHtmlFiles(FRONTEND_DIR);
console.log(`Checking ${htmlFiles.length} HTML files for broken event handlers...`);

let totalFoundMissing = 0;

for (const htmlFile of htmlFiles) {
    const html = fs.readFileSync(htmlFile, 'utf8');
    const htmlDir = path.dirname(htmlFile);

    // Extract script srcs
    const scriptSrcs = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m => m[1]);
    let combinedJs = '';
    for (const src of scriptSrcs) {
        if (src.startsWith('http://') || src.startsWith('https://') || src === '/socket.io/socket.io.js') continue;
        const clean = src.split('?')[0];
        const resolved = clean.startsWith('/') ? path.join(FRONTEND_DIR, clean.slice(1)) : path.resolve(htmlDir, clean);
        if (fs.existsSync(resolved)) {
            combinedJs += '\n' + fs.readFileSync(resolved, 'utf8');
        }
    }
    // Inline scripts
    const inline = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
    combinedJs += '\n' + inline.join('\n');

    // Also include auth.js if not directly referenced but global
    const authPath = path.join(FRONTEND_DIR, 'auth.js');
    if (fs.existsSync(authPath) && !combinedJs.includes('SmartCityAuth')) {
        combinedJs += '\n' + fs.readFileSync(authPath, 'utf8');
    }

    // Match all inline event handlers
    const eventMatches = [...html.matchAll(/on(?:click|change|input|submit)=["']([^"']+)["']/gi)];
    const missingInFile = new Set();

    for (const em of eventMatches) {
        const stmt = em[1].trim();
        const parts = stmt.split(';');
        for (const p of parts) {
            const trimmed = p.trim();
            if (!trimmed) continue;
            // Match function call like funcName(...)
            const m = trimmed.match(/^([a-zA-Z0-9_$]+)\s*\(/);
            if (m) {
                const fn = m[1];
                // Ignore built-ins or syntax keywords
                if (['if', 'for', 'while', 'alert', 'confirm', 'prompt', 'console', 'window', 'document', 'history', 'event', 'parseInt', 'parseFloat', 'Boolean', 'Number', 'String', 'setTimeout', 'clearTimeout'].includes(fn)) continue;
                
                // Check if fn is defined in combinedJs
                const fnRegex = new RegExp(`(?:function\\s+${fn}\\b|\\b${fn}\\s*=|window\\.${fn}\\s*=|${fn}\\s*:)`);
                if (!fnRegex.test(combinedJs)) {
                    missingInFile.add(fn);
                }
            }
        }
    }

    if (missingInFile.size > 0) {
        console.log(`\n❌ In ${path.relative(ROOT_DIR, htmlFile)}:`);
        for (const fn of missingInFile) {
            console.log(`   - Missing function: ${fn}()`);
            totalFoundMissing++;
        }
    }
}

console.log(`\n=================================================`);
console.log(`TOTAL MISSING EVENT HANDLERS: ${totalFoundMissing}`);
console.log(`=================================================`);
