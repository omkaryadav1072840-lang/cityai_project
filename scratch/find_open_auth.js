const fs = require('fs');
const path = require('path');

function searchDir(dir) {
  fs.readdirSync(dir).forEach(f => {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory() && f !== 'node_modules' && f !== '.git') searchDir(full);
    else if (f.endsWith('.js') || f.endsWith('.html')) {
      const c = fs.readFileSync(full, 'utf8');
      c.split('\n').forEach((l, idx) => {
        if (l.includes('openAuthPopup')) {
          console.log(full, idx + 1, l.trim());
        }
      });
    }
  });
}
searchDir('frontend');
