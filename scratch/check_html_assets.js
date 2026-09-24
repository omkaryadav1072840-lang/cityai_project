const fs = require('fs');
const path = require('path');

let brokenLinks = [];
let checkedTags = 0;

function checkHtmlFile(filePath) {
    const html = fs.readFileSync(filePath, 'utf8');
    const dir = path.dirname(filePath);

    // Check script src
    const scriptRegex = /<script\s+[^>]*src=["']([^"']+)["']/gi;
    let match;
    while ((match = scriptRegex.exec(html)) !== null) {
        checkedTags++;
        const src = match[1];
        if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//')) continue;
        
        let resolved;
        if (src.startsWith('/')) {
            resolved = path.join(path.resolve('./frontend'), src);
        } else {
            resolved = path.resolve(dir, src);
        }
        
        // Strip query params like ?v=1
        resolved = resolved.split('?')[0];

        if (!fs.existsSync(resolved)) {
            brokenLinks.push({ file: filePath, tag: 'script', ref: src, resolved });
        }
    }

    // Check link href (stylesheets)
    const linkRegex = /<link\s+[^>]*href=["']([^"']+)["']/gi;
    while ((match = linkRegex.exec(html)) !== null) {
        checkedTags++;
        const href = match[1];
        if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//') || href.startsWith('data:')) continue;
        
        let resolved;
        if (href.startsWith('/')) {
            resolved = path.join(path.resolve('./frontend'), href);
        } else {
            resolved = path.resolve(dir, href);
        }

        resolved = resolved.split('?')[0];

        if (!fs.existsSync(resolved)) {
            brokenLinks.push({ file: filePath, tag: 'link', ref: href, resolved });
        }
    }
}

function findHtmlFiles(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory() && e.name !== 'node_modules' && e.name !== '.git') {
            findHtmlFiles(full);
        } else if (e.isFile() && e.name.endsWith('.html')) {
            checkHtmlFile(full);
        }
    }
}

console.log('Validating HTML referenced scripts and stylesheets...');
findHtmlFiles(path.resolve('./frontend'));

console.log(`Checked ${checkedTags} asset references across HTML pages.`);
if (brokenLinks.length === 0) {
    console.log('✅ All local scripts and stylesheets exist!');
} else {
    console.log(`⚠️ Found ${brokenLinks.length} broken references:`);
    brokenLinks.forEach(b => console.log(`  - [${b.tag}] ${b.ref} in ${path.relative(process.cwd(), b.file)} (Resolved: ${b.resolved})`));
}
