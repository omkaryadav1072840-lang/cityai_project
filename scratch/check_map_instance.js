const { spawn } = require('child_process');

const proc = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
  '--headless',
  '--remote-debugging-port=9228',
  '--disable-gpu',
  'http://localhost:5000/pages/traffic/traffic.html'
]);

setTimeout(async () => {
  try {
    const tabs = await (await fetch('http://127.0.0.1:9228/json')).json();
    const tab = tabs.find(t => t.url.includes('traffic.html'));
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `
            JSON.stringify({
              hasTrafficMap: typeof trafficMap !== 'undefined',
              isNull: trafficMap === null,
              hasMap: !!(trafficMap && trafficMap.map),
              layersCount: trafficMap?.map?.getLayers()?.getLength(),
              junctionsFeatures: trafficMap?.junctionSource?.getFeatures()?.length,
              signalsFeatures: trafficMap?.signalSource?.getFeatures()?.length,
              canvasCount: document.getElementById('traffic-ol-map')?.querySelectorAll('canvas')?.length
            })
          `
        }
      }));
    };
    ws.onmessage = (e) => {
      const d = JSON.parse(e.data);
      if (d.id === 1) {
        console.log('Result:', JSON.parse(d.result.result.value));
        ws.close();
        proc.kill();
        process.exit(0);
      }
    };
  } catch(e) {
    console.error(e);
    proc.kill();
  }
}, 3000);
