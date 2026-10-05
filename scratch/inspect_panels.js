const fs = require('fs');
const html = fs.readFileSync('frontend/pages/hospital/hospital_dashboard.html', 'utf8');

const billingIdx = html.indexOf('id="panel-billing"');
console.log('Billing panel snippet:', html.slice(billingIdx, billingIdx + 1200));

const adminIdx = html.indexOf('id="panel-admin"');
console.log('\nAdmin panel snippet:', html.slice(adminIdx, adminIdx + 2000));
