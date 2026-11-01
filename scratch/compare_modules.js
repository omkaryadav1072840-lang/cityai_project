const fs = require('fs');

const wasteHtml = fs.readFileSync('frontend/pages/waste/waste.html', 'utf8');
const policeHtml = fs.readFileSync('frontend/pages/police/police.html', 'utf8');
const waterHtml = fs.readFileSync('frontend/pages/water/water.html', 'utf8');

const wasteCss = fs.readFileSync('frontend/pages/waste/waste.css', 'utf8');
const policeCss = fs.readFileSync('frontend/pages/police/police.css', 'utf8');
const waterCss = fs.readFileSync('frontend/pages/water/water.css', 'utf8');

console.log('=== STRUCTURAL COMPARISON ===');

// 1. Container & Main wrapper
console.log('Main wrapper:');
console.log('  Waste:', wasteHtml.match(/<main[^>]*>/i)?.[0]);
console.log('  Police:', policeHtml.match(/<main[^>]*>/i)?.[0] || 'Direct sections / divs');
console.log('  Water:', waterHtml.match(/<main[^>]*>/i)?.[0]);

// 2. Map placement
console.log('\nMap placement:');
const wasteMapMatch = wasteHtml.match(/<div id="wasteMap"[\s\S]*?<\/div>/);
console.log('  Waste map parent section: Shared card right under <main>, above all layers');
console.log('  Police map: inside Layer 2 or Layer 3?');
const policeMapInLayer = policeHtml.includes('policeMap') ? 
  (policeHtml.indexOf('policeMap') > policeHtml.indexOf('layer-staff-content') ? 'Inside Staff/Admin layer' : 'Outside') : 'None';
console.log('  Police map in layer:', policeMapInLayer);

// 3. User badge / Login in Navbar
console.log('\nNavbar Right Area:');
console.log('  Waste: nav-actions -> only Main Dashboard button');
console.log('  Police: nav-right -> Dashboard, Emergency 112, <div id="userBadgeContainer"></div>');
console.log('  Water: user-area -> Main Dashboard button');

// 4. Broken / Inconsistent Classes
console.log('\nBroken / Inconsistent button styling:');
console.log('  .outline-btn in waste.css has color: white & border: 1px solid #ffffff66');
console.log('  Used on white/light backgrounds in:');
console.log('    - .staff-actions-bar (+ Add Worker, + Create Route, ↻ Refresh)');
console.log('    - dustbinTerminalSection quick shortcut button');
console.log('    - modals (.modal footer buttons)');

// 5. Check cards & borders
console.log('\nCard styling:');
const cardRules = wasteCss.match(/\.card\s*\{[^}]+\}/);
console.log('  Waste .card:', cardRules ? cardRules[0].replace(/\r?\n/g, ' ') : 'None');

// 6. Check responsive layout / media queries
console.log('\nMedia queries:');
const mediaMatches = wasteCss.match(/@media[^{]+\{/g);
console.log('  Waste media queries:', mediaMatches);


