const fs = require('fs');
const path = require('path');

function search(dir) {
  fs.readdirSync(dir).forEach(f => {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory() && f !== 'node_modules' && f !== '.git') search(full);
    else if (f.endsWith('.js')) {
      const c = fs.readFileSync(full, 'utf8');
      c.split('\n').forEach((l, idx) => {
        if (l.includes('setInterval') || l.includes('setTimeout') || l.includes('1000') || l.includes('1500') || l.includes('2000')) {
          if (l.includes('modal') || l.includes('Modal') || l.includes('login') || l.includes('Login') || l.includes('auth') || l.includes('Auth') || l.includes('remove') || l.includes('close') || l.includes('Close') || l.includes('display') || l.includes('renderUserHeader')) {
            console.log(full, idx + 1, l.trim());
          }
        }
      });
    }
  });
}
search('frontend');
