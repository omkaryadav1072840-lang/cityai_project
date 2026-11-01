const fs = require('fs');
const htmlFiles = [
  'frontend/index.html',
  'frontend/pages/admin/gkp_admin.html',
  'frontend/pages/emergency/emergency.html',
  'frontend/pages/famous/famous.html',
  'frontend/pages/hospital/doctor_dashboard.html',
  'frontend/pages/hospital/hospital.html',
  'frontend/pages/hospital/hospital_dashboard.html',
  'frontend/pages/hospital/superadmin_hospital.html',
  'frontend/pages/parking/parking.html',
  'frontend/pages/police/police.html',
  'frontend/pages/traffic/traffic.html',
  'frontend/pages/waste/waste.html',
  'frontend/pages/water/water.html'
];
htmlFiles.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const match = content.match(/<script[^>]*src=["']([^"']*auth\.js[^"']*)["'][^>]*>/);
  console.log(f, '->', match ? match[1] : 'NOT FOUND');
});

