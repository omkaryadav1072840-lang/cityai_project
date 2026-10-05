const { spawnSync } = require('child_process');
const fs = require('fs');

const candidates = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
];

const browserPath = candidates.find(p => fs.existsSync(p));
const path = require('path');
const outPath = path.join(__dirname, 'pharmacy_preview.png');
console.log('Browser path:', browserPath);

if (browserPath) {
  const result = spawnSync(browserPath, [
    '--headless',
    '--disable-gpu',
    '--window-size=1280,950',
    `--screenshot=${outPath}`,
    '--virtual-time-budget=3000',
    'http://localhost:3000/pages/hospital/hospital.html#pharmacy'
  ], { timeout: 20000 });
  console.log('Finished status:', result.status);
  console.log('File exists:', fs.existsSync(outPath));
}
