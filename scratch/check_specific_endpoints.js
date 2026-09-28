const fs = require('fs');
const path = require('path');

const backendDir = path.join(__dirname, '..', 'backend', 'routes');
const routeFiles = fs.readdirSync(backendDir).filter(f => f.endsWith('.js'));

const routes = [];
for (const rf of routeFiles) {
    const code = fs.readFileSync(path.join(backendDir, rf), 'utf8');
    const regex = /router\.(get|post|put|delete|patch)\(\s*["']([^"']+)["']/gi;
    let m;
    while ((m = regex.exec(code)) !== null) {
        routes.push({ file: rf, method: m[1].toUpperCase(), path: m[2] });
    }
}

const checkList = [
    { method: 'POST', path: '/api/doctor/login' },
    { method: 'GET', path: '/api/appointments/availability' },
    { method: 'GET', path: '/api/diagnostics/queue' },
    { method: 'GET', path: '/api/doctor/:doctorId/appointments' },
    { method: 'PUT', path: '/api/appointments/:appointmentId/status' },
    { method: 'GET', path: '/api/doctor/patient-history/:patientId' },
    { method: 'POST', path: '/api/doctor/consultation' },
    { method: 'GET', path: '/api/emergency-departments' },
    { method: 'POST', path: '/api/emergency/incidents/:code/resolve' },
    { method: 'GET', path: '/api/ai/status' },
    { method: 'GET', path: '/api/patients/:patientId/records' },
    { method: 'GET', path: '/api/patients/:patientId/reports' },
    { method: 'POST', path: '/api/appointments/book-strict' },
    { method: 'GET', path: '/api/water/schedules' },
    { method: 'GET', path: '/api/waste/requests' },
    { method: 'POST', path: '/api/waste/reports' },
    { method: 'POST', path: '/api/waste/bin-requests' }
];

function matchRoute(method, targetPath) {
    const targetParts = targetPath.split('/');
    return routes.find(r => {
        if (r.method !== method) return false;
        const rParts = r.path.split('/');
        if (rParts.length !== targetParts.length) return false;
        for (let i = 0; i < rParts.length; i++) {
            if (rParts[i].startsWith(':') || targetParts[i].startsWith(':')) continue;
            if (rParts[i] !== targetParts[i]) return false;
        }
        return true;
    });
}

console.log("=== CHECKING SPECIFIC FRONTEND ENDPOINTS IN BACKEND ===");
for (const item of checkList) {
    const matched = matchRoute(item.method, item.path);
    if (matched) {
        console.log(`✅ [FOUND] ${item.method} ${item.path} -> in ${matched.file} (${matched.path})`);
    } else {
        console.log(`❌ [MISSING] ${item.method} ${item.path}`);
    }
}
