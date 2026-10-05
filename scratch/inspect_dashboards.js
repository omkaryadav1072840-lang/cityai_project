const fs = require('fs');

function inspectSections(filePath, title) {
  console.log(`\n=== ${title} (${filePath}) ===`);
  if (!fs.existsSync(filePath)) {
    console.log('File does not exist.');
    return;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const sections = content.match(/<section[^>]*id="([^"]+)"[^>]*>/gi) || [];
  sections.forEach(s => console.log(' ', s));
  const tabs = content.match(/data-tab="([^"]+)"/gi) || [];
  tabs.forEach(t => console.log(' Tab:', t));
}

inspectSections('./frontend/pages/hospital/doctor_dashboard.html', 'DOCTOR DASHBOARD');
inspectSections('./frontend/pages/hospital/superadmin_hospital.html', 'SUPERADMIN HOSPITAL');
