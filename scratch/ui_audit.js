const fs = require('fs');
const path = require('path');

const modules = ['waste', 'police', 'water', 'traffic', 'parking', 'hospital'];

console.log('=== UI AUDIT: COMPARING MODULES WITH WASTE ===\n');

modules.forEach(mod => {
  const htmlPath = path.join('frontend', 'pages', mod, `${mod}.html`);
  const cssPath = path.join('frontend', 'pages', mod, `${mod}.css`);

  if (!fs.existsSync(htmlPath)) {
    console.log(`Module ${mod}: HTML not found`);
    return;
  }

  const html = fs.readFileSync(htmlPath, 'utf8');
  const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';

  const hasUserBadge = html.includes('userBadgeContainer');
  const hasAuthHelpers = html.includes('auth-helpers.js');
  const navMatch = html.match(/<(header|nav)[^>]*class=["']([^"']*)["'][^>]*>([\s\S]*?)<\/\1>/i);
  const layerTabs = (html.match(/class=["'][^"']*layer-tab-btn[^"']*["']/gi) || []).length;
  const roleBanner = html.includes('role-banner') || html.includes('roleBanner');
  const sharedMapOutsideTabs = /<section[^>]*map-card[\s\S]*?id="layer-citizen-content"/i.test(html);
  
  // Check button color issues
  const outlineBtnWhiteOnWhite = css.includes('.outline-btn') && css.includes('color: white');

  console.log(`MODULE: [${mod.toUpperCase()}]`);
  console.log(`  - Navbar tag: <${navMatch ? navMatch[1] : 'unknown'}>, class: "${navMatch ? navMatch[2] : ''}"`);
  console.log(`  - Has #userBadgeContainer: ${hasUserBadge}`);
  console.log(`  - Has auth-helpers.js: ${hasAuthHelpers}`);
  console.log(`  - Layer Tab Count: ${layerTabs}`);
  console.log(`  - Has Role Banner: ${roleBanner}`);
  console.log(`  - Has Map outside Layer Tabs: ${sharedMapOutsideTabs}`);
  console.log(`  - .outline-btn text color: ${outlineBtnWhiteOnWhite ? 'WHITE (potential clash on light bg)' : 'custom/default'}`);
  console.log('');
});

