const fs = require('fs');
const { spawn } = require('child_process');

let browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
if (!fs.existsSync(browserPath)) {
    browserPath = 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe';
}

async function runBrowserTest() {
    console.log('Launching headless Edge for traffic verification...');
    const edge = spawn(browserPath, [
        '--headless',
        '--remote-debugging-port=9235',
        '--disable-gpu',
        'about:blank'
    ]);

    await new Promise(r => setTimeout(r, 2000));

    try {
        const listRes = await fetch('http://127.0.0.1:9235/json');
        const tabs = await listRes.json();
        const mainTab = tabs[0];
        const ws = new WebSocket(mainTab.webSocketDebuggerUrl);

        await new Promise(res => { ws.onopen = res; });
        console.log('Connected to Edge via CDP.');

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

        // Navigate to traffic page
        console.log('Navigating to http://localhost:5000/pages/traffic/traffic.html...');
        await send('Page.navigate', { url: 'http://localhost:5000/pages/traffic/traffic.html' });
        await new Promise(r => setTimeout(r, 2500));

        // Test 1: Switch to control tab as guest
        console.log('Testing Tab 2 (Staff Layer) as Guest...');
        let evalRes = await send('Runtime.evaluate', {
            expression: `(() => {
                switchLayer('control');
                const gate = document.getElementById('staffGatekeeper');
                const main = document.getElementById('staffOperationsMain');
                return {
                    gateDisplay: gate ? window.getComputedStyle(gate).display : null,
                    mainDisplay: main ? window.getComputedStyle(main).display : null
                };
            })()`,
            returnByValue: true
        });
        console.log('Staff layer state before login:', evalRes.result?.value);

        // Test 2: Trigger quickLoginTrafficStaff()
        console.log('Executing quickLoginTrafficStaff()...');
        evalRes = await send('Runtime.evaluate', {
            expression: `(async () => {
                await quickLoginTrafficStaff();
                const gate = document.getElementById('staffGatekeeper');
                const main = document.getElementById('staffOperationsMain');
                return {
                    gateDisplay: gate ? window.getComputedStyle(gate).display : null,
                    mainDisplay: main ? window.getComputedStyle(main).display : null,
                    currentUser: JSON.parse(localStorage.getItem('smartCityCurrentUser') || '{}')
                };
            })()`,
            awaitPromise: true,
            returnByValue: true
        });
        console.log('Staff layer state after 1-Click login:', evalRes.result?.value);

        await new Promise(r => setTimeout(r, 1000));
        const staffScreenshot = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('scratch/traffic_staff_layer.png', Buffer.from(staffScreenshot.data, 'base64'));
        console.log('✅ Saved screenshot to scratch/traffic_staff_layer.png');

        // Test 3: Trigger quickLoginTrafficAdmin() and switch to admin
        console.log('Executing quickLoginTrafficAdmin() and testing Tab 3...');
        evalRes = await send('Runtime.evaluate', {
            expression: `(async () => {
                await quickLoginTrafficAdmin();
                const gate = document.getElementById('adminGatekeeper');
                const main = document.getElementById('adminAssetsMain');
                return {
                    gateDisplay: gate ? window.getComputedStyle(gate).display : null,
                    mainDisplay: main ? window.getComputedStyle(main).display : null,
                    currentUser: JSON.parse(localStorage.getItem('smartCityCurrentUser') || '{}')
                };
            })()`,
            awaitPromise: true,
            returnByValue: true
        });
        console.log('Admin layer state after 1-Click login:', evalRes.result?.value);

        await new Promise(r => setTimeout(r, 1000));
        const adminScreenshot = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('scratch/traffic_admin_layer.png', Buffer.from(adminScreenshot.data, 'base64'));
        console.log('✅ Saved screenshot to scratch/traffic_admin_layer.png');

        ws.close();
    } catch (err) {
        console.error('Browser test error:', err);
    } finally {
        edge.kill();
        process.exit(0);
    }
}

runBrowserTest();
