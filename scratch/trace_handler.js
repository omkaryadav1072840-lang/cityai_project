const { spawn } = require('child_process');
const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function traceHandler() {
    const proc = spawn(browserPath, [
        '--headless',
        '--remote-debugging-port=9235',
        '--disable-gpu',
        'http://localhost:5000'
    ]);

    await new Promise(r => setTimeout(r, 2000));

    try {
        const tabs = await (await fetch('http://127.0.0.1:9235/json')).json();
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
                console.log("[CONSOLE]", data.params.type, data.params.args.map(a => a.value || JSON.stringify(a)).join(" "));
            }
        };

        await new Promise(r => ws.onopen = r);
        await send("Runtime.enable");

        // Open modal
        await send("Runtime.evaluate", {
            expression: `SmartCityAuth.showLoginModal("staff");`
        });

        // Let's replace the submit handler with a fully instrumented one
        const testRes = await send("Runtime.evaluate", {
            expression: `(async () => {
                const modal = document.getElementById("scGlobalLoginModal");
                const form = document.getElementById("scStaffForm");
                const staffInput = document.getElementById("scStaffId");
                const passInput = document.getElementById("scStaffPassword");
                const msgEl = document.getElementById("scModalMsg");

                staffInput.value = "STAFF-001";
                passInput.value = "admin";

                console.log("Tracing exact execution steps...");
                try {
                    console.log("Step 1: Reading inputs");
                    const sId = modal.querySelector("#scStaffId").value.trim();
                    const sPass = modal.querySelector("#scStaffPassword").value;
                    console.log("Step 2: Calling fetch to", (typeof _getApiBase === "function" ? _getApiBase() : "") + "/api/staff-login");
                    
                    const res = await fetch((typeof _getApiBase === "function" ? _getApiBase() : "") + "/api/staff-login", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ staffId: sId, password: sPass })
                    });
                    console.log("Step 3: Response status", res.status);
                    
                    const data = await res.json();
                    console.log("Step 4: Parsed JSON, token:", !!data.token, "user:", !!data.user);
                    
                    if (res.ok && data.token) {
                        console.log("Step 5: Calling setSession");
                        SmartCityAuth.setSession(data.token, data.user);
                        console.log("Step 6: Setting msgEl");
                        msgEl.style.color = "#34d399";
                        msgEl.textContent = "✅ Welcome " + data.user.name;
                        console.log("Step 7: Calling showToast");
                        SmartCityAuth.showToast("Welcome Officer " + data.user.name, "success");
                        console.log("Step 8: Calling renderUserHeader");
                        SmartCityAuth.renderUserHeader();
                        console.log("Step 9: All succeeded!");
                        return { success: true, targetDashboard: data.targetDashboard };
                    } else {
                        console.log("Step 4b: Login rejected by backend:", data.message);
                        return { success: false, message: data.message };
                    }
                } catch (err) {
                    console.error("Step FAILED with error:", err.stack || err.message);
                    return { error: err.stack || err.message };
                }
            })()`,
            awaitPromise: true,
            returnByValue: true
        });

        console.log("Trace Result:", testRes.result.value);

        ws.close();
        proc.kill();
    } catch(e) {
        console.error(e);
        proc.kill();
    }
}

traceHandler();
