const fs = require('fs');

console.log('=== AUTH ROUTES INSPECTION ===');
const authRoutes = fs.readFileSync('backend/routes/auth.routes.js', 'utf8');

const regex = /router\.(get|post|put|patch|delete)\s*\(\s*["']([^"']+)["']/gi;
let m;
const list = [];
while ((m = regex.exec(authRoutes)) !== null) {
  list.push(`${m[1].toUpperCase()} ${m[2]}`);
}

console.log(`Total routes in auth.routes.js: ${list.length}`);
list.forEach(r => console.log(' - ' + r));

