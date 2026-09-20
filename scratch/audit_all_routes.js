const fs = require('fs');
const path = require('path');

// Gather all backend routes
const backendFiles = fs.readdirSync('backend/routes').map(f => path.join('backend/routes', f));
backendFiles.push('backend/server.js');

let allRoutesContent = '';
backendFiles.forEach(f => {
  if (fs.existsSync(f)) allRoutesContent += '\n' + fs.readFileSync(f, 'utf8');
});

// Extract all router.get/post/put/delete paths
const routeDefinitions = [];
const routeRe = /(?:router|app)\.(get|post|put|delete|patch)\(\s*(\[[^\]]+\]|['"`][^'"`]+['"`])/g;
let rm;
while ((rm = routeRe.exec(allRoutesContent)) !== null) {
  const method = rm[1].toUpperCase();
  const rawPath = rm[2];
  if (rawPath.startsWith('[')) {
    try {
      const arr = eval(rawPath);
      arr.forEach(p => routeDefinitions.push({ method, path: p }));
    } catch (e) {}
  } else {
    routeDefinitions.push({ method, path: rawPath.replace(/['"`]/g, '') });
  }
}

console.log('Total registered backend routes:', routeDefinitions.length);

// Now walk frontend files and extract all fetch('/api/...')
function walk(dir, fl = []) {
  for (const f of fs.readdirSync(dir)) {
    if (f === 'node_modules') continue;
    const fp = path.join(dir, f);
    if (fs.statSync(fp).isDirectory()) walk(fp, fl);
    else if (f.endsWith('.js') || f.endsWith('.html')) fl.push(fp);
  }
  return fl;
}

const frontendFiles = walk('frontend');
const unmatched = [];
const allFetches = [];

frontendFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  // Match fetch("...", fetch(`...`, fetch('...'), apiRequest("..."), etc.
  const fetchRe = /(?:fetch|apiRequest)\s*\(\s*[`'"]([^`'"]+)[`'"]/g;
  let fm;
  while ((fm = fetchRe.exec(content)) !== null) {
    let url = fm[1];
    // Remove query params
    url = url.split('?')[0];
    // Remove hardcoded http://localhost:5000
    url = url.replace('http://localhost:5000', '');
    if (url.startsWith('/api') || url.startsWith('api')) {
      if (!url.startsWith('/')) url = '/' + url;
      allFetches.push({ file, url });
    }
  }
});

console.log('Total API calls in frontend:', allFetches.length);

// Check if each url matches any backend route pattern
allFetches.forEach(f => {
  // normalize ${...} to param
  const cleanUrl = f.url;
  // Test against route definitions
  const matched = routeDefinitions.some(rd => {
    // Convert express route like /api/patients/:patientId to regex
    const pattern = '^' + rd.path
      .replace(/:[a-zA-Z0-9_]+/g, '[^/]+')
      .replace(/[\/\\]/g, '\\/') + '$';
    try {
      // test with dummy replacement for template literals in url
      const testUrl = cleanUrl.replace(/\$\{[^}]+\}/g, 'testval');
      return new RegExp(pattern).test(testUrl);
    } catch (e) {
      return false;
    }
  });

  if (!matched) {
    unmatched.push(f);
  }
});

console.log('Unmatched frontend API calls (' + unmatched.length + '):');
const uniqueUnmatched = {};
unmatched.forEach(u => {
  const key = u.url;
  if (!uniqueUnmatched[key]) uniqueUnmatched[key] = [];
  uniqueUnmatched[key].push(u.file);
});

for (const [url, files] of Object.entries(uniqueUnmatched)) {
  console.log(`- ${url} (called from: ${files.join(', ')})`);
}
