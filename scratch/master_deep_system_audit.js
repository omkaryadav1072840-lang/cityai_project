const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT_DIR = path.resolve(__dirname, '..');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');
const BACKEND_DIR = path.join(ROOT_DIR, 'backend');

// 1. Gather all HTML pages and their scripts/stylesheets
const htmlFiles = [
  'frontend/index.html',
  'frontend/pages/emergency/emergency.html',
  'frontend/pages/famous/famous.html',
  'frontend/pages/hospital/hospital.html',
  'frontend/pages/hospital/hospital_dashboard.html',
  'frontend/pages/hospital/doctor_dashboard.html',
  'frontend/pages/parking/parking.html',
  'frontend/pages/police/police.html',
  'frontend/pages/traffic/traffic.html',
  'frontend/pages/waste/waste.html',
  'frontend/pages/water/water.html'
];

console.log("=================================================");
console.log("🔍 MASTER DEEP SYSTEM AUDIT: SMARTCITY AI");
console.log("=================================================\n");

const issues = [];
const warnings = [];

// AUDIT 1: HTML Assets (Scripts & Stylesheets)
console.log("--- AUDIT 1: Asset Resolution (Local & CDN) ---");
for (const relHtml of htmlFiles) {
  const fullHtml = path.join(ROOT_DIR, relHtml);
  if (!fs.existsSync(fullHtml)) {
    issues.push({ category: "HTML", file: relHtml, message: "File does not exist" });
    continue;
  }
  const content = fs.readFileSync(fullHtml, 'utf8');
  const htmlDir = path.dirname(fullHtml);

  // Scripts
  const scripts = [...content.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m => m[1]);
  for (const src of scripts) {
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//')) continue;
    if (src === '/socket.io/socket.io.js') {
      // Dynamic route served by socket.io server
      continue;
    }
    const resolved = src.startsWith('/') ? path.join(FRONTEND_DIR, src.slice(1)) : path.resolve(htmlDir, src);
    if (!fs.existsSync(resolved)) {
      issues.push({ category: "Asset", file: relHtml, message: `Missing script: ${src} (resolved to ${path.relative(ROOT_DIR, resolved)})` });
    }
  }

  // Stylesheets
  const styles = [...content.matchAll(/<link[^>]+href=["']([^"']+)["'][^>]*>/gi)]
    .filter(m => m[0].includes('stylesheet'))
    .map(m => m[1]);
  for (const href of styles) {
    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) continue;
    const resolved = href.startsWith('/') ? path.join(FRONTEND_DIR, href.slice(1)) : path.resolve(htmlDir, href);
    if (!fs.existsSync(resolved)) {
      issues.push({ category: "Asset", file: relHtml, message: `Missing stylesheet: ${href} (resolved to ${path.relative(ROOT_DIR, resolved)})` });
    }
  }
}

// AUDIT 2: HTML Event Handlers (onclick, onchange, etc.)
console.log("--- AUDIT 2: HTML Inline Event Handlers ---");
for (const relHtml of htmlFiles) {
  const fullHtml = path.join(ROOT_DIR, relHtml);
  if (!fs.existsSync(fullHtml)) continue;
  const html = fs.readFileSync(fullHtml, 'utf8');
  const htmlDir = path.dirname(fullHtml);

  // Load all included JS
  const scriptSrcs = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m => m[1]);
  let combinedJs = '';
  for (const src of scriptSrcs) {
    if (src.startsWith('http://') || src.startsWith('https://') || src === '/socket.io/socket.io.js') continue;
    const resolved = src.startsWith('/') ? path.join(FRONTEND_DIR, src.slice(1)) : path.resolve(htmlDir, src);
    if (fs.existsSync(resolved)) {
      combinedJs += '\n' + fs.readFileSync(resolved, 'utf8');
    }
  }
  // Include inline scripts
  const inlineScripts = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
  combinedJs += '\n' + inlineScripts.join('\n');

  // Check event handlers
  const eventMatches = [...html.matchAll(/on(?:click|change|input|submit)=["']([^"']+)["']/gi)];
  for (const em of eventMatches) {
    const rawHandler = em[1].trim();
    // Extract function calls
    const statements = rawHandler.split(';');
    for (const stmt of statements) {
      const trimmed = stmt.trim();
      if (!trimmed) continue;
      const fnMatch = trimmed.match(/^([a-zA-Z0-9_$]+)\s*\(/);
      if (fnMatch) {
        const fnName = fnMatch[1];
        const builtins = ['alert', 'confirm', 'prompt', 'openModal', 'closeModal', 'console', 'history', 'event', 'stopPropagation', 'preventDefault'];
        if (builtins.includes(fnName)) continue;

        // Check if declared in combinedJs
        const declared = 
          combinedJs.includes(`function ${fnName}`) ||
          combinedJs.includes(`${fnName} =`) ||
          combinedJs.includes(`window.${fnName}`) ||
          combinedJs.includes(`var ${fnName}`) ||
          combinedJs.includes(`let ${fnName}`) ||
          combinedJs.includes(`const ${fnName}`);

        if (!declared) {
          issues.push({
            category: "EventHandler",
            file: relHtml,
            message: `Event handler calls '${fnName}()' but function is not defined in linked JS files!`
          });
        }
      }
    }
  }

  // AUDIT 3: Modal Triggers
  const modalOpenCalls = [...(html + combinedJs).matchAll(/openModal\s*\(\s*["']([^"']+)["']\s*\)/g)].map(m => m[1]);
  for (const modalId of new Set(modalOpenCalls)) {
    const hasModal = html.includes(`id="${modalId}"`) || 
                     html.includes(`id='${modalId}'`) ||
                     combinedJs.includes(`id = "${modalId}"`) ||
                     combinedJs.includes(`id = '${modalId}'`);
    if (!hasModal) {
      issues.push({
        category: "Modal",
        file: relHtml,
        message: `openModal('${modalId}') called, but no element with id="${modalId}" exists in HTML or JS!`
      });
    }
  }
}

// AUDIT 4: Check getElementById in JS files vs corresponding HTML
console.log("--- AUDIT 4: DOM getElementById Integrity ---");
const pageMap = [
  { html: 'frontend/index.html', js: ['frontend/script.js', 'frontend/auth.js', 'frontend/realtime.js'] },
  { html: 'frontend/pages/emergency/emergency.html', js: ['frontend/pages/emergency/emergency.js'] },
  { html: 'frontend/pages/famous/famous.html', js: ['frontend/pages/famous/famous.js'] },
  { html: 'frontend/pages/hospital/hospital.html', js: ['frontend/pages/hospital/hospital.js'] },
  { html: 'frontend/pages/hospital/hospital_dashboard.html', js: ['frontend/pages/hospital/hospital_dashboard.js'] },
  { html: 'frontend/pages/hospital/doctor_dashboard.html', js: ['frontend/pages/hospital/doctor_dashboard.js'] },
  { html: 'frontend/pages/parking/parking.html', js: ['frontend/pages/parking/parking.js'] },
  { html: 'frontend/pages/police/police.html', js: ['frontend/pages/police/police.js'] },
  { html: 'frontend/pages/traffic/traffic.html', js: ['frontend/pages/traffic/traffic.js', 'frontend/pages/traffic/openlayers_map.js'] },
  { html: 'frontend/pages/waste/waste.html', js: ['frontend/pages/waste/waste.js'] },
  { html: 'frontend/pages/water/water.html', js: ['frontend/pages/water/water.js'] }
];

for (const pair of pageMap) {
  const htmlPath = path.join(ROOT_DIR, pair.html);
  if (!fs.existsSync(htmlPath)) continue;
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');

  for (const relJs of pair.js) {
    const jsPath = path.join(ROOT_DIR, relJs);
    if (!fs.existsSync(jsPath)) continue;
    const jsContent = fs.readFileSync(jsPath, 'utf8');

    const ids = [...jsContent.matchAll(/document\.getElementById\(\s*["']([^"']+)["']\s*\)/g)].map(m => m[1]);
    const missing = [];
    for (const id of new Set(ids)) {
      if (!htmlContent.includes(`id="${id}"`) && !htmlContent.includes(`id='${id}'`)) {
        // Check if dynamically created in the js
        if (!jsContent.includes(`id="${id}"`) && !jsContent.includes(`id='${id}'`) && !jsContent.includes(`.id = "${id}"`) && !jsContent.includes(`.id = '${id}'`)) {
          missing.push(id);
        }
      }
    }
    if (missing.length > 0) {
      warnings.push({
        category: "DOM_ID",
        file: relJs,
        html: pair.html,
        message: `${missing.length} getElementById target(s) missing from HTML: ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? ' ... and more' : ''}`
      });
    }
  }
}

// AUDIT 5: Navigation links across all pages
console.log("--- AUDIT 5: Navigation Links & Hyperlinks ---");
for (const relHtml of htmlFiles) {
  const fullHtml = path.join(ROOT_DIR, relHtml);
  if (!fs.existsSync(fullHtml)) continue;
  const html = fs.readFileSync(fullHtml, 'utf8');
  const htmlDir = path.dirname(fullHtml);

  const hrefs = [...html.matchAll(/<a[^>]+href=["']([^"']+)["']/gi)].map(m => m[1]);
  for (const href of hrefs) {
    if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('http://') || href.startsWith('https://')) {
      continue;
    }
    const cleanHref = href.split('?')[0].split('#')[0];
    if (!cleanHref) continue;

    const resolved = cleanHref.startsWith('/') ? path.join(FRONTEND_DIR, cleanHref.slice(1)) : path.resolve(htmlDir, cleanHref);
    if (!fs.existsSync(resolved)) {
      issues.push({
        category: "BrokenLink",
        file: relHtml,
        message: `Broken link <a href="${href}"> (resolved to ${path.relative(ROOT_DIR, resolved)})`
      });
    }
  }
}

// OUTPUT AUDIT REPORT
console.log("\n=================================================");
console.log(`AUDIT FINISHED: ${issues.length} Critical Issues, ${warnings.length} Warnings`);
console.log("=================================================");

console.log("\n--- CRITICAL ISSUES ---");
if (issues.length === 0) {
  console.log("✅ None! 0 critical broken links, missing scripts, or undefined onclick handlers!");
} else {
  issues.forEach((iss, i) => console.log(`${i + 1}. [${iss.category}] ${iss.file}: ${iss.message}`));
}

console.log("\n--- WARNINGS & DOM MISMATCHES ---");
if (warnings.length === 0) {
  console.log("✅ None!");
} else {
  warnings.forEach((w, i) => console.log(`${i + 1}. [${w.category}] in ${w.file} (page: ${w.html}):\n   ${w.message}`));
}

fs.writeFileSync(path.join(ROOT_DIR, 'scratch/master_deep_audit_report.json'), JSON.stringify({ issues, warnings }, null, 2));
