const { spawn } = require('child_process');
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function main() {
    const proc = spawn(edgePath, [
        '--headless',
        '--remote-debugging-port=9240',
        '--window-size=1440,1100',
        '--disable-gpu',
        'http://localhost:5000/pages/parking/parking.html'
    ]);

    setTimeout(async () => {
        try {
            const tabs = await (await fetch('http://127.0.0.1:9240/json')).json();
            const tab = tabs.find(t => t.url.includes('parking.html'));
            const ws = new WebSocket(tab.webSocketDebuggerUrl);
            let id = 1;
            const send = (m, p={}) => new Promise(res => {
                const i = id++;
                ws.send(JSON.stringify({ id: i, method: m, params: p }));
                const h = (e) => {
                    const d = JSON.parse(e.data);
                    if (d.id === i) { ws.removeEventListener('message', h); res(d.result); }
                };
                ws.addEventListener('message', h);
            });

            ws.onopen = async () => {
                await send('Page.enable');
                await new Promise(r => setTimeout(r, 1200));

                const check = await send('Runtime.evaluate', {
                    expression: `
                        (() => {
                            window.openOverstayCollectModal('BKG-OVR-02');
                            const m = document.getElementById('overstayCollectModal');
                            const rect = m.getBoundingClientRect();
                            const cs = window.getComputedStyle(m);
                            return {
                                rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
                                display: cs.display,
                                visibility: cs.visibility,
                                opacity: cs.opacity,
                                zIndex: cs.zIndex,
                                position: cs.position,
                                parentTag: m.parentElement ? m.parentElement.tagName : null,
                                parentId: m.parentElement ? m.parentElement.id : null,
                                parentClass: m.parentElement ? m.parentElement.className : null
                            };
                        })()
                    `,
                    returnByValue: true
                });
                console.log("Modal geometry & style:", JSON.stringify(check.result.value, null, 2));

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
