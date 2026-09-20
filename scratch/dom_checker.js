const fs = require('fs');

const pairs = [
  { html: 'frontend/index.html', js: ['frontend/script.js', 'frontend/auth.js', 'frontend/realtime.js'] },
  { html: 'frontend/pages/emergency/emergency.html', js: ['frontend/pages/emergency/emergency.js'] },
  { html: 'frontend/pages/famous/famous.html', js: ['frontend/pages/famous/famous.js', 'frontend/pages/famous/famose.js'] },
  { html: 'frontend/pages/hospital/hospital.html', js: ['frontend/pages/hospital/hospital.js'] },
  { html: 'frontend/pages/hospital/doctor_dashboard.html', js: ['frontend/pages/hospital/doctor_dashboard.js'] },
  { html: 'frontend/pages/parking/parking.html', js: ['frontend/pages/parking/parking.js'] },
  { html: 'frontend/pages/police/police.html', js: ['frontend/pages/police/police.js'] },
  { html: 'frontend/pages/traffic/traffic.html', js: ['frontend/pages/traffic/traffic.js', 'frontend/pages/traffic/openlayers_map.js', 'frontend/pages/traffic/traffic_ai_vision.js'] },
  { html: 'frontend/pages/waste/waste.html', js: ['frontend/pages/waste/waste.js'] },
  { html: 'frontend/pages/water/water.html', js: ['frontend/pages/water/water.js'] }
];

pairs.forEach(p => {
  if (!fs.existsSync(p.html)) return;
  const htmlContent = fs.readFileSync(p.html, 'utf8');
  console.log('=== Checking ' + p.html + ' ===');
  p.js.forEach(jsFile => {
    if (!fs.existsSync(jsFile)) return;
    const jsContent = fs.readFileSync(jsFile, 'utf8');
    const re = /document\.getElementById\(['"]([^'"]+)['"]\)/g;
    const matches = [];
    let m;
    while ((m = re.exec(jsContent)) !== null) { matches.push(m[1]); }
    const uniqueIds = Array.from(new Set(matches));
    const missing = uniqueIds.filter(id => !htmlContent.includes('id="' + id + '"') && !htmlContent.includes("id='" + id + "'"));
    if (missing.length > 0) {
      console.log('  ⚠️ ' + jsFile + ' missing ' + missing.length + ' IDs:');
      console.log(missing);
    } else {
      console.log('  ✓ ' + jsFile + ' all ' + uniqueIds.length + ' IDs exist.');
    }
  });
});
