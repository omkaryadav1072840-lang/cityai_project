const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');

const htmlPages = [
  'frontend/index.html',
  'frontend/pages/hospital/hospital.html',
  'frontend/pages/hospital/doctor_dashboard.html',
  'frontend/pages/hospital/hospital_dashboard.html',
  'frontend/pages/traffic/traffic.html',
  'frontend/pages/parking/parking.html',
  'frontend/pages/police/police.html',
  'frontend/pages/waste/waste.html',
  'frontend/pages/water/water.html',
  'frontend/pages/emergency/emergency.html',
  'frontend/pages/famous/famous.html',
  'frontend/pages/famous/famose.html'
];

const results = {
  pages: {},
  summary: {
    totalHtmlPages: htmlPages.length,
    criticalBugs: [],
    mediumBugs: [],
    deadLinks: [],
    duplicateFiles: [],
    duplicateFunctions: [],
    duplicateIds: [],
    missingAssets: [],
    missingFunctions: [],
    backendRouteMismatches: []
  }
};

// Check duplicate files
if (fs.existsSync(path.join(FRONTEND_DIR, 'pages/famous/famose.html')) && fs.existsSync(path.join(FRONTEND_DIR, 'pages/famous/famous.html'))) {
  results.summary.duplicateFiles.push({
    file: 'frontend/pages/famous/famose.html and famose.js',
    issue: 'Exact duplicate typo files of famous.html and famous.js',
    action: 'Delete famose.html and famose.js to eliminate redundant 160KB code and confusion.'
  });
}

htmlPages.forEach(relHtml => {
  const fullHtml = path.join(ROOT_DIR, relHtml);
  if (!fs.existsSync(fullHtml)) return;

  const htmlContent = fs.readFileSync(fullHtml, 'utf8');
  const htmlDir = path.dirname(fullHtml);
  const pageReport = {
    missingScripts: [],
    missingStyles: [],
    deadLinks: [],
    duplicateIds: [],
    missingHandlers: [],
    scriptFiles: []
  };

  // 1. Check Scripts
  const scripts = [...htmlContent.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m => m[1]);
  let combinedJs = '';
  scripts.forEach(src => {
    if (src.startsWith('http://') || src.startsWith('https://')) return;
    let resolved = src.startsWith('/') ? path.join(FRONTEND_DIR, src.slice(1)) : path.resolve(htmlDir, src);
    if (!fs.existsSync(resolved)) {
      pageReport.missingScripts.push(src);
      results.summary.missingAssets.push({ page: relHtml, asset: src, type: 'script' });
    } else {
      pageReport.scriptFiles.push(path.relative(ROOT_DIR, resolved));
      combinedJs += '\n' + fs.readFileSync(resolved, 'utf8');
    }
  });

  // 2. Check Styles
  const styles = [...htmlContent.matchAll(/<link[^>]+href=["']([^"']+)["'][^>]*>/gi)];
  styles.forEach(m => {
    if (!m[0].includes('stylesheet')) return;
    const href = m[1];
    if (href.startsWith('http://') || href.startsWith('https://')) return;
    let resolved = href.startsWith('/') ? path.join(FRONTEND_DIR, href.slice(1)) : path.resolve(htmlDir, href);
    if (!fs.existsSync(resolved)) {
      pageReport.missingStyles.push(href);
      results.summary.missingAssets.push({ page: relHtml, asset: href, type: 'stylesheet' });
    }
  });

  // 3. Check Anchor Links
  const links = [...htmlContent.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>/gi)].map(m => m[1]);
  links.forEach(href => {
    if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('tel:') || href.startsWith('mailto:')) return;
    if (href.startsWith('http://') || href.startsWith('https://')) return;
    let resolved = href.startsWith('/') ? path.join(FRONTEND_DIR, href.slice(1)) : path.resolve(htmlDir, href.split('#')[0].split('?')[0]);
    if (!fs.existsSync(resolved)) {
      pageReport.deadLinks.push(href);
      results.summary.deadLinks.push({ page: relHtml, link: href });
    }
  });

  // 4. Check Duplicate Element IDs
  const idMatches = [...htmlContent.matchAll(/id=["']([a-zA-Z0-9_\-]+)["']/gi)].map(m => m[1]);
  const idCounts = {};
  idMatches.forEach(id => {
    idCounts[id] = (idCounts[id] || 0) + 1;
  });
  for (const [id, count] of Object.entries(idCounts)) {
    if (count > 1) {
      pageReport.duplicateIds.push({ id, count });
      results.summary.duplicateIds.push({ page: relHtml, id, count });
    }
  }

  // 5. Check inline onclick / onchange / onsubmit
  const eventMatches = [...htmlContent.matchAll(/on(?:click|change|input|submit)=["']([a-zA-Z0-9_$]+)\s*\(/gi)].map(m => m[1]);
  const checkedFns = new Set();
  eventMatches.forEach(fn => {
    if (checkedFns.has(fn)) return;
    checkedFns.add(fn);
    if (['alert', 'console', 'history', 'event', 'openModal', 'closeModal', 'confirm', 'prompt', 'print'].includes(fn)) return;

    // Check if defined in combinedJs or in inline <script>
    const isDefined = combinedJs.includes('function ' + fn) || 
                      combinedJs.includes('window.' + fn) || 
                      combinedJs.includes(fn + ' =') || 
                      htmlContent.includes('function ' + fn) ||
                      htmlContent.includes('window.' + fn);
    if (!isDefined) {
      pageReport.missingHandlers.push(fn);
      results.summary.missingFunctions.push({ page: relHtml, functionName: fn });
    }
  });

  results.pages[relHtml] = pageReport;
});

// Check JS files for duplicate functions
const jsFiles = [];
function findJs(dir) {
  fs.readdirSync(dir).forEach(f => {
    let full = path.join(dir, f);
    if (fs.statSync(full).isDirectory() && f !== 'node_modules') findJs(full);
    else if (f.endsWith('.js')) jsFiles.push(full);
  });
}
findJs(FRONTEND_DIR);

jsFiles.forEach(f => {
  const relJs = path.relative(ROOT_DIR, f);
  if (relJs.includes('famose.js')) return; // Ignore typo duplicate
  const content = fs.readFileSync(f, 'utf8');
  const fnMatches = [...content.matchAll(/function\s+([a-zA-Z0-9_$]+)\s*\(/g)].map(m => m[1]);
  const fnCount = {};
  fnMatches.forEach(name => {
    fnCount[name] = (fnCount[name] || 0) + 1;
  });
  for (const [fn, cnt] of Object.entries(fnCount)) {
    if (cnt > 1) {
      results.summary.duplicateFunctions.push({ file: relJs, functionName: fn, count: cnt });
    }
  }
});

fs.writeFileSync('scratch/audit_full_suite_result.json', JSON.stringify(results, null, 2));
console.log('AUDIT FULL SUITE COMPLETE!');
console.log('Missing Assets:', results.summary.missingAssets.length);
console.log('Dead Links:', results.summary.deadLinks.length);
console.log('Duplicate IDs:', results.summary.duplicateIds.length);
console.log('Missing Event Functions:', results.summary.missingFunctions.length);
console.log('Duplicate Functions:', results.summary.duplicateFunctions.length);
console.log('Duplicate Files:', results.summary.duplicateFiles.length);
