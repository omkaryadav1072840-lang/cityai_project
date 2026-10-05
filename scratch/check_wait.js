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
    { expiresIn: '7d' }
);

async function run() {
    const edge = spawn(browserPath, [
        '--headless',
        '--remote-debugging-port=9247',
        '--disable-gpu',
        '--window-size=1380,1050',
        'about:blank'
    ]);

    await new Promise(r => setTimeout(r, 2000));

    try {
        const listRes = await fetch('http://127.0.0.1:9247/json');
        const tabs = await listRes.json();
        const ws = new WebSocket(tabs[0].webSocketDebuggerUrl);
        await new Promise(res => ws.onopen = res);

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

        console.log('Navigating to hospital.html...');
        await send('Page.navigate', { url: 'http://localhost:3000/pages/hospital/hospital.html' });

        // Poll until window.openMyAppointments exists
        let loaded = false;
        for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 500));
            const check = await send('Runtime.evaluate', {
                expression: 'typeof window.openMyAppointments === "function"'
            });
            if (check.result && check.result.value === true) {
                console.log(`openMyAppointments ready after ${(i + 1) * 500}ms`);
                loaded = true;
                break;
            }
        }

        if (!loaded) {
            console.error('Timeout waiting for openMyAppointments!');
            return;
        }

        // Set session and load
        const evalRes = await send('Runtime.evaluate', {
            expression: `
                (async () => {
                    const token = '${token}';
                    if (window.SmartCityAuth && window.SmartCityAuth.setSession) {
                        window.SmartCityAuth.setSession(token, { id: 1, role: 'citizen', patientId: 'SC-2026-318028', name: 'Rahul Sharma' });
                    }
                    localStorage.setItem('smartCityJWT', token);
                    localStorage.setItem('token', token);
                    localStorage.setItem('patient_id', 'SC-2026-318028');

                    window.openMyAppointments();
                    document.getElementById('myAppointmentPatientId').value = 'SC-2026-318028';
                    await window.loadMyAppointments();

                    return {
                        cardCount: document.querySelectorAll('.pro-appointment-card').length,
                        htmlSnippet: document.getElementById('myAppointmentsResult').innerHTML.substring(0, 150)
                    };
                })()
            `,
            awaitPromise: true,
            returnByValue: true
        });

        console.log('Execution result:', evalRes);

        await new Promise(r => setTimeout(r, 1500));
        const screenshot = await send('Page.captureScreenshot', { format: 'png' });
        if (screenshot && screenshot.data) {
            const outPath = path.resolve(__dirname, 'my_appointments_redesign.png');
            fs.writeFileSync(outPath, Buffer.from(screenshot.data, 'base64'));
            const artifactDest = 'C:\\Users\\Omkar\\.gemini\\antigravity-ide\\brain\\20443c78-30e1-40dc-87be-4de20968da24\\my_appointments_redesign.png';
            fs.copyFileSync(outPath, artifactDest);
            console.log('Preview saved to:', outPath);
        }
    } finally {
        edge.kill();
        process.exit(0);
    }
}

run();
