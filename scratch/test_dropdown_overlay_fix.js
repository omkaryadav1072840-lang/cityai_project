const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ROOT_DIR = path.resolve(__dirname, '..');
const SCRATCH_DIR = path.join(ROOT_DIR, 'scratch');

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function runTest() {
    console.log('Testing Dropdown Overlay Fix on Hospital Page...');
    const port = 9235;
    const edge = spawn(browserPath, [
        '--headless',
        `--remote-debugging-port=${port}`,
        '--disable-gpu',
        '--window-size=1440,900',
        'about:blank'
    ]);

    await sleep(2500);

    let ws;
    try {
        const listRes = await fetch(`http://127.0.0.1:${port}/json`);
        const tabs = await listRes.json();
        const mainTab = tabs.find(t => t.type === 'page') || tabs[0];
        ws = new WebSocket(mainTab.webSocketDebuggerUrl);

        await new Promise((res, rej) => {
            ws.onopen = res;
            ws.onerror = rej;
        });

        let reqId = 1;
        const pending = new Map();
        ws.onmessage = (evt) => {
            const data = JSON.parse(evt.data);
            if (data.id && pending.has(data.id)) {
                const cb = pending.get(data.id);
                pending.delete(data.id);
                cb(data.result);
            }
        };

        function send(method, params = {}) {
            return new Promise((resolve) => {
                const id = reqId++;
                pending.set(id, resolve);
                ws.send(JSON.stringify({ id, method, params }));
            });
        }

        await send('Page.enable');
        await send('Runtime.enable');

        async function evalJs(expr) {
            const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
            return res.result ? res.result.value : null;
        }

        // Navigate to hospital page
        await send('Page.navigate', { url: 'http://localhost:3000/pages/hospital/hospital.html' });
        await sleep(2500);

        // Inject super admin session matching user's screenshot
        console.log('Setting Super Admin session and opening user dropdown...');
        await evalJs(`
            const payload = {
                id: 1,
                name: "Vikramaditya Rathore",
                role: "super_admin",
                roles: ["super_admin"],
                department: "admin",
                exp: Math.floor(Date.now() / 1000) + 86400
            };
            const mockJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." + btoa(JSON.stringify(payload)) + ".sig";
            const mockUser = {
                id: 1,
                name: "Vikramaditya Rathore",
                email: "superadmin@gorakhpur.gov.in",
                role: "super_admin",
                roles: ["super_admin"],
                department: "admin",
                badge_number: "GKP-DIR-001"
            };
            SmartCityAuth.setSession(mockJwt, mockUser);
            SmartCityAuth.renderUserHeader();
        `);
        await sleep(1000);

        // Click the badge dropdown arrow to open the profile dropdown
        await evalJs(`
            const badge = document.getElementById("scGlobalUserBadge");
            if (badge) {
                const arrow = badge.querySelector("#scDropdownArrow") || badge;
                arrow.click();
            }
        `);
        await sleep(1500);

        // Capture screenshot of dropdown over the white tabs bar
        const shot = await send('Page.captureScreenshot', { format: 'png' });
        if (shot && shot.data) {
            const outPath = path.join(SCRATCH_DIR, 'dropdown_fixed_screenshot.png');
            fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
            console.log('📸 Screenshot saved: scratch/dropdown_fixed_screenshot.png');
        }

        // Check computed z-indexes
        const navZ = await evalJs('getComputedStyle(document.querySelector(".hospital-navbar")).zIndex');
        const tabsZ = await evalJs('getComputedStyle(document.querySelector(".layer-tabs-container")).zIndex');
        const ddZ = await evalJs('getComputedStyle(document.getElementById("scGlobalUserDropdown")).zIndex');
        console.log(`Computed z-index values -> Navbar: ${navZ}, Tabs bar: ${tabsZ}, Dropdown: ${ddZ}`);

        console.log('Test completed successfully.');

    } catch (e) {
        console.error('Error during test:', e);
    } finally {
        if (ws) ws.close();
        try { edge.kill(); } catch (e) {}
    }
}

runTest();
