const fs = require('fs');
const path = require('path');

const modules = ['emergency', 'famous', 'parking', 'police', 'traffic', 'waste', 'water', 'hospital'];

const moduleAudit = {};

modules.forEach(mod => {
  const modDir = path.join('frontend', 'pages', mod);
  if (!fs.existsSync(modDir)) return;
  const files = fs.readdirSync(modDir);
  const htmls = files.filter(f => f.endsWith('.html'));
  const jss = files.filter(f => f.endsWith('.js'));
  const csss = files.filter(f => f.endsWith('.css'));

  const issues = [];

  // Check each html
  htmls.forEach(h => {
    const hContent = fs.readFileSync(path.join(modDir, h), 'utf8');

    // 1. Check title
    if (!hContent.includes('<title>')) issues.push(`${h}: Missing <title> tag`);

    // 2. Check meta viewport
    if (!hContent.includes('name="viewport"')) issues.push(`${h}: Missing responsive viewport meta`);

    // 3. Check for broken internal links
    const links = [...hContent.matchAll(/href=["'](?!https?:\/\/|#|\/\/)([^"']+)["']/g)].map(m => m[1]);
    links.forEach(l => {
      // Remove anchor or query
      const clean = l.split('#')[0].split('?')[0];
      if (clean) {
        const resolved = clean.startsWith('/') 
          ? path.join('frontend', clean.slice(1)) 
          : path.resolve(modDir, clean);
        if (!fs.existsSync(resolved)) {
          issues.push(`${h}: Broken link href="${l}"`);
        }
      }
    });

    // 4. Check for onclick functions not found in any JS
    const onclicks = [...hContent.matchAll(/on(?:click|change|input|submit)=["']([a-zA-Z0-9_$]+)\s*\(/g)].map(m => m[1]);
    let allJsText = '';
    jss.forEach(j => allJsText += '\n' + fs.readFileSync(path.join(modDir, j), 'utf8'));

    onclicks.forEach(fn => {
      if (fn === 'alert' || fn === 'console' || fn === 'history' || fn === 'event' || fn === 'openModal' || fn === 'closeModal') return;
      if (!allJsText.includes('function ' + fn) && !allJsText.includes(fn + ' =') && !allJsText.includes('window.' + fn) && !hContent.includes('function ' + fn)) {
        issues.push(`${h}: Calling undefined handler ${fn}()`);
      }
    });
  });

  // Check JS files for potential issues
  jss.forEach(j => {
    const jsContent = fs.readFileSync(path.join(modDir, j), 'utf8');

    // Look for unhandled fetch rejections or missing error blocks
    const fetchMatches = [...jsContent.matchAll(/fetch\s*\(/g)];
    const catchMatches = [...jsContent.matchAll(/\.catch\s*\(|catch\s*\(/g)];

    // Check for hardcoded localhost urls
    if (jsContent.includes('http://localhost:5000') && !jsContent.includes('window.location')) {
      issues.push(`${j}: Contains hardcoded http://localhost:5000 (might break if deployed to production IP/domain)`);
    }

    // Check for duplicate function declarations
    const fnMatches = [...jsContent.matchAll(/function\s+([a-zA-Z0-9_$]+)\s*\(/g)].map(m => m[1]);
    const fnCounts = {};
    fnMatches.forEach(f => {
      fnCounts[f] = (fnCounts[f] || 0) + 1;
      if (fnCounts[f] === 2) issues.push(`${j}: Duplicate function declaration: ${f}()`);
    });
  });

  moduleAudit[mod] = {
    htmlCount: htmls.length,
    jsCount: jss.length,
    cssCount: csss.length,
    issues
  };
});

console.log('=== MODULE SPECIFIC AUDIT ===');
console.log(JSON.stringify(moduleAudit, null, 2));

fs.writeFileSync('scratch/module_audit_summary.json', JSON.stringify(moduleAudit, null, 2));
