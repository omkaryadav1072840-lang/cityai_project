const fs = require('fs');

const html = fs.readFileSync('frontend/pages/water/water.html', 'utf8');
const js = fs.readFileSync('frontend/pages/water/water.js', 'utf8');
const css = fs.readFileSync('frontend/pages/water/water.css', 'utf8');

const htmlClasses = new Set();
const classRegex = /class=["']([^"']+)["']/g;
let m;
while ((m = classRegex.exec(html)) !== null) {
  m[1].split(/\s+/).forEach(c => c && htmlClasses.add(c));
}

const jsClasses = new Set();
const jsClassRegex = /class(?:Name)?\s*=\s*["']([^"']+)["']/g;
while ((m = jsClassRegex.exec(js)) !== null) {
  m[1].split(/\s+/).forEach(c => c && jsClasses.add(c));
}

// Also check classList.add(...)
const classListRegex = /classList\.add\(["']([^"']+)["']\)/g;
while ((m = classListRegex.exec(js)) !== null) {
  m[1].split(/\s+/).forEach(c => c && jsClasses.add(c));
}

const missing = [];
for (const c of [...htmlClasses, ...jsClasses]) {
  if (!css.includes(c) && !['active', 'show', 'hide', 'hidden', 'open', 'disabled', 'potable', 'sewage', 'corridor', 'primary', 'success', 'danger'].includes(c)) {
    missing.push(c);
  }
}
console.log('Total unique classes:', htmlClasses.size + jsClasses.size);
console.log('Classes not found in water.css (' + missing.length + '):', missing.sort());
