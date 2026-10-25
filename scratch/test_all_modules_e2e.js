const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const screenshotDir = path.join(__dirname, 'module_screenshots');
if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
}

const modulesToTest = [
    {
        name: "1. Homepage & Civic Intelligence Portal",
        url: "http://localhost:5000/index.html",
        expectedSelectors: ["#hero", "#navBrandLogo", "#navUserHeaderContainer", "#map", ".sc-platform-hero"],
        interactiveAction: `(() => {
            const grievanceBtn = document.querySelector("a[onclick*='openGrievanceModal']");
            if (grievanceBtn) grievanceBtn.click();
            return {
                grievanceModalOpen: !!document.getElementById("grievanceModal") || !!document.querySelector(".sc-modal-active"),
                title: document.title
            };
        })()`
    },
    {
        name: "2. Smart Traffic Management & Signals",
        url: "http://localhost:5000/pages/traffic/traffic.html",
        expectedSelectors: [".traffic-hero", "#trafficMap", "#navUserName"],
        interactiveAction: `(() => {
            const tabs = Array.from(document.querySelectorAll(".tab-btn, .hero-buttons button"));
            if (tabs[0]) tabs[0].click();
            return {
                tabsFound: tabs.length,
                title: document.title
            };
        })()`
    },
    {
        name: "3. Smart Parking & Bay Booking",
        url: "http://localhost:5000/pages/parking/parking.html",
        expectedSelectors: [".parking-hero", "#parkingMapContainer", "#userBadgeBtn"],
        interactiveAction: `(() => {
            const searchInput = document.getElementById("parkingSearchInput") || document.querySelector("input[type='text']");
            if (searchInput) searchInput.value = "Golghar";
            return {
                hasSearch: !!searchInput,
                title: document.title
            };
        })()`
    },
    {
        name: "4. Hospital & Bed Occupancy (Citizen OPD)",
        url: "http://localhost:5000/pages/hospital/hospital.html",
        expectedSelectors: [".hospital-hero", "#hospitalMap", ".hospital-navbar"],
        interactiveAction: `(() => {
            const docCards = document.querySelectorAll(".doctor-card, .doc-card");
            const bookBtns = document.querySelectorAll("button[onclick*='book'], .btn-book");
            return {
                doctorCardsCount: docCards.length,
                bookBtnsCount: bookBtns.length,
                title: document.title
            };
        })()`
    },
    {
        name: "5. Doctor Clinical EHR & Consultations",
        url: "http://localhost:5000/pages/hospital/doctor_dashboard.html?hospital_id=HOSP-001",
        expectedSelectors: [".doctor-dashboard-container", "#doctorHeaderName", "#appointmentQueueList"],
        interactiveAction: `(() => {
            return {
                headerName: document.getElementById("doctorHeaderName") ? document.getElementById("doctorHeaderName").textContent.trim() : null,
                title: document.title
            };
        })()`
    },
    {
        name: "6. Hospital Desk Operations & Bed Management",
        url: "http://localhost:5000/pages/hospital/hospital_dashboard.html?hospital_id=HOSP-001",
        expectedSelectors: ["#hospitalTitle", "#bedManagementSection", "#receptionQueueTable"],
        interactiveAction: `(() => {
            return {
                title: document.title,
                hospitalTitle: document.getElementById("hospitalTitle") ? document.getElementById("hospitalTitle").textContent.trim() : null
            };
        })()`
    },
    {
        name: "7. Super Admin Hospital Management Console",
        url: "http://localhost:5000/pages/hospital/superadmin_hospital.html",
        expectedSelectors: [".admin-container", "#hospitalsOverviewTable", ".admin-nav"],
        interactiveAction: `(() => {
            return {
                title: document.title,
                tableExists: !!document.getElementById("hospitalsOverviewTable")
            };
        })()`
    },
    {
        name: "8. Water Supply Grid & 3D Digital Twin",
        url: "http://localhost:5000/pages/water/water.html",
        expectedSelectors: [".water-hero", "#waterMap", "#water3DContainer", "#tankerBookingSection"],
        interactiveAction: `(() => {
            const tankerBtn = document.querySelector("button[onclick*='tanker'], .btn-tanker");
            return {
                has3DContainer: !!document.getElementById("water3DContainer"),
                hasMap: !!document.getElementById("waterMap"),
                title: document.title
            };
        })()`
    },
    {
        name: "9. Solid Waste Management & Bin Telemetry",
        url: "http://localhost:5000/pages/waste/waste.html",
        expectedSelectors: [".waste-hero", "#wasteMap", "#wasteComplaintsTable"],
        interactiveAction: `(() => {
            return {
                hasMap: !!document.getElementById("wasteMap"),
                title: document.title
            };
        })()`
    },
    {
        name: "10. Police Dispatch & Crime Geo-Analytics",
        url: "http://localhost:5000/pages/police/police.html",
        expectedSelectors: [".police-hero", "#policeMap", "#pcrVanTable"],
        interactiveAction: `(() => {
            return {
                hasMap: !!document.getElementById("policeMap"),
                title: document.title
            };
        })()`
    },
    {
        name: "11. Emergency 112 / 108 SOS Dispatch",
        url: "http://localhost:5000/pages/emergency/emergency.html",
        expectedSelectors: [".emergency-hero", "#emergencyMap", "#sosTriggerBtn"],
        interactiveAction: `(() => {
            const sosBtn = document.getElementById("sosTriggerBtn");
            return {
                sosBtnFound: !!sosBtn,
                title: document.title
            };
        })()`
    },
    {
        name: "12. Famous Places, Tourism & Ramgarh Taal",
        url: "http://localhost:5000/pages/famous/famous.html",
        expectedSelectors: [".famous-hero", "#placesMap", "#aqiWidgetContainer"],
        interactiveAction: `(() => {
            return {
                hasPlacesMap: !!document.getElementById("placesMap"),
                hasAqiWidget: !!document.getElementById("aqiWidgetContainer"),
                title: document.title
            };
        })()`
    },
    {
        name: "13. ICCC Central Super Admin Console",
        url: "http://localhost:5000/pages/admin/gkp_admin.html",
        expectedSelectors: [".gkp-admin-shell", "#gkpAdminHeader", "#gkpSystemMetricsBar"],
        interactiveAction: `(() => {
            return {
                hasMetrics: !!document.getElementById("gkpSystemMetricsBar"),
                title: document.title
            };
        })()`
    },
    {
        name: "14. Privacy Policy & Civic Legal Compliance",
        url: "http://localhost:5000/pages/privacy-policy.html",
        expectedSelectors: [".legal-container, main, body"],
        interactiveAction: `(() => {
            return {
                title: document.title,
                contentLength: document.body.textContent.length
            };
        })()`
    }
];

async function runMasterWebpageAudit() {
    console.log("===============================================================");
    console.log("🚀 STARTING COMPREHENSIVE END-TO-END AUDIT FOR ALL MODULES");
    console.log("===============================================================");

    const proc = spawn(browserPath, [
        '--headless',
        '--remote-debugging-port=9241',
        '--window-size=1280,900',
        '--disable-gpu',
        'http://localhost:5000'
    ]);

    await new Promise(r => setTimeout(r, 2000));

    try {
        const tabs = await (await fetch('http://127.0.0.1:9241/json')).json();
        const tab = tabs.find(t => t.url.includes('localhost:5000'));
        if (!tab) {
            console.error("Failed to connect to browser tab.");
            proc.kill();
            return;
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

        let currentExceptions = [];
        let currentConsoleErrors = [];

        ws.onmessage = (e) => {
            const data = JSON.parse(e.data);
            if (data.id && pendingCallbacks.has(data.id)) {
                pendingCallbacks.get(data.id).resolve(data.result);
                pendingCallbacks.delete(data.id);
            }
            if (data.method === "Runtime.exceptionThrown") {
                currentExceptions.push(data.params.exceptionDetails.text + " " + JSON.stringify(data.params.exceptionDetails.exception));
            }
            if (data.method === "Runtime.consoleAPICalled" && data.params.type === "error") {
                currentConsoleErrors.push(data.params.args.map(a => a.value || JSON.stringify(a)).join(" "));
            }
        };

        await new Promise(r => ws.onopen = r);
        await send("Runtime.enable");
        await send("Page.enable");
        await send("DOM.enable");

        const auditResults = [];

        for (let i = 0; i < modulesToTest.length; i++) {
            const mod = modulesToTest[i];
            console.log(`\n▶️ [${i+1}/${modulesToTest.length}] Testing Module: ${mod.name}`);
            console.log(`   Navigating to: ${mod.url}`);

            currentExceptions = [];
            currentConsoleErrors = [];

            // Navigate
            await send("Page.navigate", { url: mod.url });

            // Wait 2.2s for DOM, tiles, and scripts to settle
            await new Promise(r => setTimeout(r, 2200));

            // Verify Expected Selectors
            const selectorChecks = await send("Runtime.evaluate", {
                expression: `(() => {
                    const selectors = ${JSON.stringify(mod.expectedSelectors)};
                    const results = {};
                    for (const sel of selectors) {
                        results[sel] = !!document.querySelector(sel);
                    }
                    return results;
                })()`,
                returnByValue: true
            });

            // Perform interactive action
            let actionResult = null;
            if (mod.interactiveAction) {
                const evalAction = await send("Runtime.evaluate", {
                    expression: mod.interactiveAction,
                    returnByValue: true
                });
                actionResult = evalAction.result ? evalAction.result.value : null;
            }

            // Capture screenshot
            const shot = await send("Page.captureScreenshot", { format: "png" });
            const shotFilename = `module_${i+1}_screenshot.png`;
            if (shot && shot.data) {
                fs.writeFileSync(path.join(screenshotDir, shotFilename), Buffer.from(shot.data, "base64"));
            }

            const isPassed = currentExceptions.length === 0;
            console.log(`   ✅ Status: ${isPassed ? "PASSED" : "FAILED"}`);
            console.log(`   DOM Selectors:`, selectorChecks.result ? selectorChecks.result.value : {});
            if (actionResult) console.log(`   Interactive State:`, actionResult);
            if (currentExceptions.length > 0) console.error(`   ⚠️ Exceptions:`, currentExceptions);
            if (currentConsoleErrors.length > 0) console.warn(`   ⚠️ Console Errors:`, currentConsoleErrors);

            auditResults.push({
                module: mod.name,
                url: mod.url,
                passed: isPassed,
                selectors: selectorChecks.result ? selectorChecks.result.value : {},
                interactiveResult: actionResult,
                exceptionsCount: currentExceptions.length,
                consoleErrorsCount: currentConsoleErrors.length,
                screenshot: shotFilename
            });
        }

        console.log("\n===============================================================");
        console.log("📊 MASTER MODULE AUDIT SCORECARD");
        console.log("===============================================================");
        let allPassed = true;
        auditResults.forEach(r => {
            const mark = r.passed ? "✅ PASS" : "❌ FAIL";
            console.log(`${mark} | ${r.module.padEnd(50)} | Errors: ${r.exceptionsCount}`);
            if (!r.passed) allPassed = false;
        });
        console.log("===============================================================");
        console.log(`TOTAL MODULES TESTED: ${auditResults.length} | PASSED: ${auditResults.filter(r => r.passed).length} | FAILED: ${auditResults.filter(r => !r.passed).length}`);
        console.log("===============================================================");

        fs.writeFileSync("scratch/master_module_e2e_results.json", JSON.stringify(auditResults, null, 2));
        console.log("Saved detailed JSON scorecard to scratch/master_module_e2e_results.json");

        ws.close();
        proc.kill();
    } catch(err) {
        console.error("Audit error:", err);
        proc.kill();
    }
}

runMasterWebpageAudit();
