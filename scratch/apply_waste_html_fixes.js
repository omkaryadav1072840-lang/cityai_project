const fs = require('fs');
const path = require('path');

const htmlPath = path.join('frontend', 'pages', 'waste', 'waste.html');
let html = fs.readFileSync(htmlPath, 'utf8');
const isCRLF = html.includes('\r\n');
const eol = isCRLF ? '\r\n' : '\n';

console.log('Original waste.html lines:', html.split(/\r?\n/).length);

// 1. Navbar update: Logo badge & #userBadgeContainer
const oldNavRegex = /<header class="navbar">[\s\S]*?<\/header>/;
const navMatch = html.match(oldNavRegex);
if (!navMatch) {
    console.error('Navbar not found in waste.html!');
    process.exit(1);
}

const updatedNavbar = `<header class="navbar">

    <a href="../../index.html" class="logo" style="text-decoration:none; color:inherit; display: flex; align-items: center; gap: 8px;">
        <img src="/ChatGPT_Image_Aug_11__2026__11_27_44_PM-removebg-preview.png" alt="SmartCity AI" style="height: 40px; width: auto;">
        <span style="font-size: 25px; font-weight: 800; letter-spacing: -0.5px; color: #172033;">Smart<span style="color: #2563eb;">City AI</span></span>
        <small style="font-size:12px; font-weight:700; color:#166534; background:#dcfce7; padding:2px 8px; border-radius:12px; margin-left:8px; border: 1px solid #bbf7d0;">WASTE</small>
    </a>

    <div class="page-title">
        ♻️ Waste Management
    </div>

    <div class="nav-actions" style="display: flex; align-items: center; gap: 12px;">
        <a href="../../index.html" style="text-decoration:none; color:#172033; font-size:13px; font-weight:700; padding:8px 14px; background:#f1f5f9; border-radius:8px; display:inline-flex; align-items:center; gap:6px; transition: background 0.2s ease;">
            ← Main Dashboard
        </a>
        <div id="userBadgeContainer"></div>
    </div>

</header>`;

html = html.replace(navMatch[0], updatedNavbar.replace(/\n/g, eol));

// 2. Add id="sharedMapSection" to map card
html = html.replace(/<section class="card map-card">/, '<section class="card map-card" id="sharedMapSection">');

// 3. Add "Show City GIS Map" button to staff-actions-bar
const staffActionsTarget = `<button class="btn green-btn" onclick="scrollToDustbinTerminal()" style="background: linear-gradient(135deg, #059669 0%, #047857 100%); font-weight: 800; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);">
                        🗑️ Smart Dustbin Dashboard (ID &amp; Pass)
                    </button>`;

const staffActionsReplacement = `<button class="btn green-btn" onclick="scrollToDustbinTerminal()" style="background: linear-gradient(135deg, #059669 0%, #047857 100%); font-weight: 800; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);">
                        🗑️ Smart Dustbin Dashboard (ID &amp; Pass)
                    </button>
                    <button class="btn outline-btn" id="btnStaffToggleMap" onclick="toggleStaffCityMap()">
                        🗺️ Show City GIS Map
                    </button>`;

if (html.includes(staffActionsTarget.replace(/\n/g, eol))) {
    html = html.replace(staffActionsTarget.replace(/\n/g, eol), staffActionsReplacement.replace(/\n/g, eol));
} else {
    console.log('Note: exact staffActionsTarget match varied, trying flexible match...');
    html = html.replace(/(<div class="staff-actions-bar">\s*<button[^>]*scrollToDustbinTerminal[^>]*>[\s\S]*?<\/button>)/,
        `$1${eol}                    <button class="btn outline-btn" id="btnStaffToggleMap" onclick="toggleStaffCityMap()">${eol}                        🗺️ Show City GIS Map${eol}                    </button>`);
}

// 4. Update dtHardwareSuite header with developer window bar & minimize
const hwSuiteHeaderTarget = `<div id="dtHardwareSuite" style="background: #0f172a; color: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 10px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
                            <div>
                                <h4 style="margin: 0; font-size: 16px; color: #38bdf8; display: flex; align-items: center; gap: 8px;">
                                    <span>🔌</span> IoT Sensor Integration &amp; Hardware Code Suite
                                </h4>
                                <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">
                                    Production-ready ESP32 firmware, ultrasonic sensor logic, PIR presence tracking, and REST API telemetry dispatcher.
                                </p>
                            </div>
                            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                                <button class="btn btn-sm" id="btnTabSim" onclick="switchSensorTab('tab-sim')" style="background: #0284c7; color: #ffffff; font-size: 12px; padding: 6px 12px;">🎮 Sensor Simulator</button>
                                <button class="btn btn-sm" id="btnTabEsp32" onclick="switchSensorTab('tab-esp32')" style="background: #1e293b; color: #94a3b8; font-size: 12px; padding: 6px 12px;">⚡ ESP32 (C++) Code</button>
                                <button class="btn btn-sm" id="btnTabPython" onclick="switchSensorTab('tab-python')" style="background: #1e293b; color: #94a3b8; font-size: 12px; padding: 6px 12px;">🐍 Python Ingestion Client</button>
                                <button class="btn btn-sm" id="btnTabCurl" onclick="switchSensorTab('tab-curl')" style="background: #1e293b; color: #94a3b8; font-size: 12px; padding: 6px 12px;">📡 cURL REST Test</button>
                            </div>
                        </div>`;

const hwSuiteHeaderReplacement = `<div id="dtHardwareSuite" style="background: #0f172a; color: #f8fafc; border-radius: 14px; padding: 20px; margin-bottom: 15px; border: 1px solid #1e293b; box-shadow: 0 8px 24px -4px rgba(15, 23, 42, 0.25);">
                        <!-- Developer Console Window Top Bar -->
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; padding-bottom: 12px; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div style="display: flex; gap: 6px;">
                                    <span style="width: 11px; height: 11px; border-radius: 50%; background: #ef4444; display: inline-block;"></span>
                                    <span style="width: 11px; height: 11px; border-radius: 50%; background: #f59e0b; display: inline-block;"></span>
                                    <span style="width: 11px; height: 11px; border-radius: 50%; background: #10b981; display: inline-block;"></span>
                                </div>
                                <div>
                                    <h4 style="margin: 0; font-size: 15px; font-weight: 700; color: #38bdf8; display: flex; align-items: center; gap: 8px;">
                                        <span>🔌</span> IoT Sensor Integration &amp; Hardware Code Suite
                                    </h4>
                                    <p style="margin: 3px 0 0 0; font-size: 12px; color: #94a3b8;">
                                        Production-ready ESP32 firmware, ultrasonic depth calculations, PIR footfall counter &amp; REST telemetry client.
                                    </p>
                                </div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                <span style="font-size: 11px; background: #1e293b; color: #38bdf8; padding: 4px 10px; border-radius: 6px; font-family: monospace; font-weight: 700; border: 1px solid #334155;">ESP32 • HC-SR04 • PIR</span>
                                <button class="btn btn-sm" onclick="toggleHardwareSuiteCollapse()" id="btnToggleHwSuite" style="background: #334155; color: #f8fafc; font-size: 11px; padding: 5px 12px; border-radius: 6px;">
                                    Minimize ⏶
                                </button>
                            </div>
                        </div>

                        <div id="dtHardwareSuiteBody">
                            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px;">
                                <button class="btn btn-sm" id="btnTabSim" onclick="switchSensorTab('tab-sim')" style="background: #0284c7; color: #ffffff; font-size: 12px; padding: 7px 14px; border-radius: 8px;">🎮 Sensor Simulator</button>
                                <button class="btn btn-sm" id="btnTabEsp32" onclick="switchSensorTab('tab-esp32')" style="background: #1e293b; color: #94a3b8; font-size: 12px; padding: 7px 14px; border-radius: 8px;">⚡ ESP32 (C++) Code</button>
                                <button class="btn btn-sm" id="btnTabPython" onclick="switchSensorTab('tab-python')" style="background: #1e293b; color: #94a3b8; font-size: 12px; padding: 7px 14px; border-radius: 8px;">🐍 Python Ingestion Client</button>
                                <button class="btn btn-sm" id="btnTabCurl" onclick="switchSensorTab('tab-curl')" style="background: #1e293b; color: #94a3b8; font-size: 12px; padding: 7px 14px; border-radius: 8px;">📡 cURL REST Test</button>
                            </div>`;

// Check if dtHardwareSuite is in html
if (html.includes('id="dtHardwareSuite"')) {
    // Replace the header and insert the opening of dtHardwareSuiteBody
    const suiteIdx = html.indexOf('id="dtHardwareSuite"');
    const suiteCloseTag = '</div>\n                    </div>\n                </div>\n            </section>';
    // Let's do exact substring replacement for the header portion
    const headerEndIdx = html.indexOf('<!-- Tab 1: Live Interactive Simulator -->', suiteIdx);
    if (headerEndIdx !== -1) {
        const fullOldHeader = html.substring(suiteIdx - 27, headerEndIdx);
        html = html.substring(0, suiteIdx - 27) + hwSuiteHeaderReplacement.replace(/\n/g, eol) + eol + '                        ' + html.substring(headerEndIdx);
        // And close dtHardwareSuiteBody right before closing dtHardwareSuite
        // Look for the end of curl tab
        const curlEnd = html.indexOf('</code></pre>\n                            </div>\n                        </div>\n                    </div>\n                </div>');
        if (curlEnd !== -1) {
            html = html.replace('</code></pre>\n                            </div>\n                        </div>\n                    </div>\n                </div>',
                                '</code></pre>\n                            </div>\n                        </div>\n                        </div> <!-- /dtHardwareSuiteBody -->\n                    </div>\n                </div>');
        } else {
            // Also test CRLF version
            html = html.replace('</code></pre>\r\n                            </div>\r\n                        </div>\r\n                    </div>\r\n                </div>',
                                '</code></pre>\r\n                            </div>\r\n                        </div>\r\n                        </div> <!-- /dtHardwareSuiteBody -->\r\n                    </div>\r\n                </div>');
        }
    }
}

// 5. Replace minmax(360px, 1fr) with minmax(280px, 1fr) for mobile responsiveness
html = html.replace(/minmax\(360px,\s*1fr\)/g, 'minmax(280px, 1fr)');

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('✅ Successfully updated frontend/pages/waste/waste.html');

// Sync to Android
const androidHtmlPath = path.join('android', 'app', 'src', 'main', 'assets', 'public', 'pages', 'waste', 'waste.html');
if (fs.existsSync(androidHtmlPath)) {
    fs.writeFileSync(androidHtmlPath, html, 'utf8');
    console.log('✅ Successfully synced to android/app/src/main/assets/public/pages/waste/waste.html');
}

