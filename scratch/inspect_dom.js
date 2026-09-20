const fs = require('fs');
const { spawn } = require('child_process');

const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const proc = spawn(browserPath, [
  '--headless',
  '--remote-debugging-port=9225',
  '--disable-gpu',
  'http://localhost:5000/pages/traffic/traffic.html'
]);

async function run() {
  await new Promise(r => setTimeout(r, 2000));
  try {
    const listRes = await fetch('http://127.0.0.1:9225/json');
    const tabs = await listRes.json();
    console.log('All tabs in browser:', tabs.map(t => ({ url: t.url, title: t.title })));
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
              JSON.stringify({
                href: window.location.href,
                title: document.title,
                bodyLength: document.body.innerHTML.length,
                bodySnippet: document.body.innerHTML.substring(0, 300),
                scriptCount: document.getElementsByTagName('script').length,
                scripts: Array.from(document.getElementsByTagName('script')).map(s => s.src)
              })
            `
          }
        }));
      }, 1000);
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === 2) {
        console.log('\n[EVALUATION RESULT]:\n', JSON.parse(msg.result.result.value));
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
