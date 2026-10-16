const { spawn } = require('child_process');

const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function testTrafficAdminNavigation() {
    const proc = spawn(browserPath, [
        '--headless',
        '--remote-debugging-port=9239',
        '--disable-gpu',
        'http://localhost:5000'
    ]);

    await new Promise(r => setTimeout(r, 2000));

    try {
        const tabs = await (await fetch('http://127.0.0.1:9239/json')).json();
        const tab = tabs.find(t => t.url.includes('localhost:5000'));
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

        let navigatedUrl = null;
        ws.onmessage = (e) => {
            const data = JSON.parse(e.data);
            if (data.id && pendingCallbacks.has(data.id)) {
                pendingCallbacks.get(data.id).resolve(data.result);
                pendingCallbacks.delete(data.id);
            }
            if (data.method === "Page.frameNavigated" && data.params.frame.parentId === undefined) {
                navigatedUrl = data.params.frame.url;
                console.log("[PAGE NAVIGATED]", navigatedUrl);
            }
        };

        await new Promise(r => ws.onopen = r);
        await send("Runtime.enable");
        await send("Page.enable");

        // Submit TR-ADMIN
        await send("Runtime.evaluate", {
            expression: `(() => {
                SmartCityAuth.showLoginModal("staff");
                document.getElementById("scStaffId").value = "TR-ADMIN";
                document.getElementById("scStaffPassword").value = "admin";
                document.querySelector("#scStaffForm button[type='submit']").click();
            })()`
        });

        console.log("Submitted TR-ADMIN, waiting for navigation...");
        await new Promise(r => setTimeout(r, 2500));

        console.log("Final browser URL after traffic admin login:", navigatedUrl);

        ws.close();
        proc.kill();
    } catch(err) {
        console.error("Test error:", err);
        proc.kill();
    }
}

testTrafficAdminNavigation();
