const fs = require('fs');
const js = fs.readFileSync('frontend/pages/traffic/traffic.js', 'utf8');

const camIds = [
  'cam-edit-id', 'cam-junction-select', 'cam-name-input', 'cam-dir-select',
  'cam-stream-input', 'cam-source-select', 'cam-playback-select',
  'cam-status-select', 'cam-res-select', 'cam-lat-input', 'cam-lng-input'
];

for (const id of camIds) {
  const matches = [...js.matchAll(new RegExp(`document\\.getElementById\\(["']${id}["']\\)`, 'g'))];
  const lines = matches.map(m => js.substring(0, m.index).split('\n').length);
  console.log(`${id}: found at line(s) ${lines.join(', ')}`);
}

