const fs = require('fs');

const js = fs.readFileSync('frontend/pages/waste/waste.js', 'utf8');

// Let's inspect renderActiveDustbinDashboard and renderDustbinNotificationTable very carefully
const fnIdx = js.indexOf('function renderActiveDustbinDashboard');
console.log(js.substring(fnIdx, fnIdx + 2000));

