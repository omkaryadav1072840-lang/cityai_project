const fs = require('fs');
const path = require('path');

const keywords = ['loginOpen', 'setLoginOpen', 'showLogin', 'closeLogin', 'setShowLogin', 'isLoginOpen', 'closeModal'];

function searchDir(dir) {
  fs.readdirSync(dir).forEach(f => {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory() && f !== 'node_modules' && f !== '.git') searchDir(full);
    else if (f.endsWith('.js') || f.endsWith('.html') || f.endsWith('.jsx') || f.endsWith('.tsx') || f.endsWith('.vue')) {
      const c = fs.readFileSync(full, 'utf8');
      c.split('\n').forEach((l, idx) => {
        keywords.forEach(kw => {
          if (l.includes(kw)) {
            console.log(full, idx + 1, kw, ':', l.trim().substring(0, 100));
          }
        });
      });
    }
  });
}
searchDir('frontend');
