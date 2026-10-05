const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const candidates = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];
const browserPath = candidates.find(p => fs.existsSync(p));
const artifactDir = 'C:\\Users\\Omkar\\.gemini\\antigravity-ide\\brain\\20443c78-30e1-40dc-87be-4de20968da24';

const outFinder = path.join(__dirname, 'hospital_doctor_finder_redesign.png');
const artifactDest = path.join(artifactDir, 'hospital_doctor_finder_redesign.png');

console.log('Capturing Doctor Finder Modal with URL #doctors...');

const res = spawnSync(browserPath, [
  '--headless',
  '--disable-gpu',
  '--window-size=1380,1050',
  `--screenshot=${outFinder}`,
  '--virtual-time-budget=7000',
  'http://localhost:3000/pages/hospital/hospital.html#doctors'
], { timeout: 35000 });

console.log('Capture exit:', res.status);
if (fs.existsSync(outFinder)) {
  fs.copyFileSync(outFinder, artifactDest);
  console.log('Saved to artifact:', artifactDest);
} else {
  console.log('File was not generated.');
}
