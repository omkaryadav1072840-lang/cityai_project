const fs = require('fs');
const { spawn } = require('child_process');

const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const proc = spawn(browserPath, [
  '--headless',
  '--remote-debugging-port=9226',
  '--disable-gpu',
  'http://localhost:5000/pages/traffic/traffic.html'
]);

async function run() {
  await new Promise(r => setTimeout(r, 2000));
  try {
    const listRes = await fetch('http://127.0.0.1:9226/json');
    const tabs = await listRes.json();
    const trafficTab = tabs.find(t => t.url.includes('traffic.html'));
    
    const ws = new WebSocket(trafficTab.webSocketDebuggerUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
      
      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 2,
          method: 'Runtime.evaluate',
          params: {
            expression: `
              (() => {
                const html = document.documentElement.outerHTML;
                return {
                  totalLength: html.length,
                  tail: html.substring(html.length - 800),
                  allScriptsInQuerySelector: Array.from(document.querySelectorAll('script')).map(s => s.outerHTML),
                  readyState: document.readyState
                };
              })()
            `,
            returnByValue: true
          }
        }));
      }, 1500);
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === 2) {
        console.log('Result:', JSON.stringify(msg.result.result.value, null, 2));
        ws.close();
        proc.kill();
        process.exit(0);
      }
    };
  } catch(e) {
    console.error(e);
    proc.kill();
  }
}
run();
