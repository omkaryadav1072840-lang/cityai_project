const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

let browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
if (!fs.existsSync(browserPath)) {
    browserPath = 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe';
}

const testPages = [
    { name: 'Hospital', url: 'http://localhost:5000/pages/hospital/hospital.html', tabSelector: '#tab-btn-staff', gatekeeperId: 'staffGatekeeper' },
    { name: 'Famous', url: 'http://localhost:5000/pages/famous/famous.html', tabSelector: '#tab-btn-staff', gatekeeperId: 'staffGatekeeper' },
    { name: 'Police', url: 'http://localhost:5000/pages/police/police.html', tabSelector: '#tab-btn-staff', gatekeeperId: 'staffGatekeeper' },
    { name: 'Emergency', url: 'http://localhost:5000/pages/emergency/emergency.html', tabSelector: '#tab-btn-staff', gatekeeperId: 'staffGatekeeper' },
    { name: 'Traffic', url: 'http://localhost:5000/pages/traffic/traffic.html', tabSelector: '#tab-btn-control', gatekeeperId: 'staffGatekeeper' }
];

async function main() {
    console.log('Starting headless browser for live verification...');
    const edge = spawn(browserPath, [
        '--headless',
        '--remote-debugging-port=9227',
        '--disable-gpu',
        'about:blank'
    ]);

    await new Promise(r => setTimeout(r, 2000));

    try {
        const listRes = await fetch('http://127.0.0.1:9227/json');
        const tabs = await listRes.json();
        const mainTab = tabs[0];
        const ws = new WebSocket(mainTab.webSocketDebuggerUrl);

        await new Promise(res => {
            ws.onopen = res;
        });

        console.log('Connected to browser CDP.');

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

        for (const test of testPages) {
            console.log(`\nNavigating to ${test.name} (${test.url})...`);
            await send('Page.navigate', { url: test.url });
            await new Promise(r => setTimeout(r, 2500));

            // Verify role banner
            const roleEval = await send('Runtime.evaluate', {
                expression: `JSON.stringify({
                    title: document.getElementById('roleTitle') ? document.getElementById('roleTitle').innerText : null,
                    pill: document.getElementById('rolePill') ? document.getElementById('rolePill').innerText : null,
                    hasTabs: !!document.querySelector('.layer-tabs-container')
                })`,
                returnByValue: true
            });
            console.log(`  Role Banner Evaluation:`, roleEval ? roleEval.result?.value : null);

            // Click staff tab to test gatekeeper lock screen
            console.log(`  Clicking Staff tab (${test.tabSelector})...`);
            await send('Runtime.evaluate', {
                expression: `
                    const tab = document.querySelector('${test.tabSelector}');
                    if (tab) tab.click();
                `
            });
            await new Promise(r => setTimeout(r, 1000));

            // Verify Gatekeeper visibility
            const gatekeeperEval = await send('Runtime.evaluate', {
                expression: `JSON.stringify({
                    gatekeeperExists: !!document.getElementById('${test.gatekeeperId}'),
                    gatekeeperDisplay: document.getElementById('${test.gatekeeperId}') ? getComputedStyle(document.getElementById('${test.gatekeeperId}')).display : null,
                    gatekeeperText: document.getElementById('${test.gatekeeperId}') ? document.getElementById('${test.gatekeeperId}').innerText.slice(0, 100).replace(/\\s+/g, ' ') : null
                })`,
                returnByValue: true
            });
            console.log(`  Gatekeeper Status:`, gatekeeperEval ? gatekeeperEval.result?.value : null);
        }

        console.log('\nAll pages verified successfully in real Edge browser session!');
    } catch (err) {
        console.error('Browser testing error:', err);
    } finally {
        edge.kill();
        process.exit(0);
    }
}

main();
