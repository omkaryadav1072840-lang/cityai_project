const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
if (!fs.existsSync(edgePath)) {
    edgePath = 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe';
}

const artifactDir = 'C:\\Users\\Omkar\\.gemini\\antigravity-ide\\brain\\d4941e1f-2e90-4c2f-b284-17e071de4e5b';

async function captureZoneTelemetry() {
    console.log("🌐 Launching Edge to capture Zone-Wise Pipeline Telemetry...");

    const uniqueUrl = `http://localhost:5000/pages/water/water.html?nocache=${Date.now()}`;
    const proc = spawn(edgePath, [
        '--headless',
        '--remote-debugging-port=9258',
        '--window-size=1500,1100',
        '--disable-gpu',
        uniqueUrl
    ]);

    await new Promise(r => setTimeout(r, 2500));

    try {
        const listRes = await fetch('http://127.0.0.1:9258/json');
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
        console.log("Connected to browser CDP session on port 9258.");

        await send('Page.enable');
        await send('Runtime.enable');
        await send('DOM.enable');

        // Set Auth keys and switch to Layer 3 (Admin)
        const initRes = await send('Runtime.evaluate', {
            expression: `
                (() => {
                    const u = {
                        id: 1,
                        name: 'Omkar Yadav (Water Director)',
                        role: 'admin',
                        department: 'water',
                        staffId: 'WTR-ADMIN-01'
                    };
                    const dummyJwt = 'dummy.' + btoa(JSON.stringify({ id: 1, role: 'admin', exp: Math.floor(Date.now()/1000) + 86400 })) + '.dummy';
                    localStorage.setItem('smartCityCurrentUser', JSON.stringify(u));
                    localStorage.setItem('currentUser', JSON.stringify(u));
                    localStorage.setItem('user', JSON.stringify(u));
                    localStorage.setItem('smartCityJWT', dummyJwt);
                    localStorage.setItem('auth_token', dummyJwt);
                    localStorage.setItem('token', dummyJwt);

                    if (typeof switchWaterLayer === 'function') {
                        switchWaterLayer('admin');
                    }
                    const sec = document.getElementById("pipelineTelemetrySection");
                    const adminMain = document.getElementById("adminAssetsMain");
                    const adminGatekeeper = document.getElementById("adminGatekeeper");

                    if (adminGatekeeper) adminGatekeeper.style.display = 'none';
                    if (adminMain) adminMain.style.display = 'block';

                    if (sec) {
                        const rect = sec.getBoundingClientRect();
                        window.scrollTo(0, rect.top + window.pageYOffset - 10);
                        return { found: true, top: rect.top + window.pageYOffset, y: window.scrollY };
                    }
                    return { found: false };
                })()
            `,
            returnByValue: true
        });
        console.log("Init & scroll result:", initRes.result.value);

        await new Promise(r => setTimeout(r, 1500));

        // Capture All Zones View (viewport screenshot)
        console.log("📸 Capturing Zone-Divided Telemetry Table (All Zones)...");
        const shotAll = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(artifactDir, 'water_zone_telemetry_all.png'), Buffer.from(shotAll.data, 'base64'));

        // Click on Mohaddipur / University zone tab
        console.log("🔘 Clicking 'Mohaddipur / University' Zone Tab...");
        await send('Runtime.evaluate', {
            expression: `
                (() => {
                    const btns = Array.from(document.querySelectorAll(".zone-filter-btn"));
                    const targetBtn = btns.find(b => b.textContent.includes("Mohaddipur") || b.textContent.includes("University"));
                    if (targetBtn) {
                        targetBtn.click();
                    }
                    const sec = document.getElementById("pipelineTelemetrySection");
                    if (sec) {
                        const rect = sec.getBoundingClientRect();
                        window.scrollTo(0, rect.top + window.pageYOffset - 10);
                    }
                })()
            `
        });
        await new Promise(r => setTimeout(r, 1200));

        // Capture Filtered Zone View
        console.log("📸 Capturing Filtered Zone View...");
        const shotFiltered = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(artifactDir, 'water_zone_telemetry_filtered.png'), Buffer.from(shotFiltered.data, 'base64'));

        ws.close();
        proc.kill();
        console.log("🎉 CAPTURED ZONE TELEMETRY SCREENSHOTS SUCCESSFULLY!");
    } catch (err) {
        console.error("Error during zone capture:", err);
        try { proc.kill(); } catch (_) {}
    }
}

captureZoneTelemetry();
