const fs = require('fs');
const path = require('path');

let brokenLinks = [];
let checkedHrefs = 0;

function checkHtmlFile(filePath) {
    const html = fs.readFileSync(filePath, 'utf8');
    const dir = path.dirname(filePath);

    const aRegex = /<a\s+[^>]*href=["']([^"']+)["']/gi;
    let match;
    while ((match = aRegex.exec(html)) !== null) {
        checkedHrefs++;
        const href = match[1].trim();
        if (
            !href ||
            href.startsWith('#') ||
            href.startsWith('javascript:') ||
            href.startsWith('tel:') ||
            href.startsWith('mailto:') ||
            href.startsWith('http://') ||
            href.startsWith('https://') ||
            href.startsWith('//')
        ) continue;
        
        let cleanHref = href.split('?')[0].split('#')[0];
        if (!cleanHref) continue;

        let resolved;
        if (cleanHref.startsWith('/')) {
            resolved = path.join(path.resolve('./frontend'), cleanHref);
        } else {
            resolved = path.resolve(dir, cleanHref);
        }

        if (!fs.existsSync(resolved)) {
            // Check if adding index.html helps
            if (fs.existsSync(path.join(resolved, 'index.html'))) continue;
            brokenLinks.push({ file: filePath, href, resolved });
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

console.log('Validating HTML <a> navigation links...');
findHtmlFiles(path.resolve('./frontend'));

console.log(`Checked ${checkedHrefs} <a> href references across HTML pages.`);
if (brokenLinks.length === 0) {
    console.log('✅ All internal page navigation links are valid!');
} else {
    console.log(`⚠️ Found ${brokenLinks.length} broken navigation links:`);
    brokenLinks.forEach(b => console.log(`  - [href="${b.href}"] in ${path.relative(process.cwd(), b.file)} (Expected at: ${b.resolved})`));
}
