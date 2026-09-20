const fs = require('fs');

['police', 'waste'].forEach(mod => {
  console.log(`\n=== AUDITING ${mod.toUpperCase()} ===`);
  const html = fs.readFileSync(`frontend/pages/${mod}/${mod}.html`, 'utf8');
  const js = fs.readFileSync(`frontend/pages/${mod}/${mod}.js`, 'utf8');

  // Check onclicks
  const onclicks = [...html.matchAll(/on(?:click|change|input|submit)=["']([a-zA-Z0-9_$]+)\s*\(/g)].map(m => m[1]);
  onclicks.forEach(fn => {
    const defined = js.includes('function ' + fn) || js.includes(fn + ' =') || js.includes('window.' + fn);
    if (!defined) console.log(`❌ ${mod}: missing function ${fn}()`);
  });

  // Check forms
  const forms = [...html.matchAll(/<form [^>]*id=["']([^"']+)["'][^>]*>/g)].map(m => m[1]);
  forms.forEach(f => {
    const listened = js.includes(`"${f}"`) || js.includes(`'${f}'`);
    if (!listened) console.log(`❌ ${mod}: unlistened form #${f}`);
  });

  console.log(`${mod} audit complete.`);
});
