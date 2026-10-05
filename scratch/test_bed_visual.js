const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const candidates = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
];

const browserPath = candidates.find(p => fs.existsSync(p));
const outPath1 = path.join(__dirname, 'bed_tab1_preview.png');
const outPath2 = path.join(__dirname, 'bed_tab2_preview.png');
console.log('Browser path:', browserPath);

if (browserPath) {
  // Capture Tab 1
  spawnSync(browserPath, [
    '--headless',
    '--disable-gpu',
    '--window-size=1280,980',
    `--screenshot=${outPath1}`,
    '--virtual-time-budget=4000',
    'http://localhost:3000/pages/hospital/hospital.html#beds'
  ], { timeout: 25000 });
  console.log('Tab 1 captured:', fs.existsSync(outPath1));

  // Capture Tab 2 with Patient Room Lookup
  spawnSync(browserPath, [
    '--headless',
    '--disable-gpu',
    '--window-size=1280,980',
    `--screenshot=${outPath2}`,
    '--virtual-time-budget=5000',
    'http://localhost:3000/pages/hospital/hospital.html?open=beds&tab=patient&uhid=PAT-RAHUL-10231'
  ], { timeout: 25000 });
  console.log('Tab 2 captured:', fs.existsSync(outPath2));
}
