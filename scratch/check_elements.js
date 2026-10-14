const { spawn } = require('child_process');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port = 9336;
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
  await send('Page.navigate', { url: targetUrl });
  await new Promise(r => setTimeout(r, 3500));

  const res = await send('Runtime.evaluate', {
    expression: `(() => {
      const compass = document.querySelector('.gis-compass-widget');
      const tools = document.querySelector('.gis-map-overlay-tools');
      const card = document.querySelector('#gisFloatingPipeCard');
      const map = document.querySelector('#waterMap');
      const viewport = document.querySelector('#gisMapViewport');

      return {
        compass: compass ? { z: window.getComputedStyle(compass).zIndex, pos: window.getComputedStyle(compass).position, top: compass.offsetTop, left: compass.offsetLeft } : 'not found',
        tools: tools ? { z: window.getComputedStyle(tools).zIndex, pos: window.getComputedStyle(tools).position, top: tools.offsetTop, right: window.getComputedStyle(tools).right } : 'not found',
        card: card ? { display: card.style.display || window.getComputedStyle(card).display, z: window.getComputedStyle(card).zIndex, pos: window.getComputedStyle(card).position } : 'not found',
        mapZ: map ? window.getComputedStyle(map).zIndex : 'not found',
        viewportPos: viewport ? window.getComputedStyle(viewport).position : 'not found'
      };
    })()`,
    returnByValue: true
  });

  console.log('EVAL RESULT:', JSON.stringify(res.result.result.value, null, 2));

  ws.close();
  proc.kill();
}

run().catch(console.error);
