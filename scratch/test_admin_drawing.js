const { spawn } = require('child_process');
const fs = require('fs');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port = 9339;
const targetUrl = 'http://localhost:3000/pages/water/water.html';

async function run() {
  const proc = spawn(edgePath, [
    '--headless',
    `--remote-debugging-port=${port}`,
    '--disable-gpu',
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

  // Pre-seed admin role in localStorage
  await send('Page.navigate', { url: targetUrl });
  await new Promise(r => setTimeout(r, 2000));

  await send('Runtime.evaluate', {
    expression: `(() => {
      localStorage.setItem('waterRole', 'admin');
      localStorage.setItem('user', JSON.stringify({ name: 'Admin Engineer', role: 'admin', department: 'water' }));
    })()`
  });

  // Reload with admin privileges
  await send('Page.reload');
  await new Promise(r => setTimeout(r, 3500));

  console.log('Activating route builder as Water Admin...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      window.scrollTo(0, 750);
      window.startMultiPointRoute();
    })()`
  });

  await new Promise(r => setTimeout(r, 600));
  let ss = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\Omkar\\.gemini\\antigravity-ide\\brain\\d4941e1f-2e90-4c2f-b284-17e071de4e5b\\water_admin_drawing_active.png', Buffer.from(ss.result.data, 'base64'));
  console.log('Admin route drawing screenshot saved!');

  ws.close();
  proc.kill();
}

run().catch(console.error);
