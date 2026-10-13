const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const jwt = require(path.join(__dirname, '../backend/node_modules/jsonwebtoken'));

const JWT_SECRET = process.env.JWT_SECRET || 'smartcity_super_secret_jwt_key_gorakhpur_2026';

let edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
if (!fs.existsSync(edgePath)) {
    edgePath = 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe';
}

const artifactDir = 'C:\\Users\\Omkar\\.gemini\\antigravity-ide\\brain\\7977112d-1503-4df9-af82-3afaa76de147';
if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
}

// Generate valid Water Admin JWT
const adminToken = jwt.sign({
    id: 'ADMIN-WATER-001',
    name: 'Superintendent Eng. V. K. Sharma',
    role: 'admin',
    department: 'water',
    subRole: 'Water Admin'
}, JWT_SECRET, { expiresIn: '2h' });

async function verifySewagePlannerInBrowser() {
    console.log("🌐 Starting Sewage Planner Browser CDP Verification...");

    const port = 9247;
    const proc = spawn(edgePath, [
        '--headless',
        `--remote-debugging-port=${port}`,
        '--window-size=1520,1080',
        '--disable-gpu',
        'http://localhost:5000/pages/water/water.html'
    ]);

    const consoleLogs = [];
    const consoleErrors = [];

    await new Promise(r => setTimeout(r, 2500));

    try {
        const listRes = await fetch(`http://127.0.0.1:${port}/json`);
        const tabs = await listRes.json();
        const tab = tabs.find(t => t.url.includes('water.html'));

        if (!tab) {
            throw new Error("Could not find water.html browser tab");
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
            const d = JSON.parse(e.data);
            if (d.method === 'Runtime.consoleAPICalled') {
                const text = (d.params.args || []).map(a => a.value || a.description || '').join(' ');
                consoleLogs.push({ type: d.params.type, text });
                if (d.params.type === 'error') {
                    consoleErrors.push(text);
                }
            }
            if (d.id && pendingCallbacks.has(d.id)) {
                const { resolve, reject } = pendingCallbacks.get(d.id);
                pendingCallbacks.delete(d.id);
                if (d.error) reject(d.error);
                else resolve(d.result);
            }
        };

        await new Promise(res => { ws.onopen = res; });
        console.log(`Connected to Edge CDP on port ${port}.`);

        await send('Page.enable');
        await send('Runtime.enable');

        // Step 1: Inject Token and User into LocalStorage
        console.log("🔑 Injecting Water Admin Credentials into LocalStorage...");
        await send('Runtime.evaluate', {
            expression: `
                (() => {
                    localStorage.setItem('token', '${adminToken}');
                    localStorage.setItem('smartcity_token', '${adminToken}');
                    localStorage.setItem('waterRole', 'admin');
                    localStorage.setItem('user', JSON.stringify({
                        id: 'ADMIN-WATER-001',
                        name: 'Superintendent Eng. V. K. Sharma',
                        role: 'admin',
                        department: 'water',
                        subRole: 'Water Admin'
                    }));
                    if (window.SmartCityAuth) {
                        window.SmartCityAuth.setSession('${adminToken}', {
                            id: 'ADMIN-WATER-001',
                            name: 'Superintendent Eng. V. K. Sharma',
                            role: 'admin',
                            department: 'water',
                            subRole: 'Water Admin'
                        });
                    }
                    return { success: true };
                })()
            `,
            returnByValue: true
        });

        // Reload page to let components initialize with authorized credentials
        await send('Page.reload');
        await new Promise(r => setTimeout(r, 2500));

        // Step 2: Switch to Sewage Network Planner Tab
        console.log("🔍 Clicking Sewage Network Planner tab (#tab-btn-sewage)...");
        const tabClick = await send('Runtime.evaluate', {
            expression: `
                (() => {
                    const btn = document.getElementById('tab-btn-sewage');
                    if (!btn) return { exists: false };
                    btn.click();
                    return { exists: true, text: btn.innerText.trim(), isActive: btn.classList.contains('active') };
                })()
            `,
            returnByValue: true
        });
        console.log("  Tab Check Result:", tabClick.result.value);

        // Allow async loading of corridors and routes
        await new Promise(r => setTimeout(r, 2500));

        // Step 3: Check Sewage Planner UI Component State
        console.log("🔍 Inspecting Sewage Planner UI Container & RBAC Gatekeeper...");
        const uiCheck = await send('Runtime.evaluate', {
            expression: `
                (() => {
                    const layer = document.getElementById('layer-sewage-content');
                    const mainPlanner = document.getElementById('sewagePlannerMain');
                    const gateNotice = document.getElementById('sewageGatekeeper');
                    const selectCorr = document.getElementById('sewageCorridorSelect');
                    const routeName = document.getElementById('sewageRouteName');
                    const hudLength = document.getElementById('sewageMetricLength');
                    const hudManholes = document.getElementById('sewageMetricManholes');
                    const hudStatus = document.getElementById('sewageRouteStatusBadge');
                    const tableRows = document.querySelectorAll('#sewageRoutesTableBody tr').length;
                    
                    return {
                        layerVisible: layer ? window.getComputedStyle(layer).display !== 'none' : false,
                        plannerVisible: mainPlanner ? window.getComputedStyle(mainPlanner).display !== 'none' : false,
                        gatekeeperVisible: gateNotice ? window.getComputedStyle(gateNotice).display !== 'none' : false,
                        corridorsCount: selectCorr ? selectCorr.options.length : 0,
                        tableRowsCount: tableRows,
                        selectedRouteName: routeName ? routeName.value : '',
                        routeLength: hudLength ? hudLength.innerText : '',
                        manholesCount: hudManholes ? hudManholes.innerText : '',
                        routeStatus: hudStatus ? hudStatus.innerText : ''
                    };
                })()
            `,
            returnByValue: true
        });
        console.log("  UI State Result:", uiCheck.result.value);

        // Capture 2D Screenshot
        const snap2D = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(artifactDir, 'sewage_planner_2d_verified.png'), Buffer.from(snap2D.data, 'base64'));
        console.log("  📸 Captured 2D Sewage Planner Screenshot: sewage_planner_2d_verified.png");

        // Step 4: Click 'Validate Norms'
        console.log("⚙️ Triggering Route Engineering Validation (#btnSewageValidate)...");
        const valClick = await send('Runtime.evaluate', {
            expression: `
                (() => {
                    const btn = document.getElementById('btnSewageValidate');
                    if (btn) btn.click();
                    return { clicked: !!btn };
                })()
            `,
            returnByValue: true
        });
        console.log("  Validation Button Clicked:", valClick.result.value);

        await new Promise(r => setTimeout(r, 2000));

        const valResult = await send('Runtime.evaluate', {
            expression: `
                (() => {
                    const banner = document.getElementById('sewageValidationResultsBox');
                    return {
                        hasBanner: !!banner,
                        bannerHtml: banner ? banner.innerHTML.slice(0, 350) : ''
                    };
                })()
            `,
            returnByValue: true
        });
        console.log("  Validation Banner Output:", valResult.result.value);

        // Step 5: Switch to 3D Pipeline Explorer and Render Proposed Sewer Line
        console.log("🧊 Switching to 3D Pipeline Explorer via #btnView3D...");
        await send('Runtime.evaluate', {
            expression: `
                (() => {
                    const btn3D = document.getElementById('btnView3D');
                    if (btn3D) btn3D.click();
                    return { clicked: !!btn3D };
                })()
            `,
            returnByValue: true
        });

        await new Promise(r => setTimeout(r, 2500));

        // Check Three.js Scene and planned sewage objects
        console.log("🔍 Checking Three.js 3D Pipeline Scene for Proposed Sewer Pipe...");
        const threeCheck = await send('Runtime.evaluate', {
            expression: `
                (() => {
                    const explorer = window.Water3DExplorer;
                    const container = document.getElementById('water3DContainer');
                    const isVisible = container && window.getComputedStyle(container).display !== 'none';
                    if (!explorer) return { has3D: false };
                    
                    const group = explorer.getPlannedSewageGroup ? explorer.getPlannedSewageGroup() : null;
                    const sewerChildren = group ? group.children.length : 0;
                    
                    // Zoom/Focus camera on sewer route
                    if (typeof explorer.focusOnSewageRoute === 'function') {
                        explorer.focusOnSewageRoute();
                    }
                    
                    return {
                        has3D: true,
                        isVisible,
                        pipeObjectsCount: explorer.getPipeMeshes ? explorer.getPipeMeshes().length : 0,
                        sewerObjectsCount: sewerChildren
                    };
                })()
            `,
            returnByValue: true
        });
        console.log("  3D Scene Check Result:", threeCheck.result.value);

        await new Promise(r => setTimeout(r, 1000));

        // Capture 3D Screenshot
        const snap3D = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(artifactDir, 'sewage_planner_3d_verified.png'), Buffer.from(snap3D.data, 'base64'));
        console.log("  📸 Captured 3D Pipeline Screenshot: sewage_planner_3d_verified.png");

        console.log("\n=======================================================");
        console.log("Console Errors Logged during run:", consoleErrors.length);
        if (consoleErrors.length > 0) {
            consoleErrors.forEach(err => console.log("  ⚠️ [Error]", err));
        } else {
            console.log("  ✅ Zero runtime errors encountered!");
        }
        console.log("=======================================================\n");

        ws.close();
        proc.kill();
        console.log("🎉 Browser CDP Verification Finished Successfully!");

    } catch (err) {
        console.error("❌ CDP Verification Failed:", err);
        try { proc.kill(); } catch (e) {}
        process.exit(1);
    }
}

verifySewagePlannerInBrowser();
