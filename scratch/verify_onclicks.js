const fs = require('fs');
const html = fs.readFileSync('./frontend/pages/parking/parking.html', 'utf8');
const js = fs.readFileSync('./frontend/pages/parking/parking.js', 'utf8');

const regex = /onclick="([^"]+)"/g;
let match;
const functions = new Set();

while ((match = regex.exec(html)) !== null) {
  const statement = match[1];
  const parts = statement.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.includes('(')) {
      const fn = trimmed.split('(')[0].trim().replace(/^window\./, '');
      if (fn && !fn.includes('event.') && !fn.includes('document.') && !fn.includes('history.')) {
        functions.add(fn);
      }
    }
  }
}

console.log('Checked functions:', Array.from(functions));
const missing = [];
for (const fn of functions) {
  if (!js.includes(fn)) {
    missing.push(fn);
  }
}

if (missing.length === 0) {
  console.log('SUCCESS: All HTML onclick functions are declared in parking.js!');
} else {
  console.error('Missing functions:', missing);
  process.exit(1);
}
