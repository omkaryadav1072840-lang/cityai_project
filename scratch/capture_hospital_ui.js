const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

let browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
if (!fs.existsSync(browserPath)) {
    browserPath = 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe';
}

async function run() {
    console.log('Starting headless browser for screenshot...');
    const edge = spawn(browserPath, [
        '--headless',
        '--remote-debugging-port=9228',
        '--disable-gpu',
        '--window-size=1400,1050',
        'about:blank'
    ]);

    await new Promise(r => setTimeout(r, 2000));

    try {
        const listRes = await fetch('http://127.0.0.1:9228/json');
        const tabs = await listRes.json();
        const mainTab = tabs[0];
        const ws = new WebSocket(mainTab.webSocketDebuggerUrl);

        await new Promise(res => {
            ws.onopen = res;
        });

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

        console.log('Navigating to hospital page...');
        await send('Page.navigate', { url: 'http://localhost:5000/pages/hospital/hospital.html' });

        await new Promise(r => setTimeout(r, 3000));

        // Scroll to the services-overview-section
        await send('Runtime.evaluate', {
            expression: `
                const el = document.querySelector('.services-overview-section');
                if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
            `
        });

        await new Promise(r => setTimeout(r, 1000));

        console.log('Capturing screenshot...');
        const screenshotResult = await send('Page.captureScreenshot', { format: 'png' });

        if (screenshotResult && screenshotResult.data) {
            const outPath = path.resolve(__dirname, 'hospital_services_redesign.png');
            fs.writeFileSync(outPath, Buffer.from(screenshotResult.data, 'base64'));
            console.log('Screenshot saved successfully to:', outPath);
        }
    } catch (e) {
        console.error('Error:', e);
    } finally {
        edge.kill();
        process.exit(0);
    }
}

run();
