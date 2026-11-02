const fs = require('fs');

const content = fs.readFileSync('backend/routes/traffic.routes.js', 'utf8');
const lines = content.split('\n');
const items = [];

lines.forEach((l, i) => {
    const trimmed = l.trim();
    const routeMatch = trimmed.match(/router\.(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]/);
    if (routeMatch) {
        items.push({ type: 'route', line: i + 1, method: routeMatch[1].toUpperCase(), path: routeMatch[2] });
    } else if (trimmed.startsWith('//') && (trimmed.includes('===') || trimmed.includes('---') || trimmed.includes('SECTION') || trimmed.includes('API') || trimmed.includes('MODULE'))) {
        items.push({ type: 'header', line: i + 1, text: trimmed });
    }
});

console.log('Total endpoints:', items.filter(x => x.type === 'route').length);
items.forEach(x => {
    if (x.type === 'header') console.log('\n' + x.text);
    else console.log(`  L${x.line}: ${x.method.padEnd(6)} ${x.path}`);
});

