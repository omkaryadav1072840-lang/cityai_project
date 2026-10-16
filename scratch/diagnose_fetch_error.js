const { spawn } = require('child_process');

const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function diagnoseFetchError() {
    const proc = spawn(browserPath, [
        '--headless',
        '--remote-debugging-port=9231',
        '--window-size=1280,900',
        '--disable-gpu',
        'http://localhost:5000'
    ]);

    await new Promise(r => setTimeout(r, 2000));

    try {
        const tabs = await (await fetch('http://127.0.0.1:9231/json')).json();
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
        };

        await new Promise(r => ws.onopen = r);
        await send("Runtime.enable");

        // Clear localStorage first so we test fresh login
        await send("Runtime.evaluate", {
            expression: `localStorage.clear()`
        });

        // Test the exact fetch that auth.js runs
        const fetchTest = await send("Runtime.evaluate", {
            expression: `(async () => {
                try {
                    const apiBase = typeof _getApiBase === "function" ? _getApiBase() : (window.API_BASE || "");
                    const targetUrl = apiBase + "/api/login";
                    console.log("Calling fetch to:", targetUrl);
                    const res = await fetch(targetUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            loginId: "6306880179",
                            password: "password123"
                        })
                    });
                    const status = res.status;
                    const text = await res.text();
                    return { success: true, targetUrl, status, text };
                } catch (err) {
                    return {
                        success: false,
                        targetUrl: (typeof _getApiBase === "function" ? _getApiBase() : "") + "/api/login",
                        errorName: err.name,
                        errorMessage: err.message,
                        errorStack: err.stack
                    };
                }
            })()`,
            awaitPromise: true,
            returnByValue: true
        });

        console.log("Fetch Test Result:", fetchTest.result.value);

        // Also test staff-login
        const staffTest = await send("Runtime.evaluate", {
            expression: `(async () => {
                try {
                    const apiBase = typeof _getApiBase === "function" ? _getApiBase() : (window.API_BASE || "");
                    const targetUrl = apiBase + "/api/staff-login";
                    const res = await fetch(targetUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            staffId: "STAFF-001",
                            password: "admin"
                        })
                    });
                    const status = res.status;
                    const text = await res.text();
                    return { success: true, targetUrl, status, text };
                } catch (err) {
                    return {
                        success: false,
                        targetUrl: (typeof _getApiBase === "function" ? _getApiBase() : "") + "/api/staff-login",
                        errorName: err.name,
                        errorMessage: err.message,
                        errorStack: err.stack
                    };
                }
            })()`,
            awaitPromise: true,
            returnByValue: true
        });

        console.log("Staff Test Result:", staffTest.result.value);

        ws.close();
        proc.kill();
    } catch(err) {
        console.error("Diagnosis error:", err);
        proc.kill();
    }
}

diagnoseFetchError();
