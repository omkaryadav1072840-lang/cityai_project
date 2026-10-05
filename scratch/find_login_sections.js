const fs = require('fs');
const path = require('path');

function search(dir) {
  fs.readdirSync(dir).forEach(f => {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory() && f !== 'node_modules' && f !== '.git') search(full);
    else if (f.endsWith('.html')) {
      const c = fs.readFileSync(full, 'utf8');
      c.split('\n').forEach((l, idx) => {
        if (/id=["'][^"']*(login|auth)[^"']*["']/i.test(l) || /class=["'][^"']*(login|auth)[^"']*["']/i.test(l) || /<section[^>]*login/i.test(l)) {
          console.log(full, idx + 1, l.trim().substring(0, 120));
        }
      });
    }
  });
}
search('frontend');
