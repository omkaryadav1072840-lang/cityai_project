const { spawn } = require('child_process');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9222;

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function getDebuggerUrl() {
    for (let i = 0; i < 20; i++) {
        try {
            const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
            if (res.ok) {
                const data = await res.json();
                return data.webSocketDebuggerUrl;
            }
        } catch (_) {}
        await sleep(300);
    }
    throw new Error("Could not connect to Chrome debugging port");
}

async function runSuite() {
    console.log("=== STARTING FULL SMARTCITY LOGIN TEST SUITE ===");

    const chrome = spawn(CHROME_PATH, [
        `--remote-debugging-port=${PORT}`,
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        `--user-data-dir=${process.env.TEMP}\\chrome_suite_${Date.now()}`
    ], { stdio: 'ignore' });

    const results = [];

    try {
        const wsUrl = await getDebuggerUrl();
        const listRes = await fetch(`http://127.0.0.1:${PORT}/json/list`);
        const pages = await listRes.json();
        const tab = pages.find(p => p.type === 'page') || pages[0];

        const ws = new WebSocket(tab.webSocketDebuggerUrl);
        await new Promise(r => ws.onopen = r);

        let id = 1;
        function send(method, params = {}) {
            return new Promise((resolve) => {
                const msgId = id++;
                const handler = (event) => {
                    const data = JSON.parse(event.data);
                    if (data.id === msgId) {
                        ws.removeEventListener('message', handler);
                        resolve(data.result);
                    }
                };
                ws.addEventListener('message', handler);
                ws.send(JSON.stringify({ id: msgId, method, params }));
            });
        }

        const consoleErrors = [];
        ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
                const args = msg.params.args.map(a => a.value || JSON.stringify(a)).join(" ");
                consoleErrors.push(args);
            }
        };

        await send("Page.enable");
        await send("Runtime.enable");

        // Helper to evaluate JS in browser
        async function evaluate(fnStr) {
            const res = await send("Runtime.evaluate", { expression: fnStr, returnByValue: true, awaitPromise: true });
            return res.result ? res.result.value : null;
        }

        // Test 1: Desktop Navigation and Login Persistence for >3 seconds
        console.log("\n[TEST 1] Desktop Layout: Open Login and verify it remains OPEN past 3 seconds");
        await send("Page.navigate", { url: "http://localhost:3000" });
        await sleep(2000);

        await evaluate(`
            localStorage.clear();
            sessionStorage.clear();
            const badge = document.getElementById("scGlobalUserBadge");
            if (badge) badge.click();
        `);

        // Check at 1000ms, 2000ms, 3000ms
        let t1Pass = true;
        for (const t of [1000, 2000, 3000]) {
            await sleep(1000);
            const status = await evaluate(`
                (() => {
                    const m = document.getElementById("scGlobalLoginModal");
                    if (!m) return null;
                    const cs = window.getComputedStyle(m);
                    return { display: cs.display, opacity: cs.opacity, pointerEvents: cs.pointerEvents };
                })()
            `);
            console.log(`  Modal state at ${t}ms:`, status);
            if (!status || status.display !== "flex" || status.opacity !== "1" || status.pointerEvents !== "auto") {
                t1Pass = false;
            }
        }
        results.push({ test: "Login remains open >3 seconds without auto-closing", passed: t1Pass });

        // Test 2: Clicking inside card does NOT close modal
        console.log("\n[TEST 2] Clicking inside modal card / input fields does NOT close modal");
        await evaluate(`
            const card = document.querySelector("#scGlobalLoginModal .sc-dialog-card");
            if (card) card.click();
            const input = document.getElementById("scCitLoginId");
            if (input) {
                input.focus();
                input.click();
            }
        `);
        await sleep(500);
        const cardClickCheck = await evaluate(`document.getElementById("scGlobalLoginModal") !== null`);
        console.log("  Modal still present after clicking inside card:", cardClickCheck);
        results.push({ test: "Clicking inside card does not close modal", passed: cardClickCheck === true });

        // Test 3: Close via ✕ button
        console.log("\n[TEST 3] Close via ✕ button");
        await evaluate(`
            const closeBtn = document.getElementById("scModalCloseBtn");
            if (closeBtn) closeBtn.click();
        `);
        await sleep(300);
        const closeBtnCheck = await evaluate(`document.getElementById("scGlobalLoginModal") === null`);
        console.log("  Modal closed via ✕ button:", closeBtnCheck);
        results.push({ test: "Modal closes on ✕ button", passed: closeBtnCheck === true });

        // Test 4: Close via backdrop click (click outside card)
        console.log("\n[TEST 4] Re-open and close via clicking backdrop");
        await evaluate(`SmartCityAuth.showLoginModal("citizen");`);
        await sleep(300);
        await evaluate(`
            const m = document.getElementById("scGlobalLoginModal");
            if (m) m.click();
        `);
        await sleep(300);
        const backdropClickCheck = await evaluate(`document.getElementById("scGlobalLoginModal") === null`);
        console.log("  Modal closed via backdrop click:", backdropClickCheck);
        results.push({ test: "Modal closes on backdrop click", passed: backdropClickCheck === true });

        // Test 5: Invalid credentials show error and DO NOT close modal
        console.log("\n[TEST 5] Invalid credentials form submission");
        await evaluate(`SmartCityAuth.showLoginModal("citizen");`);
        await sleep(300);
        await evaluate(`
            const idInput = document.getElementById("scCitLoginId");
            const passInput = document.getElementById("scCitPassword");
            idInput.value = "9999999999";
            passInput.value = "wrongpassword";
            const form = document.getElementById("scCitizenForm");
            form.dispatchEvent(new Event("submit", { cancelable: true }));
        `);
        await sleep(1000);
        const invalidCheck = await evaluate(`
            (() => {
                const m = document.getElementById("scGlobalLoginModal");
                const msg = document.getElementById("scModalMsg");
                return { modalPresent: !!m, errorText: msg ? msg.textContent : "" };
            })()
        `);
        console.log("  Invalid submit check:", invalidCheck);
        results.push({
            test: "Invalid credentials displays error and keeps modal open",
            passed: invalidCheck.modalPresent && invalidCheck.errorText.length > 0
        });

        // Test 6: Valid credentials login (Citizen 6306880179 / password123)
        console.log("\n[TEST 6] Valid credentials login (Citizen)");
        await evaluate(`SmartCityAuth.showLoginModal("citizen");`);
        await sleep(300);
        const preSubmitVal = await evaluate(`
            (() => {
                const idInput = document.getElementById("scCitLoginId");
                const passInput = document.getElementById("scCitPassword");
                idInput.value = "6306880179";
                passInput.value = "password123";
                return { id: idInput.value, pass: passInput.value };
            })()
        `);
        console.log("  Pre-submit input values:", preSubmitVal);

        await evaluate(`
            const btn = document.querySelector("#scCitizenForm button[type=submit]");
            if (btn) btn.click();
        `);
        await sleep(1500);
        const loginCheck = await evaluate(`
            (() => {
                return {
                    isAuth: SmartCityAuth.isAuthenticated(),
                    user: SmartCityAuth.getUser(),
                    token: !!SmartCityAuth.getToken(),
                    modalPresent: !!document.getElementById("scGlobalLoginModal"),
                    badgeText: document.getElementById("scGlobalUserBadge")?.innerText || "",
                    modalMsg: document.getElementById("scModalMsg")?.textContent || ""
                };
            })()
        `);
        console.log("  Login result:", loginCheck);
        results.push({
            test: "Citizen login succeeds, sets session, updates header badge",
            passed: loginCheck.isAuth && loginCheck.token && !loginCheck.modalPresent && loginCheck.badgeText.includes("Omkar")
        });

        // Test 7: Persistence across page refresh
        console.log("\n[TEST 7] Session persistence on page reload");
        await send("Page.navigate", { url: "http://localhost:3000" });
        await sleep(2000);
        const persistCheck = await evaluate(`
            (() => {
                return {
                    isAuth: SmartCityAuth.isAuthenticated(),
                    user: SmartCityAuth.getUser(),
                    badgeText: document.getElementById("scGlobalUserBadge")?.innerText || ""
                };
            })()
        `);
        console.log("  Persist after reload:", persistCheck);
        results.push({
            test: "Session persists after page refresh",
            passed: persistCheck.isAuth && persistCheck.badgeText.includes("Omkar")
        });

        // Test 8: Logout works and restores Sign In button
        console.log("\n[TEST 8] Logout flow");
        await evaluate(`
            SmartCityAuth.logout();
        `);
        await sleep(1000);
        const logoutCheck = await evaluate(`
            (() => {
                return {
                    isAuth: SmartCityAuth.isAuthenticated(),
                    badgeText: document.getElementById("scGlobalUserBadge")?.innerText || ""
                };
            })()
        `);
        console.log("  Logout state:", logoutCheck);
        results.push({
            test: "Logout clears session and restores Sign In button",
            passed: !logoutCheck.isAuth && logoutCheck.badgeText.includes("Sign In")
        });

        // Test 9: Mobile viewport responsiveness (375x667)
        console.log("\n[TEST 9] Mobile viewport responsiveness (375x667)");
        await send("Emulation.setDeviceMetricsOverride", {
            width: 375,
            height: 667,
            deviceScaleFactor: 2,
            mobile: true
        });
        await send("Page.navigate", { url: "http://localhost:3000" });
        await sleep(1500);
        await evaluate(`SmartCityAuth.showLoginModal("citizen");`);
        await sleep(1000);
        const mobileCheck = await evaluate(`
            (() => {
                const m = document.getElementById("scGlobalLoginModal");
                const card = document.querySelector("#scGlobalLoginModal .sc-dialog-card");
                if (!m || !card) return null;
                const rect = card.getBoundingClientRect();
                return {
                    modalVisible: window.getComputedStyle(m).opacity === "1",
                    cardWidth: rect.width,
                    fitsScreen: rect.width <= 375
                };
            })()
        `);
        console.log("  Mobile check:", mobileCheck);
        results.push({
            test: "Modal renders cleanly and fits on mobile viewport",
            passed: mobileCheck && mobileCheck.modalVisible && mobileCheck.fitsScreen
        });

        // Test 10: Check module pages login entry points
        console.log("\n[TEST 10] Module pages login entry points");
        const modulePages = [
            "pages/traffic/traffic.html",
            "pages/parking/parking.html",
            "pages/hospital/hospital.html",
            "pages/waste/waste.html",
            "pages/water/water.html",
            "pages/police/police.html",
            "pages/emergency/emergency.html",
            "pages/famous/famous.html"
        ];

        let modulePassCount = 0;
        for (const page of modulePages) {
            await send("Page.navigate", { url: `http://localhost:3000/${page}` });
            await sleep(1200);
            const res = await evaluate(`
                (() => {
                    if (!window.SmartCityAuth) return { success: false, reason: "No SmartCityAuth" };
                    SmartCityAuth.showLoginModal("staff");
                    const m = document.getElementById("scGlobalLoginModal");
                    if (!m) return { success: false, reason: "No modal in DOM" };
                    const cs = window.getComputedStyle(m);
                    const visible = cs.opacity === "1" && cs.display === "flex" && cs.pointerEvents === "auto";
                    m.remove();
                    return { success: visible };
                })()
            `);
            if (res && res.success) {
                modulePassCount++;
                console.log(`  ✓ ${page}: Login modal opens and styles correctly`);
            } else {
                console.log(`  ✗ ${page}: Failed -`, res);
            }
        }
        results.push({
            test: `Module pages login entry points (8/8)`,
            passed: modulePassCount === modulePages.length
        });

        console.log("\n=== CONSOLE ERRORS CAPTURED ===");
        console.log(consoleErrors.length === 0 ? "None (0 errors)" : consoleErrors);

        console.log("\n=== TEST RESULTS SUMMARY ===");
        let allPassed = true;
        results.forEach((r, i) => {
            console.log(`${r.passed ? '✅ PASS' : '❌ FAIL'} [${i+1}] ${r.test}`);
            if (!r.passed) allPassed = false;
        });

        console.log("\nOverall Suite:", allPassed ? "ALL TESTS PASSED!" : "SOME TESTS FAILED");

        ws.close();
    } finally {
        chrome.kill();
        console.log("Chrome terminated.");
    }
}

runSuite().catch(err => {
    console.error("Suite execution error:", err);
});
