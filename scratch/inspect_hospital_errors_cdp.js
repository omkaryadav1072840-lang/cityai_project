const { spawn } = require('child_process');
const fs = require('fs');

const candidates = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
];
const browserPath = candidates.find(p => fs.existsSync(p));

const proc = spawn(browserPath, [
  '--headless',
  '--remote-debugging-port=9227',
  '--disable-gpu',
  'http://localhost:3000/pages/hospital/hospital.html'
]);

async function run() {
  await new Promise(r => setTimeout(r, 2500));
  try {
    const listRes = await fetch('http://127.0.0.1:9227/json');
    const tabs = await listRes.json();
    const tab = tabs.find(t => t.url.includes('hospital.html'));
    if (!tab) {
      console.log('Tab not found in tabs:', tabs);
      proc.kill();
      process.exit(1);
    }
    
    const ws = new WebSocket(tab.webSocketDebuggerUrl);

    const logs = [];
    const exceptions = [];
    const failed404s = [];

    ws.onopen = () => {
      ws.send(JSON.stringify({ id: 1, method: 'Network.enable' }));
      ws.send(JSON.stringify({ id: 2, method: 'Runtime.enable' }));
      ws.send(JSON.stringify({ id: 3, method: 'Log.enable' }));
      ws.send(JSON.stringify({ id: 4, method: 'Console.enable' }));

      // Evaluate after 3 seconds
      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 10,
          method: 'Runtime.evaluate',
          params: {
            expression: `
              ({
                title: document.title,
                hospitalCardsCount: document.querySelectorAll('.hospital-card, .pro-hospital-card, .directory-card').length,
                doctorCardsCount: document.querySelectorAll('.doctor-card, .pro-doctor-card').length,
                bedCardsCount: document.querySelectorAll('.bed-card, .pro-bed-card').length,
                totalModals: document.querySelectorAll('.modal').length,
                brokenImages: Array.from(document.querySelectorAll('img')).filter(img => !img.complete || img.naturalWidth === 0).map(img => img.src)
              })
            `,
            returnByValue: true
          }
        }));
      }, 3000);
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
        if (msg.params.type === 'error' || msg.params.type === 'warning') {
          logs.push(`[CONSOLE ${msg.params.type.toUpperCase()}] ${text}`);
        }
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        exceptions.push(`[EXCEPTION] ${msg.params.exceptionDetails.text} ${msg.params.exceptionDetails.exception?.description}`);
      }
      if (msg.method === 'Network.responseReceived') {
        if (msg.params.response.status >= 400) {
          failed404s.push(`[HTTP ${msg.params.response.status}] ${msg.params.response.url}`);
        }
      }
      if (msg.id === 10) {
        console.log('=== DOM EVALUATION RESULT ===');
        console.log(JSON.stringify(msg.result.result.value, null, 2));
        console.log('\n=== EXCEPTIONS ===');
        console.log(exceptions.length ? exceptions : 'None');
        console.log('\n=== FAILED RESPONSES (4xx/5xx) ===');
        console.log(failed404s.length ? failed404s : 'None');
        console.log('\n=== CONSOLE ERRORS & WARNINGS ===');
        console.log(logs.slice(0, 25).join('\n'));
        
        ws.close();
        proc.kill();
        process.exit(0);
      }
    };
  } catch(e) {
    console.error('Inspect error:', e);
    proc.kill();
    process.exit(1);
  }
}

run();
