const express = require('../backend/node_modules/express');
const app = express();

// Load all route files
const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, '..', 'backend', 'routes');
const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.routes.js'));

const registeredRoutes = [];

routeFiles.forEach(rf => {
  try {
    const router = require(path.join(routesDir, rf));
    if (router && router.stack) {
      router.stack.forEach(layer => {
        if (layer.route) {
          const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase());
          registeredRoutes.push({
            file: rf,
            path: layer.route.path,
            methods
          });
        }
      });
    }
  } catch (e) {
    console.error(`Error loading ${rf}:`, e.message);
  }
});

console.log(`Total registered backend routes: ${registeredRoutes.length}`);
fs.writeFileSync('scratch/registered_routes.json', JSON.stringify(registeredRoutes, null, 2));

// Compare with frontend API calls
const jsFiles = [];
function findJs(dir) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(e => {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== 'node_modules' && !e.name.startsWith('.')) findJs(full);
    else if (e.isFile() && e.name.endsWith('.js')) jsFiles.push(full);
  });
}
findJs('frontend');

const frontendCalls = [];
jsFiles.forEach(file => {
  const c = fs.readFileSync(file, 'utf8');
  // Match fetch(url, options) or apiRequest(url, options)
  const regex = /(?:fetch|apiRequest)\s*\(\s*([`'"])(\/api\/.*?)\1(?:\s*,\s*(\{[\s\S]*?\}))?/g;
  let m;
  while ((m = regex.exec(c)) !== null) {
    const rawUrl = m[2];
    const opts = m[3] || '';
    const methodMatch = opts.match(/method\s*:\s*["']([A-Z]+)["']/i);
    const method = methodMatch ? methodMatch[1].toUpperCase() : 'GET';
    frontendCalls.push({
      file: path.relative('.', file),
      rawUrl,
      method
    });
  }
});

console.log(`Total frontend API calls found: ${frontendCalls.length}`);
fs.writeFileSync('scratch/frontend_calls.json', JSON.stringify(frontendCalls, null, 2));

process.exit(0);
