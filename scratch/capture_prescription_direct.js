const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const jwt = require(path.join(__dirname, '..', 'backend', 'node_modules', 'jsonwebtoken'));

const candidates = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
];

const browserPath = candidates.find(p => fs.existsSync(p));
const token = jwt.sign(
    { id: 1, role: 'citizen', patientId: 'SC-2026-318028', mobile: '9876543210' },
    'smartcity_super_secret_jwt_key_gorakhpur_2026',
    { expiresIn: '7d' }
);

const outPath = path.join(__dirname, 'prescription_modal_redesign.png');
const artifactDest = 'C:\\Users\\Omkar\\.gemini\\antigravity-ide\\brain\\20443c78-30e1-40dc-87be-4de20968da24\\prescription_modal_redesign.png';

console.log('Browser path:', browserPath);

if (browserPath) {
  const url = `http://localhost:3000/pages/hospital/hospital.html?token=${encodeURIComponent(token)}&patient_id=SC-2026-318028#prescription`;
  console.log('Navigating to:', url);

  const res = spawnSync(browserPath, [
    '--headless',
    '--disable-gpu',
    '--window-size=1380,1050',
    `--screenshot=${outPath}`,
    '--virtual-time-budget=6000',
    url
  ], { timeout: 35000 });

  console.log('Capture exit:', res.status);
  console.log('File exists:', fs.existsSync(outPath));
  if (fs.existsSync(outPath)) {
    fs.copyFileSync(outPath, artifactDest);
    console.log('Preview successfully copied to artifact:', artifactDest);
  }
}
