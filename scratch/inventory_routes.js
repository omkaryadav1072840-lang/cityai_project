const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, '..', 'backend', 'routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));

const routesMap = {};

for (const file of files) {
    const content = fs.readFileSync(path.join(routesDir, file), 'utf8');
    const regex = /router\.(get|post|put|delete|patch)\(\s*["']([^"']+)["']/gi;
    let match;
    const routes = [];
    while ((match = regex.exec(content)) !== null) {
        routes.push({ method: match[1].toUpperCase(), path: match[2] });
    }
    routesMap[file] = routes;
}

console.log("=== BACKEND ROUTE INVENTORY ===");
for (const [file, routes] of Object.entries(routesMap)) {
    console.log(`\n--- ${file} (${routes.length} routes) ---`);
    for (const r of routes) {
        console.log(`  ${r.method.padEnd(6)} ${r.path}`);
    }
}

fs.writeFileSync(path.join(__dirname, 'backend_routes_inventory.json'), JSON.stringify(routesMap, null, 2));
