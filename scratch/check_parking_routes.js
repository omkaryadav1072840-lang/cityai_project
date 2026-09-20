const fs = require('fs');

const js = fs.readFileSync('frontend/pages/parking/parking.js', 'utf8');
const routes = fs.readFileSync('backend/routes/parking.routes.js', 'utf8');

const fetchMatches = [...js.matchAll(/fetch\([`'"](\/api\/parking[^`'"?]+)/g)].map(m => m[1]);
const uniqueFetches = Array.from(new Set(fetchMatches));

console.log('Unique API endpoints called from parking.js:');
uniqueFetches.forEach(endpoint => {
  // Convert endpoint like /api/parking/${id} to a pattern
  let pattern = endpoint.replace(/\$\{[^}]+\}/g, ':[^/]+').replace(/\//g, '\\/');
  // check if route has it
  const hasRoute = new RegExp(endpoint.split('$')[0]).test(routes);
  console.log(`- ${endpoint} => ${hasRoute ? 'MATCH' : '⚠️ NOT FOUND IN ROUTES'}`);
});
