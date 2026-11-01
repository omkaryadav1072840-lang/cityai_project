const fs = require('fs');

console.log('=== WASTE ROUTES INSPECTION ===');
const routes = fs.readFileSync('backend/routes/waste.routes.js', 'utf8');

const regex = /router\.(get|post|put|patch|delete)\s*\(\s*["']([^"']+)["']/gi;
let m;
const list = [];
while ((m = regex.exec(routes)) !== null) {
  list.push(`${m[1].toUpperCase()} ${m[2]}`);
}

console.log(`Total routes in waste.routes.js: ${list.length}`);
list.forEach(r => console.log(' - ' + r));

console.log('\n=== WASTE AI SERVICE INSPECTION ===');
if (fs.existsSync('backend/services/waste_ai_service.js')) {
  const ai = fs.readFileSync('backend/services/waste_ai_service.js', 'utf8');
  console.log(ai.substring(0, 800));
}

console.log('\n=== PYTHON AI SERVICE INSPECTION ===');
if (fs.existsSync('ai_service/waste_prediction.py')) {
  const py = fs.readFileSync('ai_service/waste_prediction.py', 'utf8');
  console.log(py.substring(0, 800));
}

