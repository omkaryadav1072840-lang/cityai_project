const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT_DIR = path.resolve(__dirname, '..');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');

function ping(url, method = 'GET', body = null) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: url,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, body: data.slice(0, 150) });
      });
    });
    req.on('error', (err) => resolve({ status: 'ERROR', error: err.message }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  const calls = JSON.parse(fs.readFileSync('scratch/frontend_calls.json', 'utf8'));
  console.log(`Auditing ${calls.length} frontend API calls across modules against live backend...`);

  const results = {
    total: calls.length,
    passed: 0,
    mismatchesOrMissing: []
  };

  // Dedup calls by method + normalized url
  const seen = new Set();
  const uniqueCalls = [];
  for (const c of calls) {
    let clean = c.rawUrl.split('?')[0].replace(/\$\{.*?\}/g, '1');
    const key = `${c.method} ${clean}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueCalls.push({ ...c, cleanUrl: clean });
    }
  }

  console.log(`Testing ${uniqueCalls.length} unique API signatures...`);

  for (const c of uniqueCalls) {
    const res = await ping(c.cleanUrl, c.method, c.method !== 'GET' ? {} : null);
    if (res.status === 404) {
      results.mismatchesOrMissing.push({
        file: c.file,
        method: c.method,
        url: c.rawUrl,
        testedUrl: c.cleanUrl,
        status: res.status,
        response: res.body
      });
    } else {
      results.passed++;
    }
  }

  console.log(`Passed: ${results.passed}, Missing/404: ${results.mismatchesOrMissing.length}`);
  fs.writeFileSync('scratch/live_api_audit_results.json', JSON.stringify(results, null, 2));
  
  if (results.mismatchesOrMissing.length > 0) {
    console.log('\n--- 404 NOT FOUND API CALLS (REAL BUGS) ---');
    results.mismatchesOrMissing.forEach(m => {
      console.log(`❌ [${m.method}] ${m.cleanUrl} in ${m.file}`);
    });
  }
}

run().catch(console.error);
