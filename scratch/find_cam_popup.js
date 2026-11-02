const fs = require('fs');
const content = fs.readFileSync('./frontend/pages/traffic/traffic.js', 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes("props.type === 'camera'") || l.includes('props.type === "camera"')) {
    console.log(lines.slice(i, Math.min(lines.length, i + 50)).join('\n'));
  }
});

