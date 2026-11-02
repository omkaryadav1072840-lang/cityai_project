const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, '..', 'frontend', 'pages');

function walk(dir) {
    let files = [];
    fs.readdirSync(dir).forEach(f => {
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) files = files.concat(walk(full));
        else if (f.endsWith('.html')) files.push(full);
    });
    return files;
}

const htmlFiles = walk(pagesDir);
let changedCount = 0;

htmlFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;

    content = content.replace(/href="\/manifest\.json"/g, 'href="../../manifest.json"');
    content = content.replace(/href="\/favicon\.svg"/g, 'href="../../favicon.svg"');
    content = content.replace(/href="\/apple-touch-icon\.png"/g, 'href="../../apple-touch-icon.png"');
    content = content.replace(/content="\/smartcity-og-preview\.png"/g, 'content="../../smartcity-og-preview.png"');

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        changedCount++;
        console.log(`Updated assets in: ${path.relative(pagesDir, file)}`);
    }
});

console.log(`Total updated files: ${changedCount}`);

