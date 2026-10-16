const { spawn } = require('child_process');
const fs = require('fs');

const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function testLoginInEdge() {
    console.log("Starting Edge in headless mode with remote debugging...");
    const proc = spawn(browserPath, [
        '--headless',
        '--remote-debugging-port=9230',
        '--window-size=1280,900',
        '--disable-gpu',
        'http://localhost:5000'
    ]);

    await new Promise(r => setTimeout(r, 2000));

    try {
        const tabs = await (await fetch('http://127.0.0.1:9230/json')).json();
        console.log("Open tabs:", tabs.map(t => ({ url: t.url, id: t.id })));
        const tab = tabs.find(t => t.url.includes('localhost:5000'));
        if (!tab) {
            console.error("Tab not found!");
            proc.kill();
            return;
        }

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
                const { resolve } = pendingCallbacks.get(data.id);
                pendingCallbacks.delete(data.id);
                resolve(data.result);
            }
            if (data.method === "Runtime.consoleAPICalled") {
                console.log("[BROWSER CONSOLE]", data.params.type, data.params.args.map(a => a.value || a.description).join(" "));
            }
            if (data.method === "Runtime.exceptionThrown") {
                console.error("[BROWSER EXCEPTION]", data.params.exceptionDetails.text, data.params.exceptionDetails.exception);
            }
        };

        await new Promise(r => ws.onopen = r);
        console.log("Connected to Edge CDP via WebSocket.");

        await send("Runtime.enable");
        await send("Page.enable");
        await send("DOM.enable");

        // Wait 2s for page to settle
        await new Promise(r => setTimeout(r, 2000));

        // Evaluate state of navbar and login button
        let evalRes = await send("Runtime.evaluate", {
            expression: `(() => {
                const badge = document.querySelector("#scGlobalUserBadge") || document.querySelector("#scGlobalVisitorBadge") || document.querySelector(".sc-top-announcement") || document.querySelector("#navUserHeaderContainer");
                const allButtons = Array.from(document.querySelectorAll("button, a")).map(b => b.textContent.trim()).filter(t => t.includes("Sign") || t.includes("Login"));
                return {
                    badgeFound: !!badge,
                    badgeHtml: badge ? badge.outerHTML.slice(0, 300) : null,
                    authButtons: allButtons,
                    hasSmartCityAuth: typeof SmartCityAuth !== "undefined",
                    authMethods: typeof SmartCityAuth !== "undefined" ? Object.keys(SmartCityAuth) : []
                };
            })()`,
            returnByValue: true
        });

        console.log("Evaluation Result 1 (Page state):", evalRes.result.value);

        // Click Sign In button or trigger SmartCityAuth.showLoginModal('citizen')
        evalRes = await send("Runtime.evaluate", {
            expression: `(() => {
                SmartCityAuth.showLoginModal("citizen");
                const modal = document.getElementById("scGlobalLoginModal");
                return {
                    modalExists: !!modal,
                    modalActive: modal ? modal.classList.contains("sc-modal-active") : false,
                    display: modal ? window.getComputedStyle(modal).display : null,
                    visibility: modal ? window.getComputedStyle(modal).visibility : null,
                    zIndex: modal ? window.getComputedStyle(modal).zIndex : null
                };
            })()`,
            returnByValue: true
        });

        console.log("Evaluation Result 2 (Modal opened):", evalRes.result.value);

        // Test Citizen Login form
        evalRes = await send("Runtime.evaluate", {
            expression: `(async () => {
                const loginInput = document.getElementById("scCitLoginId");
                const passInput = document.getElementById("scCitPassword");
                const form = document.getElementById("scCitizenForm");
                if (!loginInput || !passInput || !form) return { error: "inputs not found" };

                loginInput.value = "6306880179";
                passInput.value = "password123";

                // Trigger submit
                const submitEvent = new Event("submit", { bubbles: true, cancelable: true });
                form.dispatchEvent(submitEvent);

                // Wait 1s
                await new Promise(r => setTimeout(r, 1000));

                const msgEl = document.getElementById("scModalMsg");
                return {
                    messageText: msgEl ? msgEl.textContent : null,
                    messageColor: msgEl ? msgEl.style.color : null,
                    tokenInStorage: !!localStorage.getItem("token") || !!localStorage.getItem("smartcity_token"),
                    userInStorage: localStorage.getItem("smartcity_user")
                };
            })()`,
            awaitPromise: true,
            returnByValue: true
        });

        console.log("Evaluation Result 3 (Citizen login test):", evalRes.result.value);

        // Test Staff Login form
        evalRes = await send("Runtime.evaluate", {
            expression: `(async () => {
                // switch to staff tab
                const staffTabBtn = document.querySelector(".sc-tab-pill[data-tab='staff']");
                if (staffTabBtn) staffTabBtn.click();

                const staffInput = document.getElementById("scStaffId");
                const passInput = document.getElementById("scStaffPassword");
                const form = document.getElementById("scStaffForm");
                if (!staffInput || !passInput || !form) return { error: "staff inputs not found" };

                staffInput.value = "STAFF-001";
                passInput.value = "admin";

                // Trigger submit
                const submitEvent = new Event("submit", { bubbles: true, cancelable: true });
                form.dispatchEvent(submitEvent);

                // Wait 1s
                await new Promise(r => setTimeout(r, 1000));

                const msgEl = document.getElementById("scModalMsg");
                return {
                    messageText: msgEl ? msgEl.textContent : null,
                    messageColor: msgEl ? msgEl.style.color : null,
                    tokenInStorage: !!localStorage.getItem("token") || !!localStorage.getItem("smartcity_token"),
                    userInStorage: localStorage.getItem("smartcity_user")
                };
            })()`,
            awaitPromise: true,
            returnByValue: true
        });

        console.log("Evaluation Result 4 (Staff login test):", evalRes.result.value);

        // Capture screenshot of current modal
        const screenshot = await send("Page.captureScreenshot", { format: "png" });
        if (screenshot && screenshot.data) {
            fs.writeFileSync("scratch/login_flow_modal.png", Buffer.from(screenshot.data, "base64"));
            console.log("Saved screenshot to scratch/login_flow_modal.png");
        }

        ws.close();
        proc.kill();
        console.log("Test finished successfully.");
    } catch(err) {
        console.error("Test failed:", err);
        proc.kill();
    }
}

testLoginInEdge();
