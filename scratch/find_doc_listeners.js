const fs = require('fs');
const path = require('path');

function searchDir(dir) {
  fs.readdirSync(dir).forEach(f => {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory() && f !== 'node_modules' && f !== '.git') searchDir(full);
    else if (f.endsWith('.js')) {
      const c = fs.readFileSync(full, 'utf8');
      c.split('\n').forEach((l, idx) => {
        if (/document\.addEventListener|window\.addEventListener/.test(l)) {
          console.log(full, idx + 1, l.trim());
        }
      });
    }
  });
}
searchDir('frontend');
