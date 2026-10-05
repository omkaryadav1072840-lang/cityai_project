const fs = require('fs');

const dashHtml = fs.readFileSync('./frontend/pages/hospital/hospital_dashboard.html', 'utf8');
const p1 = dashHtml.match(/id="panel-[^"]+"/g) || [];
console.log('hospital_dashboard panels:\n', p1.join('\n'));

const saHtml = fs.readFileSync('./frontend/pages/hospital/superadmin_hospital.html', 'utf8');
const p2 = saHtml.match(/id="[^"]*panel[^"]*"/gi) || [];
console.log('\nsuperadmin panels:\n', p2.join('\n'));

const docHtml = fs.readFileSync('./frontend/pages/hospital/doctor_dashboard.html', 'utf8');
const p3 = docHtml.match(/id="[^"]*panel[^"]*"/gi) || [];
console.log('\ndoctor panels:\n', p3.join('\n'));
