const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT_DIR = path.resolve(__dirname, '..');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');
const BACKEND_DIR = path.join(ROOT_DIR, 'backend');

const results = {
    syntaxErrors: [],
    htmlAssetErrors: [],
    duplicateIds: [],
    brokenEventHandlers: [],
    missingDomElements: [],
    apiRouteMismatches: [],
    backendLogicalIssues: [],
    authKeyInconsistencies: []
};

// Helper: recursively find files
function getFiles(dir, exts, excludeDirs = ['node_modules', '.git']) {
    let files = [];
    if (!fs.existsSync(dir)) return files;
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
        if (excludeDirs.includes(item.name)) continue;
        const full = path.join(dir, item.name);
        if (item.isDirectory()) {
            files = files.concat(getFiles(full, exts, excludeDirs));
        } else if (exts.some(ext => item.name.endsWith(ext))) {
            files.push(full);
        }
    }
    return files;
}

// 1. SYNTAX CHECK
console.log('--- 1. Checking JS Syntax across Frontend and Backend ---');
const allJsFiles = [
    ...getFiles(FRONTEND_DIR, ['.js']),
    ...getFiles(BACKEND_DIR, ['.js'], ['node_modules', '.git', 'uploads'])
];

for (const f of allJsFiles) {
    try {
        const code = fs.readFileSync(f, 'utf8');
        new vm.Script(code, { filename: f });
    } catch (err) {
        results.syntaxErrors.push({
            file: path.relative(ROOT_DIR, f),
            line: err.stack ? err.stack.split('\n')[0] : err.message,
            message: err.message
        });
    }
}

// 2. HTML AUDIT: Assets, duplicate IDs, inline handlers
console.log('--- 2. Checking HTML files: Assets, Duplicate IDs, and Event Handlers ---');
const htmlFiles = getFiles(FRONTEND_DIR, ['.html']);
const htmlData = {}; // file -> { content, ids, scripts, stylesheets, inlineHandlers }

for (const htmlFile of htmlFiles) {
    const relHtml = path.relative(ROOT_DIR, htmlFile);
    const htmlDir = path.dirname(htmlFile);
    const content = fs.readFileSync(htmlFile, 'utf8');

    // Duplicate IDs
    const idRegex = /id=["']([^"']+)["']/g;
    let match;
    const ids = new Set();
    const dupes = [];
    while ((match = idRegex.exec(content)) !== null) {
        const id = match[1];
        if (ids.has(id)) {
            dupes.push(id);
        }
        ids.add(id);
    }
    if (dupes.length > 0) {
        results.duplicateIds.push({ file: relHtml, duplicateIds: [...new Set(dupes)] });
    }

    // Scripts
    const scriptSrcRegex = /<script[^>]+src=["']([^"']+)["']/g;
    const scriptPaths = [];
    while ((match = scriptSrcRegex.exec(content)) !== null) {
        const src = match[1];
        if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//')) {
            continue; // external CDN
        }
        let cleanSrc = src.split('?')[0];
        let diskPath;
        if (cleanSrc.startsWith('/')) {
            diskPath = path.join(FRONTEND_DIR, cleanSrc.substring(1));
        } else {
            diskPath = path.resolve(htmlDir, cleanSrc);
        }
        scriptPaths.push(diskPath);
        if (!fs.existsSync(diskPath)) {
            results.htmlAssetErrors.push({
                file: relHtml,
                type: 'Missing Script',
                src,
                resolvedPath: path.relative(ROOT_DIR, diskPath)
            });
        }
    }

    // Stylesheets
    const cssHrefRegex = /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/g;
    while ((match = cssHrefRegex.exec(content)) !== null) {
        const href = match[1];
        if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) continue;
        let cleanHref = href.split('?')[0];
        let diskPath;
        if (cleanHref.startsWith('/')) {
            diskPath = path.join(FRONTEND_DIR, cleanHref.substring(1));
        } else {
            diskPath = path.resolve(htmlDir, cleanHref);
        }
        if (!fs.existsSync(diskPath)) {
            results.htmlAssetErrors.push({
                file: relHtml,
                type: 'Missing Stylesheet',
                href,
                resolvedPath: path.relative(ROOT_DIR, diskPath)
            });
        }
    }

    // Images
    const imgSrcRegex = /<img[^>]+src=["']([^"']+)["']/g;
    while ((match = imgSrcRegex.exec(content)) !== null) {
        const src = match[1];
        if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//') || src.startsWith('data:')) continue;
        let diskPath;
        if (src.startsWith('/')) {
            diskPath = path.join(FRONTEND_DIR, src.substring(1));
        } else {
            diskPath = path.resolve(htmlDir, src);
        }
        if (!fs.existsSync(diskPath)) {
            results.htmlAssetErrors.push({
                file: relHtml,
                type: 'Missing Image',
                src,
                resolvedPath: path.relative(ROOT_DIR, diskPath)
            });
        }
    }

    // Inline event handlers: onclick, onchange, onsubmit, oninput, etc.
    const inlineHandlerRegex = /\s(on[a-z]+)=["']([^"']+)["']/gi;
    const inlineHandlers = [];
    while ((match = inlineHandlerRegex.exec(content)) !== null) {
        const attr = match[1];
        const val = match[2].trim();
        inlineHandlers.push({ attr, val });
    }

    htmlData[htmlFile] = {
        relHtml,
        ids,
        scriptPaths,
        inlineHandlers,
        content
    };
}

// 3. CHECK INLINE HANDLERS vs JAVASCRIPT FUNCTIONS
console.log('--- 3. Checking inline event handlers against defined JS functions ---');
for (const [htmlFile, data] of Object.entries(htmlData)) {
    // Combine content of all scripts included in this HTML
    let combinedJs = '';
    for (const sPath of data.scriptPaths) {
        if (fs.existsSync(sPath)) {
            combinedJs += '\n' + fs.readFileSync(sPath, 'utf8');
        }
    }
    // Also extract inline <script> blocks in the HTML
    const inlineScriptRegex = /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
    let sMatch;
    while ((sMatch = inlineScriptRegex.exec(data.content)) !== null) {
        combinedJs += '\n' + sMatch[1];
    }

    for (const handler of data.inlineHandlers) {
        const code = handler.val;
        // Extract function call: e.g. switchTab('tab') -> switchTab, or SmartCityAuth.showModal() -> SmartCityAuth
        // Ignore simple statements like "this.select()" or "window.location=..." or "return false;"
        if (/^(return\s+|window\.|this\.|event\.|console\.)/.test(code)) continue;
        if (code === 'void(0)' || code === 'return false;' || code === 'return false') continue;

        const fnCallMatch = code.match(/^([a-zA-Z0-9_$]+(\.[a-zA-Z0-9_$]+)*)\s*\(/);
        if (fnCallMatch) {
            const fullFnName = fnCallMatch[1];
            const rootName = fullFnName.split('.')[0];
            
            // Check if rootName or fullFnName is defined in combinedJs
            // e.g. function rootName, rootName =, window.rootName =, const rootName =, let rootName =, var rootName =
            const fnPattern = new RegExp(`(function\\s+${rootName}\\b|\\b${rootName}\\s*=|window\\.${rootName}\\b|var\\s+${rootName}\\b|let\\s+${rootName}\\b|const\\s+${rootName}\\b|class\\s+${rootName}\\b)`, 'g');
            if (!fnPattern.test(combinedJs)) {
                // Also check if it's a standard browser function (e.g. alert, confirm, history.back)
                const standardGlobals = ['alert', 'confirm', 'prompt', 'history', 'location', 'print', 'close', 'open'];
                if (!standardGlobals.includes(rootName)) {
                    results.brokenEventHandlers.push({
                        htmlFile: data.relHtml,
                        handlerAttr: handler.attr,
                        call: code,
                        missingFunction: fullFnName
                    });
                }
            }
        }
    }
}

// 4. CHECK UNGUARDED DOM GETELEMENTBYID IN FRONTEND JS
console.log('--- 4. Checking DOM element accesses for null safety / missing IDs ---');
for (const [htmlFile, data] of Object.entries(htmlData)) {
    for (const sPath of data.scriptPaths) {
        if (!fs.existsSync(sPath)) continue;
        const jsContent = fs.readFileSync(sPath, 'utf8');
        const lines = jsContent.split('\n');
        
        // Find lines with document.getElementById('id')
        const getElRegex = /document\.getElementById\(["']([^"']+)["']\)(\.|\s*\[)/g;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            let match;
            while ((match = getElRegex.exec(line)) !== null) {
                const elId = match[1];
                const accessor = match[2];
                // If ID is not in HTML
                if (!data.ids.has(elId)) {
                    // Check if line or preceding line checks `if (document.getElementById(...))` or uses optional chaining `?.`
                    if (!line.includes(`document.getElementById('${elId}')?.`) && 
                        !line.includes(`document.getElementById("${elId}")?.`) &&
                        !line.includes(`if (`) && !line.includes(`? `) && !line.includes(`&&`)) {
                        
                        results.missingDomElements.push({
                            htmlFile: data.relHtml,
                            scriptFile: path.relative(ROOT_DIR, sPath),
                            lineNumber: i + 1,
                            elementId: elId,
                            lineSnippet: line.trim().substring(0, 120)
                        });
                    }
                }
            }
        }
    }
}

// 5. EXTRACT FRONTEND API CALLS & COMPARE WITH BACKEND ROUTES
console.log('--- 5. Checking Frontend API Calls vs Backend Routes ---');
// Read backend server.js and routes
const backendRouteFiles = getFiles(path.join(BACKEND_DIR, 'routes'), ['.js']);
const registeredRoutes = [];

// Look at server.js to see base paths: app.use('/api/...', ...)
const serverJsContent = fs.readFileSync(path.join(BACKEND_DIR, 'server.js'), 'utf8');
const mountRegex = /app\.use\(["'](\/api[^"']*)["'],\s*require\(["']([^"']+)["']\)/g;
const mounts = {};
let m;
while ((m = mountRegex.exec(serverJsContent)) !== null) {
    const basePath = m[1];
    let routeReq = m[2];
    if (!routeReq.endsWith('.js')) routeReq += '.js';
    const absRoutePath = path.resolve(BACKEND_DIR, routeReq);
    mounts[absRoutePath] = basePath;
}

// Also check direct routes in server.js: app.get('/api/..., ...)
const directRouteRegex = /app\.(get|post|put|delete|patch)\(["'](\/api[^"']*)["']/g;
while ((m = directRouteRegex.exec(serverJsContent)) !== null) {
    registeredRoutes.push({ method: m[1].toUpperCase(), path: m[2], file: 'backend/server.js' });
}

// In each route file, extract router.get/post/put/delete/patch
for (const rf of backendRouteFiles) {
    const rfContent = fs.readFileSync(rf, 'utf8');
    const basePath = mounts[rf] || '';
    const routerRegex = /router\.(get|post|put|delete|patch)\(["']([^"']*)["']/g;
    let rm;
    while ((rm = routerRegex.exec(rfContent)) !== null) {
        const method = rm[1].toUpperCase();
        let subPath = rm[2];
        if (subPath === '/') subPath = '';
        const fullPath = (basePath + subPath).replace(/\/+/g, '/');
        registeredRoutes.push({ method, path: fullPath, file: path.relative(ROOT_DIR, rf) });
    }
}

// Now extract API calls from frontend JS
const frontendJsFiles = getFiles(FRONTEND_DIR, ['.js']);
const apiCalls = [];
for (const f of frontendJsFiles) {
    const content = fs.readFileSync(f, 'utf8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Match fetch('/api/...') or fetch(`${API_BASE}/api/...`) or fetch(url + '/api/...')
        const fetchMatch = line.match(/(?:fetch|fetchWithAuth|get|post|put|delete)\(\s*[`"']([^`"']*\/api\/[^`"']*)[`"']/i) ||
                           line.match(/(?:fetch|fetchWithAuth)\(\s*`\${[^}]+}(\/api\/[^`]+)`/i);
        if (fetchMatch) {
            let endpoint = fetchMatch[1];
            // Normalize parameterized strings like /api/hospital/${id} -> /api/hospital/:param
            const normalized = endpoint.replace(/\$\{[^}]+\}/g, ':param').split('?')[0];
            apiCalls.push({
                file: path.relative(ROOT_DIR, f),
                line: i + 1,
                endpoint,
                normalized
            });
        }
    }
}

// Match each API call against registeredRoutes
for (const call of apiCalls) {
    // Check if any registered route matches
    const callParts = call.normalized.split('/').filter(Boolean);
    const matchFound = registeredRoutes.some(r => {
        const rParts = r.path.split('/').filter(Boolean);
        if (rParts.length !== callParts.length) return false;
        for (let idx = 0; idx < rParts.length; idx++) {
            if (rParts[idx].startsWith(':')) continue; // param
            if (callParts[idx] === ':param') continue;
            if (rParts[idx] !== callParts[idx]) return false;
        }
        return true;
    });

    if (!matchFound) {
        // Also check if handled via generic proxy or wildcard
        const isDynamicOrWildcard = call.normalized.includes(':param') || call.normalized.includes('*');
        results.apiRouteMismatches.push({
            frontendFile: call.file,
            lineNumber: call.line,
            endpoint: call.endpoint,
            normalized: call.normalized,
            possibleIssue: 'No matching backend route found'
        });
    }
}

// 6. CHECK AUTH STORAGE KEY CONSISTENCY
console.log('--- 6. Checking Auth Token & Storage Key Consistency ---');
const storageKeys = new Map();
for (const f of frontendJsFiles) {
    const content = fs.readFileSync(f, 'utf8');
    const keyRegex = /localStorage\.(?:getItem|setItem|removeItem)\(["']([^"']+)["']/g;
    let km;
    while ((km = keyRegex.exec(content)) !== null) {
        const key = km[1];
        if (!storageKeys.has(key)) storageKeys.set(key, []);
        storageKeys.get(key).push(path.relative(ROOT_DIR, f));
    }
}

// 7. CHECK BACKEND FOR LOGICAL RISKS (e.g. unhandled async, missing return after res.status)
console.log('--- 7. Checking Backend Routes for Missing Returns & Potential Logic Bugs ---');
for (const rf of backendRouteFiles) {
    const rfContent = fs.readFileSync(rf, 'utf8');
    const lines = rfContent.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Look for pattern: res.status(400).json(...) where there is NO return on the line and next line executes code
        if (line.includes('res.status(') && line.includes('.json(') && !line.includes('return ') && !line.includes('};')) {
            const nextNonEmpty = lines.slice(i + 1, i + 5).find(l => l.trim() && !l.trim().startsWith('//') && !l.trim().startsWith('/*'));
            if (nextNonEmpty && !nextNonEmpty.trim().startsWith('}') && !nextNonEmpty.trim().startsWith('catch') && !nextNonEmpty.trim().startsWith('return')) {
                results.backendLogicalIssues.push({
                    file: path.relative(ROOT_DIR, rf),
                    line: i + 1,
                    snippet: line.trim(),
                    issue: 'res.status().json() without return keyword before subsequent code execution'
                });
            }
        }
    }
}

// Write findings to output file
const outPath = path.join(ROOT_DIR, 'scratch', 'comprehensive_audit_findings.json');
fs.writeFileSync(outPath, JSON.stringify(results, null, 2));

console.log('\n======================================================');
console.log('📋 AUDIT COMPLETED. SUMMARY OF FINDINGS:');
console.log(`- Syntax Errors:             ${results.syntaxErrors.length}`);
console.log(`- HTML Missing Assets:       ${results.htmlAssetErrors.length}`);
console.log(`- Duplicate HTML IDs:        ${results.duplicateIds.length}`);
console.log(`- Broken Event Handlers:     ${results.brokenEventHandlers.length}`);
console.log(`- Missing DOM Elements:      ${results.missingDomElements.length}`);
console.log(`- Unmatched API Routes:      ${results.apiRouteMismatches.length}`);
console.log(`- Backend Logic/Return Bugs: ${results.backendLogicalIssues.length}`);
console.log(`Detailed JSON saved to: ${outPath}`);
console.log('======================================================\n');
