const fs = require('fs');
const path = require('path');

const frontendDir = path.join(__dirname, '..', 'frontend');

function walkHtml(dir) {
    let files = [];
    fs.readdirSync(dir).forEach(f => {
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) files = files.concat(walkHtml(full));
        else if (f.endsWith('.html')) files.push(full);
    });
    return files;
}

const htmlFiles = walkHtml(frontendDir);
console.log(`Checking handlers across ${htmlFiles.length} HTML files...`);

const handlerRegex = /\b(onclick|onchange|onsubmit|oninput|onload)=["']([^"']+)["']/gi;
const fnCallRegex = /([a-zA-Z0-9_$]+)\s*\(/g;

// Standard browser built-ins to ignore
const builtins = new Set([
    'alert', 'confirm', 'prompt', 'focus', 'blur', 'click', 'submit', 'reset',
    'select', 'preventDefault', 'stopPropagation', 'requestSubmit', 'open', 'close',
    'print', 'scrollTo', 'scrollBy', 'setInterval', 'setTimeout', 'clearInterval',
    'clearTimeout', 'parseInt', 'parseFloat', 'encodeURIComponent', 'decodeURIComponent',
    'Boolean', 'String', 'Number', 'Date', 'Math', 'Array', 'Object', 'JSON', 'RegExp',
    'console', 'log', 'warn', 'error', 'info', 'debug', 'toLowerCase', 'toUpperCase',
    'trim', 'split', 'slice', 'replace', 'indexOf', 'includes', 'push', 'pop', 'shift',
    'unshift', 'forEach', 'map', 'filter', 'reduce', 'then', 'catch', 'finally',
    'setAttribute', 'getAttribute', 'removeAttribute', 'classList', 'add', 'remove', 'toggle',
    'getElementById', 'querySelector', 'querySelectorAll', 'createElement', 'appendChild',
    'removeChild', 'insertBefore', 'replaceChild', 'addEventListener', 'removeEventListener',
    'dispatchEvent', 'matchMedia', 'reload', 'replace', 'zoomIn', 'zoomOut', 'resetCamera'
]);

let totalHandlers = 0;
const handlerReports = [];

htmlFiles.forEach(htmlPath => {
    const html = fs.readFileSync(htmlPath, 'utf8');
    const relHtml = path.relative(frontendDir, htmlPath);

    // Collect all script files loaded by this html
    const scriptSrcRegex = /<script[^>]+src=["']([^"']+)["']/gi;
    let sMatch;
    const loadedScripts = [];
    while ((sMatch = scriptSrcRegex.exec(html)) !== null) {
        const src = sMatch[1].split('?')[0];
        if (src.startsWith('http') || src.startsWith('//')) continue;
        const scriptPath = path.resolve(path.dirname(htmlPath), src);
        if (fs.existsSync(scriptPath)) {
            loadedScripts.push(scriptPath);
        }
    }

    // Combine all script contents
    let allJs = '';
    loadedScripts.forEach(sp => {
        allJs += '\n' + fs.readFileSync(sp, 'utf8');
    });

    // Also include inline scripts
    const inlineScriptRegex = /<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/gi;
    let iMatch;
    while ((iMatch = inlineScriptRegex.exec(html)) !== null) {
        allJs += '\n' + iMatch[1];
    }

    // Check all handler attributes
    let hMatch;
    while ((hMatch = handlerRegex.exec(html)) !== null) {
        totalHandlers++;
        const attr = hMatch[1];
        const code = hMatch[2];

        // Extract function calls
        let fnMatch;
        while ((fnMatch = fnCallRegex.exec(code)) !== null) {
            const fnName = fnMatch[1];
            if (builtins.has(fnName)) continue;
            if (fnName.startsWith('window.')) continue;
            
            // Check if function or object exists in combined JS
            // Function definition: function fnName, fnName = function, fnName = (, fnName(
            // or window.fnName or SmartCityAuth.fnName or object property
            const regexes = [
                new RegExp(`\\bfunction\\s+${fnName}\\b`),
                new RegExp(`\\b${fnName}\\s*=\\s*(?:function|\\()`),
                new RegExp(`\\bwindow\\.${fnName}\\b`),
                new RegExp(`\\b${fnName}:\\s*function\\b`),
                new RegExp(`\\b${fnName}:\\s*\\(`),
                new RegExp(`\\b${fnName}\\s*\\(`),
                new RegExp(`\\bvar\\s+${fnName}\\b`),
                new RegExp(`\\blet\\s+${fnName}\\b`),
                new RegExp(`\\bconst\\s+${fnName}\\b`)
            ];

            const found = regexes.some(r => r.test(allJs));
            if (!found) {
                handlerReports.push({
                    file: relHtml,
                    handler: attr,
                    code: code.trim(),
                    missingFn: fnName
                });
            }
        }
    }
});

console.log(`Audited ${totalHandlers} inline handlers.`);
console.log(`Found ${handlerReports.length} potentially unresolvable function calls:`);
handlerReports.forEach(r => {
    console.log(`  ❌ [${r.file}] in ${r.handler}="${r.code}": "${r.missingFn}" not found`);
});

process.exit(0);
