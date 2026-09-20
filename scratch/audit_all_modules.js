const fs = require('fs');
const path = require('path');

const pagesDir = 'd:/cityai_project - Copy/frontend/pages';
const modules = fs.readdirSync(pagesDir).filter(f => fs.statSync(path.join(pagesDir, f)).isDirectory());

const report = [];

modules.forEach(mod => {
    const modPath = path.join(pagesDir, mod);
    const htmlFile = fs.readdirSync(modPath).find(f => f.endsWith('.html'));
    const jsFile = fs.readdirSync(modPath).find(f => f.endsWith('.js'));
    const cssFile = fs.readdirSync(modPath).find(f => f.endsWith('.css'));

    if (!htmlFile || !jsFile) {
        report.push({ module: mod, status: 'MISSING_CORE_FILES', htmlFile, jsFile });
        return;
    }

    const html = fs.readFileSync(path.join(modPath, htmlFile), 'utf8');
    const js = fs.readFileSync(path.join(modPath, jsFile), 'utf8');

    // 1. Onclick handlers
    const onclickMatches = [...html.matchAll(/onclick=["']([a-zA-Z0-9_]+)\(/g)];
    const uniqueOnclicks = [...new Set(onclickMatches.map(m => m[1]))];
    const missingOnclicks = [];
    uniqueOnclicks.forEach(fn => {
        const inJs = js.includes('function ' + fn) || js.includes(fn + ' =') || js.includes('window.' + fn) || js.includes(fn + ':');
        if (!inJs) missingOnclicks.push(fn);
    });

    // 2. Forms
    const formMatches = [...html.matchAll(/<form [^>]*id=["']([^"']+)["'][^>]*>/g)];
    const missingForms = [];
    formMatches.forEach(f => {
        const id = f[1];
        const tag = f[0];
        const onsubmitMatch = tag.match(/onsubmit=["']([a-zA-Z0-9_]+)\(/);
        if (onsubmitMatch) {
            const fn = onsubmitMatch[1];
            const inJs = js.includes('function ' + fn) || js.includes(fn + ' =') || js.includes('window.' + fn);
            if (!inJs) missingForms.push({ id, reason: `Missing onsubmit function: ${fn}` });
        } else {
            const listened = js.includes(`"${id}"`) || js.includes(`'${id}'`);
            if (!listened) missingForms.push({ id, reason: 'No addEventListener for form' });
        }
    });

    // 3. 3-Layer Check
    const has3Layers = html.includes('layer-citizen-content') && html.includes('layer-staff-content') && html.includes('layer-admin-content');
    const hasTabs = html.includes('layer-tabs-container') || html.includes('layer-tabs');

    // 4. Check backend API calls in JS
    const apiCalls = [...js.matchAll(/fetch\(\s*["'`](\/api\/[^"'`?]+)/g)].map(m => m[1]);
    const uniqueApis = [...new Set(apiCalls)];

    // 5. Look for mock/dummy indicators
    const mockPatterns = [];
    if (js.includes('MOCK_') || js.includes('mockData') || js.includes('dummy')) mockPatterns.push('mock variable present');
    if (js.includes('Math.random()') && !js.includes('fetch')) mockPatterns.push('random simulation instead of fetch');

    report.push({
        module: mod,
        htmlFile,
        jsFile,
        cssFile,
        totalOnclicks: uniqueOnclicks.length,
        missingOnclicks,
        totalForms: formMatches.length,
        missingForms,
        has3Layers,
        hasTabs,
        backendEndpointsUsed: uniqueApis.length,
        apiEndpoints: uniqueApis,
        mockPatterns
    });
});

console.log(JSON.stringify(report, null, 2));
