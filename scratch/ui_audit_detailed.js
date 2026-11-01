const fs = require('fs');
const path = require('path');

function analyzeWasteCSS() {
  const wasteCss = fs.readFileSync('frontend/pages/waste/waste.css', 'utf8');
  const uiCompCss = fs.readFileSync('frontend/components/ui_components.css', 'utf8');

  console.log('--- CSS ANALYSIS ---');

  // Find outline-btn
  const outlineMatches = wasteCss.match(/\.outline-btn\s*\{[^}]+\}/g);
  console.log('Outline button styles in waste.css:');
  if (outlineMatches) outlineMatches.forEach(m => console.log(m));

  // Find color contrast issues in staff-actions-bar
  const staffActions = wasteCss.match(/\.staff-actions-bar\s*\{[^}]+\}/g);
  console.log('\n.staff-actions-bar style:');
  if (staffActions) staffActions.forEach(m => console.log(m));

  // Find dark backgrounds inside waste
  const darkBlocks = [];
  const regex = /([^{]+)\{\s*([^}]*background[^;}]*#[0-1][0-9a-fA-F]{5}[^;}]*)[^}]*\}/g;
  let match;
  while ((match = regex.exec(wasteCss)) !== null) {
    darkBlocks.push({ selector: match[1].trim(), rule: match[2].trim() });
  }
  console.log('\nDark background rules in waste.css (contrast clash with light theme):');
  darkBlocks.slice(0, 10).forEach(b => console.log(`  ${b.selector} -> ${b.rule}`));

  // Check CSS variables vs hardcoded colors
  const hardcodedColors = (wasteCss.match(/#[0-9a-fA-F]{3,8}/g) || []).length;
  console.log(`\nHardcoded hex color occurrences in waste.css: ${hardcodedColors}`);
}

function analyzeWasteHTML() {
  const wasteHtml = fs.readFileSync('frontend/pages/waste/waste.html', 'utf8');
  
  console.log('\n--- HTML COMPONENT AUDIT ---');
  
  // Navbar check
  const navMatch = wasteHtml.match(/<header class="navbar">([\s\S]*?)<\/header>/);
  console.log('Waste Navbar snippet:\n', navMatch ? navMatch[0] : 'None');

  // Check role banner
  const roleMatch = wasteHtml.match(/<div class="role-banner"[\s\S]*?<\/div>/);
  console.log('\nRole Banner:\n', roleMatch ? roleMatch[0] : 'None');

  // Check where maps are located
  const mapIds = [];
  const mapRegex = /id="([^"]*[Mm]ap[^"]*)"/g;
  let m;
  while ((m = mapRegex.exec(wasteHtml)) !== null) {
    mapIds.push(m[1]);
  }
  console.log('\nMap containers in waste.html:', mapIds);

  // Check button classes used in waste.html
  const btnClasses = new Set();
  const btnRegex = /class="([^"]*btn[^"]*)"/g;
  while ((m = btnRegex.exec(wasteHtml)) !== null) {
    m[1].split(/\s+/).filter(c => c.includes('btn')).forEach(c => btnClasses.add(c));
  }
  console.log('\nButton classes used in waste.html:', Array.from(btnClasses));
}

analyzeWasteCSS();
analyzeWasteHTML();

