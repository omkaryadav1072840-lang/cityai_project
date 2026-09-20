const { spawn } = require('child_process');
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function main() {
    const proc = spawn(edgePath, [
        '--headless',
        '--remote-debugging-port=9239',
        '--window-size=1440,1100',
        '--disable-gpu',
        'http://localhost:5000/pages/parking/parking.html'
    ]);

    setTimeout(async () => {
        try {
            const tabs = await (await fetch('http://127.0.0.1:9239/json')).json();
            const tab = tabs.find(t => t.url.includes('parking.html'));
            const ws = new WebSocket(tab.webSocketDebuggerUrl);
            let id = 1;
            const send = (m, p={}) => new Promise((resolve, reject) => {
                const i = id++;
                ws.send(JSON.stringify({ id: i, method: m, params: p }));
                const h = (e) => {
                    const d = JSON.parse(e.data);
                    if (d.id === i) {
                        ws.removeEventListener('message', h);
                        if (d.error) reject(d.error);
                        else resolve(d.result);
                    }
                };
                ws.addEventListener('message', h);
            });

            ws.onopen = async () => {
                await send('Page.enable');
                await new Promise(r => setTimeout(r, 1000));
                
                // Login
                await send('Runtime.evaluate', {
                    expression: `
                        (async () => {
                            const res = await fetch('/api/staff-login', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ staffId: 'PRK001', password: '123456' })
                            });
                            const data = await res.json();
                            localStorage.setItem('smartCityJWT', data.token);
                            localStorage.setItem('smartcity_token', data.token);
                            localStorage.setItem('smartCityCurrentUser', JSON.stringify(data.user));
                            localStorage.setItem('smartcity_user', JSON.stringify(data.user));
                            localStorage.setItem('parkingStaffAuth', 'true');
                            if (window.applyRoleUI) window.applyRoleUI();
                            window.switchParkingLayer('staff');
                            await new Promise(r => setTimeout(r, 500));
                            
                            // Now test openOverstayCollectModal
                            let err = null;
                            try {
                                window.openOverstayCollectModal('BKG-OVR-02');
                            } catch (e) {
                                err = e.message;
                            }
                            
                            const modal = document.getElementById('overstayCollectModal');
                            return {
                                error: err,
                                modalFound: !!modal,
                                styleDisplay: modal ? modal.style.display : null,
                                computedDisplay: modal ? window.getComputedStyle(modal).display : null,
                                zIndex: modal ? window.getComputedStyle(modal).zIndex : null
                            };
                        })()
                    `,
                    awaitPromise: true,
                    returnByValue: true
                }).then(async res => {
                    console.log("Evaluation Result:", JSON.stringify(res));
                    const fs = require('fs');
                    const path = require('path');
                    const snap = await send('Page.captureScreenshot', { format: 'png' });
                    fs.writeFileSync(path.join('C:/Users/Omkar/.gemini/antigravity-ide/brain/60c09161-1bdb-4057-88ca-9bb05577584c', 'parking_fine_modal_view.png'), Buffer.from(snap.data, 'base64'));
                    console.log("Saved parking_fine_modal_view.png directly!");
                });

                ws.close();
                proc.kill();
                process.exit(0);
            };
        } catch (e) {
            console.error(e);
            proc.kill();
            process.exit(1);
        }
    }, 2000);
}
main();
