const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const jwt = require('../backend/node_modules/jsonwebtoken');

let edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
if (!fs.existsSync(edgePath)) {
    edgePath = 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe';
}

const artifactDir = 'C:\\Users\\Omkar\\.gemini\\antigravity-ide\\brain\\d4941e1f-2e90-4c2f-b284-17e071de4e5b';
const JWT_SECRET = process.env.JWT_SECRET || 'smartcity_super_secret_jwt_key_gorakhpur_2026';

const adminToken = jwt.sign(
    { id: 'WTR-ADM-01', staffId: 'WTR-ADMIN', name: 'Omkar Yadav (Water Director)', role: 'admin', department: 'water', email: 'wateradmin@smartcity.gov' },
    JWT_SECRET,
    { expiresIn: '7d' }
);

async function captureExecutiveUI() {
    console.log("🌐 Launching Edge to capture Executive UI updates...");

    const uniqueUrl = `http://localhost:5000/pages/water/water.html?nocache=${Date.now()}`;
    const proc = spawn(edgePath, [
        '--headless',
        '--remote-debugging-port=9269',
        '--window-size=1600,1200',
        '--disable-gpu',
        uniqueUrl
    ]);

    await new Promise(r => setTimeout(r, 2500));

    try {
        const listRes = await fetch('http://127.0.0.1:9269/json');
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
        console.log("Connected to browser CDP session on port 9269.");

        await send('Page.enable');
        await send('Runtime.enable');
        await send('DOM.enable');

        // Setup real Water Admin JWT Session
        console.log("1️⃣ Focusing Workspace Bar & Route Builder Deck with clean offset...");
        await send('Runtime.evaluate', {
            expression: `
                (() => {
                    const u = {
                        id: 'WTR-ADM-01',
                        name: 'Omkar Yadav (Water Director)',
                        role: 'admin',
                        department: 'water',
                        staffId: 'WTR-ADMIN-01'
                    };
                    const token = ${JSON.stringify(adminToken)};
                    if (window.SmartCityAuth && typeof window.SmartCityAuth.setSession === 'function') {
                        window.SmartCityAuth.setSession(token, u);
                    } else {
                        localStorage.setItem('smartCityCurrentUser', JSON.stringify(u));
                        localStorage.setItem('currentUser', JSON.stringify(u));
                        localStorage.setItem('user', JSON.stringify(u));
                        localStorage.setItem('smartCityJWT', token);
                        localStorage.setItem('auth_token', token);
                        localStorage.setItem('token', token);
                    }

                    const wsBar = document.getElementById("waterWorkspacesBar");
                    if (wsBar) {
                        const rect = wsBar.getBoundingClientRect();
                        window.scrollTo(0, rect.top + window.pageYOffset - 120);
                    }
                })()
            `
        });

        await new Promise(r => setTimeout(r, 1200));

        console.log("📸 Capturing Workspace Toolbar & Route Builder Deck...");
        const shotDeck = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(artifactDir, 'water_professional_builder_deck.png'), Buffer.from(shotDeck.data, 'base64'));

        // Next: Switch to Staff / Operations layer & scroll to Specialized Work Orders Table
        console.log("2️⃣ Loading Specialized Water Work Orders via authenticated API...");
        await send('Runtime.evaluate', {
            expression: `
                (async () => {
                    if (typeof switchWaterLayer === 'function') {
                        switchWaterLayer('staff');
                    } else {
                        const staffLayer = document.getElementById("layer-staff-content");
                        if (staffLayer) staffLayer.style.display = "block";
                    }

                    if (typeof window.fetchWorkOrders === 'function') {
                        await window.fetchWorkOrders();
                    }

                    const woSec = document.getElementById("waterWorkOrdersSection");
                    if (woSec) {
                        const rect = woSec.getBoundingClientRect();
                        window.scrollTo(0, rect.top + window.pageYOffset - 120);
                    }
                })()
            `,
            awaitPromise: true
        });

        // Wait for rendering
        await new Promise(r => setTimeout(r, 2000));

        console.log("📸 Capturing Specialized Work Orders Table...");
        const shotWO = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(artifactDir, 'water_professional_work_orders.png'), Buffer.from(shotWO.data, 'base64'));

        ws.close();
        proc.kill();
        console.log("🎉 CAPTURED BOTH SCREENSHOTS WITH REAL DATA SUCCESSFULLY!");
    } catch (err) {
        console.error("Error during screenshot capture:", err);
        try { proc.kill(); } catch (_) {}
    }
}

captureExecutiveUI();
