const fs = require('fs');

['frontend/script.js', 'frontend/auth.js', 'frontend/realtime.js'].forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  content.split('\n').forEach((l, idx) => {
    if (l.includes('addEventListener') && l.includes('click') && (l.includes('document') || l.includes('window'))) {
      console.log(file, idx + 1, l.trim());
    }
  });
});
