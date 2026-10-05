const fs = require('fs');

const content = fs.readFileSync('frontend/auth.js', 'utf8');
const lines = content.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('setInterval') || l.includes('setTimeout') || l.includes('addEventListener') || l.includes('remove') || l.includes('close')) {
    console.log(idx + 1, l.trim().substring(0, 110));
  }
});
