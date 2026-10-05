const fs = require('fs');
const content = fs.readFileSync('frontend/pages/hospital/hospital.html', 'utf8');

// Find all sections or major containers with id
const idRegex = /<(?:section|div|main)[^>]*\bid=["']([^"']+)["'][^>]*>/gi;
let match;
const ids = [];
while ((match = idRegex.exec(content)) !== null) {
  if (match[0].startsWith('<section') || match[1].includes('Sec') || match[1].includes('Container') || match[1].includes('Grid') || match[1].includes('Modal')) {
    ids.push({ tag: match[0].split(' ')[0].slice(1), id: match[1] });
  }
}

console.log('Key Sections and Containers on hospital.html:');
ids.forEach(i => console.log(`  [${i.tag}] #${i.id}`));

// Find all modals
const modals = content.match(/id=["']([a-zA-Z0-9_-]*Modal[a-zA-Z0-9_-]*)["']/gi) || [];
console.log('\nModals found:');
const uniqueModals = [...new Set(modals.map(m => m.replace(/id=["']/i, '').replace(/["']/, '')))];
uniqueModals.forEach(m => console.log(`  - #${m}`));

// Find repeated cards or duplicate data containers in HTML
const repeatedStaticCards = content.match(/class=["'][^"']*card[^"']*["']/gi) || [];
console.log(`\nCard classes count: ${repeatedStaticCards.length}`);
