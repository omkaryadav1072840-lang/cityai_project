const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');
const jwt = require(path.join(__dirname, '..', 'backend', 'node_modules', 'jsonwebtoken'));

let browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
if (!fs.existsSync(browserPath)) {
    browserPath = 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe';
}

const token = jwt.sign(
    { id: 1, role: 'citizen', patientId: 'SC-2026-318028' },
    'smartcity_super_secret_jwt_key_gorakhpur_2026',
    { expiresIn: '2h' }
);

async function run() {
    console.log('Starting headless browser for appointments screenshot...');
    const edge = spawn(browserPath, [
        '--headless',
        '--remote-debugging-port=9241',
        '--disable-gpu',
        '--window-size=1380,1050',
        'about:blank'
    ]);

    await new Promise(r => setTimeout(r, 2000));

    try {
        const listRes = await fetch('http://127.0.0.1:9241/json');
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

        console.log('Injecting session before document loads...');
        await send('Page.addScriptToEvaluateOnNewDocument', {
            source: `
                try {
                    localStorage.setItem('smartCityJWT', '${token}');
                    localStorage.setItem('smartCityCurrentUser', JSON.stringify({ id: 1, role: 'citizen', patientId: 'SC-2026-318028', name: 'Rahul Sharma' }));
                    localStorage.setItem('token', '${token}');
                    localStorage.setItem('user', JSON.stringify({ id: 1, role: 'citizen', patientId: 'SC-2026-318028', name: 'Rahul Sharma' }));
                    localStorage.setItem('patient_id', 'SC-2026-318028');
                } catch(e) {}
            `
        });

        console.log('Navigating to hospital.html#appointments...');
        await send('Page.navigate', { url: 'http://localhost:3000/pages/hospital/hospital.html#appointments' });

        console.log('Waiting for appointments rendering...');
        await new Promise(r => setTimeout(r, 6000));

        console.log('Capturing screenshot of My Appointments modal with live cards...');
        const screenshotResult = await send('Page.captureScreenshot', { format: 'png' });

        if (screenshotResult && screenshotResult.data) {
            const outPath = path.resolve(__dirname, 'my_appointments_redesign.png');
            fs.writeFileSync(outPath, Buffer.from(screenshotResult.data, 'base64'));
            console.log('Screenshot saved to:', outPath);

            const artifactDest = 'C:\\Users\\Omkar\\.gemini\\antigravity-ide\\brain\\20443c78-30e1-40dc-87be-4de20968da24\\my_appointments_redesign.png';
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
