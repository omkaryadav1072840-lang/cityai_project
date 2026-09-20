const fs = require('fs');
const { spawn } = require('child_process');

const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const proc = spawn(browserPath, [
  '--headless',
  '--remote-debugging-port=9224',
  '--disable-gpu',
  'http://localhost:5000/pages/traffic/traffic.html'
]);

async function run() {
  await new Promise(r => setTimeout(r, 2000));
  try {
    const listRes = await fetch('http://127.0.0.1:9224/json');
    const tabs = await listRes.json();
    const trafficTab = tabs.find(t => t.url.includes('traffic.html'));
    
    const ws = new WebSocket(trafficTab.webSocketDebuggerUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({ id: 1, method: 'Network.enable' }));
      ws.send(JSON.stringify({ id: 2, method: 'Runtime.enable' }));
      ws.send(JSON.stringify({ id: 3, method: 'Page.enable' }));
      
      // Check scripts on page
      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 4,
          method: 'Runtime.evaluate',
          params: {
            expression: `
              Array.from(document.querySelectorAll('script')).map(s => ({
                src: s.src,
                type: s.type
              }))
            `,
            returnByValue: true
          }
        }));
      }, 1500);
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Network.loadingFailed') {
        console.log('[NETWORK FAILED]', msg.params.errorText, msg.params);
      }
      if (msg.method === 'Network.responseReceived') {
        console.log('[NETWORK RESPONSE]', msg.params.response.url, msg.params.response.status);
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        console.log('[EXCEPTION]', msg.params.exceptionDetails.text, msg.params.exceptionDetails.exception?.description);
      }
      if (msg.id === 4) {
        console.log('\n[SCRIPTS IN DOM]:', msg.result.result.value);
        setTimeout(() => {
          ws.close();
          proc.kill();
          process.exit(0);
        }, 1500);
      }
    };
  } catch(e) {
    console.error(e);
    proc.kill();
  }
}
run();
