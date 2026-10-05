const fs = require('fs');
const html = fs.readFileSync('frontend/pages/hospital/hospital_dashboard.html', 'utf8');

console.log('Includes modalProcessPayment:', html.includes('modalProcessPayment'));
console.log('Includes invoicesTable:', html.includes('invoicesTable'));
console.log('Includes hospitalLogoInput:', html.includes('hospitalLogoInput'));
console.log('Includes billingPanel or panel-billing:', html.includes('panel-billing'));

// Find all panels
const panelMatches = html.match(/id="panel-[^"]+"/g);
console.log('Found panels:', panelMatches);

// Find all modals
const modalMatches = html.match(/id="modal[^"]+"/g);
console.log('Found modals:', modalMatches);
