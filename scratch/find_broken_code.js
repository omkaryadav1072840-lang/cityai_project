const fs = require('fs');
const path = require('path');

const frontendDir = path.join(__dirname, '..', 'frontend');

function getAllFiles(dir, exts = ['.html']) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const full = path.join(dir, file);
        const stat = fs.statSync(full);
        if (stat && stat.isDirectory()) {
            results = results.concat(getAllFiles(full, exts));
        } else if (exts.includes(path.extname(full))) {
            results.push(full);
        }
    });
    return results;
}

const htmlFiles = getAllFiles(frontendDir, ['.html']);

console.log(`Checking ${htmlFiles.length} HTML files...`);

const brokenLinks = [];

htmlFiles.forEach(htmlFile => {
    const content = fs.readFileSync(htmlFile, 'utf8');
    const dir = path.dirname(htmlFile);

    // Check <a href="...">
    const aRegex = /<a[^>]+href=["']([^"']+)["']/g;
    let m;
    while ((m = aRegex.exec(content)) !== null) {
        const href = m[1];
        if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('tel:') || href.startsWith('mailto:')) continue;
        const clean = href.split('?')[0].split('#')[0];
        if (!clean) continue;
        
        let target;
        if (clean.startsWith('/')) {
            target = path.join(frontendDir, clean.replace(/^\/frontend\//, '').replace(/^\//, ''));
        } else {
            target = path.resolve(dir, clean);
        }

        if (!fs.existsSync(target)) {
            brokenLinks.push({ file: path.relative(frontendDir, htmlFile), type: '<a>', href, target });
        }
    }
});

console.log(`Found ${brokenLinks.length} broken <a> links.`);
brokenLinks.forEach(b => console.log(`   [${b.file}] ${b.href} -> ${b.target}`));

