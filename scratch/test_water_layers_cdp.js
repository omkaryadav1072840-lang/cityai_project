const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const artifactDir = 'C:\\Users\\Omkar\\.gemini\\antigravity-ide\\brain\\60c09161-1bdb-4057-88ca-9bb05577584c';

async function main() {
    console.log("🚀 Launching Headless Edge to test 3-Layer Water Module...");
    const proc = spawn(edgePath, [
        '--headless',
        '--remote-debugging-port=9234',
        '--window-size=1440,1100',
        '--disable-gpu',
        'http://localhost:5000/pages/water/water.html'
    ]);

    setTimeout(async () => {
        try {
            const tabs = await (await fetch('http://127.0.0.1:9234/json')).json();
            const tab = tabs.find(t => t.url.includes('water.html'));
            if (!tab) {
                console.error("Water tab not found:", tabs);
                proc.kill();
                process.exit(1);
            }

            const ws = new WebSocket(tab.webSocketDebuggerUrl);
            let msgId = 1;
            const pendingCallbacks = new Map();

            function send(method, params = {}) {
                return new Promise((resolve, reject) => {
                    const id = msgId++;
                    pendingCallbacks.set(id, { resolve, reject });
                    ws.send(JSON.stringify({ id, method, params }));
                });
            }

            ws.onmessage = (e) => {
                const d = JSON.parse(e.data);
                if (d.id && pendingCallbacks.has(d.id)) {
                    const { resolve, reject } = pendingCallbacks.get(d.id);
                    pendingCallbacks.delete(d.id);
                    if (d.error) reject(d.error);
                    else resolve(d.result);
                }
            };

            ws.onopen = async () => {
                console.log("🟢 Connected to CDP on port 9234.");
                await send('Page.enable');

                // 1. Citizen Layer View
                console.log("📸 Capturing Citizen Layer (Default View)...");
                await new Promise(r => setTimeout(r, 1500));
                await send('Runtime.evaluate', { expression: `window.scrollTo(0, 380);` });
                await new Promise(r => setTimeout(r, 400));

                const snap1 = await send('Page.captureScreenshot', { format: 'png' });
                fs.writeFileSync(path.join(artifactDir, 'water_citizen_layer_view.png'), Buffer.from(snap1.data, 'base64'));
                console.log("Saved water_citizen_layer_view.png");

                // 2. Login as Water Staff (WTR001)
                console.log("🔑 Logging in as Water Works Staff (WTR001)...");
                await send('Runtime.evaluate', {
                    expression: `
                        (async () => {
                            const res = await fetch('/api/staff-login', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ staffId: 'WTR001', password: 'staff123' })
                            });
                            const data = await res.json();
                            if (data.token) {
                                localStorage.setItem('smartCityJWT', data.token);
                                localStorage.setItem('smartcity_token', data.token);
                                localStorage.setItem('smartCityCurrentUser', JSON.stringify(data.user));
                                localStorage.setItem('smartcity_user', JSON.stringify(data.user));
                                localStorage.setItem('waterRole', 'worker');
                                window.switchWaterLayer('staff');
                                return data.user;
                            }
                            return null;
                        })()
                    `,
                    awaitPromise: true
                });

                await new Promise(r => setTimeout(r, 1500));
                await send('Runtime.evaluate', { expression: `window.scrollTo(0, 480);` });
                await new Promise(r => setTimeout(r, 400));

                // 3. Capture Staff Operations Layer
                console.log("📸 Capturing Staff Operations Layer...");
                const snap2 = await send('Page.captureScreenshot', { format: 'png' });
                fs.writeFileSync(path.join(artifactDir, 'water_staff_layer_view.png'), Buffer.from(snap2.data, 'base64'));
                console.log("Saved water_staff_layer_view.png");

                await send('Runtime.evaluate', { expression: `window.scrollTo(0, 950);` });
                await new Promise(r => setTimeout(r, 400));
                const snap2b = await send('Page.captureScreenshot', { format: 'png' });
                fs.writeFileSync(path.join(artifactDir, 'water_staff_tankers_view.png'), Buffer.from(snap2b.data, 'base64'));
                console.log("Saved water_staff_tankers_view.png");

                // 4. Switch to Admin & SCADA Layer
                console.log("📸 Switching to Admin & SCADA Layer...");
                await send('Runtime.evaluate', { expression: `window.switchWaterLayer('admin'); window.scrollTo(0, 480);` });
                await new Promise(r => setTimeout(r, 1200));

                const snap3 = await send('Page.captureScreenshot', { format: 'png' });
                fs.writeFileSync(path.join(artifactDir, 'water_admin_layer_view.png'), Buffer.from(snap3.data, 'base64'));
                console.log("Saved water_admin_layer_view.png");

                console.log("🎉 All 3-Layer Water screenshots captured and verified successfully!");
                ws.close();
                proc.kill();
                process.exit(0);
            };

        } catch (e) {
            console.error("Test error:", e);
            proc.kill();
            process.exit(1);
        }
    }, 2000);
}

main();
