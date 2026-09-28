const fs = require('fs');
const { spawn } = require('child_process');

let browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
if (!fs.existsSync(browserPath)) {
    browserPath = 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe';
}

async function run() {
    console.log('Starting headless browser...');
    const edge = spawn(browserPath, [
        '--headless',
        '--remote-debugging-port=9229',
        '--disable-gpu',
        '--window-size=1400,900',
        'about:blank'
    ]);

    await new Promise(r => setTimeout(r, 2000));

    try {
        const listRes = await fetch('http://127.0.0.1:9229/json');
        const tabs = await listRes.json();
        const mainTab = tabs[0];
        const ws = new WebSocket(mainTab.webSocketDebuggerUrl);

        await new Promise(res => { ws.onopen = res; });

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

        console.log('Navigating to traffic page...');
        await send('Page.navigate', { url: 'http://localhost:5000/pages/traffic/traffic.html' });
        await new Promise(r => setTimeout(r, 3000));

        // 1. Switch to control layer as guest (shows gatekeeper)
        console.log('Clicking Staff Layer tab as guest...');
        await send('Runtime.evaluate', {
            expression: `
                window.alert = () => {};
                switchLayer('control');
            `
        });
        await new Promise(r => setTimeout(r, 500));
        let shot = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('scratch/traffic_staff_gatekeeper.png', Buffer.from(shot.data, 'base64'));
        console.log('Saved scratch/traffic_staff_gatekeeper.png');

        // 2. Click 1-Click Login: Insp. Verma
        console.log('Triggering 1-Click Login for Staff...');
        await send('Runtime.evaluate', {
            expression: `
                (async () => {
                    const res = await fetch("/api/staff-login", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ staffId: "TR-VERMA", password: "verma123" })
                    });
                    const data = await res.json();
                    if (data.token) {
                        localStorage.setItem("smartCityJWT", data.token);
                        localStorage.setItem("smartCityCurrentUser", JSON.stringify(data.user));
                        initUserSession();
                        switchLayer("control");
                    }
                })();
            `
        });
        await new Promise(r => setTimeout(r, 1500));
        shot = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('scratch/traffic_staff_unlocked.png', Buffer.from(shot.data, 'base64'));
        console.log('Saved scratch/traffic_staff_unlocked.png');

        // 3. Switch to admin layer
        console.log('Switching to Admin Layer...');
        await send('Runtime.evaluate', {
            expression: `
                (async () => {
                    const res = await fetch("/api/staff-login", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ staffId: "TR-ADMIN", password: "admin123" })
                    });
                    const data = await res.json();
                    if (data.token) {
                        localStorage.setItem("smartCityJWT", data.token);
                        localStorage.setItem("smartCityCurrentUser", JSON.stringify(data.user));
                        initUserSession();
                        switchLayer("admin");
                    }
                })();
            `
        });
        await new Promise(r => setTimeout(r, 1500));
        shot = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('scratch/traffic_admin_unlocked.png', Buffer.from(shot.data, 'base64'));
        console.log('Saved scratch/traffic_admin_unlocked.png');

        ws.close();
    } catch (e) {
        console.error('Error:', e);
    } finally {
        edge.kill();
        process.exit(0);
    }
}

run();
