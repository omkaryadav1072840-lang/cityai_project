const fs = require('fs');
const html = fs.readFileSync('frontend/pages/hospital/hospital.html', 'utf8');

// Look for doctor cards, hospital cards, bed items in the raw HTML before JS renders
const docCards = html.match(/class=["'][^"']*doctor-card[^"']*["']/g) || [];
console.log('Static doctor cards in HTML:', docCards.length);

const hospCards = html.match(/class=["'][^"']*hospital-card[^"']*["']/g) || [];
console.log('Static hospital cards in HTML:', hospCards.length);

const bedCards = html.match(/class=["'][^"']*bed-category-card[^"']*["']/g) || [];
console.log('Static bed-category cards in HTML:', bedCards.length);

// Let's inspect where doctor cards appear in HTML
const docMatches = html.match(/<div class=["']doctor-card[\s\S]*?<\/div>\s*<\/div>/gi) || [];
console.log('Static doctor snippets in HTML:', docMatches.length);
if (docMatches.length > 0) {
  console.log('Sample doctor in HTML:', docMatches[0].slice(0, 300));
}
