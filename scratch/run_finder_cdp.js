
const { spawn } = require('child_process');

const proc = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
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
      fs.writeFileSync('D:\\cityai_project - Copy\\scratch\\hospital_doctor_finder.png', buf);
      fs.writeFileSync('C:\\Users\\Omkar\\.gemini\\antigravity-ide\\brain\\20443c78-30e1-40dc-87be-4de20968da24\\hospital_doctor_finder.png', buf);
      console.log('Successfully captured hospital_doctor_finder.png');
      ws.close();
      proc.kill();
      process.exit(0);
    }
  };
}
capture().catch(console.error);
