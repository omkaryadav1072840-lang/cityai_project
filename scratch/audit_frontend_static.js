const fs = require('fs');
const path = require('path');

const frontendDir = path.join(__dirname, '..', 'frontend');

const htmlFiles = [
    'index.html',
    'pages/emergency/emergency.html',
    'pages/famous/famous.html',
    'pages/hospital/hospital.html',
    'pages/hospital/hospital_dashboard.html',
    'pages/hospital/doctor_dashboard.html',
    'pages/parking/parking.html',
    'pages/police/police.html',
    'pages/traffic/traffic.html',
    'pages/waste/waste.html',
    'pages/water/water.html'
];

const results = [];

for (const relHtml of htmlFiles) {
    const fullHtmlPath = path.join(frontendDir, relHtml);
    if (!fs.existsSync(fullHtmlPath)) {
        results.push({ file: relHtml, type: 'FILE_NOT_FOUND', detail: `Missing HTML file: ${fullHtmlPath}` });
        continue;
    }
    const htmlContent = fs.readFileSync(fullHtmlPath, 'utf8');
    const htmlDir = path.dirname(fullHtmlPath);

    // 1. Check linked scripts
    const scriptRegex = /<script\s+[^>]*src=["']([^"']+)["'][^>]*>/gi;
    let match;
    const includedJsFiles = [];
    while ((match = scriptRegex.exec(htmlContent)) !== null) {
        const src = match[1];
        if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//')) {
            continue; // external CDN
        }
        // local relative or absolute
        let resolvedPath;
        if (src.startsWith('/')) {
            resolvedPath = path.join(frontendDir, src.replace(/^\//, ''));
        } else {
            resolvedPath = path.resolve(htmlDir, src);
        }
        if (!fs.existsSync(resolvedPath)) {
            results.push({ file: relHtml, type: 'MISSING_SCRIPT', detail: `Script not found: ${src} -> ${resolvedPath}` });
        } else {
            includedJsFiles.push(resolvedPath);
        }
    }

    // 2. Check linked CSS
    const cssRegex = /<link\s+[^>]*href=["']([^"']+)["'][^>]*>/gi;
    while ((match = cssRegex.exec(htmlContent)) !== null) {
        const href = match[1];
        if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) {
            continue;
        }
        if (href.endsWith('.css')) {
            let resolvedPath;
            if (href.startsWith('/')) {
                resolvedPath = path.join(frontendDir, href.replace(/^\//, ''));
            } else {
                resolvedPath = path.resolve(htmlDir, href);
            }
            if (!fs.existsSync(resolvedPath)) {
                results.push({ file: relHtml, type: 'MISSING_CSS', detail: `CSS not found: ${href} -> ${resolvedPath}` });
            }
        }
    }

    // 3. Check duplicate IDs in HTML
    const idRegex = /id=["']([a-zA-Z0-9_\-]+)["']/gi;
    const ids = new Set();
    const duplicateIds = new Set();
    while ((match = idRegex.exec(htmlContent)) !== null) {
        const id = match[1];
        if (ids.has(id)) {
            duplicateIds.add(id);
        } else {
            ids.add(id);
        }
    }
    if (duplicateIds.size > 0) {
        results.push({ file: relHtml, type: 'DUPLICATE_IDS', detail: `Duplicate element IDs: ${Array.from(duplicateIds).join(', ')}` });
    }

    // 4. Check onclick handlers against included JS files
    const allJsCode = includedJsFiles.map(f => fs.readFileSync(f, 'utf8')).join('\n');
    // Also include inline scripts in the HTML
    const inlineScriptRegex = /<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/gi;
    let inlineJs = '';
    while ((match = inlineScriptRegex.exec(htmlContent)) !== null) {
        inlineJs += '\n' + match[1];
    }
    const combinedJs = allJsCode + '\n' + inlineJs;

    const onclickRegex = /onclick=["']([a-zA-Z0-9_$]+)\s*\(([^"']*)\)["']/gi;
    const missingFunctions = new Set();
    while ((match = onclickRegex.exec(htmlContent)) !== null) {
        const fnName = match[1];
        // Special keywords like 'event', 'this', 'window', 'alert', 'console'
        if (['alert', 'confirm', 'prompt', 'console', 'window', 'location', 'event'].includes(fnName)) continue;
        
        // Check if function is defined in combinedJs
        const hasFn = combinedJs.includes(`function ${fnName}`) || 
                      combinedJs.includes(`${fnName} =`) || 
                      combinedJs.includes(`${fnName}:`) || 
                      combinedJs.includes(`window.${fnName}`);
        if (!hasFn) {
            missingFunctions.add(fnName);
        }
    }
    if (missingFunctions.size > 0) {
        results.push({ file: relHtml, type: 'MISSING_ONCLICK_FN', detail: `Functions called in onclick not found: ${Array.from(missingFunctions).join(', ')}` });
    }

    // 5. Check dead buttons (button without onclick, type=submit in form, or id/class)
    const buttonRegex = /<button\s+([^>]*)>([\s\S]*?)<\/button>/gi;
    const deadButtons = [];
    while ((match = buttonRegex.exec(htmlContent)) !== null) {
        const attrs = match[1];
        const btnText = match[2].replace(/<[^>]+>/g, '').trim().substring(0, 30);
        const hasOnclick = /onclick=/i.test(attrs);
        const hasId = /id=["']([^"']+)["']/i.test(attrs);
        const isSubmit = /type=["']submit["']/i.test(attrs);
        const hasClass = /class=["']([^"']+)["']/i.test(attrs);
        const hasDataAttr = /data-[a-zA-Z0-9_\-]+=/i.test(attrs);

        if (!hasOnclick && !hasId && !isSubmit && !hasDataAttr) {
            // Check if class is specifically hooked in JS
            if (hasClass) {
                const classMatch = attrs.match(/class=["']([^"']+)["']/i);
                const classes = classMatch[1].split(/\s+/);
                const isHooked = classes.some(c => combinedJs.includes(`.${c}`) || combinedJs.includes(`'${c}'`) || combinedJs.includes(`"${c}"`));
                if (!isHooked) {
                    deadButtons.push(btnText || 'Unnamed Button');
                }
            } else {
                deadButtons.push(btnText || 'Unnamed Button');
            }
        }
    }
    if (deadButtons.length > 0) {
        results.push({ file: relHtml, type: 'POTENTIAL_DEAD_BUTTONS', detail: `Buttons with no click hook: ${deadButtons.slice(0, 5).join('; ')} (Total: ${deadButtons.length})` });
    }

    // 6. Check document.getElementById in JS against HTML IDs
    const getElemRegex = /document\.getElementById\(["']([a-zA-Z0-9_\-]+)["']\)/g;
    const missingIdsInHtml = new Set();
    while ((match = getElemRegex.exec(combinedJs)) !== null) {
        const targetId = match[1];
        // Some elements are created dynamically in template literals, so also check if JS generates it
        const dynamicId = new RegExp(`id=["']${targetId}["']|id=\\\\?["']\\$\\{[^}]*\\}${targetId}|id=\\\\?["']${targetId}`, 'i');
        if (!ids.has(targetId) && !dynamicId.test(combinedJs)) {
            missingIdsInHtml.add(targetId);
        }
    }
    if (missingIdsInHtml.size > 0) {
        results.push({ file: relHtml, type: 'MISSING_DOM_IDS', detail: `JS looks for getElementById that does not exist in HTML: ${Array.from(missingIdsInHtml).slice(0, 10).join(', ')} (Total: ${missingIdsInHtml.size})` });
    }
}

console.log("=== STATIC AUDIT FINDINGS ===");
console.log(`Total Findings: ${results.length}`);
for (const r of results) {
    console.log(`\n[${r.type}] ${r.file}`);
    console.log(`  -> ${r.detail}`);
}

fs.writeFileSync(path.join(__dirname, 'static_audit_results.json'), JSON.stringify(results, null, 2));
