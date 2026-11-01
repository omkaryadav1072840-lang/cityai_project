const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'pages', 'waste', 'waste.html'), 'utf8');

// Basic tag balancer for div, section, main, header, footer
const tags = ['div', 'section', 'main', 'header', 'footer', 'form', 'table', 'tbody', 'thead', 'tr'];
const counts = {};

tags.forEach(t => {
    const openRegex = new RegExp(`<${t}[\\s>]`, 'gi');
    const closeRegex = new RegExp(`</${t}>`, 'gi');
    const openCount = (html.match(openRegex) || []).length;
    const closeCount = (html.match(closeRegex) || []).length;
    counts[t] = { open: openCount, close: closeCount, balanced: openCount === closeCount };
});

console.log("HTML Tag Balance Audit:");
console.table(counts);

// Check if any tag is unbalanced
const unbalanced = Object.entries(counts).filter(([_, v]) => !v.balanced);
if (unbalanced.length > 0) {
    console.log("⚠️ UNBALANCED TAGS FOUND:", unbalanced);
} else {
    console.log("✅ All checked structural tags are balanced!");
}

