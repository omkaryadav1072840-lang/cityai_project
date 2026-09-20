const fs = require('fs');
const content = fs.readFileSync('frontend/pages/parking/parking.html', 'utf8');
const lines = content.split('\n');
let depth = 0;
for (let i = 1900; i < lines.length; i++) {
  const line = lines[i] || '';
  const opens = (line.match(/<div\b/g) || []).length;
  const closes = (line.match(/<\/div>/g) || []).length;
  depth += (opens - closes);
  if (line.includes('class="parking-modal"') || line.includes('class="fine-modal-overlay"')) {
    console.log((i+1) + ' [depth ' + depth + ']: ' + line.trim());
  }
}
console.log('Final depth at bottom:', depth);
