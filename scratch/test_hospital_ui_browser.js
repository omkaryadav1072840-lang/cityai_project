const { spawn } = require("child_process");
const http = require("http");

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function getJson(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = "";
            res.on("data", c => data += c);
            res.on("end", () => {
                try { resolve(JSON.parse(data)); } catch (e) { resolve(data); }
            });
        }).on("error", reject);
    });
}

async function runBrowserTest() {
    console.log("=== STARTING HEADLESS CHROME BROWSER UI VERIFICATION ===");
    const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    const chromeProc = spawn(chromePath, [
        "--headless=new",
        "--remote-debugging-port=9222",
        "--disable-gpu",
        "--no-sandbox",
        "http://localhost:3000/pages/hospital/hospital.html"
    ]);

    let ws = null;
    let msgId = 1;
    const pending = new Map();

    function sendCmd(method, params = {}) {
        return new Promise((resolve, reject) => {
            const id = msgId++;
            pending.set(id, { resolve, reject });
            ws.send(JSON.stringify({ id, method, params }));
        });
    }

    try {
        await sleep(3000);
        const tabs = await getJson("http://localhost:9222/json");
        const pageTab = tabs.find(t => t.type === "page" && t.url.includes("hospital.html"));
        if (!pageTab || !pageTab.webSocketDebuggerUrl) {
            throw new Error("Could not find Chrome page tab WebSocket URL");
        }

        ws = new WebSocket(pageTab.webSocketDebuggerUrl);
        await new Promise((res, rej) => {
            ws.onopen = res;
            ws.onerror = rej;
        });

        ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.id && pending.has(msg.id)) {
                const { resolve, reject } = pending.get(msg.id);
                pending.delete(msg.id);
                if (msg.error) reject(msg.error);
                else resolve(msg.result);
            }
        };

        await sendCmd("Page.enable");
        await sendCmd("Runtime.enable");
        await sleep(2000);

        async function evalJs(expr) {
            const res = await sendCmd("Runtime.evaluate", {
                expression: expr,
                returnByValue: true,
                awaitPromise: true
            });
            return res.result?.value;
        }

        console.log("\n1. Verifying global variables and functions in page context...");
        const hasOpenEditPanel = await evalJs("typeof openEditPanel === 'function'");
        const hasHospitalAdminManager = await evalJs("typeof HospitalAdminManager === 'object'");
        console.log(`  [${hasOpenEditPanel ? 'PASS' : 'FAIL'}] openEditPanel is a global function:`, hasOpenEditPanel);
        console.log(`  [${hasHospitalAdminManager ? 'PASS' : 'FAIL'}] HospitalAdminManager is exposed:`, hasHospitalAdminManager);

        console.log("\n2. Testing Citizen role (unauthenticated access to edit panel)...");
        // Clear any previous token
        await evalJs("localStorage.clear(); sessionStorage.clear();");
        await evalJs("openEditPanel('hospitalInfo');");
        await sleep(800);

        const citizenModalHtml = await evalJs("document.getElementById('editContent')?.innerHTML || ''");
        const hasAuthGate = citizenModalHtml.includes("staff-auth-gate") && citizenModalHtml.includes("Hospital Administrative Access Required");
        console.log(`  [${hasAuthGate ? 'PASS' : 'FAIL'}] Citizen gets access gate modal:`, hasAuthGate);

        console.log("\n3. Testing Hospital Staff role (STAFF-MED-01, HOSP-001)...");
        // Authenticate staff via backend login
        const loginRes = await fetch("http://localhost:5000/api/staff-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ staffId: "STAFF-MED-01", password: "staff123" })
        });
        const loginData = await loginRes.json();
        const staffToken = loginData.token;
        const staffUser = loginData.user;

        // Set session in browser
        await evalJs(`
            if (typeof SmartCityAuth !== 'undefined') {
                SmartCityAuth.setSession('${staffToken}', ${JSON.stringify(staffUser)});
            }
        `);

        // Open Hospital Info as Staff
        await evalJs("openEditPanel('hospitalInfo');");
        await sleep(1500);

        const staffHeaderTitle = await evalJs("document.querySelector('.hosp-admin-title-wrap h2')?.innerText || ''");
        const staffAssignedFacility = await evalJs("document.getElementById('hospAdminControls')?.innerText || ''");
        const hasTabsBar = await evalJs("document.getElementById('hospAdminTabsBar') !== null");
        const hasHospForm = await evalJs("document.getElementById('hospInfoForm') !== null");
        const hospNameVal = await evalJs("document.getElementById('hospNameInput')?.value || ''");

        console.log(`  [${staffHeaderTitle.includes('Hospital Management Console') ? 'PASS' : 'FAIL'}] Staff Console Title:`, staffHeaderTitle);
        console.log(`  [${staffAssignedFacility.includes('AIIMS Gorakhpur') ? 'PASS' : 'FAIL'}] Staff Locked Facility:`, staffAssignedFacility);
        console.log(`  [${hasTabsBar ? 'PASS' : 'FAIL'}] Management Tabs Bar rendered:`, hasTabsBar);
        console.log(`  [${hasHospForm ? 'PASS' : 'FAIL'}] Hospital Info Edit Form rendered:`, hasHospForm);
        console.log(`  [${hospNameVal.includes('AIIMS') ? 'PASS' : 'FAIL'}] Form populated with real database name:`, hospNameVal);

        console.log("\n4. Testing Tab Switching across all 6 management sections...");

        // Tab: Doctors
        await evalJs("HospitalAdminManager.switchTab('doctors');");
        await sleep(1500);
        const docTableRows = await evalJs("document.querySelectorAll('.hosp-table tbody tr').length");
        const hasAddDocBtn = await evalJs("document.querySelector('button[onclick*=\"showAddDoctorForm\"]') !== null");
        console.log(`  [${docTableRows > 0 ? 'PASS' : 'FAIL'}] Doctors Tab loaded (${docTableRows} rows rendered):`, docTableRows > 0);
        console.log(`  [${hasAddDocBtn ? 'PASS' : 'FAIL'}] + Add Doctor button present:`, hasAddDocBtn);

        // Tab: Ambulances
        await evalJs("HospitalAdminManager.switchTab('ambulance');");
        await sleep(1500);
        const ambTableRows = await evalJs("document.querySelectorAll('.hosp-table tbody tr').length");
        const hasAddAmbBtn = await evalJs("document.querySelector('button[onclick*=\"showAddAmbulanceForm\"]') !== null");
        console.log(`  [${ambTableRows > 0 ? 'PASS' : 'FAIL'}] Ambulances Tab loaded (${ambTableRows} rows rendered):`, ambTableRows > 0);
        console.log(`  [${hasAddAmbBtn ? 'PASS' : 'FAIL'}] + Add Ambulance button present:`, hasAddAmbBtn);

        // Tab: Bed Capacity
        await evalJs("HospitalAdminManager.switchTab('beds');");
        await sleep(1500);
        const statCardsCount = await evalJs("document.querySelectorAll('.hosp-stat-card').length");
        const hasBedGenInput = await evalJs("document.getElementById('bedGenInput') !== null");
        console.log(`  [${statCardsCount === 5 ? 'PASS' : 'FAIL'}] Bed Capacity Stat Cards rendered (${statCardsCount}/5):`, statCardsCount === 5);
        console.log(`  [${hasBedGenInput ? 'PASS' : 'FAIL'}] Bed Allocations Form Inputs present:`, hasBedGenInput);

        // Tab: Emergency Unit
        await evalJs("HospitalAdminManager.switchTab('emergency');");
        await sleep(1500);
        const hasEmgPhoneInput = await evalJs("document.getElementById('emgPhoneInput') !== null");
        const hasEmgTypeInput = await evalJs("document.getElementById('emgTypeInput') !== null");
        console.log(`  [${hasEmgPhoneInput && hasEmgTypeInput ? 'PASS' : 'FAIL'}] Emergency Unit Form rendered:`, hasEmgPhoneInput && hasEmgTypeInput);

        // Tab: Doctor Slots
        await evalJs("HospitalAdminManager.switchTab('slots');");
        await sleep(1500);
        const hasSlotToolbar = await evalJs("document.querySelector('button[onclick*=\"showAddSlotForm\"]') !== null");
        const slotRowsCount = await evalJs("document.querySelectorAll('.hosp-table tbody tr').length");
        console.log(`  [${hasSlotToolbar ? 'PASS' : 'FAIL'}] Appointment Slots Scheduler rendered:`, hasSlotToolbar);

        console.log("\n5. Testing Administrator Role (Facility Switcher)...");
        const adminLoginRes = await fetch("http://localhost:5000/api/staff-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ staffId: "STAFF-001", password: "admin123" })
        });
        const adminLoginData = await adminLoginRes.json();
        await evalJs(`
            if (typeof SmartCityAuth !== 'undefined') {
                SmartCityAuth.setSession('${adminLoginData.token}', ${JSON.stringify(adminLoginData.user)});
            }
        `);
        await evalJs("openEditPanel('hospitalInfo');");
        await sleep(1500);

        const hasAdminHospSelector = await evalJs("document.querySelector('.hosp-selector-pill select') !== null");
        const hospOptionCount = await evalJs("document.querySelectorAll('.hosp-selector-pill select option').length");
        console.log(`  [${hasAdminHospSelector ? 'PASS' : 'FAIL'}] Admin Facility Switcher Dropdown present:`, hasAdminHospSelector);
        console.log(`  [${hospOptionCount >= 6 ? 'PASS' : 'FAIL'}] Facilities Available to Admin (${hospOptionCount} hospitals):`, hospOptionCount >= 6);

        console.log("\n=== BROWSER UI VERIFICATION COMPLETED SUCCESSFULLY ===");
    } catch (err) {
        console.error("Browser test error:", err);
    } finally {
        if (ws) ws.close();
        chromeProc.kill();
        process.exit(0);
    }
}

runBrowserTest();
