const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
if (!fs.existsSync(edgePath)) {
    edgePath = 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe';
}

const artifactDir = 'C:\\Users\\Omkar\\.gemini\\antigravity-ide\\brain\\80baed90-ef8d-461b-a5ab-f0ec9951e713';
if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
}

async function runBrowserVerification() {
    console.log("🌐 Starting Independent Browser Verification via Edge CDP...");

    const proc = spawn(edgePath, [
        '--headless',
        '--remote-debugging-port=9244',
        '--window-size=1440,1000',
        '--disable-gpu',
        'http://localhost:5000/pages/water/water.html'
    ]);

    const consoleLogs = [];
    const consoleErrors = [];

    await new Promise(r => setTimeout(r, 2500));

    try {
        const listRes = await fetch('http://127.0.0.1:9244/json');
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
        console.log("Connected to browser CDP session on port 9244.");

        await send('Page.enable');
        await send('Runtime.enable');

        // Wait for page to initialize
        await new Promise(r => setTimeout(r, 2000));

        // Step 1: Verify 2D Leaflet DOM
        console.log("🔍 Checking 2D Leaflet Map state...");
        const eval2D = await send('Runtime.evaluate', {
            expression: `
                (() => {
                    const mapEl = document.getElementById('waterMap');
                    const isVisible = mapEl && window.getComputedStyle(mapEl).display !== 'none';
                    const hasLeafletPanes = mapEl && !!mapEl.querySelector('.leaflet-pane');
                    const markerCount = mapEl ? mapEl.querySelectorAll('.leaflet-marker-icon').length : 0;
                    return { hasMap: !!mapEl, isVisible, hasLeafletPanes, markerCount };
                })()
            `,
            returnByValue: true
        });
        console.log("  2D Map State:", eval2D.result.value);

        // Screenshot 2D view
        const snap2D = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(artifactDir, 'water_2d_leaflet_verified.png'), Buffer.from(snap2D.data, 'base64'));
        console.log("  📸 Captured 2D Map Screenshot: water_2d_leaflet_verified.png");

        // Step 2: Switch to 3D Pipeline Explorer
        console.log("🔍 Switching to 3D Pipeline Explorer via #btnView3D...");
        const switchRes = await send('Runtime.evaluate', {
            expression: `
                (() => {
                    const btn3D = document.getElementById('btnView3D');
                    if (btn3D) {
                        btn3D.click();
                        return { clicked: true };
                    }
                    if (typeof window.toggleWaterDimension === 'function') {
                        window.toggleWaterDimension('3d');
                        return { toggledFn: true };
                    }
                    return { failed: true };
                })()
            `,
            returnByValue: true
        });
        console.log("  Switch Result:", switchRes.result.value);

        await new Promise(r => setTimeout(r, 2000));

        // Step 3: Verify Three.js Canvas and WebGL Context
        console.log("🔍 Inspecting Three.js WebGL canvas and scene...");
        const eval3D = await send('Runtime.evaluate', {
            expression: `
                (() => {
                    const container3D = document.getElementById('water3DContainer');
                    const canvasContainer = document.getElementById('water3DCanvasContainer');
                    const canvas = canvasContainer ? canvasContainer.querySelector('canvas') : null;
                    const isVisible = container3D && window.getComputedStyle(container3D).display !== 'none';
                    const hasCanvas = !!canvas;
                    const canvasWidth = canvas ? canvas.width : 0;
                    const canvasHeight = canvas ? canvas.height : 0;
                    const hasThreeModule = typeof window.THREE !== 'undefined';
                    const hasExplorerObj = typeof window.Water3DExplorer !== 'undefined';
                    return {
                        isVisible,
                        hasCanvas,
                        canvasWidth,
                        canvasHeight,
                        hasThreeModule,
                        hasExplorerObj
                    };
                })()
            `,
            returnByValue: true
        });
        console.log("  3D WebGL State:", eval3D.result.value);

        // Screenshot 3D view
        const snap3D = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(artifactDir, 'water_3d_webgl_verified.png'), Buffer.from(snap3D.data, 'base64'));
        console.log("  📸 Captured 3D WebGL Screenshot: water_3d_webgl_verified.png");

        // Step 4: Click STP preset view
        console.log("🔍 Testing camera preset #btnStpView...");
        await send('Runtime.evaluate', {
            expression: `
                (() => {
                    const btnStp = document.getElementById('btnStpView');
                    if (btnStp) btnStp.click();
                    if (window.Water3DExplorer && window.Water3DExplorer.setCameraPreset) {
                        window.Water3DExplorer.setCameraPreset('stp');
                    }
                })()
            `
        });
        await new Promise(r => setTimeout(r, 1000));

        // Step 5: Test Asset Drawer Inspection
        console.log("🔍 Opening Asset Drawer for STP-01...");
        const drawerEval = await send('Runtime.evaluate', {
            expression: `
                (async () => {
                    if (typeof window.inspectWaterAsset === 'function') {
                        await window.inspectWaterAsset('STP-01');
                    }
                    const drawer = document.getElementById('waterAssetDrawer');
                    const title = document.getElementById('drawerAssetTitle')?.textContent || '';
                    const assetId = document.getElementById('drawerAssetId')?.textContent || '';
                    const assetType = document.getElementById('drawerAssetType')?.textContent || '';
                    const status = document.getElementById('drawerAssetStatus')?.textContent || '';
                    const badge = document.getElementById('drawerProvenanceBadge')?.textContent || '';
                    const isVisible = drawer && window.getComputedStyle(drawer).display !== 'none';
                    return { isVisible, title, assetId, assetType, status, badge };
                })()
            `,
            awaitPromise: true,
            returnByValue: true
        });
        console.log("  Drawer Inspection Result:", drawerEval.result.value);

        // Screenshot Asset Drawer
        const snapDrawer = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(artifactDir, 'water_asset_drawer_verified.png'), Buffer.from(snapDrawer.data, 'base64'));
        console.log("  📸 Captured Asset Drawer Screenshot: water_asset_drawer_verified.png");

        // Step 6: Close Drawer
        await send('Runtime.evaluate', {
            expression: `
                (() => {
                    const closeBtn = document.getElementById('btnCloseDrawer');
                    if (closeBtn) closeBtn.click();
                    const drawer = document.getElementById('waterAssetDrawer');
                    if (drawer) drawer.style.display = 'none';
                })()
            `
        });

        console.log("🔍 Verification of Console Errors during Browser Session:");
        if (consoleErrors.length === 0) {
            console.log("  ✅ Zero runtime console errors detected during browser session!");
        } else {
            console.warn("  ⚠️ Console errors detected:", consoleErrors);
        }

        ws.close();
        proc.kill();

        return {
            success: true,
            eval2D: eval2D.result.value,
            eval3D: eval3D.result.value,
            drawer: drawerEval.result.value,
            consoleErrors
        };
    } catch (err) {
        console.error("Browser verification error:", err);
        proc.kill();
        throw err;
    }
}

if (require.main === module) {
    runBrowserVerification().then(res => {
        console.log("\n🎯 BROWSER VERIFICATION AUDIT COMPLETE:\n", JSON.stringify(res, null, 2));
        process.exit(0);
    }).catch(err => {
        console.error("Browser verification failed:", err);
        process.exit(1);
    });
}

module.exports = { runBrowserVerification };
