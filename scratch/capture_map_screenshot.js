const fs = require('fs');
const { spawn } = require('child_process');

const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const proc = spawn(browserPath, [
  '--headless',
  '--remote-debugging-port=9229',
  '--window-size=1280,900',
  '--disable-gpu',
  'http://localhost:5000/pages/traffic/traffic.html'
]);

setTimeout(async () => {
  try {
    const tabs = await (await fetch('http://127.0.0.1:9229/json')).json();
    const tab = tabs.find(t => t.url.includes('traffic.html'));
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({ id: 1, method: 'Page.enable' }));
      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 2,
          method: 'Page.captureScreenshot',
          params: { format: 'png' }
        }));
      }, 3000);
    };
    ws.onmessage = (e) => {
      const d = JSON.parse(e.data);
      if (d.id === 2 && d.result && d.result.data) {
        const buffer = Buffer.from(d.result.data, 'base64');
        fs.writeFileSync('frontend/pages/traffic/traffic_map_preview.png', buffer);
        console.log('Screenshot saved successfully: frontend/pages/traffic/traffic_map_preview.png, size:', buffer.length);
        ws.close();
        proc.kill();
        process.exit(0);
      }
    };
  } catch(e) {
    console.error(e);
    proc.kill();
  }
}, 3000);
