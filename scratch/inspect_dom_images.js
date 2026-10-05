const { spawn } = require('child_process');
const fs = require('fs');

const candidates = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];
const browserPath = candidates.find(p => fs.existsSync(p));

const proc = spawn(browserPath, [
  '--headless',
  '--remote-debugging-port=9228',
  '--disable-gpu',
  'http://localhost:3000/pages/hospital/hospital.html'
]);

async function run() {
  await new Promise(r => setTimeout(r, 2500));
  try {
    const listRes = await fetch('http://127.0.0.1:9228/json');
    const tabs = await listRes.json();
    const tab = tabs.find(t => t.url.includes('hospital.html'));
    const ws = new WebSocket(tab.webSocketDebuggerUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 2,
          method: 'Runtime.evaluate',
          params: {
            expression: `
              Array.from(document.querySelectorAll('img')).map(img => ({
                outerHTML: img.outerHTML,
                src: img.src,
                currentSrc: img.currentSrc,
                id: img.id,
                className: img.className,
                parentElement: img.parentElement ? img.parentElement.tagName + '.' + img.parentElement.className : 'null'
              }))
            `,
            returnByValue: true
          }
        }));
      }, 2000);
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === 2) {
        console.log('Images in DOM:', JSON.stringify(msg.result.result.value, null, 2));
        ws.close();
        proc.kill();
        process.exit(0);
      }
    };
  } catch(e) {
    console.error(e);
    proc.kill();
    process.exit(1);
  }
}

run();
