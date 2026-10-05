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
        '--remote-debugging-port=9231',
        '--disable-gpu',
        '--window-size=1400,1050',
        'about:blank'
    ]);

    await new Promise(r => setTimeout(r, 2000));

    try {
        const listRes = await fetch('http://127.0.0.1:9231/json');
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

        console.log('Navigating to hospital page on port 3000...');
        let nav = await send('Page.navigate', { url: 'http://localhost:3000/pages/hospital/hospital.html' });
        await new Promise(r => setTimeout(r, 2500));

        console.log('Opening Hospitals modal via showHospitals()...');
        const evalRes = await send('Runtime.evaluate', {
            expression: `
                (async () => {
                    if (typeof showHospitals === 'function') {
                        await showHospitals();
                        return 'showHospitals invoked';
                    }
                    return 'showHospitals not found';
                })()
            `,
            awaitPromise: true
        });
        console.log('Eval result:', evalRes);

        await new Promise(r => setTimeout(r, 2000));

        console.log('Capturing screenshot of Hospitals Directory modal...');
        const screenshotResult = await send('Page.captureScreenshot', { format: 'png' });

        if (screenshotResult && screenshotResult.data) {
            const outPath = path.resolve(__dirname, 'hospitals_modal_screenshot.png');
            fs.writeFileSync(outPath, Buffer.from(screenshotResult.data, 'base64'));
            console.log('Screenshot saved to:', outPath);

            const artifactDest = 'C:\\Users\\Omkar\\.gemini\\antigravity-ide\\brain\\20443c78-30e1-40dc-87be-4de20968da24\\hospitals_modal_preview.png';
            fs.copyFileSync(outPath, artifactDest);
            console.log('Screenshot copied to artifact path:', artifactDest);
        }
    } catch (e) {
        console.error('Error during capture:', e);
    } finally {
        edge.kill();
        process.exit(0);
    }
}

run();
