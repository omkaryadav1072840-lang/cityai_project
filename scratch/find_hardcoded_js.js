const fs = require('fs');
const js = fs.readFileSync('frontend/pages/hospital/hospital.js', 'utf8');

// Find hardcoded arrays of objects with hospitals or doctors or beds
const arrayMatches = js.match(/const\s+([a-zA-Z0-9_$]+)\s*=\s*\[\s*\{[\s\S]*?\}\s*\];/g) || [];
console.log('Hardcoded array variables:');
arrayMatches.forEach(m => {
  const name = m.match(/const\s+([a-zA-Z0-9_$]+)/)[1];
  console.log(`- ${name} (length: ${m.length} chars)`);
});

// Let's check fallback data definitions
const fallbackMatches = js.match(/(?:fallback|default|mock|dummy|sample)[a-zA-Z0-9_$]*\s*=\s*[\{\[]/gi) || [];
console.log('\nFallback definitions:', fallbackMatches);
