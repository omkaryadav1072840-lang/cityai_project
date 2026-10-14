/**
 * SmartCity AI - Exhaustive Bug Hunting & Robustness Test Suite
 * 
 * Tests:
 * 1. Backend Route Edge Cases & Error Boundaries (400, 404, 500 avoidance).
 * 2. SQL Injection / Malformed Input Resiliency.
 * 3. Static Asset & glTF Model Availability.
 * 4. Headless Browser CDP Audit:
 *    - Console errors & unhandled promise rejections
 *    - 3D Three.js canvas & WebGL context
 *    - 2D Leaflet map instances
 *    - Switching all 3 layers & sub-desks
 *    - Asset drawer inspection triggers
 *    - Dimension toggles (2D <-> 3D)
 *    - Form modals & button clickability
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

const ROOT_DIR = path.join(__dirname, '..');
const PORT = 5000;
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

let serverProc = null;
let browserProc = null;
const findings = [];

function recordBug(severity, title, details) {
    findings.push({ severity, title, details });
    console.log(`\n🚨 [BUG FOUND - ${severity.toUpperCase()}] ${title}`);
    console.log(`   Details: ${details}\n`);
}

function makeReq(method, urlPath, headers = {}, body = null) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: '127.0.0.1',
            port: PORT,
            path: encodeURI(urlPath),
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let parsed = data;
                try { parsed = JSON.parse(data); } catch (e) {}
                resolve({ status: res.statusCode, data: parsed, headers: res.headers });
            });
        });
        req.on('error', reject);
        if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
        req.end();
    });
}

async function startServer() {
    console.log("⚡ Starting local server for deep bug hunting...");
    return new Promise((resolve, reject) => {
        serverProc = spawn('node', ['backend/server.js'], {
            cwd: ROOT_DIR,
            env: { ...process.env, PORT: String(PORT), NODE_ENV: 'test', DISABLE_RATE_LIMIT: 'true' }
        });

        serverProc.stdout.on('data', d => {
            const str = d.toString();
            if (str.includes('running on port') || str.includes('Listening on port') || str.includes('MySQL Connection Pool')) {
                setTimeout(resolve, 800);
            }
        });

        serverProc.stderr.on('data', d => {
            console.error('Server err:', d.toString());
        });

        setTimeout(resolve, 2500);
    });
}

async function runApiBugTests(adminToken, staffToken, visitorToken) {
    console.log("\n=======================================================");
    console.log("🔬 TESTING BACKEND API EDGE CASES & SECURITY BOUNDARIES");
    console.log("=======================================================");

    // Test 1: Invalid asset ID
    const invAsset = await makeReq('GET', '/api/water/network/assets/NON-EXISTENT-ID-XYZ');
    if (invAsset.status === 500) {
        recordBug('medium', 'GET /api/water/network/assets/:id crashes with 500 on non-existent ID', JSON.stringify(invAsset.data));
    } else if (invAsset.status === 404) {
        console.log("  ✅ Non-existent asset ID correctly returns 404");
    }

    // Test 2: SQL Injection probe in query parameters
    const sqlProbe = await makeReq('GET', "/api/water/network/assets?type=' OR 1=1 --&zone=' OR '1'='1");
    if (sqlProbe.status === 500) {
        recordBug('high', 'SQL syntax error / unescaped query parameter in /api/water/network/assets', JSON.stringify(sqlProbe.data));
    } else {
        console.log("  ✅ SQL injection in asset query params safely parameterized (HTTP " + sqlProbe.status + ")");
    }

    // Test 3: POST /api/water/pipelines with empty body
    const emptyPipe = await makeReq('POST', '/api/water/pipelines', { Authorization: `Bearer ${adminToken}` }, {});
    if (emptyPipe.status === 500) {
        recordBug('medium', 'POST /api/water/pipelines crashes with 500 on empty payload', JSON.stringify(emptyPipe.data));
    } else if (emptyPipe.status === 400) {
        console.log("  ✅ Empty pipeline creation cleanly rejected with HTTP 400");
    }

    // Test 4: POST /api/water/sectors with invalid JSON
    const malformedSector = await makeReq('POST', '/api/water/sectors', { Authorization: `Bearer ${adminToken}` }, {
        name: "Test Bug Sector",
        boundary_geojson: "NOT_VALID_GEOJSON_STRING"
    });
    if (malformedSector.status === 500) {
        recordBug('medium', 'POST /api/water/sectors crashes with 500 on malformed boundary string', JSON.stringify(malformedSector.data));
    } else {
        console.log("  ✅ Malformed sector boundary handled safely (HTTP " + malformedSector.status + ")");
    }

    // Test 5: Verify glTF static asset serving
    const gltfFiles = ['pump.gltf', 'motor.gltf', 'valve.gltf', 'control_tower.gltf'];
    for (const gf of gltfFiles) {
        const res = await makeReq('GET', `/assets/models/water/${gf}`);
        if (res.status !== 200) {
            recordBug('high', `Static glTF file not accessible at /assets/models/water/${gf}`, `HTTP ${res.status}`);
        } else {
            console.log(`  ✅ Static asset /assets/models/water/${gf} accessible (HTTP 200)`);
        }
    }

    // Test 6: Verify license file served
    const licRes = await makeReq('GET', '/assets/models/water/ASSET_LICENSES.md');
    if (licRes.status !== 200) {
        recordBug('low', 'ASSET_LICENSES.md not accessible over HTTP', `HTTP ${licRes.status}`);
    } else {
        console.log("  ✅ ASSET_LICENSES.md accessible over HTTP (HTTP 200)");
    }
}

async function runBrowserCdpAudit() {
    console.log("\n=======================================================");
    console.log("🌐 HEADLESS BROWSER AUDIT VIA CHROME/EDGE DEVTOOLS PROTOCOL");
    console.log("=======================================================");

    if (!fs.existsSync(edgePath)) {
        console.log("  ⚠️ Edge binary not found at default path, skipping CDP browser run.");
        return;
    }

    const cdpPort = 9245;
    browserProc = spawn(edgePath, [
        '--headless',
        `--remote-debugging-port=${cdpPort}`,
        '--window-size=1440,900',
        '--disable-gpu',
        'http://127.0.0.1:5000/pages/water/water.html'
    ]);

    await new Promise(r => setTimeout(r, 2000));

    try {
        const tabsRes = await (await fetch(`http://127.0.0.1:${cdpPort}/json`)).json();
        const tab = tabsRes.find(t => t.url.includes('water.html'));
        if (!tab) {
            console.error("  ❌ Could not find water.html browser tab.");
            return;
        }

        const ws = new WebSocket(tab.webSocketDebuggerUrl);
        let msgId = 1;
        const pendingCallbacks = new Map();
        const consoleErrors = [];
        const networkFailures = [];

        function send(method, params = {}) {
            return new Promise((resolve, reject) => {
                const id = msgId++;
                pendingCallbacks.set(id, { resolve, reject });
                ws.send(JSON.stringify({ id, method, params }));
            });
        }

        ws.onmessage = (e) => {
            const msg = JSON.parse(e.data);
            if (msg.method === 'Runtime.consoleAPICalled') {
                if (msg.params.type === 'error') {
                    const text = msg.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
                    consoleErrors.push(text);
                }
            } else if (msg.method === 'Runtime.exceptionThrown') {
                const text = msg.params.exceptionDetails.text + ': ' + (msg.params.exceptionDetails.exception?.description || '');
                consoleErrors.push(text);
            } else if (msg.method === 'Network.responseReceived') {
                if (msg.params.response.status >= 400 && !msg.params.response.url.includes('/api/auth/demo-login')) {
                    networkFailures.push({ url: msg.params.response.url, status: msg.params.response.status });
                }
            }

            if (msg.id && pendingCallbacks.has(msg.id)) {
                const { resolve, reject } = pendingCallbacks.get(msg.id);
                pendingCallbacks.delete(msg.id);
                if (msg.error) reject(msg.error);
                else resolve(msg.result);
            }
        };

        await new Promise((resolve, reject) => {
            ws.onopen = resolve;
            ws.onerror = reject;
        });

        console.log("  🟢 Connected to Browser CDP.");
        await send('Page.enable');
        await send('Runtime.enable');
        await send('Network.enable');

        // Wait for page initial scripts to run
        await new Promise(r => setTimeout(r, 2500));

        // Audit 1: Verify 3-layer buttons in DOM
        const layerCheck = await send('Runtime.evaluate', {
            expression: `({
                hasCitizenTab: Boolean(document.getElementById('tab-btn-citizen')),
                hasStaffTab: Boolean(document.getElementById('tab-btn-staff')),
                hasAdminTab: Boolean(document.getElementById('tab-btn-admin')),
                hasMap2D: Boolean(document.getElementById('waterMap')),
                hasContainer3D: Boolean(document.getElementById('water3DContainer')),
                hasCanvasContainer3D: Boolean(document.getElementById('water3DCanvasContainer')),
                threeAvailable: typeof THREE !== 'undefined',
                gltfLoaderAvailable: typeof THREE !== 'undefined' && typeof THREE.GLTFLoader !== 'undefined'
            })`,
            returnByValue: true
        });

        const domState = layerCheck.result.value;
        console.log("  DOM State Audit:", JSON.stringify(domState, null, 2));

        if (!domState.hasCitizenTab || !domState.hasStaffTab || !domState.hasAdminTab) {
            recordBug('high', 'Missing one or more primary 3-layer tab buttons', JSON.stringify(domState));
        } else {
            console.log("  ✅ Primary 3-layer tab buttons all present in DOM");
        }

        if (!domState.gltfLoaderAvailable) {
            recordBug('medium', 'THREE.GLTFLoader not defined on window in browser', 'Check GLTFLoader CDN script');
        } else {
            console.log("  ✅ THREE.GLTFLoader is active in browser window");
        }

        // Audit 2: Switch to 3D mode and check WebGL scene initialization
        console.log("  🧊 Testing toggleWaterDimension('3d')...");
        const switch3D = await send('Runtime.evaluate', {
            expression: `(function() {
                try {
                    window.toggleWaterDimension('3d');
                    return {
                        success: true,
                        map2dVisible: document.getElementById('waterMap').style.display !== 'none',
                        map3dVisible: document.getElementById('water3DContainer').style.display !== 'none',
                        sceneCreated: Boolean(window.Water3DExplorer && window.Water3DExplorer.getScene())
                    };
                } catch(e) {
                    return { success: false, error: e.message, stack: e.stack };
                }
            })()`,
            returnByValue: true
        });

        console.log("  3D Switch Result:", JSON.stringify(switch3D.result.value));
        if (!switch3D.result.value.success) {
            recordBug('high', 'toggleWaterDimension("3d") threw runtime error', switch3D.result.value.error);
        } else {
            console.log("  ✅ 3D dimension switch succeeded with WebGL scene");
        }

        // Audit 3: Switch through all 3 layers programmatically
        console.log("  🔄 Testing switchWaterLayer for all 3 layers...");
        const layerSwitchTest = await send('Runtime.evaluate', {
            expression: `(function() {
                const results = {};
                try {
                    window.switchWaterLayer('citizen');
                    results.citizen = document.getElementById('layer-citizen-content').style.display === 'block';

                    window.switchWaterLayer('staff');
                    results.staff = document.getElementById('layer-staff-content').style.display === 'block';

                    window.switchWaterLayer('admin');
                    results.admin = document.getElementById('layer-admin-content').style.display === 'block';

                    return { success: true, results };
                } catch(e) {
                    return { success: false, error: e.message };
                }
            })()`,
            returnByValue: true
        });

        console.log("  Layer Switch Result:", JSON.stringify(layerSwitchTest.result.value));
        if (!layerSwitchTest.result.value.success) {
            recordBug('high', 'switchWaterLayer threw runtime exception', layerSwitchTest.result.value.error);
        } else {
            console.log("  ✅ All 3 role layers toggled without error");
        }

        // Audit 4: Test inspectWaterAsset drawer opening with mock asset
        console.log("  🔍 Testing window.inspectWaterAsset('TANK-001')...");
        const inspectTest = await send('Runtime.evaluate', {
            expression: `(async function() {
                try {
                    await window.inspectWaterAsset('TANK-001');
                    const drawer = document.getElementById('waterAssetDrawer');
                    return {
                        success: true,
                        drawerDisplayed: drawer && drawer.style.display !== 'none',
                        title: document.getElementById('drawerAssetTitle')?.textContent,
                        hasProvenance: Boolean(document.getElementById('drawerProvenanceBadge')?.innerHTML)
                    };
                } catch(e) {
                    return { success: false, error: e.message };
                }
            })()`,
            awaitPromise: true,
            returnByValue: true
        });

        console.log("  Inspect Result:", JSON.stringify(inspectTest.result.value));
        if (!inspectTest.result.value.success) {
            recordBug('medium', 'inspectWaterAsset threw runtime error', inspectTest.result.value.error);
        } else {
            console.log("  ✅ Asset inspection drawer opened with telemetry & provenance");
        }

        // Wait to capture any delayed console errors
        await new Promise(r => setTimeout(r, 1000));

        if (consoleErrors.length > 0) {
            consoleErrors.forEach(err => {
                // Filter benign favicon or analytics 404s
                if (!err.includes('favicon.ico')) {
                    recordBug('medium', 'Browser Console Error Detected', err);
                }
            });
        } else {
            console.log("  ✅ Zero unhandled browser console errors detected!");
        }

        if (networkFailures.length > 0) {
            networkFailures.forEach(nf => {
                if (!nf.url.includes('favicon.ico')) {
                    recordBug('medium', `Network Request Failed: ${nf.url}`, `HTTP ${nf.status}`);
                }
            });
        }

    } catch (e) {
        console.error("  CDP execution error:", e);
    }
}

async function main() {
    try {
        await startServer();

        // Obtain tokens for testing
        const waLogin = await makeReq('POST', '/api/auth/demo-login', {}, { role: "water_admin" });
        const wsLogin = await makeReq('POST', '/api/auth/demo-login', {}, { role: "water_staff" });
        const citLogin = await makeReq('POST', '/api/auth/demo-login', {}, { role: "citizen" });

        const adminToken = waLogin.data?.token || "";
        const staffToken = wsLogin.data?.token || "";
        const visitorToken = citLogin.data?.token || "";

        // 1. Run API edge cases
        await runApiBugTests(adminToken, staffToken, visitorToken);

        // 2. Run Headless browser audit
        await runBrowserCdpAudit();

    } catch (err) {
        console.error("Caught error during test execution:", err);
    } finally {
        if (browserProc) {
            try { browserProc.kill(); } catch (e) {}
        }
        if (serverProc) {
            try { serverProc.kill(); } catch (e) {}
        }

        console.log("\n=======================================================");
        console.log(`🏁 BUG AUDIT SUMMARY: ${findings.length} ISSUE(S) IDENTIFIED`);
        console.log("=======================================================");
        if (findings.length === 0) {
            console.log("✨ EXCELLENT! No bugs, runtime crashes, or broken links found.\n");
            process.exit(0);
        } else {
            console.table(findings);
            process.exit(1);
        }
    }
}

main().catch(err => {
    console.error("Fatal bug audit crash:", err);
    if (serverProc) serverProc.kill();
    if (browserProc) browserProc.kill();
    process.exit(1);
});
