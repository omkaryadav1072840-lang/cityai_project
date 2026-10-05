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
const outPath = path.join(__dirname, 'hospitals_directory_preview.png');
const artifactDest = 'C:\\Users\\Omkar\\.gemini\\antigravity-ide\\brain\\20443c78-30e1-40dc-87be-4de20968da24\\hospitals_directory_preview.png';

console.log('Browser path:', browserPath);

if (browserPath) {
  const res = spawnSync(browserPath, [
    '--headless',
    '--disable-gpu',
    '--window-size=1380,1000',
    `--screenshot=${outPath}`,
    '--virtual-time-budget=6000',
    'http://localhost:3000/pages/hospital/hospital.html#hospitals'
  ], { timeout: 30000 });
  
  console.log('Capture exit:', res.status);
  console.log('File exists:', fs.existsSync(outPath));
  if (fs.existsSync(outPath)) {
    fs.copyFileSync(outPath, artifactDest);
    console.log('Copied to artifact:', artifactDest);
  }
}
