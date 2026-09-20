const fs = require('fs');
const trafficJs = fs.readFileSync('frontend/pages/traffic/traffic.js', 'utf8');
const mapJs = fs.readFileSync('frontend/pages/traffic/openlayers_map.js', 'utf8');

// Find all trafficMap.methodName(...) calls
const re = /trafficMap\.([a-zA-Z0-9_]+)\s*\(/g;
let match;
const mapCalls = new Set();
while ((match = re.exec(trafficJs)) !== null) {
  mapCalls.add(match[1]);
}

console.log('All trafficMap method calls in traffic.js:', Array.from(mapCalls));

const missingMapMethods = [];
for (const method of mapCalls) {
  // Check if method exists in openlayers_map.js (e.g. methodName(...) or methodName =)
  const methodRegex = new RegExp('\\b' + method + '\\s*\\(');
  if (!methodRegex.test(mapJs)) {
    missingMapMethods.push(method);
  }
}

console.log('Missing methods on SmartCityTrafficMap:', missingMapMethods);
