const fs = require('fs');
const content = fs.readFileSync('frontend/script.js', 'utf8');

['function loadCityStatus', 'function checkBackend', 'function initDashboardRealtime', 'function initializePatientForm'].forEach(fn => {
  const idx = content.indexOf(fn);
  if (idx !== -1) {
    console.log(content.substring(idx, idx + 400));
    console.log('-----------------------------------------');
  }
});
