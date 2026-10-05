const fs = require('fs');

const content = fs.readFileSync('frontend/script.js', 'utf8');
const lines = content.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('checkExistingLogin') || l.includes('function closeAuth') || l.includes('closeAuthPopup')) {
    console.log(idx + 1, l.trim());
  }
});
