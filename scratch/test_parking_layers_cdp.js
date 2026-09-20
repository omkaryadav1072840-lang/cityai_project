const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const artifactDir = 'C:\\Users\\Omkar\\.gemini\\antigravity-ide\\brain\\60c09161-1bdb-4057-88ca-9bb05577584c';

async function main() {
    console.log("🚀 Launching Headless Edge to test updated light theme & fine collection...");
    const proc = spawn(edgePath, [
        '--headless',
        '--remote-debugging-port=9237',
        '--window-size=1440,1100',
        '--disable-gpu',
        'http://localhost:5000/pages/parking/parking.html'
    ]);

    setTimeout(async () => {
        try {
            const tabs = await (await fetch('http://127.0.0.1:9237/json')).json();
            const tab = tabs.find(t => t.url.includes('parking.html'));
            if (!tab) {
                console.error("Parking tab not found:", tabs);
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
                console.log("🟢 Connected to CDP on port 9237.");
                await send('Page.enable');

                // 1. Citizen Layer View (Light Theme)
                console.log("📸 Capturing Citizen Layer (Light Theme)...");
                await new Promise(r => setTimeout(r, 1500));
                await send('Runtime.evaluate', { expression: `window.scrollTo(0, 380);` });
                await new Promise(r => setTimeout(r, 400));

                const snap1 = await send('Page.captureScreenshot', { format: 'png' });
                fs.writeFileSync(path.join(artifactDir, 'parking_citizen_layer_view.png'), Buffer.from(snap1.data, 'base64'));
                console.log("Saved parking_citizen_layer_view.png");

                // 2. Gatekeeper View (Light Theme)
                console.log("🔒 Checking Gatekeeper on Layer 2 (Light Theme)...");
                await send('Runtime.evaluate', { expression: `window.switchParkingLayer('staff'); window.scrollTo(0, 380);` });
                await new Promise(r => setTimeout(r, 600));

                const snapGate = await send('Page.captureScreenshot', { format: 'png' });
                fs.writeFileSync(path.join(artifactDir, 'parking_gatekeeper_view.png'), Buffer.from(snapGate.data, 'base64'));
                console.log("Saved parking_gatekeeper_view.png");

                // 3. Login as Parking Attendant Staff (PRK001)
                console.log("🔑 Logging in as Parking Attendant Staff (PRK001)...");
                await send('Runtime.evaluate', {
                    expression: `
                        (async () => {
                            const res = await fetch('/api/staff-login', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ staffId: 'PRK001', password: '123456' })
                            });
                            const data = await res.json();
                            if (data.token) {
                                localStorage.setItem('smartCityJWT', data.token);
                                localStorage.setItem('smartcity_token', data.token);
                                localStorage.setItem('smartCityCurrentUser', JSON.stringify(data.user));
                                localStorage.setItem('smartcity_user', JSON.stringify(data.user));
                                localStorage.setItem('parkingStaffAuth', 'true');
                                if (window.applyRoleUI) window.applyRoleUI();
                                window.switchParkingLayer('staff');
                                return data.user;
                            }
                            return null;
                        })()
                    `,
                    awaitPromise: true
                });

                await new Promise(r => setTimeout(r, 1500));
                await send('Runtime.evaluate', { expression: `window.scrollTo(0, 950);` });
                await new Promise(r => setTimeout(r, 600));

                // 4. Capture Staff Layer with Shift Drawer, Bay Override, and Overstay Queue
                console.log("📸 Capturing Staff Operations Layer (Shift Drawer, Bay Override, Overstays)...");
                const snap2 = await send('Page.captureScreenshot', { format: 'png' });
                fs.writeFileSync(path.join(artifactDir, 'parking_staff_layer_view.png'), Buffer.from(snap2.data, 'base64'));
                console.log("Saved parking_staff_layer_view.png");

                // 5. Open Fine Payment Modal for BKG-OVR-02
                console.log("💵 Opening Fine Payment Modal for BKG-OVR-02...");
                await send('Runtime.evaluate', { expression: `window.openOverstayCollectModal('BKG-OVR-02');` });
                await new Promise(r => setTimeout(r, 800));

                const snapModal = await send('Page.captureScreenshot', { format: 'png' });
                fs.writeFileSync(path.join(artifactDir, 'parking_fine_modal_view.png'), Buffer.from(snapModal.data, 'base64'));
                console.log("Saved parking_fine_modal_view.png");

                // 6. Confirm Fine Payment & Capture Printable Municipal Receipt
                console.log("🧾 Confirming fine payment in MySQL & generating official receipt...");
                await send('Runtime.evaluate', { expression: `window.confirmOverstayFinePayment();` });
                await new Promise(r => setTimeout(r, 1500));

                const snapRcpt = await send('Page.captureScreenshot', { format: 'png' });
                fs.writeFileSync(path.join(artifactDir, 'parking_fine_receipt_view.png'), Buffer.from(snapRcpt.data, 'base64'));
                console.log("Saved parking_fine_receipt_view.png");

                // Close modal
                await send('Runtime.evaluate', { expression: `window.closeOverstayCollectModal();` });
                await new Promise(r => setTimeout(r, 400));

                // 7. Switch to Admin Layer
                console.log("📸 Switching to Admin & ICCC Asset Management Layer...");
                await send('Runtime.evaluate', { expression: `window.switchParkingLayer('admin'); window.scrollTo(0, 420);` });
                await new Promise(r => setTimeout(r, 1200));

                const snap3 = await send('Page.captureScreenshot', { format: 'png' });
                fs.writeFileSync(path.join(artifactDir, 'parking_admin_layer_view.png'), Buffer.from(snap3.data, 'base64'));
                console.log("Saved parking_admin_layer_view.png");

                console.log("🎉 All Parking tests and updated screenshots captured successfully!");
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
