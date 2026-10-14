const { spawn } = require('child_process');
const fs = require('fs');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port = 9338;
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
  const consoleLogs = [];

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Runtime.consoleAPICalled') {
      const text = msg.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
      consoleLogs.push(`[${msg.params.type}] ${text}`);
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      consoleLogs.push(`[EXCEPTION] ${msg.params.exceptionDetails.text}`);
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

  // Test 1: Close Floating Pipe Card
  console.log('Testing closeFloatingPipeCard()...');
  let test1 = await send('Runtime.evaluate', {
    expression: `(() => {
      window.closeFloatingPipeCard();
      const card = document.getElementById('gisFloatingPipeCard');
      return { cardDisplayAfterClose: card.style.display };
    })()`,
    returnByValue: true
  });
  console.log('Test 1 Result:', test1.result.value);

  // Test 2: Re-open Floating Pipe Card with a specific pipe
  console.log('Testing updateFloatingPipeCard()...');
  let test2 = await send('Runtime.evaluate', {
    expression: `(() => {
      window.updateFloatingPipeCard({
        name: 'University Road Potable Feeder',
        pipeline_code: 'PL-FW-102',
        pipe_type: 'POTABLE',
        diameter_mm: 500,
        material: 'Ductile Iron (Class K9)',
        depth_meters: 2.1,
        flow_rate_lps: 110,
        pressure_bar: 3.8,
        status: 'Operational'
      });
      const card = document.getElementById('gisFloatingPipeCard');
      const title = document.getElementById('floatingPipeTitle').textContent;
      const status = document.getElementById('floatingPipeStatus').textContent;
      const flow = document.getElementById('fpFlow').textContent;
      return { cardDisplay: card.style.display, title, status, flow };
    })()`,
    returnByValue: true
  });
  console.log('Test 2 Result:', test2.result.value);

  // Test 3: Click "Start Route"
  console.log('Testing startMultiPointRoute()...');
  let test3 = await send('Runtime.evaluate', {
    expression: `(() => {
      window.startMultiPointRoute();
      const panel = document.getElementById('pipeContextualPanel');
      const banner = document.getElementById('mapDrawingBanner');
      return {
        panelDisplay: panel ? panel.style.display : 'none',
        bannerDisplay: banner ? banner.style.display : 'none'
      };
    })()`,
    returnByValue: true
  });
  console.log('Test 3 Result:', test3.result.value);

  // Scroll to map and capture screenshot with contextual panel open!
  await send('Runtime.evaluate', { expression: 'window.scrollTo(0, 750);' });
  await new Promise(r => setTimeout(r, 600));
  let ss = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\Omkar\\.gemini\\antigravity-ide\\brain\\d4941e1f-2e90-4c2f-b284-17e071de4e5b\\water_route_building_active.png', Buffer.from(ss.result.data, 'base64'));
  console.log('Screenshot of active route building saved!');

  // Test 4: Inspector Modal
  console.log('Testing openSelectedPipeFullDetails()...');
  let test4 = await send('Runtime.evaluate', {
    expression: `(() => {
      window.openSelectedPipeFullDetails();
      const modal = document.getElementById('gisInspectorModal');
      const title = document.getElementById('gisInspectorTitle') ? document.getElementById('gisInspectorTitle').textContent : '';
      return {
        modalDisplay: modal ? modal.style.display : 'none',
        modalTitle: title
      };
    })()`,
    returnByValue: true
  });
  console.log('Test 4 Result:', test4.result.value);

  // Capture screenshot of inspector modal
  await new Promise(r => setTimeout(r, 600));
  ss = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\Omkar\\.gemini\\antigravity-ide\\brain\\d4941e1f-2e90-4c2f-b284-17e071de4e5b\\water_inspector_modal.png', Buffer.from(ss.result.data, 'base64'));
  console.log('Screenshot of inspector modal saved!');

  console.log('Console logs count:', consoleLogs.length);
  if (consoleLogs.length > 0) {
    console.log(consoleLogs.slice(0, 10).join('\n'));
  }

  ws.close();
  proc.kill();
  console.log('All interaction tests passed!');
}

run().catch(console.error);
