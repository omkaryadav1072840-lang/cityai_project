const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const candidates = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];
const browserPath = candidates.find(p => fs.existsSync(p));
const artifactDir = 'C:\\Users\\Omkar\\.gemini\\antigravity-ide\\brain\\20443c78-30e1-40dc-87be-4de20968da24';
const outPath = path.join(__dirname, 'hospital_doctor_profile_view.png');
const artifactDest = path.join(artifactDir, 'hospital_doctor_profile_view.png');

const proc = spawn(browserPath, [
  '--headless',
  '--remote-debugging-port=9249',
  '--disable-gpu',
  '--window-size=1400,1100',
  'http://localhost:3000/pages/hospital/hospital.html'
]);

async function run() {
  await new Promise(r => setTimeout(r, 2500));
  const listRes = await fetch('http://127.0.0.1:9249/json');
  const tabs = await listRes.json();
  const tab = tabs.find(t => t.url && t.url.includes('hospital.html'));
  const ws = new WebSocket(tab.webSocketDebuggerUrl);

  ws.onopen = () => {
    ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
    ws.send(JSON.stringify({ id: 2, method: 'Page.enable' }));

    setTimeout(() => {
      // Open doctor finder and click view details on Dr. Alok Nath Tripathi
      ws.send(JSON.stringify({
        id: 10,
        method: 'Runtime.evaluate',
        params: {
          expression: `
            openDoctorFinder();
            setTimeout(() => {
              const doc = doctorData.find(d => d.name.includes('Alok Nath Tripathi')) || doctorData[0];
              if (doc) viewDoctorDetails(doc.doctor_id || doc.id);
            }, 600);
          `
        }
      }));

      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 11,
          method: 'Page.captureScreenshot',
          params: { format: 'png' }
        }));
      }, 2000);
    }, 1500);
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id === 11 && msg.result?.data) {
      const buf = Buffer.from(msg.result.data, 'base64');
      fs.writeFileSync(outPath, buf);
      fs.writeFileSync(artifactDest, buf);
      console.log('Saved hospital_doctor_profile_view.png successfully.');
      ws.close();
      proc.kill();
      process.exit(0);
    }
  };
}

run().catch(err => {
  console.error(err);
  proc.kill();
  process.exit(1);
});
