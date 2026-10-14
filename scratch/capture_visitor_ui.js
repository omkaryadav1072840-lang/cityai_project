const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const jwt = require('../backend/node_modules/jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'smartcity_super_secret_jwt_key_gorakhpur_2026';
const staffToken = jwt.sign(
    { id: 'WTR-STF-01', staffId: 'WTR-STAFF', name: 'Suresh Gupta (Pipeline Eng)', role: 'staff', department: 'water', email: 'waterstaff@smartcity.gov' },
    JWT_SECRET,
    { expiresIn: '7d' }
);

const artifactDir = 'C:\\Users\\Omkar\\.gemini\\antigravity-ide\\brain\\d4941e1f-2e90-4c2f-b284-17e071de4e5b';

async function captureStaffLive() {
    console.log("🌐 Launching Edge to capture Staff Live Tables...");

    const uniqueUrl = `http://localhost:5000/pages/water/water.html?nocache=${Date.now()}`;
    const proc = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
        '--headless',
        '--remote-debugging-port=9273',
        '--window-size=1560,1200',
        '--disable-gpu',
        uniqueUrl
    ]);

    await new Promise(r => setTimeout(r, 2500));

    try {
        const tabs = await (await fetch('http://127.0.0.1:9273/json')).json();
        const tab = tabs.find(t => t.url && t.url.includes('water.html'));
        if (!tab) throw new Error("water.html tab not found!");

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

        await send('Page.enable');
        await send('Runtime.enable');

        await send('Runtime.evaluate', {
            expression: `
                (async () => {
                    const u = {
                        id: 'WTR-STF-01',
                        name: 'Suresh Gupta (Pipeline Eng)',
                        role: 'staff',
                        department: 'water',
                        staffId: 'WTR-STAFF'
                    };
                    const token = ${JSON.stringify(staffToken)};
                    if (window.SmartCityAuth && typeof window.SmartCityAuth.setSession === 'function') {
                        window.SmartCityAuth.setSession(token, u);
                    } else {
                        localStorage.setItem('smartCityCurrentUser', JSON.stringify(u));
                        localStorage.setItem('smartCityJWT', token);
                    }

                    if (typeof switchWaterLayer === 'function') switchWaterLayer('staff');

                    const gatekeeper = document.getElementById("staffGatekeeper");
                    const mainOps = document.getElementById("staffOperationsMain");
                    if (gatekeeper) gatekeeper.style.display = "none";
                    if (mainOps) mainOps.style.display = "block";

                    const compSec = document.querySelector('#staffComplaintsTable');
                    if (compSec) {
                        const rect = compSec.closest('.section-card').getBoundingClientRect();
                        window.scrollTo(0, rect.top + window.pageYOffset - 90);
                    }
                })()
            `,
            awaitPromise: true
        });

        await new Promise(r => setTimeout(r, 2000));
        console.log("📸 Capturing Staff Live Tables Screenshot...");
        const shot = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(artifactDir, 'water_staff_operations_live.png'), Buffer.from(shot.data, 'base64'));

        ws.close();
        proc.kill();
        console.log("🎉 SUCCESS!");
    } catch (err) {
        console.error(err);
        try { proc.kill(); } catch (_) {}
    }
}

captureStaffLive();
