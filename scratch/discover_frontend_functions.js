const fs = require('fs');
const path = require('path');

const frontendDir = path.join(__dirname, '..', 'frontend');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(filePath));
        } else {
            results.push(filePath);
        }
    });
    return results;
}

const allFiles = walk(frontendDir);
const htmlFiles = allFiles.filter(f => f.endsWith('.html'));
const jsFiles = allFiles.filter(f => f.endsWith('.js'));

console.log(`Discovered ${htmlFiles.length} HTML files and ${jsFiles.length} JS files.`);

// Extract buttons, forms, inputs from HTML
const htmlInventory = [];
for (const file of htmlFiles) {
    const relPath = path.relative(frontendDir, file);
    const content = fs.readFileSync(file, 'utf8');

    // Buttons
    const buttonRegex = /<button[^>]*>([\s\S]*?)<\/button>/gi;
    let bMatch;
    const buttons = [];
    while ((bMatch = buttonRegex.exec(content)) !== null) {
        const fullTag = bMatch[0];
        const text = bMatch[1].replace(/<[^>]+>/g, '').trim().slice(0, 50);
        const idMatch = fullTag.match(/id=["']([^"']+)["']/i);
        const onclickMatch = fullTag.match(/onclick=["']([^"']+)["']/i);
        const classMatch = fullTag.match(/class=["']([^"']+)["']/i);
        buttons.push({
            id: idMatch ? idMatch[1] : null,
            text,
            onclick: onclickMatch ? onclickMatch[1] : null,
            className: classMatch ? classMatch[1] : null
        });
    }

    // Forms
    const formRegex = /<form[^>]*>([\s\S]*?)<\/form>/gi;
    let fMatch;
    const forms = [];
    while ((fMatch = formRegex.exec(content)) !== null) {
        const fullTag = fMatch[0];
        const idMatch = fullTag.match(/id=["']([^"']+)["']/i);
        const onsubmitMatch = fullTag.match(/onsubmit=["']([^"']+)["']/i);
        const actionMatch = fullTag.match(/action=["']([^"']+)["']/i);
        forms.push({
            id: idMatch ? idMatch[1] : null,
            onsubmit: onsubmitMatch ? onsubmitMatch[1] : null,
            action: actionMatch ? actionMatch[1] : null
        });
    }

    // Interactive anchors
    const anchorRegex = /<a[^>]+(?:href=["']#[^"']*["']|onclick=["'][^"']+["'])[^>]*>([\s\S]*?)<\/a>/gi;
    let aMatch;
    const interactiveLinks = [];
    while ((aMatch = anchorRegex.exec(content)) !== null) {
        const fullTag = aMatch[0];
        const text = aMatch[1].replace(/<[^>]+>/g, '').trim().slice(0, 50);
        const idMatch = fullTag.match(/id=["']([^"']+)["']/i);
        const onclickMatch = fullTag.match(/onclick=["']([^"']+)["']/i);
        const hrefMatch = fullTag.match(/href=["']([^"']+)["']/i);
        interactiveLinks.push({
            id: idMatch ? idMatch[1] : null,
            text,
            onclick: onclickMatch ? onclickMatch[1] : null,
            href: hrefMatch ? hrefMatch[1] : null
        });
    }

    htmlInventory.push({
        file: relPath,
        buttonsCount: buttons.length,
        buttons,
        formsCount: forms.length,
        forms,
        linksCount: interactiveLinks.length,
        interactiveLinks
    });
}

// Extract functions from JS files
const jsInventory = [];
for (const file of jsFiles) {
    const relPath = path.relative(frontendDir, file);
    const content = fs.readFileSync(file, 'utf8');

    // function name(...)
    const fnRegex = /(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(([^)]*)\)/g;
    let fnMatch;
    const functions = [];
    while ((fnMatch = fnRegex.exec(content)) !== null) {
        functions.push({
            name: fnMatch[1],
            params: fnMatch[2].trim()
        });
    }

    // const name = async (...) => or name: async function
    const constFnRegex = /(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/g;
    let cMatch;
    while ((cMatch = constFnRegex.exec(content)) !== null) {
        functions.push({
            name: cMatch[1],
            params: cMatch[2].trim()
        });
    }

    // Window assignments
    const winRegex = /window\.([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?(?:function|\()/g;
    let wMatch;
    while ((wMatch = winRegex.exec(content)) !== null) {
        functions.push({
            name: `window.${wMatch[1]}`,
            params: ''
        });
    }

    // Event listeners
    const elRegex = /addEventListener\s*\(\s*['"]([^'"]+)['"]\s*,\s*(?:async\s*)?(?:function|\(([^)]*)\)\s*=>|([a-zA-Z0-9_$]+))/g;
    let elMatch;
    const listeners = [];
    while ((elMatch = elRegex.exec(content)) !== null) {
        listeners.push({
            event: elMatch[1],
            handler: elMatch[3] || 'anonymous'
        });
    }

    jsInventory.push({
        file: relPath,
        functionsCount: functions.length,
        functions,
        listenersCount: listeners.length,
        listeners
    });
}

fs.writeFileSync(path.join(__dirname, 'frontend_html_inventory.json'), JSON.stringify(htmlInventory, null, 2));
fs.writeFileSync(path.join(__dirname, 'frontend_js_inventory.json'), JSON.stringify(jsInventory, null, 2));
console.log('Frontend inventory written to scratch/');
