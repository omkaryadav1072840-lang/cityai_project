const { spawn } = require('child_process');
const http = require('http');

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

async function run() {
    console.log("Spawning Chrome headless...");
    const chrome = spawn(CHROME_PATH, [
        `--remote-debugging-port=${PORT}`,
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        `--user-data-dir=${process.env.TEMP}\\chrome_debug_test_${Date.now()}`
    ], { stdio: 'ignore' });

    try {
        const wsUrl = await getDebuggerUrl();
        console.log("Connected to Chrome:", wsUrl);

        // Get existing page or create target via browser WebSocket
        const listRes = await fetch(`http://127.0.0.1:${PORT}/json/list`);
        const pages = await listRes.json();
        const tab = pages.find(p => p.type === 'page') || pages[0];
        const tabWsUrl = tab.webSocketDebuggerUrl;

        const ws = new WebSocket(tabWsUrl);
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

        ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.method === "Runtime.consoleAPICalled") {
                const args = msg.params.args.map(a => a.value || JSON.stringify(a)).join(" ");
                console.log(`[BROWSER CONSOLE ${msg.params.type}]`, args);
            } else if (msg.method === "Page.loadEventFired") {
                console.log("Page loaded!");
            }
        };

        await send("Page.enable");
        await send("Runtime.enable");

        // Inject diagnostic hooks before scripts run
        await send("Page.addScriptToEvaluateOnNewDocument", {
            source: `
                // Hook Element.prototype.remove
                const origRemove = Element.prototype.remove;
                Element.prototype.remove = function() {
                    if (this.id === 'scGlobalLoginModal' || (this.classList && this.classList.contains('sc-modal-backdrop'))) {
                        console.error('[DIAGNOSTIC] scGlobalLoginModal is being REMOVED! Call stack:\\n' + (new Error().stack));
                    }
                    return origRemove.apply(this, arguments);
                };

                // Hook Node.prototype.removeChild
                const origRemoveChild = Node.prototype.removeChild;
                Node.prototype.removeChild = function(child) {
                    if (child && (child.id === 'scGlobalLoginModal' || (child.classList && child.classList.contains('sc-modal-backdrop')))) {
                        console.error('[DIAGNOSTIC] scGlobalLoginModal is being REMOVED via removeChild! Call stack:\\n' + (new Error().stack));
                    }
                    return origRemoveChild.apply(this, arguments);
                };

                // Hook window.location.reload
                const origReload = window.location.reload;
                window.location.reload = function() {
                    console.error('[DIAGNOSTIC] window.location.reload called! Call stack:\\n' + (new Error().stack));
                };

                // Hook window.SmartCityAuth.showLoginModal if available
                console.log('[DIAGNOSTIC] Diagnostic hooks injected.');
            `
        });

        // Navigate
        await send("Page.navigate", { url: "http://localhost:3000" });
        console.log("Navigated to http://localhost:3000. Waiting 2 seconds for initial render...");
        await sleep(2000);

        // Click Login button
        console.log("Attempting to find and click Login button...");
        const clickResult = await send("Runtime.evaluate", {
            expression: `
                (() => {
                    const badge = document.getElementById("scGlobalUserBadge");
                    if (badge) {
                        badge.click();
                        return "Clicked #scGlobalUserBadge";
                    }
                    return "No login button found!";
                })()
            `,
            returnByValue: true
        });
        console.log("Click result:", clickResult.result ? clickResult.result.value : clickResult);

        // Inspect styles of modal at 100ms, 300ms, 600ms, 1200ms
        for (const t of [100, 250, 400, 600, 1000, 1500]) {
            await sleep(150);
            const res = await send("Runtime.evaluate", {
                expression: `
                    (() => {
                        const m = document.getElementById("scGlobalLoginModal");
                        if (!m) return "Modal NOT found";
                        const cs = window.getComputedStyle(m);
                        return {
                            className: m.className,
                            opacity: cs.opacity,
                            pointerEvents: cs.pointerEvents,
                            animation: cs.animation,
                            animationFillMode: cs.animationFillMode,
                            display: cs.display
                        };
                    })()
                `,
                returnByValue: true
            });
            console.log(`[T+${t}ms Style Check]`, res.result ? res.result.value : res);
        }

        ws.close();
    } finally {
        chrome.kill();
        console.log("Chrome process terminated.");
    }
}

run().catch(err => {
    console.error("Test error:", err);
});
