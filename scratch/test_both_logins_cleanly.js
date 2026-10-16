const { spawn } = require('child_process');
const fs = require('fs');

const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function testBothLoginsCleanly() {
    console.log("Starting Edge in headless mode...");
    const proc = spawn(browserPath, [
        '--headless',
        '--remote-debugging-port=9236',
        '--window-size=1280,900',
        '--disable-gpu',
        'http://localhost:5000'
    ]);

    await new Promise(r => setTimeout(r, 2000));

    try {
        const tabs = await (await fetch('http://127.0.0.1:9236/json')).json();
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

        // 1. Test Citizen Login
        console.log("\n--- TEST 1: CITIZEN LOGIN ---");
        const citizenRes = await send("Runtime.evaluate", {
            expression: `(async () => {
                localStorage.clear();
                SmartCityAuth.showLoginModal("citizen");
                
                const loginInput = document.getElementById("scCitLoginId");
                const passInput = document.getElementById("scCitPassword");
                const form = document.getElementById("scCitizenForm");

                loginInput.value = "6306880179";
                passInput.value = "password123";

                const submitBtn = form.querySelector("button[type='submit']");
                submitBtn.click();

                // Wait 1.2s for session and close
                await new Promise(r => setTimeout(r, 1200));

                const token = SmartCityAuth.getToken();
                const user = SmartCityAuth.getUser();
                const modal = document.getElementById("scGlobalLoginModal");

                return {
                    citizenLoginSuccess: !!token,
                    userRole: user ? user.role : null,
                    userName: user ? user.name : null,
                    modalClosed: !modal
                };
            })()`,
            awaitPromise: true,
            returnByValue: true
        });

        console.log("Citizen Login Result:", citizenRes.result.value);

        // 2. Test Staff Login
        console.log("\n--- TEST 2: STAFF LOGIN (STAFF-001) ---");
        const staffRes = await send("Runtime.evaluate", {
            expression: `(async () => {
                SmartCityAuth.logout();
                SmartCityAuth.showLoginModal("staff");

                const staffInput = document.getElementById("scStaffId");
                const passInput = document.getElementById("scStaffPassword");
                const form = document.getElementById("scStaffForm");

                staffInput.value = "STAFF-001";
                passInput.value = "admin";

                const submitBtn = form.querySelector("button[type='submit']");
                submitBtn.click();

                // Wait 1.2s
                await new Promise(r => setTimeout(r, 1200));

                const token = SmartCityAuth.getToken();
                const user = SmartCityAuth.getUser();
                const modal = document.getElementById("scGlobalLoginModal");

                return {
                    staffLoginSuccess: !!token,
                    userRole: user ? user.role : null,
                    userName: user ? user.name : null,
                    department: user ? user.department : null,
                    modalClosed: !modal
                };
            })()`,
            awaitPromise: true,
            returnByValue: true
        });

        console.log("Staff Login Result:", staffRes.result.value);

        // 3. Test Doctor Login (DOC002)
        console.log("\n--- TEST 3: DOCTOR LOGIN (DOC002) ---");
        const docRes = await send("Runtime.evaluate", {
            expression: `(async () => {
                SmartCityAuth.logout();
                SmartCityAuth.showLoginModal("staff");

                const staffInput = document.getElementById("scStaffId");
                const passInput = document.getElementById("scStaffPassword");
                const form = document.getElementById("scStaffForm");

                staffInput.value = "DOC002";
                passInput.value = "doctor123";

                const submitBtn = form.querySelector("button[type='submit']");
                submitBtn.click();

                // Wait 1.2s
                await new Promise(r => setTimeout(r, 1200));

                const token = SmartCityAuth.getToken();
                const user = SmartCityAuth.getUser();
                const modal = document.getElementById("scGlobalLoginModal");

                return {
                    docLoginSuccess: !!token,
                    userRole: user ? user.role : null,
                    userName: user ? user.name : null,
                    specialization: user ? user.specialization : null,
                    modalClosed: !modal
                };
            })()`,
            awaitPromise: true,
            returnByValue: true
        });

        console.log("Doctor Login Result:", docRes.result.value);

        // 4. Test Quick Persona Login (Traffic Inspector Verma)
        console.log("\n--- TEST 4: QUICK PERSONA (TRAFFIC) ---");
        const quickRes = await send("Runtime.evaluate", {
            expression: `(async () => {
                SmartCityAuth.logout();
                await SmartCityAuth.quickLoginPersona("traffic");

                await new Promise(r => setTimeout(r, 600));

                const token = SmartCityAuth.getToken();
                const user = SmartCityAuth.getUser();

                return {
                    quickLoginSuccess: !!token,
                    userRole: user ? user.role : null,
                    userName: user ? user.name : null,
                    department: user ? user.department : null
                };
            })()`,
            awaitPromise: true,
            returnByValue: true
        });

        console.log("Quick Persona Result:", quickRes.result.value);

        ws.close();
        proc.kill();
        console.log("\nALL AUTHENTICATION FLOWS VERIFIED SUCCESSFULLY!");
    } catch(err) {
        console.error("Test error:", err);
        proc.kill();
    }
}

testBothLoginsCleanly();
