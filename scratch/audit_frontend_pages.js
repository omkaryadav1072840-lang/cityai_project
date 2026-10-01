/**
 * SMARTCITY AI - FRONTEND PAGES, ASSETS & LINKS INTEGRITY AUDIT (STEPS 5, 6, 18)
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

function request(urlPath) {
    return new Promise((resolve) => {
        const url = new URL(urlPath, "http://localhost:5000");
        const req = http.request({
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: "GET"
        }, (res) => {
            let data = "";
            res.on("data", c => data += c);
            res.on("end", () => resolve({ status: res.statusCode, data }));
        });
        req.on("error", (e) => resolve({ status: 500, error: e.message }));
        req.end();
    });
}

let passed = 0;
let failed = 0;

function recordPass(msg) {
    passed++;
    console.log(`  ✅ [PASS] ${msg}`);
}

function recordFail(msg, detail) {
    failed++;
    console.error(`  ❌ [FAIL] ${msg}`);
    if (detail) console.error("     Details:", detail);
}

async function auditFrontend() {
    console.log("========================================================");
    console.log("  🌐 FRONTEND PAGE-BY-PAGE AUDIT (STEPS 5, 6, 18)");
    console.log("========================================================");

    const pages = [
        { path: "/", name: "Home/Index Portal" },
        { path: "/index.html", name: "Index HTML" },
        { path: "/pages/traffic/traffic.html", name: "Traffic Management Page" },
        { path: "/pages/parking/parking.html", name: "Parking Booking & Bay Grid Page" },
        { path: "/pages/hospital/hospital.html", name: "Hospital & Bed Search Page" },
        { path: "/pages/hospital/doctor_dashboard.html", name: "Doctor Clinical Dashboard" },
        { path: "/pages/hospital/hospital_dashboard.html", name: "Hospital Operations Dashboard" },
        { path: "/pages/waste/waste.html", name: "Waste Management Page" },
        { path: "/pages/water/water.html", name: "Water Supply SCADA Page" },
        { path: "/pages/emergency/emergency.html", name: "Emergency & SOS Response Page" },
        { path: "/pages/police/police.html", name: "Police Stations & Complaints Page" },
        { path: "/pages/famous/famous.html", name: "Tourism & Heritage Places Page" },
        { path: "/privacy-policy", name: "Privacy Policy Page" },
        { path: "/terms-and-conditions", name: "Terms & Conditions Page" }
    ];

    for (const pg of pages) {
        const res = await request(pg.path);
        if (res.status === 200 && res.data && res.data.length > 500) {
            recordPass(`${pg.name} (${pg.path}) loads successfully (HTTP 200, ${res.data.length} bytes)`);

            // Check for script tags and stylesheet tags in the HTML
            const scriptMatches = res.data.match(/<script\s+[^>]*src=["']([^"']+)["']/gi) || [];
            for (const sm of scriptMatches) {
                const src = sm.match(/src=["']([^"']+)["']/i)[1];
                if (!src.startsWith("http") && !src.startsWith("//")) {
                    // Resolve relative script path
                    let scriptPath = src;
                    if (src.startsWith("/")) {
                        scriptPath = src;
                    } else {
                        const pageDir = path.dirname(pg.path);
                        scriptPath = path.posix.join(pageDir, src);
                    }
                    const sRes = await request(scriptPath);
                    if (sRes.status === 200) {
                        // script loads
                    } else {
                        recordFail(`Broken script in ${pg.name}: ${src} -> HTTP ${sRes.status}`);
                    }
                }
            }

            const cssMatches = res.data.match(/<link\s+[^>]*href=["']([^"']+)["']/gi) || [];
            for (const cm of cssMatches) {
                if (cm.includes('rel="stylesheet"') || cm.includes("rel='stylesheet'")) {
                    const href = cm.match(/href=["']([^"']+)["']/i)[1];
                    if (!href.startsWith("http") && !href.startsWith("//")) {
                        let cssPath = href;
                        if (href.startsWith("/")) {
                            cssPath = href;
                        } else {
                            const pageDir = path.dirname(pg.path);
                            cssPath = path.posix.join(pageDir, href);
                        }
                        const cRes = await request(cssPath);
                        if (cRes.status === 200) {
                            // css loads
                        } else {
                            recordFail(`Broken CSS in ${pg.name}: ${href} -> HTTP ${cRes.status}`);
                        }
                    }
                }
            }
        } else {
            recordFail(`${pg.name} (${pg.path}) failed with status ${res.status}`);
        }
    }

    // Check shared Core assets
    const coreAssets = [
        "/index.css",
        "/script.js",
        "/js/smartcity-map.js",
        "/api/client.js",
        "/api/traffic.api.js",
        "/api/parking.api.js",
        "/api/hospital.api.js",
        "/api/waste.api.js",
        "/api/water.api.js",
        "/api/emergency.api.js",
        "/api/police.api.js",
        "/api/ai.api.js"
    ];

    for (const ca of coreAssets) {
        const aRes = await request(ca);
        if (aRes.status === 200) {
            recordPass(`Core Asset ${ca} loaded (HTTP 200)`);
        } else {
            recordFail(`Core Asset ${ca} missing or broken (HTTP ${aRes.status})`);
        }
    }

    console.log("\n========================================================");
    console.log(`  FRONTEND AUDIT RESULT: ${passed} PASSED | ${failed} FAILED`);
    console.log("========================================================");
}

auditFrontend().catch(console.error);
