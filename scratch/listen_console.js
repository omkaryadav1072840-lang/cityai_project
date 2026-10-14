const { spawn } = require('child_process');

async function test() {
    const proc = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
        '--headless',
        '--remote-debugging-port=9264',
        'http://localhost:5000/pages/water/water.html'
    ]);
    await new Promise(r => setTimeout(r, 3000));
    const tabs = await (await fetch('http://127.0.0.1:9264/json')).json();
    const tab = tabs[0];
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
        ws.onmessage = (e) => {
            const d = JSON.parse(e.data);
            if (d.method === 'Runtime.consoleAPICalled') {
                console.log('BROWSER CONSOLE:', d.params.type, d.params.args.map(a => a.value || a.description).join(' '));
            } else if (d.method === 'Runtime.exceptionThrown') {
                console.log('BROWSER EXCEPTION:', d.params.exceptionDetails.text, d.params.exceptionDetails.exception?.description);
            }
        };

        await new Promise(r => setTimeout(r, 3000));

        const checkRes = await send('Runtime.evaluate', {
            expression: `({
                hasFetchWorkOrders: typeof window.fetchWorkOrders,
                hasSmartCityAuth: typeof window.SmartCityAuth,
                hasWaterJS: typeof window.switchWaterLayer
            })`,
            returnByValue: true
        });
        console.log('Window properties check:', checkRes.result.value);

        ws.close();
        proc.kill();
    };
}
test();
