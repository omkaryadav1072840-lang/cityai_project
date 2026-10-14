const { spawn } = require('child_process');
const fs = require('fs');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port = 9334;
const targetUrl = 'http://localhost:3000/pages/water/water.html';

async function run() {
  const proc = spawn(edgePath, [
    '--headless',
    `--remote-debugging-port=${port}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
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
  await new Promise(r => setTimeout(r, 4000));

  // 1. Scroll to Map
  await send('Runtime.evaluate', { expression: 'window.scrollTo(0, 750);' });
  await new Promise(r => setTimeout(r, 500));
  let ss = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\Omkar\\.gemini\\antigravity-ide\\brain\\d4941e1f-2e90-4c2f-b284-17e071de4e5b\\water_map_section.png', Buffer.from(ss.result.data, 'base64'));

  // 2. Scroll to Bottom Quad Cards
  await send('Runtime.evaluate', { expression: 'window.scrollTo(0, 1450);' });
  await new Promise(r => setTimeout(r, 500));
  ss = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\Omkar\\.gemini\\antigravity-ide\\brain\\d4941e1f-2e90-4c2f-b284-17e071de4e5b\\water_bottom_quad.png', Buffer.from(ss.result.data, 'base64'));

  // 3. Switch to Equipment Library Workspace
  await send('Runtime.evaluate', { expression: 'window.scrollTo(0, 650); switchWaterWorkspace("library");' });
  await new Promise(r => setTimeout(r, 800));
  ss = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\Omkar\\.gemini\\antigravity-ide\\brain\\d4941e1f-2e90-4c2f-b284-17e071de4e5b\\water_library_deck.png', Buffer.from(ss.result.data, 'base64'));

  // 4. Switch to Existing Network Workspace
  await send('Runtime.evaluate', { expression: 'switchWaterWorkspace("existing");' });
  await new Promise(r => setTimeout(r, 800));
  ss = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\Omkar\\.gemini\\antigravity-ide\\brain\\d4941e1f-2e90-4c2f-b284-17e071de4e5b\\water_existing_deck.png', Buffer.from(ss.result.data, 'base64'));

  ws.close();
  proc.kill();
  console.log('All screenshots captured!');
}

run().catch(console.error);
