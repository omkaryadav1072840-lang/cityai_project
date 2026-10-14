const { spawn } = require('child_process');
const jwt = require('../backend/node_modules/jsonwebtoken');
const token = jwt.sign({ id: 'WTR-ADM-01', role: 'admin', department: 'water' }, 'smartcity_super_secret_jwt_key_gorakhpur_2026', { expiresIn: '7d' });

async function test() {
    const proc = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
        '--headless',
        '--remote-debugging-port=9268',
        'http://localhost:5000/pages/water/water.html'
    ]);
    await new Promise(r => setTimeout(r, 2500));
    const tabs = await (await fetch('http://127.0.0.1:9268/json')).json();
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
                (async () => {
                    if (window.SmartCityAuth && typeof window.SmartCityAuth.setSession === 'function') {
                        window.SmartCityAuth.setSession('${token}', {
                            id: 'WTR-ADM-01',
                            role: 'admin',
                            department: 'water',
                            name: 'Omkar Yadav'
                        });
                    } else {
                        localStorage.setItem('smartCityJWT', '${token}');
                        localStorage.setItem('smartCityCurrentUser', JSON.stringify({ role: 'admin', department: 'water' }));
                    }

                    console.log('Token from getAuthToken:', window.SmartCityAuth ? window.SmartCityAuth.getToken() : null);

                    const res = await fetch("http://localhost:5000/api/water/work-orders", {
                        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + (window.SmartCityAuth ? window.SmartCityAuth.getToken() : "") }
                    });
                    const resJson = await res.json();
                    
                    // Call fetchWorkOrders
                    await window.fetchWorkOrders();

                    const tbody = document.getElementById("workOrdersTableBody");
                    return {
                        status: res.status,
                        ordersCount: resJson.orders ? resJson.orders.length : 0,
                        tbodyRows: tbody ? tbody.children.length : 0,
                        firstRowHTML: tbody && tbody.children[0] ? tbody.children[0].innerHTML : "NONE"
                    };
                })()
            `,
            awaitPromise: true,
            returnByValue: true
        });
        console.log('Result:', evalRes.result.value);
        ws.close();
        proc.kill();
    };
}
test();
