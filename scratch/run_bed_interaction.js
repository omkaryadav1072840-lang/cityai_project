
  const { spawn } = require('child_process');
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless',
    '--remote-debugging-port=9233',
    '--disable-gpu',
    '--window-size=1380,1000',
    'about:blank'
  ]);

  setTimeout(async () => {
    try {
      const list = await fetch('http://127.0.0.1:9233/json').then(r => r.json());
      const ws = new WebSocket(list[0].webSocketDebuggerUrl);
      await new Promise(r => ws.onopen = r);

      let id = 1;
      function send(method, params = {}) {
        return new Promise(resolve => {
          const reqId = id++;
          const handler = (e) => {
            const data = JSON.parse(e.data);
            if (data.id === reqId) {
              ws.removeEventListener('message', handler);
              resolve(data.result);
            }
          };
          ws.addEventListener('message', handler);
          ws.send(JSON.stringify({ id: reqId, method, params }));
        });
      }

      await send('Page.enable');
      await send('Runtime.enable');
      await send('Page.navigate', { url: 'http://localhost:3000/pages/hospital/hospital.html#hospitals' });
      await new Promise(r => setTimeout(r, 2500));

      // Click Live Beds on the first card
      const res = await send('Runtime.evaluate', {
        expression: `
          (() => {
            const bedBtn = document.querySelector('.pro-hospital-card .btn-pro-beds');
            if (bedBtn) {
              bedBtn.click();
              return 'clicked Live Beds';
            }
            return 'btn not found';
          })()
        `
      });
      console.log('Bed click result:', res);

      await new Promise(r => setTimeout(r, 2000));

      const screenshot = await send('Page.captureScreenshot', { format: 'png' });
      if (screenshot && screenshot.data) {
        fs.writeFileSync('D:\\cityai_project - Copy\\scratch\\test_interaction_beds.png', Buffer.from(screenshot.data, 'base64'));
        console.log('Interaction screenshot saved!');
      }
    } catch(err) {
      console.error(err);
    } finally {
      edge.kill();
      process.exit(0);
    }
  }, 2000);
