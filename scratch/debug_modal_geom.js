const { spawn } = require('child_process');

const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless',
    '--remote-debugging-port=9253',
    '--disable-gpu',
    'about:blank'
]);

setTimeout(async () => {
    try {
        const list = await fetch('http://127.0.0.1:9253/json').then(r => r.json());
        const ws = new WebSocket(list[0].webSocketDebuggerUrl);
        await new Promise(r => ws.onopen = r);

        let id = 1;
        function send(m, p={}) {
            return new Promise(res => {
                const reqId = id++;
                const h = (e) => {
                    const d = JSON.parse(e.data);
                    if (d.id === reqId) {
                        ws.removeEventListener('message', h);
                        res(d.result);
                    }
                };
                ws.addEventListener('message', h);
                ws.send(JSON.stringify({ id: reqId, method: m, params: p }));
            });
        }

        await send('Page.enable');
        await send('Runtime.enable');
        await send('Page.navigate', { url: 'http://localhost:3000/pages/hospital/hospital.html#appointments' });
        await new Promise(r => setTimeout(r, 4000));

        const r = await send('Runtime.evaluate', {
            expression: `(() => {
                const el = document.querySelector(".appt-tab");
                const p = el ? el.parentElement : null;
                const prev = p ? p.previousElementSibling : null;
                return {
                    elRect: el ? el.getBoundingClientRect() : null,
                    pRect: p ? p.getBoundingClientRect() : null,
                    prevRect: prev ? prev.getBoundingClientRect() : null,
                    pOverflow: p ? window.getComputedStyle(p).overflow : null,
                    pHeight: p ? window.getComputedStyle(p).height : null
                };
            })()`,
            returnByValue: true
        });

        console.log('GEOMETRY:', JSON.stringify(r.result.value, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        edge.kill();
        process.exit(0);
    }
}, 2000);
