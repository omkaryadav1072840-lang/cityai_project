const fs = require('fs');
const html = fs.readFileSync('frontend/pages/waste/waste.html', 'utf8');
const lines = html.split('\n');

function findLine(str) {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(str)) return i + 1;
  }
  return -1;
}

console.log('Navbar line:', findLine('<header class="navbar">'));
console.log('Layer tabs line:', findLine('class="layer-tabs-container"'));
console.log('Role banner line:', findLine('id="roleBanner"'));
console.log('Shared map line:', findLine('class="card map-card"'));
console.log('Layer 1 citizen line:', findLine('id="layer-citizen-content"'));
console.log('Layer 2 staff line:', findLine('id="layer-staff-content"'));
console.log('Staff actions bar line:', findLine('class="staff-actions-bar"'));
console.log('Dustbin terminal line:', findLine('id="dustbinTerminalSection"'));
console.log('Layer 3 admin line:', findLine('id="layer-admin-content"'));

