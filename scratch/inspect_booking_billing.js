const fs = require('fs');

function searchPatterns(file, patterns) {
    if (!fs.existsSync(file)) return [];
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    const results = [];
    lines.forEach((l, i) => {
        for (const p of patterns) {
            if (l.toLowerCase().includes(p.toLowerCase())) {
                results.push({ line: i + 1, pattern: p, text: l.trim().slice(0, 140) });
                break;
            }
        }
    });
    return results;
}

console.log('--- hospital.js bed booking & alerts ---');
console.log(searchPatterns('frontend/pages/hospital/hospital.js', ['alert(', 'bookbed', 'reservebed', '/ward-beds/assign', '/ward-beds/book', 'booking modal']).slice(0, 15));

console.log('--- hospital_dashboard.js billing & logo ---');
console.log(searchPatterns('frontend/pages/hospital/hospital_dashboard.js', ['createinvoice', 'payinvoice', 'partial', 'invoices', 'logo']).slice(0, 15));

console.log('--- backend routes billing & booking ---');
console.log(searchPatterns('backend/routes/hospital.routes.js', ['/invoices', 'invoice', '/ward-beds', 'book', 'payment']).slice(0, 15));
