const fs = require('fs');

const content = fs.readFileSync('frontend/script.js', 'utf8');
const lines = content.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('setTimeout') || l.includes('setInterval')) {
    console.log(idx + 1, l.trim().substring(0, 100));
  }
});
