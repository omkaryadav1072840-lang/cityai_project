const fs = require('fs');
const js = fs.readFileSync('frontend/pages/traffic/traffic.js', 'utf8');
const html = fs.readFileSync('frontend/pages/traffic/traffic.html', 'utf8');

// List of functions containing missing IDs
const functionsToAudit = [
  'dispatchEmergencyCorridor',
  'deactivateEmergencyCorridor',
  'openAddJunctionModal', // line 2446
  'openEditJunctionModal',
  'openAddSignalModal', // line 2519
  'openAddStaffModal', // line 2552
  'handleCameraSourceChange',
  'handlePlaybackTypeChange',
  'openAddCameraModal', // line 2805
  'openEditCameraModal',
  'submitCameraForm',
  'submitJunctionForm',
  'submitSignalForm',
  'submitStaffForm',
  'submitTrafficIncident',
  'processChallanPayment',
  'openVMSEditModal',
  'submitVMSMessage',
  'subscribeCommuteAlert',
  'submitSignalLocationModification',
  'openCitizenDisputeModal'
];

for (const fn of functionsToAudit) {
  const inHtml = html.includes(fn);
  // count occurrences in js
  const jsOccurrences = (js.match(new RegExp('\\b' + fn + '\\b', 'g')) || []).length;
  console.log(`${fn}: in HTML: ${inHtml}, occurrences in JS: ${jsOccurrences}`);
}

