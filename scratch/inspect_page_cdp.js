const fs = require('fs');
const { spawn } = require('child_process');

const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const proc = spawn(browserPath, [
  '--headless',
  '--remote-debugging-port=9227',
  '--disable-gpu',
  'http://localhost:5000/pages/traffic/traffic.html'
]);

async function run() {
  await new Promise(r => setTimeout(r, 2000));
  try {
    const listRes = await fetch('http://127.0.0.1:9227/json');
    const tabs = await listRes.json();
    const trafficTab = tabs.find(t => t.url.includes('traffic.html'));
    
    const ws = new WebSocket(trafficTab.webSocketDebuggerUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({ id: 1, method: 'Console.enable' }));
      ws.send(JSON.stringify({ id: 2, method: 'Runtime.enable' }));
      
      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 3,
          method: 'Runtime.evaluate',
          params: {
            expression: `
              JSON.stringify({
                hasOl: typeof window.ol !== 'undefined',
                hasTrafficMap: typeof window.trafficMap !== 'undefined' && window.trafficMap !== null,
                hasMapInstance: !!(window.trafficMap && window.trafficMap.map),
                mapTarget: window.trafficMap && window.trafficMap.targetId,
                mapElementExists: !!document.getElementById('traffic-ol-map'),
                mapClientHeight: document.getElementById('traffic-ol-map')?.clientHeight,
                mapClientWidth: document.getElementById('traffic-ol-map')?.clientWidth,
                mapLayersCount: window.trafficMap?.map?.getLayers()?.getLength(),
                junctionsRendered: window.trafficMap?.junctionSource?.getFeatures()?.length,
                allJunctionsCount: typeof allJunctions !== 'undefined' ? allJunctions.length : -1,
                allSignalsCount: typeof allSignals !== 'undefined' ? allSignals.length : -1,
                clockText: document.getElementById('clock')?.textContent,
                scriptCount: document.getElementsByTagName('script').length
              })
            `
          }
        }));
      }, 2500);
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.consoleAPICalled') {
        console.log('[BROWSER CONSOLE]', msg.params.type, msg.params.args.map(a => a.value || a.description).join(' '));
      } else if (msg.method === 'Runtime.exceptionThrown') {
        console.error('[BROWSER EXCEPTION]', msg.params.exceptionDetails);
      } else if (msg.id === 3) {
        console.log('\n[REAL BROWSER PAGE STATE EVALUATION RESULT]:');
        console.log(JSON.parse(msg.result.result.value));
        setTimeout(() => {
          ws.close();
          proc.kill();
          process.exit(0);
        }, 500);
      }
    };

    ws.onerror = (err) => console.error('WS error:', err.message);
  } catch(e) {
    console.error(e);
    proc.kill();
  }
}
run();
