// Simulate browser environment to trace map initialization
const fs = require('fs');

// Read openlayers_map.js and traffic.js
const mapCode = fs.readFileSync('frontend/pages/traffic/openlayers_map.js', 'utf8');
const trafficCode = fs.readFileSync('frontend/pages/traffic/traffic.js', 'utf8');

console.log('--- CHECKING openlayers_map.js SYNTAX ---');
try {
  new Function(mapCode);
  console.log('openlayers_map.js compiles successfully with 0 errors');
} catch (e) {
  console.error('Syntax error in openlayers_map.js:', e);
}

console.log('--- CHECKING traffic.js SYNTAX ---');
try {
  new Function(trafficCode);
  console.log('traffic.js compiles successfully with 0 errors');
} catch (e) {
  console.error('Syntax error in traffic.js:', e);
}

