const fs = require('fs');
const c = fs.readFileSync('frontend/pages/traffic/traffic.js', 'utf8');
const regex = /getElementById\(['"]([^'"]+)['"]\)/g;
let m;
const ids = new Set();
while ((m = regex.exec(c)) !== null) {
    ids.add(m[1]);
}
console.log('Total IDs found:', ids.size);
fs.writeFileSync('scratch/traffic_ids.json', JSON.stringify([...ids], null, 2));
console.log('Saved to scratch/traffic_ids.json');

