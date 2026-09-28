const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

let browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
if (!fs.existsSync(browserPath)) {
    browserPath = 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe';
}

console.log('Using browser binary:', browserPath);

const proc = spawn(browserPath, [
    '--headless',
    '--remote-debugging-port=9226',
    '--disable-gpu',
    'http://localhost:5000/'
]);

async function run() {
    await new Promise(r => setTimeout(r, 2500));
    try {
        const listRes = await fetch('http://127.0.0.1:9226/json');
        const tabs = await listRes.json();
        console.log('Available tabs:', tabs.map(t => ({ title: t.title, url: t.url })));

        const mainTab = tabs.find(t => t.url && (t.url.includes('5000') || t.url.includes('localhost'))) || tabs[0];
        console.log('Attaching to tab:', mainTab.url);

        const ws = new WebSocket(mainTab.webSocketDebuggerUrl);

        ws.onopen = () => {
            ws.send(JSON.stringify({ id: 1, method: 'Page.enable' }));
            ws.send(JSON.stringify({ id: 2, method: 'Runtime.enable' }));
            
            setTimeout(() => {
                // Inspect feature links
                ws.send(JSON.stringify({
                    id: 10,
                    method: 'Runtime.evaluate',
                    params: {
                        expression: `
                            Array.from(document.querySelectorAll('.features .feature')).map(el => ({
                                id: el.id,
                                text: el.innerText.trim().replace(/\\s+/g, ' '),
                                href: el.getAttribute('href'),
                                borderRadius: getComputedStyle(el).borderRadius,
                                backgroundColor: getComputedStyle(el).backgroundColor
                            }))
                        `,
                        returnByValue: true
                    }
                }));

                // Capture screenshot
                ws.send(JSON.stringify({
                    id: 20,
                    method: 'Page.captureScreenshot',
                    params: { format: 'png' }
                }));
            }, 1500);
        };

        ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.id === 10) {
                console.log('\n[FEATURE CARDS AUDIT]:');
                console.log(JSON.stringify(msg.result.result.value, null, 2));
            }
            if (msg.id === 20 && msg.result && msg.result.data) {
                const buffer = Buffer.from(msg.result.data, 'base64');
                const outPath = path.join(__dirname, 'dashboard_screenshot.png');
                fs.writeFileSync(outPath, buffer);
                console.log(`\n[SCREENSHOT SAVED]: ${outPath} (${buffer.length} bytes)`);

                // Navigate to traffic page to test it
                console.log('\nTesting navigation to Traffic page...');
                ws.send(JSON.stringify({
                    id: 30,
                    method: 'Page.navigate',
                    params: { url: 'http://localhost:5000/pages/traffic/traffic.html' }
                }));

                setTimeout(() => {
                    ws.send(JSON.stringify({
                        id: 40,
                        method: 'Runtime.evaluate',
                        params: {
                            expression: `
                                ({
                                    title: document.title,
                                    hasMap: !!document.getElementById('traffic-ol-map'),
                                    camerasCount: typeof allCameras !== 'undefined' ? allCameras.length : 0,
                                    junctionsCount: typeof allJunctions !== 'undefined' ? allJunctions.length : 0,
                                    hasCameraModal: !!document.getElementById('modal-camera'),
                                    hasJunctionModal: !!document.getElementById('modal-junction'),
                                    hasIncidentModal: !!document.getElementById('modal-incident')
                                })
                            `,
                            returnByValue: true
                        }
                    }));
                }, 3000);
            }
            if (msg.id === 40) {
                console.log('\n[TRAFFIC PAGE EVALUATION]:');
                console.log(JSON.stringify(msg.result.result.value, null, 2));
                setTimeout(() => {
                    ws.close();
                    proc.kill();
                    process.exit(0);
                }, 500);
            }
            if (msg.method === 'Runtime.exceptionThrown') {
                console.error('[BROWSER EXCEPTION]', msg.params.exceptionDetails.text);
            }
        };

        ws.onerror = (err) => {
            console.error('WebSocket Error:', err);
            proc.kill();
            process.exit(1);
        };
    } catch (e) {
        console.error('Run Error:', e);
        proc.kill();
        process.exit(1);
    }
}

run();
