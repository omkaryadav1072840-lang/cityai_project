const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port = 9333;
const targetUrl = 'http://localhost:3000/pages/water/water.html';
const artifactScreenshot = 'C:\\Users\\Omkar\\.gemini\\antigravity-ide\\brain\\d4941e1f-2e90-4c2f-b284-17e071de4e5b\\water_inspected.png';

async function run() {
  console.log('Spawning Edge headless...');
  const proc = spawn(edgePath, [
    '--headless',
    `--remote-debugging-port=${port}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1600,1050',
    'about:blank'
  ]);

  proc.on('error', (err) => console.error('Spawn error:', err));

  // Wait for debugger endpoint
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

  if (!pageTab) {
    console.error('Failed to get pageTab');
    proc.kill();
    return;
  }

  console.log('Connecting via native WebSocket to:', pageTab.webSocketDebuggerUrl);
  const ws = new WebSocket(pageTab.webSocketDebuggerUrl);

  let idCounter = 1;
  const pending = new Map();
  const consoleMessages = [];

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Runtime.consoleAPICalled') {
      const text = msg.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
      consoleMessages.push(`[${msg.params.type.toUpperCase()}] ${text}`);
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      consoleMessages.push(`[EXCEPTION] ${msg.params.exceptionDetails.text} at ${msg.params.exceptionDetails.url || ''}:${msg.params.exceptionDetails.lineNumber || 0}`);
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

  await send('Runtime.enable');
  await send('Page.enable');
  await send('DOM.enable');

  console.log('Navigating to:', targetUrl);
  await send('Page.navigate', { url: targetUrl });

  // Wait 4 seconds for map, data, and scripts to initialize
  await new Promise(r => setTimeout(r, 4000));

  console.log('=== BROWSER CONSOLE MESSAGES & EXCEPTIONS ===');
  console.log(consoleMessages.join('\n') || 'None recorded');

  // Evaluate DOM checks
  const evalRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const map = document.getElementById('waterMap');
      const floatingCard = document.getElementById('gisFloatingPipeCard');
      const pipePanel = document.getElementById('pipeContextualPanel');
      const equipPanel = document.getElementById('equipmentContextualPanel');
      const quadGrid = document.querySelector('.gis-bottom-quad-grid');
      const wsBar = document.getElementById('waterWorkspacesBar');

      return {
        mapFound: !!map,
        mapVisible: map ? (map.offsetWidth > 0 && map.offsetHeight > 0) : false,
        mapDimensions: map ? { w: map.offsetWidth, h: map.offsetHeight } : null,
        floatingCardFound: !!floatingCard,
        floatingCardDisplay: floatingCard ? window.getComputedStyle(floatingCard).display : 'missing',
        floatingCardZIndex: floatingCard ? window.getComputedStyle(floatingCard).zIndex : 'missing',
        floatingCardRect: floatingCard ? floatingCard.getBoundingClientRect() : null,
        wsBarFound: !!wsBar,
        quadGridCount: quadGrid ? quadGrid.children.length : 0,
        pipeCount: window.pipelines ? window.pipelines.length : 0,
        assetCount: window.networkAssets ? window.networkAssets.length : 0,
        leafletPaneCount: document.querySelectorAll('.leaflet-pane').length
      };
    })()`,
    returnByValue: true
  });

  console.log('=== DOM EVALUATION RESULT ===');
  console.log(JSON.stringify(evalRes.result ? evalRes.result.value : evalRes, null, 2));

  // Capture Screenshot
  console.log('Capturing screenshot...');
  const ssRes = await send('Page.captureScreenshot', { format: 'png' });
  if (ssRes.result && ssRes.result.data) {
    fs.writeFileSync(artifactScreenshot, Buffer.from(ssRes.result.data, 'base64'));
    console.log('Screenshot saved successfully to:', artifactScreenshot);
  }

  ws.close();
  proc.kill();
  console.log('Inspection complete.');
}

run().catch(console.error);
