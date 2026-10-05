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
    { id: 1, role: 'citizen', patientId: 'SC-2026-318028' },
    'smartcity_super_secret_jwt_key_gorakhpur_2026',
    { expiresIn: '7d' }
);

const artifactDir = 'C:\\Users\\Omkar\\.gemini\\antigravity-ide\\brain\\20443c78-30e1-40dc-87be-4de20968da24';

// 1. Capture Main Page Doctors section
console.log('1. Capturing Main Page Doctors section...');
const outDocSection = path.join(__dirname, 'hospital_homepage_doctors.png');
spawnSync(browserPath, [
  '--headless',
  '--disable-gpu',
  '--window-size=1380,1050',
  `--screenshot=${outDocSection}`,
  '--virtual-time-budget=6000',
  'http://localhost:3000/pages/hospital/hospital.html#doctorList'
], { timeout: 30000 });

if (fs.existsSync(outDocSection)) {
  fs.copyFileSync(outDocSection, path.join(artifactDir, 'hospital_homepage_doctors.png'));
  console.log('Saved hospital_homepage_doctors.png to artifact');
}

// 2. Capture Find Doctors Modal
console.log('2. Capturing Find Doctors Modal...');
const outDocFinder = path.join(__dirname, 'hospital_doctor_finder.png');

// We can open the modal via CDP or simple test script
const testCdpScript = `
const { spawn } = require('child_process');

const proc = spawn('${browserPath.replace(/\\/g, '\\\\')}', [
  '--headless',
  '--remote-debugging-port=9231',
  '--disable-gpu',
  '--window-size=1380,1050',
  'http://localhost:3000/pages/hospital/hospital.html'
]);

async function capture() {
  await new Promise(r => setTimeout(r, 2500));
  const listRes = await fetch('http://127.0.0.1:9231/json');
  const tabs = await listRes.json();
  const tab = tabs.find(t => t.url.includes('hospital.html'));
  const ws = new WebSocket(tab.webSocketDebuggerUrl);

  ws.onopen = () => {
    ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
    ws.send(JSON.stringify({ id: 2, method: 'Page.enable' }));

    // Open Doctor Finder Modal and wait 1 sec then capture
    setTimeout(() => {
      ws.send(JSON.stringify({
        id: 3,
        method: 'Runtime.evaluate',
        params: { expression: 'openDoctorFinder();' }
      }));

      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 4,
          method: 'Page.captureScreenshot',
          params: { format: 'png' }
        }));
      }, 1500);
    }, 2000);
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id === 4 && msg.result?.data) {
      const fs = require('fs');
      const buf = Buffer.from(msg.result.data, 'base64');
      fs.writeFileSync('${outDocFinder.replace(/\\/g, '\\\\')}', buf);
      fs.writeFileSync('${path.join(artifactDir, 'hospital_doctor_finder.png').replace(/\\/g, '\\\\')}', buf);
      console.log('Successfully captured hospital_doctor_finder.png');
      ws.close();
      proc.kill();
      process.exit(0);
    }
  };
}
capture().catch(console.error);
`;

fs.writeFileSync(path.join(__dirname, 'run_finder_cdp.js'), testCdpScript);
spawnSync('node', [path.join(__dirname, 'run_finder_cdp.js')], { timeout: 30000 });

console.log('All captures completed.');
