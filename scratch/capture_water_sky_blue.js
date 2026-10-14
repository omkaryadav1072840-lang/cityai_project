const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
if (!fs.existsSync(edgePath)) {
    edgePath = 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe';
}

const artifactDir = 'C:\\Users\\Omkar\\.gemini\\antigravity-ide\\brain\\d4941e1f-2e90-4c2f-b284-17e071de4e5b';
if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
}

async function captureWaterSkyBlue() {
    console.log("🌐 Launching Edge CDP to capture Water sky blue theme screenshots...");

    const uniqueUrl = `http://localhost:5000/pages/water/water.html?nocache=${Date.now()}`;
    const proc = spawn(edgePath, [
        '--headless',
        '--remote-debugging-port=9255',
        '--window-size=1500,1050',
        '--disable-gpu',
        uniqueUrl
    ]);

    await new Promise(r => setTimeout(r, 2500));

    try {
        const listRes = await fetch('http://127.0.0.1:9255/json');
        const tabs = await listRes.json();
        const tab = tabs.find(t => t.url && t.url.includes('water.html'));

        if (!tab) {
            throw new Error("Could not find water.html browser tab");
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

        await new Promise(res => { ws.onopen = res; });
        console.log("Connected to browser CDP session on port 9255.");

        await send('Page.enable');
        await send('Runtime.enable');
        await send('Network.enable');
        await send('Network.setCacheDisabled', { cacheDisabled: true });

        // Set login auth in localStorage to admin
        await send('Runtime.evaluate', {
            expression: `
                (() => {
                    localStorage.setItem('auth_token', 'admin-token-water-demo');
                    localStorage.setItem('user', JSON.stringify({
                        id: 1,
                        name: 'Omkar Yadav (Water Director)',
                        role: 'admin',
                        department: 'water'
                    }));
                    if (typeof window.checkUserRoleAndPermissions === 'function') {
                        window.checkUserRoleAndPermissions();
                    }
                })()
            `
        });

        await new Promise(r => setTimeout(r, 2000));

        // 1. Screenshot Top KPI & Supply section
        console.log("📸 Capturing Top KPI & Supply section...");
        await send('Runtime.evaluate', { expression: `window.scrollTo(0, 0);` });
        await new Promise(r => setTimeout(r, 600));
        const snap1 = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(artifactDir, 'water_sky_blue_kpis.png'), Buffer.from(snap1.data, 'base64'));

        // 2. Scroll to Hydraulic AI Controller & screenshot
        console.log("📸 Capturing Hydraulic SCADA AI Controller...");
        await send('Runtime.evaluate', {
            expression: `
                (() => {
                    const el = document.getElementById('hydraulicAiPanel') || document.querySelector('.hydraulic-ai-panel');
                    if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
                })()
            `
        });
        await new Promise(r => setTimeout(r, 1000));
        const snap2 = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(artifactDir, 'water_sky_blue_hydraulic_ai.png'), Buffer.from(snap2.data, 'base64'));

        // 3. Scroll to Map section & screenshot 2D map with Workspace Toolbar
        console.log("📸 Capturing 2D Map section and Route builder deck...");
        await send('Runtime.evaluate', {
            expression: `
                (() => {
                    const el = document.getElementById('waterMapSection') || document.getElementById('waterMap');
                    if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
                    if (window.waterMap) window.waterMap.invalidateSize();
                })()
            `
        });
        await new Promise(r => setTimeout(r, 1200));
        const snap3 = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(artifactDir, 'water_sky_blue_2d_map.png'), Buffer.from(snap3.data, 'base64'));

        // 4. Scroll to Predictive Water & Sewage Forecasting section
        console.log("📸 Capturing Predictive Forecasting section...");
        await send('Runtime.evaluate', {
            expression: `
                (() => {
                    const el = document.getElementById('predictiveForecastSection') || document.querySelector('.predictive-grid');
                    if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
                })()
            `
        });
        await new Promise(r => setTimeout(r, 1000));
        const snap4 = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(artifactDir, 'water_sky_blue_predictive.png'), Buffer.from(snap4.data, 'base64'));

        // 5. Switch to 3D Digital Twin and capture 3D view
        console.log("📸 Switching to 3D Digital Twin and capturing view...");
        await send('Runtime.evaluate', {
            expression: `
                (() => {
                    const btn3D = document.getElementById('btnView3D');
                    if (btn3D) btn3D.click();
                    else if (typeof window.toggleWaterDimension === 'function') window.toggleWaterDimension('3d');
                    const mapSec = document.getElementById('waterMapSection') || document.getElementById('water3DContainer');
                    if (mapSec) mapSec.scrollIntoView({ behavior: 'instant', block: 'center' });
                })()
            `
        });
        await new Promise(r => setTimeout(r, 2200));
        const snap5 = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(artifactDir, 'water_sky_blue_3d_twin.png'), Buffer.from(snap5.data, 'base64'));

        console.log("🎉 ALL SCREENSHOTS CAPTURED SUCCESSFULLY!");

        ws.close();
        proc.kill();
    } catch (err) {
        console.error("CDP Capture Error:", err);
        proc.kill();
    }
}

captureWaterSkyBlue();
