const fs = require('fs');
const content = fs.readFileSync('./frontend/index.html', 'utf-8');
const lines = content.split('\n');
lines.forEach((l, i) => {
    if (l.includes('href="#"') || l.includes("href='#'")) {
        console.log(`Line ${i + 1}: ${l.trim()}`);
    }
});
