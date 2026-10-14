const { spawn } = require('child_process');
const jwt = require('../backend/node_modules/jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'smartcity_super_secret_jwt_key_gorakhpur_2026';
const adminToken = jwt.sign(
    { id: 'WTR-ADM-01', staffId: 'WTR-ADMIN', name: 'Omkar Yadav (Water Director)', role: 'admin', department: 'water', email: 'wateradmin@smartcity.gov' },
    JWT_SECRET,
    { expiresIn: '7d' }
);

async function auditWaterPage() {
    console.log("🔍 Launching Headless Edge to audit Water page for runtime bugs and UI gaps...");

    const proc = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
        '--headless',
        '--remote-debugging-port=9270',
        '--window-size=1600,1200',
        '--disable-gpu',
        'http://localhost:5000/pages/water/water.html'
    ]);

    await new Promise(r => setTimeout(r, 2500));

    try {
        const tabs = await (await fetch('http://127.0.0.1:9270/json')).json();
        const tab = tabs.find(t => t.url && t.url.includes('water.html'));
        if (!tab) throw new Error("water.html tab not found!");

        const ws = new WebSocket(tab.webSocketDebuggerUrl);
        let id = 1;
        const pendingCallbacks = new Map();

        function send(method, params = {}) {
            return new Promise((resolve, reject) => {
                const curId = id++;
                pendingCallbacks.set(curId, { resolve, reject });
                ws.send(JSON.stringify({ id: curId, method, params }));
            });
        }

        ws.onmessage = (e) => {
            const d = JSON.parse(e.data);
            if (d.id && pendingCallbacks.has(d.id)) {
                const { resolve, reject } = pendingCallbacks.get(d.id);
                pendingCallbacks.delete(d.id);
                if (d.error) reject(d.error);
                else resolve(d.result);
            }
        };

        await new Promise(res => { ws.onopen = res; });
        console.log("Connected to browser session.");

        await send('Page.enable');
        await send('Runtime.enable');
        await send('Log.enable');

        const consoleErrors = [];
        const networkFailures = [];

        ws.addEventListener('message', (e) => {
            const d = JSON.parse(e.data);
            if (d.method === 'Runtime.consoleAPICalled' && (d.params.type === 'error' || d.params.type === 'warning')) {
                consoleErrors.push({
                    type: d.params.type,
                    args: d.params.args.map(a => a.value || a.description).join(' ')
                });
            } else if (d.method === 'Runtime.exceptionThrown') {
                consoleErrors.push({
                    type: 'exception',
                    text: d.params.exceptionDetails.text,
                    desc: d.params.exceptionDetails.exception?.description
                });
            }
        });

        // 1. Initial State Audit (Visitor Layer)
        console.log("--- Auditing Layer 1 (Citizen/Visitor) ---");
        await new Promise(r => setTimeout(r, 2000));

        // 2. Set Admin Session and switch to Staff Layer
        console.log("--- Auditing Layer 2 (Staff Operations) ---");
        await send('Runtime.evaluate', {
            expression: `
                (async () => {
                    const u = {
                        id: 'WTR-ADM-01',
                        name: 'Omkar Yadav (Water Director)',
                        role: 'admin',
                        department: 'water',
                        staffId: 'WTR-ADMIN-01'
                    };
                    const token = ${JSON.stringify(adminToken)};
                    if (window.SmartCityAuth && typeof window.SmartCityAuth.setSession === 'function') {
                        window.SmartCityAuth.setSession(token, u);
                    } else {
                        localStorage.setItem('smartCityJWT', token);
                        localStorage.setItem('smartCityCurrentUser', JSON.stringify(u));
                    }
                    if (typeof switchWaterLayer === 'function') switchWaterLayer('staff');
                })()
            `,
            awaitPromise: true
        });
        await new Promise(r => setTimeout(r, 2000));

        // 3. Switch to Admin Layer
        console.log("--- Auditing Layer 3 (Admin Command & SCADA Assets) ---");
        await send('Runtime.evaluate', {
            expression: `
                (async () => {
                    if (typeof switchWaterLayer === 'function') switchWaterLayer('admin');
                })()
            `,
            awaitPromise: true
        });
        await new Promise(r => setTimeout(r, 2000));

        // 4. Test Workspace switches (Library, Existing, Build)
        console.log("--- Auditing Workspaces (Build, Library, Existing) ---");
        await send('Runtime.evaluate', {
            expression: `
                (async () => {
                    if (typeof switchWaterWorkspace === 'function') {
                        switchWaterWorkspace('library');
                        await new Promise(r => setTimeout(r, 500));
                        switchWaterWorkspace('existing');
                        await new Promise(r => setTimeout(r, 500));
                        switchWaterWorkspace('build');
                    }
                })()
            `,
            awaitPromise: true
        });
        await new Promise(r => setTimeout(r, 1000));

        // 5. Test 2D / 3D Dimension toggle
        console.log("--- Auditing 2D / 3D Dimension Toggle ---");
        await send('Runtime.evaluate', {
            expression: `
                (async () => {
                    if (typeof toggleWaterDimension === 'function') {
                        toggleWaterDimension('3d');
                        await new Promise(r => setTimeout(r, 800));
                        toggleWaterDimension('2d');
                    }
                })()
            `,
            awaitPromise: true
        });
        await new Promise(r => setTimeout(r, 1000));

        // 6. Inspect missing elements or broken image / link targets
        const domAudit = await send('Runtime.evaluate', {
            expression: `
                (() => {
                    const issues = [];
                    // Check broken images
                    document.querySelectorAll('img').forEach(img => {
                        if (!img.naturalWidth && img.src && !img.src.startsWith('data:')) {
                            issues.push({ type: 'broken-image', src: img.src });
                        }
                    });
                    // Check buttons with onclick where function is undefined
                    document.querySelectorAll('button[onclick]').forEach(btn => {
                        const attr = btn.getAttribute('onclick');
                        const fnName = attr.split('(')[0].trim();
                        if (fnName && typeof window[fnName] === 'undefined') {
                            issues.push({ type: 'missing-onclick-fn', fnName, btnId: btn.id, text: btn.textContent.trim().slice(0, 30) });
                        }
                    });
                    // Check inputs missing labels or ids
                    const unstyledSelects = Array.from(document.querySelectorAll('select')).filter(s => {
                        const bg = window.getComputedStyle(s).backgroundColor;
                        return bg === 'rgb(15, 23, 42)' || bg === 'black';
                    }).length;

                    return { issues, unstyledSelects };
                })()
            `,
            returnByValue: true
        });

        console.log("\n================ AUDIT SUMMARY ================");
        console.log("Captured Console Errors/Warnings:", consoleErrors.length);
        consoleErrors.forEach((err, i) => {
            console.log(`  [${i+1}] ${err.type.toUpperCase()}: ${err.args || (err.text + ': ' + err.desc)}`);
        });

        console.log("\nCaptured DOM Issues:", domAudit.result.value.issues.length);
        domAudit.result.value.issues.forEach((iss, i) => {
            console.log(`  [${i+1}] ${JSON.stringify(iss)}`);
        });
        console.log("Unstyled/Harsh Dark Selects found:", domAudit.result.value.unstyledSelects);

        ws.close();
        proc.kill();
    } catch (err) {
        console.error("Error during audit:", err);
        try { proc.kill(); } catch (_) {}
    }
}

auditWaterPage();
