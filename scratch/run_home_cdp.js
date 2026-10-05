
const { spawn } = require('child_process');

const proc = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
  '--headless',
  '--remote-debugging-port=9245',
  '--disable-gpu',
  '--window-size=1400,1200',
  'http://localhost:3000/pages/hospital/hospital.html'
]);

async function capture() {
  await new Promise(r => setTimeout(r, 3000));
  const listRes = await fetch('http://127.0.0.1:9245/json');
  const tabs = await listRes.json();
  const tab = tabs.find(t => t.url && t.url.includes('hospital.html'));
  const ws = new WebSocket(tab.webSocketDebuggerUrl);

  ws.onopen = () => {
    ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
    ws.send(JSON.stringify({ id: 2, method: 'Page.enable' }));

    setTimeout(() => {
      // Scroll to doctor list
      ws.send(JSON.stringify({
        id: 3,
        method: 'Runtime.evaluate',
        params: {
          expression: 'document.getElementById("doctorList").scrollIntoView({ behavior: "instant", block: "center" });'
        }
      }));

      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 4,
          method: 'Page.captureScreenshot',
          params: { format: 'png' }
        }));
      }, 1000);
    }, 2000);
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id === 4 && msg.result?.data) {
      const fs = require('fs');
      const buf = Buffer.from(msg.result.data, 'base64');
      fs.writeFileSync('D:\\cityai_project - Copy\\scratch\\hospital_homepage_doctors.png', buf);
      fs.writeFileSync('C:\\Users\\Omkar\\.gemini\\antigravity-ide\\brain\\20443c78-30e1-40dc-87be-4de20968da24\\hospital_homepage_doctors.png', buf);
      console.log('Saved hospital_homepage_doctors.png successfully.');
      ws.close();
      proc.kill();
      process.exit(0);
    }
  };
}
capture().catch(err => {
  console.error(err);
  proc.kill();
  process.exit(1);
});
