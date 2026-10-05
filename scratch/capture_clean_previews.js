const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const candidates = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];
const browserPath = candidates.find(p => fs.existsSync(p));
const artifactDir = 'C:\\Users\\Omkar\\.gemini\\antigravity-ide\\brain\\20443c78-30e1-40dc-87be-4de20968da24';

const proc = spawn(browserPath, [
  '--headless',
  '--remote-debugging-port=9238',
  '--disable-gpu',
  '--window-size=1400,1100',
  'http://localhost:3000/pages/hospital/hospital.html'
]);

async function capture() {
  let tab = null;
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 600));
    try {
      const listRes = await fetch('http://127.0.0.1:9238/json');
      const tabs = await listRes.json();
      tab = tabs.find(t => t.url && t.url.includes('hospital.html'));
      if (tab && tab.webSocketDebuggerUrl) break;
    } catch(e) {}
  }

  if (!tab || !tab.webSocketDebuggerUrl) {
    console.error('Could not connect to browser tab');
    proc.kill();
    process.exit(1);
  }

  const ws = new WebSocket(tab.webSocketDebuggerUrl);

  ws.onopen = () => {
    ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
    ws.send(JSON.stringify({ id: 2, method: 'Page.enable' }));

    // 1. Scroll to Doctor List and capture
    setTimeout(() => {
      ws.send(JSON.stringify({
        id: 10,
        method: 'Runtime.evaluate',
        params: {
          expression: `
            const el = document.getElementById('doctorList');
            if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
          `
        }
      }));

      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 11,
          method: 'Page.captureScreenshot',
          params: { format: 'png' }
        }));
      }, 1200);
    }, 2500);
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);

    if (msg.id === 11 && msg.result?.data) {
      const buf = Buffer.from(msg.result.data, 'base64');
      fs.writeFileSync(path.join(__dirname, 'hospital_homepage_doctors.png'), buf);
      fs.writeFileSync(path.join(artifactDir, 'hospital_homepage_doctors.png'), buf);
      console.log('Successfully captured hospital_homepage_doctors.png');

      // 2. Open Doctor Finder Modal and capture
      ws.send(JSON.stringify({
        id: 20,
        method: 'Runtime.evaluate',
        params: { expression: 'openDoctorFinder();' }
      }));

      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 21,
          method: 'Page.captureScreenshot',
          params: { format: 'png' }
        }));
      }, 1500);
    }

    if (msg.id === 21 && msg.result?.data) {
      const buf = Buffer.from(msg.result.data, 'base64');
      fs.writeFileSync(path.join(__dirname, 'hospital_doctor_finder.png'), buf);
      fs.writeFileSync(path.join(artifactDir, 'hospital_doctor_finder.png'), buf);
      console.log('Successfully captured hospital_doctor_finder.png');

      ws.close();
      proc.kill();
      process.exit(0);
    }
  };
}

capture().catch(e => {
  console.error(e);
  proc.kill();
  process.exit(1);
});
