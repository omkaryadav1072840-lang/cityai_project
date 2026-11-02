const fs = require('fs');
const http = require('http');

console.log("🔍 TESTING JUNCTION MOVE & MAP RELOCATION VERIFICATION");

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✅ PASS: ${message}`);
        passed++;
    } else {
        console.error(`  ❌ FAIL: ${message}`);
        failed++;
    }
}

// 1. Check traffic.html contents
const html = fs.readFileSync('frontend/pages/traffic/traffic.html', 'utf8');
assert(html.includes('id="map-coord-pick-banner-admin"'), "traffic.html contains #map-coord-pick-banner-admin");
assert(html.includes('id="traffic-ol-map-admin"'), "traffic.html contains #traffic-ol-map-admin");
assert(html.includes('cancelRelocationMode()'), "traffic.html has cancelRelocationMode trigger");

// 2. Check traffic.js contents
const js = fs.readFileSync('frontend/pages/traffic/traffic.js', 'utf8');
assert(js.includes('window.startMoveJunctionOnMap = startMoveJunctionOnMap;'), "traffic.js exports startMoveJunctionOnMap");
assert(js.includes('window.cancelRelocationMode = cancelRelocationMode;'), "traffic.js exports cancelRelocationMode");
assert(js.includes('window.finalizeAssetRelocation = finalizeAssetRelocation;'), "traffic.js exports finalizeAssetRelocation");
assert(js.includes('traffic-ol-map-admin'), "traffic.js targets traffic-ol-map-admin");
assert(!js.includes('document.getElementById("trafficMapContainerCard")'), "traffic.js removed old nonexistent trafficMapContainerCard references");
assert(js.includes('flyToCoordinates'), "traffic.js flies to coordinates when moving junction");
assert(js.includes('map-coord-pick-banner-admin'), "traffic.js controls admin relocation banner");

// 3. Check openlayers_map.js contents
const olMap = fs.readFileSync('frontend/pages/traffic/openlayers_map.js', 'utf8');
assert(olMap.includes('showPopup(coordinate, htmlContent)'), "openlayers_map.js has showPopup method");
assert(olMap.includes('map-coord-pick-banner-admin'), "openlayers_map.js connects admin relocation banner");

console.log(`\n=======================================================`);
console.log(`STATIC CHECKS: ${passed} PASSED, ${failed} FAILED`);
console.log(`=======================================================`);

if (failed > 0) process.exit(1);

