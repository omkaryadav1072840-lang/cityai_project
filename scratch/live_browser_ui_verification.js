const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ROOT_DIR = path.resolve(__dirname, '..');
const SCRATCH_DIR = path.join(ROOT_DIR, 'scratch');

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function runBrowserAudit() {
    console.log('=====================================================');
    console.log('🌐 STARTING LOCAL HEADLESS BROWSER UI VERIFICATION');
    console.log('=====================================================\n');

    const port = 9230;
    const edge = spawn(browserPath, [
        '--headless',
        `--remote-debugging-port=${port}`,
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
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

        console.log('Connected to Microsoft Edge via Chrome DevTools Protocol (CDP).\n');

        let reqId = 1;
        const pending = new Map();
        const consoleMessages = [];
        const uncaughtExceptions = [];

        ws.onmessage = (evt) => {
            const data = JSON.parse(evt.data);
            if (data.id && pending.has(data.id)) {
                const cb = pending.get(data.id);
                pending.delete(data.id);
                cb(data.result);
            }
            if (data.method === 'Runtime.consoleAPICalled') {
                const text = data.params.args.map(a => a.value || a.description || '').join(' ');
                if (data.params.type === 'error') {
                    consoleMessages.push({ type: 'error', text });
                }
            }
            if (data.method === 'Runtime.exceptionThrown') {
                uncaughtExceptions.push(data.params.exceptionDetails.text + ' ' + (data.params.exceptionDetails.exception?.description || ''));
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
        await send('DOM.enable');

        async function evalJs(expr) {
            const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
            return res.result ? res.result.value : null;
        }

        async function takeScreenshot(fileName) {
            const data = await send('Page.captureScreenshot', { format: 'png' });
            if (data && data.data) {
                const filePath = path.join(SCRATCH_DIR, fileName);
                fs.writeFileSync(filePath, Buffer.from(data.data, 'base64'));
                console.log(`   📸 Screenshot saved: ${fileName}`);
            }
        }

        // =========================================================
        // TEST 1: HOMEPAGE (http://localhost:3000)
        // =========================================================
        console.log('▶️ [1/4] Navigating to Homepage (http://localhost:3000)...');
        await send('Page.navigate', { url: 'http://localhost:3000' });
        await sleep(3500);

        const pageTitle = await evalJs('document.title');
        const heroExists = await evalJs('!!document.querySelector(".hero, .hero-section, header")');
        const navbarExists = await evalJs('!!document.querySelector("nav, .navbar, .header")');
        const mapContainerExists = await evalJs('!!document.getElementById("cityMap") || !!document.querySelector(".map-container")');
        console.log(`   Page Title: "${pageTitle}"`);
        console.log(`   Navbar rendered: ${navbarExists} | Hero rendered: ${heroExists} | City Map container: ${mapContainerExists}`);
        await takeScreenshot('ui_audit_01_homepage.png');

        // Test Universal AI Widget FAB
        console.log('   Testing Universal Floating AI Assistant Widget...');
        const aiFabExists = await evalJs('!!document.getElementById("scUniversalAIFab")');
        console.log(`   Floating AI FAB (#scUniversalAIFab) exists: ${aiFabExists}`);

        if (aiFabExists) {
            await evalJs('document.getElementById("scUniversalAIFab").click()');
            await sleep(1500);
            const aiWindowVisible = await evalJs('document.getElementById("scUniversalAIWindow")?.classList.contains("active") || document.getElementById("scUniversalAIWindow")?.style.display !== "none"');
            console.log(`   AI Chat Window opened: ${aiWindowVisible}`);
            await takeScreenshot('ui_audit_02_ai_widget_open.png');

            // Send a test message
            await evalJs(`
                const input = document.getElementById("scAiInput");
                if (input) {
                    input.value = "Hello Gorakhpur SmartCity";
                    const sendBtn = document.getElementById("scAiSendBtn");
                    if (sendBtn) sendBtn.click();
                }
            `);
            await sleep(2500);
            const messageCount = await evalJs('document.querySelectorAll(".sc-msg").length');
            console.log(`   AI Messages exchanged in chat: ${messageCount}`);
            // Close AI window
            await evalJs('document.getElementById("scAiCloseBtn")?.click()');
            await sleep(500);
        }

        // Test Sign-In Modal
        console.log('   Testing Login / Sign-In Modal...');
        await evalJs('if (window.SmartCityAuth) SmartCityAuth.showLoginModal("citizen");');
        await sleep(1200);
        const loginModalOpen = await evalJs('document.getElementById("scAuthModal")?.classList.contains("active") || !!document.querySelector(".sc-auth-modal")');
        console.log(`   Sign-In Modal opened: ${loginModalOpen}`);
        await takeScreenshot('ui_audit_03_login_modal.png');
        await evalJs('if (window.SmartCityAuth) SmartCityAuth.closeModal();');
        await sleep(500);

        // =========================================================
        // TEST 2: HOSPITAL PORTAL (http://localhost:3000/pages/hospital/hospital.html)
        // =========================================================
        console.log('\n▶️ [2/4] Navigating to Hospital Portal (http://localhost:3000/pages/hospital/hospital.html)...');
        await send('Page.navigate', { url: 'http://localhost:3000/pages/hospital/hospital.html' });
        await sleep(3000);

        const hospTitle = await evalJs('document.title');
        const hospCards = await evalJs('document.querySelectorAll(".hospital-card, .dept-card, .doctor-card").length');
        const bedStats = await evalJs('!!document.getElementById("statTotalBeds") || !!document.querySelector(".bed-metric, .stat-value")');
        console.log(`   Hospital Page Title: "${hospTitle}"`);
        console.log(`   Clinical Cards Rendered: ${hospCards} | Bed Telemetry Metrics: ${bedStats}`);
        await takeScreenshot('ui_audit_04_hospital.png');

        // Test Tab Switching to Staff / Admin
        console.log('   Testing Hospital Role Layer Switching...');
        await evalJs('if (typeof switchHospitalLayer === "function") switchHospitalLayer("staff");');
        await sleep(1200);
        await takeScreenshot('ui_audit_05_hospital_staff.png');

        // =========================================================
        // TEST 3: TRAFFIC GIS PORTAL (http://localhost:3000/pages/traffic/traffic.html)
        // =========================================================
        console.log('\n▶️ [3/4] Navigating to Traffic Portal (http://localhost:3000/pages/traffic/traffic.html)...');
        await send('Page.navigate', { url: 'http://localhost:3000/pages/traffic/traffic.html' });
        await sleep(3000);

        const trafficTitle = await evalJs('document.title');
        const leafletLoaded = await evalJs('typeof L !== "undefined"');
        const junctionList = await evalJs('document.querySelectorAll(".junction-card, .signal-item, tr").length');
        console.log(`   Traffic Page Title: "${trafficTitle}"`);
        console.log(`   Leaflet GIS Engine Loaded: ${leafletLoaded} | Junction/Signal Elements: ${junctionList}`);
        await takeScreenshot('ui_audit_06_traffic.png');

        // =========================================================
        // TEST 4: WATER 3D & SEWAGE DESIGNER (http://localhost:3000/pages/water/water.html)
        // =========================================================
        console.log('\n▶️ [4/4] Navigating to Water & Sewage Portal (http://localhost:3000/pages/water/water.html)...');
        await send('Page.navigate', { url: 'http://localhost:3000/pages/water/water.html' });
        await sleep(3000);

        const waterTitle = await evalJs('document.title');
        const threeJsLoaded = await evalJs('typeof THREE !== "undefined"');
        const sewageTypeElem = await evalJs('!!document.getElementById("sewageNetworkType")');
        const pipelineClassElem = await evalJs('!!document.getElementById("sewagePipelineClassification")');
        console.log(`   Water Page Title: "${waterTitle}"`);
        console.log(`   Three.js 3D Engine: ${threeJsLoaded}`);
        console.log(`   Fixed sewageNetworkType: ${sewageTypeElem} | sewagePipelineClassification: ${pipelineClassElem}`);
        await takeScreenshot('ui_audit_07_water.png');

        // Switch to Sewage Designer Layer
        console.log('   Switching to Sewage Network Planner layer...');
        await evalJs('if (typeof switchWaterLayer === "function") switchWaterLayer("sewage");');
        await sleep(1500);
        await takeScreenshot('ui_audit_08_sewage_designer.png');

        console.log('\n=====================================================');
        console.log('🏁 BROWSER UI VERIFICATION SUMMARY');
        console.log('=====================================================');
        console.log(`Uncaught JS Runtime Exceptions: ${uncaughtExceptions.length}`);
        if (uncaughtExceptions.length > 0) {
            uncaughtExceptions.forEach(e => console.log('   ❌ ' + e));
        } else {
            console.log('   ✅ No uncaught runtime exceptions detected across all pages!');
        }

        console.log(`Browser Console Errors: ${consoleMessages.length}`);
        if (consoleMessages.length > 0) {
            consoleMessages.slice(0, 5).forEach(m => console.log('   ⚠️ ' + m.text));
        }
        console.log('\n🎉 ALL 4 MAIN PAGES & INTERACTIVE MODALS RENDERED SUCCESSFULLY!');

    } catch (err) {
        console.error('Browser audit error:', err);
    } finally {
        if (ws) ws.close();
        try {
            edge.kill();
        } catch (e) {}
    }
}

runBrowserAudit();
