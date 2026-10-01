const fs = require('fs');
const path = require('path');

function search(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, f.name);
    if (f.isDirectory()) {
      if (f.name !== 'node_modules' && f.name !== '.git') search(full);
    } else if (f.name.endsWith('.html') || f.name.endsWith('.js')) {
      const content = fs.readFileSync(full, 'utf8');
      const matches = [];
      const lines = content.split('\n');
      lines.forEach((l, idx) => {
        if (/ambulance/i.test(l) && /(track|request|assign|dispatch|status|live)/i.test(l)) {
          matches.push({ line: idx + 1, text: l.trim().slice(0, 120) });
        }
      });
      if (matches.length > 0) {
        console.log(`\n=== ${full} (${matches.length} matches) ===`);
        matches.slice(0, 8).forEach(m => console.log(`  L${m.line}: ${m.text}`));
      }
    }
  }
}

search('frontend');
