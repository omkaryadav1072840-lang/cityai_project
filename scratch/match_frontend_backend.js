const fs = require('fs');

const routes = JSON.parse(fs.readFileSync('scratch/registered_routes.json', 'utf8'));
const calls = JSON.parse(fs.readFileSync('scratch/frontend_calls.json', 'utf8'));

// Convert Express route path to regex
function routeToRegex(routePath) {
  if (Array.isArray(routePath)) {
    return routePath.map(r => routeToRegex(r));
  }
  // Replace :param with ([^/?#]+)
  const pattern = '^' + routePath.replace(/:[a-zA-Z0-9_]+/g, '([^/?#]+)') + '$';
  return new RegExp(pattern);
}

const compiledRoutes = [];
routes.forEach(r => {
  if (Array.isArray(r.path)) {
    r.path.forEach(p => {
      compiledRoutes.push({
        pathStr: p,
        regex: routeToRegex(p),
        methods: r.methods,
        file: r.file
      });
    });
  } else if (typeof r.path === 'string') {
    compiledRoutes.push({
      pathStr: r.path,
      regex: routeToRegex(r.path),
      methods: r.methods,
      file: r.file
    });
  }
});

const unmatchedCalls = [];
const methodMismatches = [];
const matchedCalls = [];

calls.forEach(call => {
  // Clean rawUrl by removing query strings and replacing ${...} with dummy string
  let cleanUrl = call.rawUrl.split('?')[0];
  cleanUrl = cleanUrl.replace(/\$\{.*?\}/g, 'PLACEHOLDER_VAL');

  let matched = false;
  let methodMatched = false;

  for (const cr of compiledRoutes) {
    if (cr.regex.test(cleanUrl)) {
      matched = true;
      if (cr.methods.includes(call.method)) {
        methodMatched = true;
        break;
      }
    }
  }

  if (!matched) {
    unmatchedCalls.push({
      file: call.file,
      url: call.rawUrl,
      cleanUrl,
      method: call.method
    });
  } else if (!methodMatched) {
    methodMismatches.push({
      file: call.file,
      url: call.rawUrl,
      cleanUrl,
      callMethod: call.method
    });
  } else {
    matchedCalls.push(call);
  }
});

console.log('=== FRONTEND TO BACKEND API MATCHING REPORT ===');
console.log(`Total Frontend API Calls: ${calls.length}`);
console.log(`Successfully Matched: ${matchedCalls.length}`);
console.log(`Unmatched (Route Missing in Backend): ${unmatchedCalls.length}`);
console.log(`Method Mismatches (e.g. Frontend GET but Backend POST): ${methodMismatches.length}`);

console.log('\n--- UNMATCHED CALLS (REAL BUGS / MISSING ROUTES) ---');
const uniqueUnmatched = {};
unmatchedCalls.forEach(u => {
  const key = `${u.method} ${u.cleanUrl}`;
  if (!uniqueUnmatched[key]) uniqueUnmatched[key] = [];
  uniqueUnmatched[key].push(u.file);
});

for (const [k, files] of Object.entries(uniqueUnmatched)) {
  console.log(`❌ ${k} (Called in: ${[...new Set(files)].join(', ')})`);
}

console.log('\n--- METHOD MISMATCHES ---');
methodMismatches.forEach(m => {
  console.log(`⚠️ ${m.callMethod} ${m.cleanUrl} (Called in: ${m.file})`);
});

fs.writeFileSync('scratch/unmatched_routes.json', JSON.stringify({ unmatchedCalls, methodMismatches }, null, 2));
