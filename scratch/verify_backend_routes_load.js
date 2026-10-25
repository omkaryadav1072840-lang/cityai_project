const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const routesDir = path.join(ROOT_DIR, 'backend', 'routes');

const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
let hasErrors = false;

for (const rf of routeFiles) {
    try {
        const fullPath = path.join(routesDir, rf);
        const router = require(fullPath);
        if (!router) {
            console.error(`❌ Route ${rf} did not export anything.`);
            hasErrors = true;
        } else {
            console.log(`✅ Route ${rf} loaded successfully.`);
        }
    } catch (err) {
        console.error(`❌ Failed to load route ${rf}:`, err.message);
        hasErrors = true;
    }
}

if (!hasErrors) {
    console.log('\n🎉 ALL backend routes loaded without missing modules or controllers!');
} else {
    process.exit(1);
}
