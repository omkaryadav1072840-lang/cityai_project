const fs = require('fs');
const http = require('http');

const files = [
    './frontend/pages/hospital/hospital.js',
    './frontend/pages/hospital/hospital_dashboard.js',
    './frontend/pages/hospital/doctor_dashboard.js'
];

const apiCalls = new Set();
files.forEach(f => {
    const content = fs.readFileSync(f, 'utf8');
    const regex = /(?:fetch|apiRequest|authFetch)\s*\(\s*[`'"]([^?'"`$\s]+)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        let url = match[1];
        if (url.startsWith('http://localhost:5000')) url = url.replace('http://localhost:5000', '');
        if (url.startsWith('/api') || url.startsWith('api/')) {
            if (!url.startsWith('/')) url = '/' + url;
            apiCalls.add(url);
        }
    }
});

function checkRoute(path) {
    return new Promise(resolve => {
        http.get('http://localhost:5000' + path, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                resolve({ path, status: res.statusCode, body: body.slice(0, 150) });
            });
        }).on('error', err => resolve({ path, error: err.message }));
    });
}

async function testAll() {
    console.log('Detected Unique Hospital Frontend Endpoints count:', apiCalls.size);
    console.log('\n--- Route Status Check Results ---');
    for (const p of Array.from(apiCalls).sort()) {
        let testUrl = p
            .replace(':hospitalId', 'HOSP-002')
            .replace(':patientId', 'PAT-5931984821')
            .replace(':doctorId', 'DOC001')
            .replace(':bookingId', 'TB-2026-0101');
        const res = await checkRoute(testUrl);
        const icon = (res.status >= 200 && res.status < 400) ? '✅' : (res.status === 401 || res.status === 403 ? '🔒' : '❌');
        console.log(`${icon} [${res.status || 'ERR'}] ${testUrl}`);
        if (res.status >= 400) {
            console.log(`    ↳ Response: ${res.body}`);
        }
    }
}

testAll().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
