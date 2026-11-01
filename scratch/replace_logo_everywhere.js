const fs = require('fs');

const files = [
  'frontend/403.html',
  'frontend/404.html',
  'frontend/500.html',
  'frontend/manifest.json',
  'frontend/pages/admin/gkp_admin.html',
  'frontend/pages/emergency/emergency.html',
  'frontend/pages/famous/famous.html',
  'frontend/pages/parking/parking.html',
  'frontend/pages/police/police.html',
  'frontend/pages/privacy-policy.html',
  'frontend/pages/terms-and-conditions.html',
  'frontend/pages/traffic/traffic.html',
  'frontend/pages/waste/bin_dashboard.html',
  'frontend/pages/waste/control_center.html',
  'frontend/pages/waste/waste.html',
  'frontend/pages/waste/worker_dashboard.html',
  'frontend/pages/water/water.html'
];

let totalReplaced = 0;

files.forEach(f => {
  if (!fs.existsSync(f)) return;
  let content = fs.readFileSync(f, 'utf8');
  const oldTarget = '/ChatGPT_Image_Aug_11__2026__11_27_44_PM-removebg-preview.png';
  if (content.includes(oldTarget)) {
    const count = content.split(oldTarget).length - 1;
    content = content.replaceAll(oldTarget, '/logo.png');
    fs.writeFileSync(f, content, 'utf8');
    totalReplaced += count;
    console.log(`Replaced ${count} in ${f}`);
  }
});

console.log(`Finished! Total occurrences replaced: ${totalReplaced}`);

