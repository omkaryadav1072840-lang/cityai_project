const fs = require('fs');

const js = fs.readFileSync('frontend/pages/waste/waste.js', 'utf8');

const fnStart = js.indexOf('function renderActiveDustbinDashboard(bin)');
const fnEnd = js.indexOf('function renderDustbinNotificationTable(bin)');

console.log('=== renderActiveDustbinDashboard ===\n');
console.log(js.substring(fnStart, fnEnd));

