const fs = require('fs');

const content = fs.readFileSync('frontend/pages/hospital/hospital.js', 'utf8');

// 1. Check duplicate function declarations
const funcMatches = [...content.matchAll(/function\s+([a-zA-Z0-9_$]+)\s*\(/g)];
const funcs = {};
const duplicates = [];

funcMatches.forEach(m => {
  const name = m[1];
  funcs[name] = (funcs[name] || 0) + 1;
  if (funcs[name] === 2) duplicates.push(name);
});

console.log('Total functions:', funcMatches.length);
console.log('Duplicate function declarations:', duplicates);

// 2. Check getElementById references vs hospital.html elements
const idMatches = [...content.matchAll(/getElementById\s*\(\s*["']([^"']+)["']\s*\)/g)].map(m => m[1]);
const uniqueIds = [...new Set(idMatches)];

const htmlContent = fs.readFileSync('frontend/pages/hospital/hospital.html', 'utf8');
const missingInHtml = uniqueIds.filter(id => !htmlContent.includes(`id="${id}"`) && !htmlContent.includes(`id='${id}'`));

console.log(`\nDOM IDs referenced in JS (${uniqueIds.length}):`);
console.log('IDs missing in hospital.html:', missingInHtml);

// 3. Check for syntax error via node compilation
try {
  new Function(content);
  console.log('\nSyntax Check: Valid JavaScript (No compile errors)');
} catch (e) {
  console.error('\nSyntax Error in hospital.js:', e.message);
}
