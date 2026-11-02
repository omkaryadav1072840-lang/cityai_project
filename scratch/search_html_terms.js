const fs = require('fs');
const html = fs.readFileSync('frontend/pages/traffic/traffic.html', 'utf8');

const terms = [
  'modal-pay', 'pay-channel', 'vms-select', 'commute-name', 'challan-pending',
  'cd-citizen', 'emergency-corridor', 'btn-dispatch-corridor', 'modal-incident',
  'modal-jnc', 'modal-sig', 'modal-cam'
];

terms.forEach(t => {
  console.log(`${t}: in HTML? ${html.includes(t)}`);
});

