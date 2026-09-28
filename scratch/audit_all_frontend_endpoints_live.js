const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT_DIR = path.resolve(__dirname, '..');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');

function findJsFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && !file.startsWith('.')) {
        results = results.concat(findJsFiles(full));
      }
    } else if (file.endsWith('.js')) {
      results.push(full);
    }
  }
  return results;
}

const jsFiles = findJsFiles(FRONTEND_DIR);
console.log(`Auditing ${jsFiles.length} JS files in frontend...`);

// Extract all endpoints and HTTP methods
const endpointMap = new Map(); // endpoint -> Set of methods

for (const jsPath of jsFiles) {
  const content = fs.readFileSync(jsPath, 'utf8');
  const relPath = path.relative(ROOT_DIR, jsPath);

  // Match fetch(url, options) or apiRequest(url, options) or SmartCityAuth.fetch(url, options)
  const regex = /(?:fetch|apiRequest|SmartCityAuth\.fetch)\s*\(\s*([`'"])(.*?)\1(?:\s*,\s*(\{[\s\S]*?\}))?/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    let url = match[2];
    let optStr = match[3] || '';
    if (!url.includes('/api/')) continue;

    // Detect method
    let method = 'GET';
    const methodMatch = optStr.match(/method\s*:\s*["'](GET|POST|PUT|DELETE|PATCH)["']/i);
    if (methodMatch) {
      method = methodMatch[1].toUpperCase();
    }

    // Normalize URL: replace template strings like ${id} or ${...} with dummy "1"
    let normalized = url.replace(/\$\{.*?\}/g, '1').split('?')[0];

    if (!endpointMap.has(normalized)) {
      endpointMap.set(normalized, { methods: new Set(), callers: new Set(), raw: url });
    }
    endpointMap.get(normalized).methods.add(method);
    endpointMap.get(normalized).callers.add(relPath);
  }
}

console.log(`Found ${endpointMap.size} distinct API endpoint calls across frontend.`);

// Also get auth token for authenticated requests
function getAuthToken() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve(json.token || null);
        } catch {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.write(JSON.stringify({ mobile: '9876543210', password: 'Password@123' }));
    req.end();
  });
}

function requestEndpoint(url, method, token) {
  return new Promise((resolve) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: url,
      method: method,
      headers
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        resolve({ status: res.statusCode, body: body.slice(0, 150) });
      });
    });
    req.on('error', (err) => resolve({ status: 'ERROR', body: err.message }));
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      req.write(JSON.stringify({ dummy: 1 }));
    }
    req.end();
  });
}

async function run() {
  const token = await getAuthToken();
  console.log(`Auth token acquired: ${token ? 'YES' : 'NO'}`);

  const notFound = [];
  const serverErrors = [];
  const ok = [];

  for (const [ep, info] of endpointMap.entries()) {
    for (const method of info.methods) {
      const res = await requestEndpoint(ep, method, token);
      if (res.status === 404) {
        notFound.push({ endpoint: ep, method, callers: Array.from(info.callers), response: res.body });
      } else if (res.status === 500) {
        serverErrors.push({ endpoint: ep, method, callers: Array.from(info.callers), response: res.body });
      } else {
        ok.push({ endpoint: ep, method, status: res.status });
      }
    }
  }

  console.log('\n=================================================');
  console.log(`RESULTS: ${ok.length} OK/Expected, ${notFound.length} 404 NOT FOUND, ${serverErrors.length} 500 SERVER ERRORS`);
  console.log('=================================================');

  if (notFound.length > 0) {
    console.log('\n❌ 404 NOT FOUND ENDPOINTS:');
    notFound.forEach(n => {
      console.log(` [404] ${n.method} ${n.endpoint}`);
      console.log(`       Called in: ${n.callers.join(', ')}`);
    });
  }

  if (serverErrors.length > 0) {
    console.log('\n💥 500 INTERNAL SERVER ERROR ENDPOINTS:');
    serverErrors.forEach(s => {
      console.log(` [500] ${s.method} ${s.endpoint}`);
      console.log(`       Called in: ${s.callers.join(', ')}`);
      console.log(`       Message: ${s.response}`);
    });
  }

  fs.writeFileSync('scratch/live_api_endpoint_audit.json', JSON.stringify({ notFound, serverErrors, okCount: ok.length }, null, 2));
}

run();
