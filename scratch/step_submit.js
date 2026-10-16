const { spawn } = require('child_process');

const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function stepByStepSubmit() {
    const proc = spawn(browserPath, [
        '--headless',
        '--remote-debugging-port=9232',
        '--window-size=1280,900',
        '--disable-gpu',
        'http://localhost:5000'
    ]);

    await new Promise(r => setTimeout(r, 2000));

    try {
        const tabs = await (await fetch('http://127.0.0.1:9232/json')).json();
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

        ws.onmessage = (e) => {
            const data = JSON.parse(e.data);
            if (data.id && pendingCallbacks.has(data.id)) {
                pendingCallbacks.get(data.id).resolve(data.result);
                pendingCallbacks.delete(data.id);
            }
            if (data.method === "Runtime.consoleAPICalled") {
                console.log("[PAGE CONSOLE]", data.params.type, data.params.args.map(a => a.value || JSON.stringify(a)).join(" "));
            }
        };

        await new Promise(r => ws.onopen = r);
        await send("Runtime.enable");

        // Open modal
        await send("Runtime.evaluate", {
            expression: `SmartCityAuth.showLoginModal("staff");`
        });

        // Fill inputs and click submit button
        const res = await send("Runtime.evaluate", {
            expression: `(async () => {
                const staffInput = document.getElementById("scStaffId");
                const passInput = document.getElementById("scStaffPassword");
                const submitBtn = document.querySelector("#scStaffForm button[type='submit']");
                
                staffInput.value = "STAFF-001";
                passInput.value = "admin";
                
                console.log("Inputs set:", staffInput.value, passInput.value);
                
                // Let's observe fetch calls
                const originalFetch = window.fetch;
                window.fetch = async function(...args) {
                    console.log("Intercepted fetch:", args[0], JSON.stringify(args[1]));
                    try {
                        const response = await originalFetch.apply(this, args);
                        console.log("Fetch response status:", response.status);
                        const clone = response.clone();
                        console.log("Fetch response text:", await clone.text());
                        return response;
                    } catch(fetchErr) {
                        console.error("Fetch threw error:", fetchErr);
                        throw fetchErr;
                    }
                };

                submitBtn.click();

                await new Promise(r => setTimeout(r, 2000));

                const msgEl = document.getElementById("scModalMsg");
                return {
                    msg: msgEl ? msgEl.textContent : "modal msg element missing",
                    modalStillInDom: !!document.getElementById("scGlobalLoginModal")
                };
            })()`,
            awaitPromise: true,
            returnByValue: true
        });

        console.log("Step result:", res.result.value);

        ws.close();
        proc.kill();
    } catch(e) {
        console.error(e);
        proc.kill();
    }
}

stepByStepSubmit();
