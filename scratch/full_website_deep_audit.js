const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT_DIR = path.resolve(__dirname, '..');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');
const BACKEND_DIR = path.join(ROOT_DIR, 'backend');

// Helper to make HTTP requests
function pingEndpoint(endpoint, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: endpoint,
      method,
      headers: { 'Content-Type': 'application/json', ...headers }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body.slice(0, 100) });
        }
      });
    });
    req.on('error', (err) => resolve({ status: 'ERROR', error: err.message }));
    if (data) req.write(typeof data === 'string' ? data : JSON.stringify(data));
    req.end();
  });
}

// Recursively find files
function findFiles(dir, ext) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && !file.startsWith('.')) {
        results = results.concat(findFiles(filePath, ext));
      }
    } else if (file.endsWith(ext)) {
      results.push(filePath);
    }
  });
  return results;
}

async function runDeepAudit() {
  console.log('====================================================');
  console.log('🔍 SMART CITY AI — COMPREHENSIVE FULL-WEBSITE AUDIT');
  console.log('====================================================\n');

  const auditReport = {
    pagesAnalyzed: 0,
    brokenAssets: [],
    missingFunctions: [],
    missingModalTriggers: [],
    backendRouteMismatches: [],
    duplicateFiles: [],
    jsSyntaxErrors: [],
    databaseIssues: [],
    uxSuggestions: []
  };

  // 1. FILE INVENTORY & DUPLICATES
  console.log('--- 1. AUDITING PAGES & DUPLICATE FILES ---');
  const htmlFiles = findFiles(FRONTEND_DIR, '.html');
  auditReport.pagesAnalyzed = htmlFiles.length;
  console.log(`Found ${htmlFiles.length} HTML pages.`);

  // Check duplicate famous pages
  const hasFamose = fs.existsSync(path.join(FRONTEND_DIR, 'pages', 'famous', 'famose.html'));
  const hasFamous = fs.existsSync(path.join(FRONTEND_DIR, 'pages', 'famous', 'famous.html'));
  if (hasFamose && hasFamous) {
    auditReport.duplicateFiles.push({
      issue: 'Duplicate / Typo HTML file in Famous Places module',
      files: ['frontend/pages/famous/famose.html', 'frontend/pages/famous/famous.html'],
      recommendation: 'Remove famose.html (typo) and keep only famous.html'
    });
  }

  // 2. CHECK ASSETS (CSS & JS linked in HTML)
  console.log('\n--- 2. AUDITING LINKED ASSETS (SCRIPTS & STYLESHEETS) ---');
  for (const htmlPath of htmlFiles) {
    const relHtml = path.relative(ROOT_DIR, htmlPath);
    const html = fs.readFileSync(htmlPath, 'utf8');
    const htmlDir = path.dirname(htmlPath);

    // Check script src
    const scriptMatches = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)];
    for (const sm of scriptMatches) {
      const src = sm[1];
      if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//')) continue;
      // Local path resolution
      let resolved;
      if (src.startsWith('/')) {
        resolved = path.join(FRONTEND_DIR, src.slice(1));
      } else {
        resolved = path.resolve(htmlDir, src);
      }
      if (!fs.existsSync(resolved)) {
        auditReport.brokenAssets.push({
          page: relHtml,
          type: 'script',
          src,
          resolved: path.relative(ROOT_DIR, resolved)
        });
      }
    }

    // Check link stylesheet
    const linkMatches = [...html.matchAll(/<link[^>]+href=["']([^"']+)["'][^>]*>/gi)];
    for (const lm of linkMatches) {
      const tag = lm[0];
      if (!tag.includes('stylesheet')) continue;
      const href = lm[1];
      if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) continue;
      let resolved;
      if (href.startsWith('/')) {
        resolved = path.join(FRONTEND_DIR, href.slice(1));
      } else {
        resolved = path.resolve(htmlDir, href);
      }
      if (!fs.existsSync(resolved)) {
        auditReport.brokenAssets.push({
          page: relHtml,
          type: 'stylesheet',
          src: href,
          resolved: path.relative(ROOT_DIR, resolved)
        });
      }
    }
  }

  console.log(`Broken asset links found: ${auditReport.brokenAssets.length}`);
  auditReport.brokenAssets.forEach(b => console.log(` ❌ [${b.page}] Missing ${b.type}: ${b.src}`));

  // 3. AUDIT JAVASCRIPT FILES & SYNTAX
  console.log('\n--- 3. AUDITING JAVASCRIPT SYNTAX & CODE INTEGRITY ---');
  const jsFiles = findFiles(FRONTEND_DIR, '.js');
  for (const jsPath of jsFiles) {
    const relJs = path.relative(ROOT_DIR, jsPath);
    const jsContent = fs.readFileSync(jsPath, 'utf8');
    try {
      new Function(jsContent);
    } catch (e) {
      auditReport.jsSyntaxErrors.push({ file: relJs, error: e.message });
      console.log(` ❌ Syntax error in ${relJs}: ${e.message}`);
    }
  }
  if (auditReport.jsSyntaxErrors.length === 0) {
    console.log(` ✅ All ${jsFiles.length} JavaScript files passed syntax verification.`);
  }

  // 4. AUDIT EVENT HANDLERS & MODAL TRIGGERS PER PAGE
  console.log('\n--- 4. AUDITING EVENT HANDLERS & MODALS PER PAGE ---');
  for (const htmlPath of htmlFiles) {
    const relHtml = path.relative(ROOT_DIR, htmlPath);
    const html = fs.readFileSync(htmlPath, 'utf8');
    const htmlDir = path.dirname(htmlPath);

    // Find linked scripts for this page
    const scriptSrcs = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m => m[1]);
    let combinedJs = '';
    for (const src of scriptSrcs) {
      if (src.startsWith('http://') || src.startsWith('https://')) continue;
      let resolved = src.startsWith('/') ? path.join(FRONTEND_DIR, src.slice(1)) : path.resolve(htmlDir, src);
      if (fs.existsSync(resolved)) {
        combinedJs += '\n' + fs.readFileSync(resolved, 'utf8');
      }
    }

    // Inline event handlers
    const eventMatches = [...html.matchAll(/on(?:click|change|input|submit)=["']([a-zA-Z0-9_$]+)\s*\(/gi)];
    for (const em of eventMatches) {
      const fn = em[1];
      if (fn === 'alert' || fn === 'console' || fn === 'history' || fn === 'event' || fn === 'openModal' || fn === 'closeModal') continue;
      const definedInJs = combinedJs.includes('function ' + fn) || combinedJs.includes(fn + ' =') || combinedJs.includes('window.' + fn) || html.includes('function ' + fn);
      if (!definedInJs) {
        auditReport.missingFunctions.push({
          page: relHtml,
          functionName: fn
        });
      }
    }

    // Modal triggers: openModal('modalId') or closeModal('modalId')
    const modalCalls = [...(html + combinedJs).matchAll(/(?:openModal|closeModal)\s*\(\s*["']([^"']+)["']\s*\)/g)].map(m => m[1]);
    const uniqueModals = [...new Set(modalCalls)];
    for (const mId of uniqueModals) {
      const inHtml = html.includes(`id="${mId}"`) || html.includes(`id='${mId}'`);
      const createdInJs = combinedJs.includes(`modal.id = "${mId}"`) || combinedJs.includes(`modal.id = '${mId}'`) || combinedJs.includes(`id="${mId}"`);
      if (!inHtml && !createdInJs) {
        auditReport.missingModalTriggers.push({
          page: relHtml,
          modalId: mId
        });
      }
    }
  }

  console.log(`Missing event handler functions: ${auditReport.missingFunctions.length}`);
  auditReport.missingFunctions.forEach(m => console.log(` ❌ [${m.page}] Missing function: ${m.functionName}()`));
  console.log(`Missing modal IDs: ${auditReport.missingModalTriggers.length}`);
  auditReport.missingModalTriggers.forEach(m => console.log(` ❌ [${m.page}] Missing modal ID: #${m.modalId}`));

  // 5. AUDIT FRONTEND API CALLS VS BACKEND ROUTES
  console.log('\n--- 5. AUDITING API ENDPOINTS CALLED IN FRONTEND ---');
  const allApiCalls = new Set();
  for (const jsPath of jsFiles) {
    const js = fs.readFileSync(jsPath, 'utf8');
    const matches = [...js.matchAll(/(?:fetch|apiRequest)\s*\(\s*([`'"])(.*?)\1/g)];
    matches.forEach(m => {
      let raw = m[2];
      if (raw.includes('/api/')) {
        // Strip template literal expressions e.g. ${...}
        const cleaned = raw.replace(/\$\{.*?\}/g, 'PARAM').split('?')[0];
        allApiCalls.add(cleaned);
      }
    });
  }

  console.log(`Found ${allApiCalls.size} distinct API endpoints called across frontend.`);
  for (const ep of allApiCalls) {
    // Test endpoint with dummy params if needed
    const testUrl = ep.replace(/PARAM/g, '1');
    const res = await pingEndpoint(testUrl);
    if (res.status === 404 || res.status === 'ERROR') {
      auditReport.backendRouteMismatches.push({
        endpoint: ep,
        testedUrl: testUrl,
        status: res.status
      });
      console.log(` ❌ [${res.status}] Missing API: ${ep}`);
    } else {
      // console.log(` ✅ [${res.status}] ${ep}`);
    }
  }

  // 6. MODULE-BY-MODULE AUDIT SUMMARY
  console.log('\n====================================================');
  console.log('📊 AUDIT RESULTS SUMMARY');
  console.log('====================================================');
  console.log(`Total HTML Pages Analyzed: ${auditReport.pagesAnalyzed}`);
  console.log(`Broken Asset References: ${auditReport.brokenAssets.length}`);
  console.log(`Duplicate / Typo Pages: ${auditReport.duplicateFiles.length}`);
  console.log(`Missing JS Event Handlers: ${auditReport.missingFunctions.length}`);
  console.log(`Missing Modal Containers: ${auditReport.missingModalTriggers.length}`);
  console.log(`Missing/404 Backend APIs: ${auditReport.backendRouteMismatches.length}`);

  fs.writeFileSync('scratch/full_audit_report.json', JSON.stringify(auditReport, null, 2));
  console.log('\nDetailed JSON report saved to scratch/full_audit_report.json');

  process.exit(0);
}

runDeepAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
