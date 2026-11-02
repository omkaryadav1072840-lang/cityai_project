const fs = require('fs');

const content = fs.readFileSync('frontend/pages/traffic/traffic.html', 'utf8');
const lines = content.split('\n');

console.log('--- Head & Meta ---');
lines.slice(0, 40).forEach((l, i) => console.log(`${i+1}: ${l}`));

console.log('\n--- Major Divs & IDs ---');
lines.forEach((l, i) => {
    const trimmed = l.trim();
    if (trimmed.startsWith('<div id=') || trimmed.startsWith('<section id=') || trimmed.startsWith('<main') || trimmed.startsWith('<header') || trimmed.startsWith('<nav')) {
        console.log(`L${i+1}: ${trimmed.slice(0, 100)}`);
    }
});

