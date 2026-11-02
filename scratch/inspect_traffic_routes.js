const fs = require('fs');
const content = fs.readFileSync('./backend/routes/traffic.routes.js', 'utf8');
const lines = content.split('\n');
const routes = [];
lines.forEach((line, idx) => {
  const m = line.match(/router\.(get|post|put|delete|patch)\(\s*['"]([^'"]+)['"]/i);
  if (m) {
    routes.push({ method: m[1].toUpperCase(), path: m[2], line: idx + 1 });
  }
});
console.log('Total routes found:', routes.length);
routes.forEach(r => console.log(r.method.padEnd(7) + r.path + ' (L' + r.line + ')'));

