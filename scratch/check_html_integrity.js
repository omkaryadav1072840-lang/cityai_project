const fs = require('fs');
const path = require('path');

function walkHtml(dir) {
  let list = [];
  fs.readdirSync(dir).forEach(f => {
    if (f === 'node_modules' || f === '.git' || f === 'scratch') return;
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) list = list.concat(walkHtml(full));
    else if (f.endsWith('.html')) list.push(full);
  });
  return list;
}

const htmlFiles = walkHtml('frontend');
console.log('Verifying integrity for', htmlFiles.length, 'HTML files in frontend...');

let missing = [];

htmlFiles.forEach(htmlPath => {
  const htmlDir = path.dirname(htmlPath);
  const content = fs.readFileSync(htmlPath, 'utf8');

  // 1. Check <script src="...">
  const scriptRegex = /<script[^>]+src=["']([^"']+)["']/gi;
  let match;
  while ((match = scriptRegex.exec(content)) !== null) {
    let src = match[1];
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//')) continue;
    src = src.split('?')[0]; // strip query string

    let resolvedPath;
    if (src.startsWith('/')) {
      resolvedPath = path.join('frontend', src.slice(1));
    } else {
      resolvedPath = path.join(htmlDir, src);
    }

    if (!fs.existsSync(resolvedPath) && !fs.existsSync(path.join('.', src))) {
      missing.push({ html: htmlPath, type: 'SCRIPT', src, resolved: resolvedPath });
    }
  }

  // 2. Check <link rel="stylesheet" href="...">
  const cssRegex = /<link[^>]+href=["']([^"']+)["'][^>]*>/gi;
  while ((match = cssRegex.exec(content)) !== null) {
    let href = match[1];
    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) continue;
    href = href.split('?')[0];
    if (!href.endsWith('.css') && !href.endsWith('.ico') && !href.endsWith('.png') && !href.endsWith('.svg')) continue;

    let resolvedPath;
    if (href.startsWith('/')) {
      resolvedPath = path.join('frontend', href.slice(1));
    } else {
      resolvedPath = path.join(htmlDir, href);
    }

    if (!fs.existsSync(resolvedPath) && !fs.existsSync(path.join('.', href))) {
      missing.push({ html: htmlPath, type: 'LINK/CSS', src: href, resolved: resolvedPath });
    }
  }

  // 3. Check <img src="...">
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  while ((match = imgRegex.exec(content)) !== null) {
    let src = match[1];
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:') || src.startsWith('blob:')) continue;
    src = src.split('?')[0];

    let resolvedPath;
    if (src.startsWith('/')) {
      resolvedPath = path.join('frontend', src.slice(1));
    } else {
      resolvedPath = path.join(htmlDir, src);
    }

    if (!fs.existsSync(resolvedPath) && !fs.existsSync(path.join('.', src))) {
      missing.push({ html: htmlPath, type: 'IMG', src, resolved: resolvedPath });
    }
  }
});

console.log('Integrity check completed!');
console.log('Missing references:', missing.length);
if (missing.length > 0) {
  missing.forEach(m => console.log(`[${m.type} MISSING] in ${m.html}: ${m.src} (resolved: ${m.resolved})`));
}

