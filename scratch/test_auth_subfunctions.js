const { spawn } = require('child_process');
const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const proc = spawn(browserPath, ['--headless', '--remote-debugging-port=9234', '--disable-gpu', 'http://localhost:5000']);

setTimeout(async () => {
    try {
        const tabs = await (await fetch('http://127.0.0.1:9234/json')).json();
        const tab = tabs.find(t => t.url.includes('localhost:5000'));
        const ws = new WebSocket(tab.webSocketDebuggerUrl);
        ws.onopen = () => {
            ws.send(JSON.stringify({
                id: 1,
                method: 'Runtime.evaluate',
                params: {
                    expression: `(() => {
                        const user = { id: 3, name: 'Vikramaditya Rathore', department: 'ICCC Command Center', role: 'super_admin' };
                        const token = 'fake.token.jwt';
                        const report = {};
                        try { SmartCityAuth.setSession(token, user); report.setSession = "OK"; } catch(e) { report.setSession = e.stack; }
                        try { SmartCityAuth.showToast('Test', 'info'); report.showToast = "OK"; } catch(e) { report.showToast = e.stack; }
                        try { SmartCityAuth.renderUserHeader(); report.renderUserHeader = "OK"; } catch(e) { report.renderUserHeader = e.stack; }
                        return report;
                    })()`,
                    returnByValue: true
                }
            }));
        };
        ws.onmessage = (e) => {
            const d = JSON.parse(e.data);
            if (d.id === 1) {
                console.log('Function test report:', d.result.result.value);
                ws.close();
                proc.kill();
                process.exit(0);
            }
        };
    } catch (err) {
        console.error(err);
        proc.kill();
    }
}, 2000);
