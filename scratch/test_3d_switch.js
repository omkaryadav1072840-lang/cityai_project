const { spawn } = require('child_process');
const fs = require('fs');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port = 9341;
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
  const consoleLogs = [];

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Runtime.consoleAPICalled') {
      const text = msg.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
      consoleLogs.push(`[${msg.params.type}] ${text}`);
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      consoleLogs.push(`[EXCEPTION] ${msg.params.exceptionDetails.text} at line ${msg.params.exceptionDetails.lineNumber}`);
    }
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

  console.log('Triggering toggleWaterDimension("3d")...');
  const evalRes = await send('Runtime.evaluate', {
    expression: `(() => {
      if (typeof window.toggleWaterDimension === 'function') {
        window.toggleWaterDimension('3d');
      }
      const map2d = document.getElementById('waterMap');
      const map3d = document.getElementById('water3DContainer');
      const canvasCont = document.getElementById('water3DCanvasContainer');
      const canvasEl = canvasCont ? canvasCont.querySelector('canvas') : null;
      const viewport = document.getElementById('gisMapViewport');

      return {
        map2dDisplay: map2d ? window.getComputedStyle(map2d).display : 'missing',
        map3dDisplay: map3d ? window.getComputedStyle(map3d).display : 'missing',
        map3dParent: map3d ? map3d.parentElement.className : 'missing',
        map3dRect: map3d ? map3d.getBoundingClientRect() : null,
        viewportRect: viewport ? viewport.getBoundingClientRect() : null,
        canvasFound: !!canvasEl,
        canvasSize: canvasEl ? { w: canvasEl.width, h: canvasEl.height } : null,
        threeLoaded: typeof THREE !== 'undefined',
        water3DExplorerLoaded: typeof Water3DExplorer !== 'undefined'
      };
    })()`,
    returnByValue: true
  });

  console.log('3D Status Result:', JSON.stringify(evalRes.result ? evalRes.result.value : evalRes, null, 2));

  // Wait 2 seconds for Three.js render
  await new Promise(r => setTimeout(r, 2000));

  // Screenshot at viewport scroll
  await send('Runtime.evaluate', { expression: 'window.scrollTo(0, 480);' });
  await new Promise(r => setTimeout(r, 500));
  let ss = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\Omkar\\.gemini\\antigravity-ide\\brain\\d4941e1f-2e90-4c2f-b284-17e071de4e5b\\water_3d_state_current.png', Buffer.from(ss.result.data, 'base64'));
  console.log('Screenshot saved to water_3d_state_current.png');

  if (consoleLogs.length > 0) {
    console.log('Console Logs:');
    console.log(consoleLogs.join('\n'));
  }

  ws.close();
  proc.kill();
}

run().catch(console.error);
