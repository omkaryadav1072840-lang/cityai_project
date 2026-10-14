const { spawn } = require('child_process');

async function test() {
    const proc = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
        '--headless',
        '--remote-debugging-port=9271',
        'http://localhost:5000/pages/water/water.html'
    ]);
    await new Promise(r => setTimeout(r, 2500));
    const tabs = await (await fetch('http://127.0.0.1:9271/json')).json();
    const tab = tabs.find(t => t.url && t.url.includes('water.html'));
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.onopen = async () => {
        let id = 1;
        function send(method, params = {}) {
            return new Promise(res => {
                const curId = id++;
                const handler = (e) => {
                    const d = JSON.parse(e.data);
                    if (d.id === curId) {
                        ws.removeEventListener('message', handler);
                        res(d.result);
                    }
                };
                ws.addEventListener('message', handler);
                ws.send(JSON.stringify({ id: curId, method, params }));
            });
        }
        await send('Runtime.enable');
        const evalRes = await send('Runtime.evaluate', {
            expression: `
                (() => {
                    const missing = [];
                    document.querySelectorAll('button[onclick]').forEach(btn => {
                        const attr = btn.getAttribute('onclick');
                        // Extract function or expression
                        try {
                            const handler = new Function('event', attr);
                            // test calling a dry check or see if expression compiles
                        } catch (e) {
                            missing.push({ type: 'syntax-error', attr, err: e.message });
                        }
                        
                        // Check if the primary function in the onclick exists
                        const match = attr.match(/^([a-zA-Z0-9_$.]+)\\s*\\(/);
                        if (match) {
                            const fnPath = match[1];
                            try {
                                const fn = eval(fnPath);
                                if (typeof fn !== 'function') {
                                    missing.push({ type: 'not-a-function', fnPath, attr, text: btn.textContent.trim().slice(0, 30) });
                                }
                            } catch (e) {
                                missing.push({ type: 'eval-error', fnPath, err: e.message, text: btn.textContent.trim().slice(0, 30) });
                            }
                        }
                    });
                    return missing;
                })()
            `,
            returnByValue: true
        });
        console.log('REAL Missing Handlers:', evalRes.result.value);
        ws.close();
        proc.kill();
    };
}
test();
