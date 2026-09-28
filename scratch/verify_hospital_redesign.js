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
    '--remote-debugging-port=9229',
    '--disable-gpu',
    '--window-size=1440,1100',
    'http://localhost:5000/pages/hospital/hospital.html'
]);

async function run() {
    await new Promise(r => setTimeout(r, 2500));
    try {
        const listRes = await fetch('http://127.0.0.1:9229/json');
        const tabs = await listRes.json();
        const mainTab = tabs.find(t => t.url && (t.url.includes('hospital') || t.url.includes('5000'))) || tabs.find(t => t.type === 'page') || tabs[0];
        console.log('Attaching to tab:', mainTab.url);

        const ws = new WebSocket(mainTab.webSocketDebuggerUrl);

        ws.onopen = () => {
            ws.send(JSON.stringify({ id: 1, method: 'Page.enable' }));
            ws.send(JSON.stringify({ id: 2, method: 'Runtime.enable' }));

            setTimeout(() => {
                // Scroll down to services
                ws.send(JSON.stringify({
                    id: 10,
                    method: 'Runtime.evaluate',
                    params: {
                        expression: `
                            const el = document.querySelector('.services-overview-section') || document.querySelector('.service-grid');
                            if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
                            ({
                                title: document.title,
                                cardsCount: document.querySelectorAll('.service-grid .service-card').length,
                                firstCardTitle: document.querySelector('.service-card h3') ? document.querySelector('.service-card h3').innerText : '',
                                firstCardChip: document.querySelector('.service-status-chip') ? document.querySelector('.service-status-chip').innerText : '',
                                pillsCount: document.querySelectorAll('.cat-pill').length,
                                fontFamily: getComputedStyle(document.body).fontFamily
                            })
                        `,
                        returnByValue: true
                    }
                }));

                // Test filter pill click
                ws.send(JSON.stringify({
                    id: 15,
                    method: 'Runtime.evaluate',
                    params: {
                        expression: `
                            const docPill = Array.from(document.querySelectorAll('.cat-pill')).find(p => p.innerText.includes('Doctors'));
                            if (docPill) docPill.click();
                            ({
                                activePill: document.querySelector('.cat-pill.active') ? document.querySelector('.cat-pill.active').innerText : '',
                                visibleCards: Array.from(document.querySelectorAll('.service-grid .service-card')).filter(c => c.style.display !== 'none').map(c => c.querySelector('h3').innerText)
                            })
                        `,
                        returnByValue: true
                    }
                }));

                // Take screenshot after filter
                setTimeout(() => {
                    ws.send(JSON.stringify({
                        id: 20,
                        method: 'Page.captureScreenshot',
                        params: { format: 'png' }
                    }));
                }, 800);
            }, 2500);
        };

        ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.id === 10) {
                console.log('\n[HOSPITAL CARDS EVALUATION]:');
                console.log(JSON.stringify(msg.result?.result?.value, null, 2));
            }
            if (msg.id === 15) {
                console.log('\n[FILTER PILL CLICK RESULT]:');
                console.log(JSON.stringify(msg.result?.result?.value, null, 2));
            }
            if (msg.id === 20 && msg.result && msg.result.data) {
                const buffer = Buffer.from(msg.result.data, 'base64');
                const outPath = path.join(__dirname, 'hospital_redesign_screenshot.png');
                fs.writeFileSync(outPath, buffer);
                console.log(`\n[SUCCESS SCREENSHOT SAVED]: ${outPath} (${buffer.length} bytes)`);

                setTimeout(() => {
                    ws.close();
                    proc.kill();
                    process.exit(0);
                }, 500);
            }
        };
    } catch (e) {
        console.error('Error:', e);
        proc.kill();
        process.exit(1);
    }
}

run();
