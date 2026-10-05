const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

let browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
if (!fs.existsSync(browserPath)) {
    browserPath = 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe';
}

async function run() {
    const edge = spawn(browserPath, [
        '--headless',
        '--remote-debugging-port=9245',
        '--disable-gpu',
        '--window-size=1380,1050',
        'about:blank'
    ]);

    await new Promise(r => setTimeout(r, 2000));

    try {
        const listRes = await fetch('http://127.0.0.1:9245/json');
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

        ws.addEventListener('message', (evt) => {
            const data = JSON.parse(evt.data);
            if (data.method === 'Runtime.consoleAPICalled') {
                console.log('BROWSER CONSOLE:', data.params.type, data.params.args.map(a => a.value || a.description).join(' '));
            }
            if (data.method === 'Runtime.exceptionThrown') {
                console.error('BROWSER EXCEPTION:', data.params.exceptionDetails.text, data.params.exceptionDetails.exception?.description);
            }
        });

        await send('Page.enable');
        await send('Runtime.enable');

        console.log('Navigating to hospital.html...');
        await send('Page.navigate', { url: 'http://localhost:3000/pages/hospital/hospital.html' });
        await new Promise(r => setTimeout(r, 5000));

    } finally {
        edge.kill();
        process.exit(0);
    }
}

run();
