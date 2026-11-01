// scratch/test_browser_dustbin_flow.js
// End-to-end browser simulation of clicking "Unlock Dustbin Dashboard" and verifying role isolation

const http = require("http");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

const express = require(path.join(__dirname, "../backend/node_modules/express"));
const authRouter = require(path.join(__dirname, "../backend/routes/auth.routes"));
const wasteRouter = require(path.join(__dirname, "../backend/routes/waste.routes"));

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));
app.use(authRouter);
app.use(wasteRouter);

const edgePaths = [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
];
const browserPath = edgePaths.find((p) => fs.existsSync(p));

if (!browserPath) {
    console.error("Edge browser executable not found");
    process.exit(1);
}

const server = app.listen(5000, "127.0.0.1", async () => {
    console.log("🟢 Test server listening on http://127.0.0.1:5000");

    const browserProc = spawn(browserPath, [
        "--headless=new",
        "--remote-debugging-port=9244",
        "--window-size=1280,800",
        "--disable-gpu",
        "http://127.0.0.1:5000/pages/waste/waste.html"
    ]);

    let passed = 0;
    let failed = 0;
    function assert(cond, msg) {
        if (cond) {
            passed++;
            console.log(`  ✅ PASS: ${msg}`);
        } else {
            failed++;
            console.error(`  ❌ FAIL: ${msg}`);
        }
    }

    setTimeout(async () => {
        try {
            const tabsRes = await fetch("http://127.0.0.1:9244/json");
            const tabs = await tabsRes.json();
            const tab = tabs.find((t) => t.url.includes("waste.html"));

            if (!tab) {
                console.error("waste.html tab not found in browser");
                browserProc.kill();
                server.close(() => process.exit(1));
                return;
            }

            const ws = new WebSocket(tab.webSocketDebuggerUrl);
            let msgId = 1;
            const pending = new Map();

            function send(method, params = {}) {
                return new Promise((res, rej) => {
                    const id = msgId++;
                    pending.set(id, { res, rej });
                    ws.send(JSON.stringify({ id, method, params }));
                });
            }

            ws.onmessage = (e) => {
                const msg = JSON.parse(e.data);
                if (msg.id && pending.has(msg.id)) {
                    const { res, rej } = pending.get(msg.id);
                    pending.delete(msg.id);
                    if (msg.error) rej(msg.error);
                    else res(msg.result);
                }
            };

            ws.onopen = async () => {
                await send("Page.enable");
                await send("Runtime.enable");

                // Wait 1.5s for initial DOM
                await new Promise((r) => setTimeout(r, 1500));

                console.log("\n--- STEP 1: Verify Unlock Button & Inputs on waste.html ---");
                const initialCheck = await send("Runtime.evaluate", {
                    expression: `({
                        binInputVal: document.getElementById('dtBinCodeInput')?.value,
                        passInputVal: document.getElementById('dtPasscodeInput')?.value,
                        unlockBtnExists: Boolean(document.querySelector('button[onclick*="authenticateDustbinTerminal"]'))
                    })`,
                    returnByValue: true
                });
                console.log("Initial state:", initialCheck.result.value);
                assert(initialCheck.result.value.binInputVal === "BIN-GOL-01", "Default bin input is BIN-GOL-01");
                assert(initialCheck.result.value.passInputVal === "BIN@2026", "Default pass input is BIN@2026");
                assert(initialCheck.result.value.unlockBtnExists, "Unlock Dustbin Dashboard button exists");

                console.log("\n--- STEP 2: Trigger Click on 'Unlock Dustbin Dashboard' ---");
                await send("Runtime.evaluate", {
                    expression: `window.authenticateDustbinTerminal('BIN-GOL-01', 'BIN@2026')`
                });

                // Wait 1.5s for authentication, token set, and window.location.href navigation
                await new Promise((r) => setTimeout(r, 1500));

                console.log("\n--- STEP 3: Verify Dedicated Dustbin Dashboard Loaded ---");
                const pageCheck = await send("Runtime.evaluate", {
                    expression: `({
                        href: window.location.href,
                        title: document.title,
                        headerBinCode: document.getElementById('headerBinCode')?.textContent,
                        guardBinCode: document.getElementById('guardBinCode')?.textContent,
                        fillLiquidHeight: document.getElementById('fillLiquid')?.style.height,
                        metricFillPct: document.getElementById('metricFillPct')?.textContent,
                        hasLockBtn: Boolean(document.querySelector('button[onclick*="logoutBinStaff"]')),
                        isBinStaffSession: localStorage.getItem('smartCityCurrentUser')
                    })`,
                    returnByValue: true
                });
                console.log("Dedicated Terminal State:", pageCheck.result.value);

                assert(pageCheck.result.value.href.includes("bin_dashboard.html?binCode=BIN-GOL-01"), "Navigated directly to dedicated bin_dashboard.html");
                assert(pageCheck.result.value.headerBinCode === "BIN-GOL-01", "Header displays locked unit BIN-GOL-01");
                assert(pageCheck.result.value.guardBinCode === "BIN-GOL-01", "Restriction notice shows BIN-GOL-01");
                assert(pageCheck.result.value.hasLockBtn, "Lock & Sign Out button is present");

                console.log("\n--- STEP 4: Enforce Isolation - Attempt Navigation to /index.html ---");
                await send("Runtime.evaluate", {
                    expression: `window.location.href = '/index.html'`
                });

                // Wait 1.2s for navigation and automatic role isolation intercept
                await new Promise((r) => setTimeout(r, 1200));

                const isolationCheck = await send("Runtime.evaluate", {
                    expression: `({
                        href: window.location.href,
                        isolated: window.location.href.includes('bin_dashboard.html')
                    })`,
                    returnByValue: true
                });
                console.log("After attempting /index.html:", isolationCheck.result.value);
                assert(isolationCheck.result.value.isolated, "Direct /index.html navigation blocked: operator bounced back to bin_dashboard.html");

                console.log("\n=========================================================================");
                console.log(`BROWSER E2E SUMMARY: ${passed} PASSED, ${failed} FAILED`);
                console.log("=========================================================================\n");

                browserProc.kill();
                server.close(() => process.exit(failed > 0 ? 1 : 0));
            };
        } catch (e) {
            console.error("Browser test error:", e);
            browserProc.kill();
            server.close(() => process.exit(1));
        }
    }, 2000);
});

