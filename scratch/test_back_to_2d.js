const { spawn } = require('child_process');
const fs = require('fs');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port = 9342;
const targetUrl = 'http://localhost:3000/pages/water/water.html';

async function run() {
  const proc = spawn(edgePath, [
    '--headless',
    `--remote-debugging-port=${port}`,
    '--disable-gpu',
    '--window-size=1600,1200',
    'about:blank'
  ]);

  let pageTab = null;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 300));
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json`);
      const tabs = await res.json();
      pageTab = tabs.find(t => t.type === 'page');
      if (pageTab && pageTab.webSocketDebuggerUrl) break;
    } catch (_) {}
  }

  const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
  let idCounter = 1;
  const pending = new Map();

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  };

  const send = (method, params = {}) => {
    return new Promise((resolve) => {
      const id = idCounter++;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  };

  await new Promise(r => ws.onopen = r);
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url: targetUrl });
  await new Promise(r => setTimeout(r, 3500));

  // 1. Switch to 3D
  await send('Runtime.evaluate', { expression: 'window.toggleWaterDimension("3d");' });
  await new Promise(r => setTimeout(r, 1500));

  // 2. Switch back to 2D
  console.log('Switching back to 2D...');
  await send('Runtime.evaluate', { expression: 'window.toggleWaterDimension("2d");' });
  await new Promise(r => setTimeout(r, 1000));

  // Scroll to map and screenshot
  await send('Runtime.evaluate', { expression: 'window.scrollTo(0, 480);' });
  await new Promise(r => setTimeout(r, 500));
  let ss = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\Omkar\\.gemini\\antigravity-ide\\brain\\d4941e1f-2e90-4c2f-b284-17e071de4e5b\\water_back_to_2d.png', Buffer.from(ss.result.data, 'base64'));
  console.log('Saved water_back_to_2d.png');

  ws.close();
  proc.kill();
}

run().catch(console.error);
