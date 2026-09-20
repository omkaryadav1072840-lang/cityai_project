const fs = require('fs');
const html = fs.readFileSync('frontend/pages/traffic/traffic.html', 'utf8');

const idx = html.indexOf('/socket.io/socket.io.js');
console.log('Index of socket.io:', idx);
console.log('Surrounding 200 chars before:');
console.log(html.substring(idx - 200, idx));

// Check if there is any unclosed tag before that
const before = html.substring(0, idx);
const tagRegex = /<\/?([a-zA-Z0-9\-]+)[^>]*>/g;
let m;
const stack = [];
while ((m = tagRegex.exec(before)) !== null) {
  const full = m[0];
  const tag = m[1].toLowerCase();
  if (full.endsWith('/>') || ['meta', 'link', 'input', 'img', 'br', 'hr'].includes(tag)) {
    continue;
  }
  if (full.startsWith('</')) {
    const last = stack.pop();
    if (last !== tag) {
      // console.log(`Mismatch: expected </${last}>, found </${tag}> at pos ${m.index}`);
    }
  } else {
    stack.push(tag);
  }
}
console.log('Unclosed tags remaining on stack before scripts:', stack);
