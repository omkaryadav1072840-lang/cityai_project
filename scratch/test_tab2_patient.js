const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

let browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
if (!fs.existsSync(browserPath)) {
    browserPath = 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe';
}

async function run() {
    const port = 9228;
    const edge = spawn(browserPath, [
        '--headless',
        `--remote-debugging-port=${port}`,
        '--disable-gpu',
        '--window-size=1280,1050',
        'about:blank'
    ]);

    await new Promise(r => setTimeout(r, 2000));

    try {
        const listRes = await fetch(`http://127.0.0.1:${port}/json`);
        const tabs = await listRes.json();
        const mainTab = tabs[0];
        const ws = new WebSocket(mainTab.webSocketDebuggerUrl);

        await new Promise(res => { ws.onopen = res; });
        console.log('Connected to CDP.');

        let id = 1;
        function send(method, params = {}) {
            return new Promise((resolve) => {
                const reqId = id++;
                const handler = (evt) => {
                    const data = JSON.parse(evt.data);
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

        await send('Page.navigate', { url: 'http://localhost:3000/pages/hospital/hospital.html#beds' });
        await new Promise(r => setTimeout(r, 3000));

        // Switch to patient tab and look up PAT-RAHUL-10231
        console.log('Switching to patient tab and searching UHID...');
        await send('Runtime.evaluate', {
            expression: `
                switchBedModalTab('patient');
                fillAndLookupPatient('PAT-RAHUL-10231');
            `
        });

        await new Promise(r => setTimeout(r, 2500));

        // Take screenshot
        const shot = await send('Page.captureScreenshot', { format: 'png' });
        const outPath = path.join(__dirname, 'bed_tab2_preview.png');
        fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
        console.log('Screenshot saved to:', outPath);

        ws.close();
    } catch (e) {
        console.error('CDP Error:', e);
    } finally {
        edge.kill();
    }
}

run();
