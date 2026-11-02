const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();

// Recursively find all html files
function findHtmlFiles(dir, list = []) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach(e => {
        if (e.isDirectory() && !['node_modules', '.git', 'backups', 'dist'].includes(e.name)) {
            findHtmlFiles(path.join(dir, e.name), list);
        } else if (e.isFile() && e.name.endsWith('.html')) {
            list.push(path.join(dir, e.name));
        }
    });
    return list;
}

// Find all JS files
function findJsFiles(dir, list = []) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach(e => {
        if (e.isDirectory() && !['node_modules', '.git', 'backups', 'dist', 'scratch'].includes(e.name)) {
            findJsFiles(path.join(dir, e.name), list);
        } else if (e.isFile() && e.name.endsWith('.js')) {
            list.push(path.join(dir, e.name));
        }
    });
    return list;
}

const htmlFiles = findHtmlFiles('frontend');
const jsFiles = findJsFiles('frontend');

// Read all JS content
const allJsContent = jsFiles.map(f => ({
    path: path.relative(rootDir, f).replace(/\\/g, '/'),
    content: fs.readFileSync(f, 'utf8')
}));

console.log(`Auditing ${htmlFiles.length} HTML files against ${jsFiles.length} JS files...`);

const missingHandlers = [];

for (const h of htmlFiles) {
    const relHtml = path.relative(rootDir, h).replace(/\\/g, '/');
    const content = fs.readFileSync(h, 'utf8');
    
    // Find script tags inside this html
    const scriptSrcMatches = [...content.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m => m[1]);
    
    // Extract inline script blocks
    const inlineScripts = [...content.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]).join('\n');

    // Find all onclick, onchange, onsubmit, oninput
    const eventMatches = [...content.matchAll(/\s(on[a-z]+)=["']([^"']+)["']/gi)];
    
    for (const match of eventMatches) {
        const eventName = match[1];
        const eventCode = match[2].trim();

        // Extract function call name e.g. "openModal()" -> "openModal"
        const funcMatch = eventCode.match(/^([a-zA-Z0-9_$]+)\s*\(/);
        if (funcMatch) {
            const funcName = funcMatch[1];
            // Skip common built-ins
            if (['alert', 'confirm', 'console', 'window', 'document', 'history', 'event', 'location', 'setTimeout'].includes(funcName)) continue;

            // Check if defined in inline script
            const inInline = new RegExp(`(?:function\\s+${funcName}\\s*\\(|(?:window\\.|const\\s+|let\\s+|var\\s+)?${funcName}\\s*=\\s*)`).test(inlineScripts);
            
            // Check in any loaded JS file
            let inExternal = false;
            for (const js of allJsContent) {
                if (new RegExp(`(?:function\\s+${funcName}\\s*\\(|(?:window\\.|const\\s+|let\\s+|var\\s+)?${funcName}\\s*=\\s*)`).test(js.content)) {
                    inExternal = true;
                    break;
                }
            }

            if (!inInline && !inExternal) {
                missingHandlers.push({
                    html: relHtml,
                    event: eventName,
                    call: eventCode.slice(0, 80),
                    functionName: funcName
                });
            }
        }
    }
}

console.log(`\n=== MISSING / UNRESOLVED EVENT HANDLERS IN HTML (${missingHandlers.length}) ===`);
if (missingHandlers.length === 0) {
    console.log('✅ All inline onclick/onsubmit handlers are properly defined!');
} else {
    // Unique by html + functionName
    const unique = {};
    missingHandlers.forEach(m => {
        const key = `${m.html} -> ${m.functionName}`;
        if (!unique[key]) unique[key] = m;
    });
    Object.values(unique).forEach(m => {
        console.log(`❌ In [${m.html}]: ${m.event} calls "${m.functionName}" (${m.call}) - NOT DEFINED!`);
    });
}

