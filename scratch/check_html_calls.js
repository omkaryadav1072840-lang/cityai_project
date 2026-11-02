const fs = require('fs');
const html = fs.readFileSync('frontend/pages/traffic/traffic.html', 'utf8');

const funcs = [
  'submitJunctionForm', 'submitCameraForm', 'submitSignalForm', 'submitStaffForm', 
  'submitTrafficIncident', 'submitAddJunction', 'submitAddCamera', 'submitAddSignal', 'submitCreateStaff',
  'deleteJunction', 'deleteCamera', 'deleteSignal', 'openEditJunctionModal', 'openEditCameraModal',
  'openAddJunctionModal', 'openAddSignalModal', 'openAddCameraModal', 'openAddStaffModal'
];

for (const fn of funcs) {
  const inHtml = html.includes(fn);
  console.log(`${fn}: in HTML? ${inHtml}`);
}

