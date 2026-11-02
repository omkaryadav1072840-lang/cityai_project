const fs = require('fs');
const path = require('path');

const authPath = path.join(__dirname, '..', 'frontend', 'auth.js');
let code = fs.readFileSync(authPath, 'utf8');

// Target starts with `const detailsOpenAttr = "";` and `modal.innerHTML = ` and ends with `document.body.appendChild(modal);`
const startMarker = 'const detailsOpenAttr = "";\r\n\r\n        modal.innerHTML = `';
const startMarkerLF = 'const detailsOpenAttr = "";\n\n        modal.innerHTML = `';

const endMarker = '</div> <!-- /sc-dialog-card -->\r\n        `;';
const endMarkerLF = '</div> <!-- /sc-dialog-card -->\n        `;';

let startIdx = code.indexOf(startMarker);
let isCRLF = true;
if (startIdx === -1) {
    startIdx = code.indexOf(startMarkerLF);
    isCRLF = false;
}

if (startIdx === -1) {
    console.error('Could not find start marker!');
    process.exit(1);
}

let endIdx = code.indexOf(isCRLF ? endMarker : endMarkerLF, startIdx);
if (endIdx === -1) {
    console.error('Could not find end marker!');
    process.exit(1);
}

endIdx += (isCRLF ? endMarker.length : endMarkerLF.length);

const newInnerHtml = `modal.innerHTML = \`
            <div class="sc-dialog-card" role="dialog" aria-modal="true">
                <!-- Header -->
                <div class="sc-dialog-header">
                    <div class="sc-header-title-wrap">
                        <div class="sc-header-logo-glow">
                            <img src="logo.png" onerror="this.onerror=null; this.src='../../logo.png';" alt="SmartCity AI" class="sc-header-logo-img">
                        </div>
                        <div>
                            <div class="sc-header-badge-tag">MUNICIPAL COMMAND &amp; CITIZEN ACCESS</div>
                            <h2 class="sc-header-title">SmartCity AI Portal Access</h2>
                        </div>
                    </div>
                    <button type="button" class="sc-close-btn" id="scModalCloseBtn" title="Close">✕</button>
                </div>

                <!-- Unified Content -->
                <div class="sc-dialog-scroll">
                    <!-- Segmented Tabs at Top of Content -->
                    <div class="sc-segmented-tabs">
                        <button type="button" class="sc-tab-pill active" data-tab="citizen">
                            <span>👤</span> Citizen Sign-In
                        </button>
                        <button type="button" class="sc-tab-pill" data-tab="staff">
                            <span>🛡️</span> Staff / Officer
                        </button>
                        <button type="button" class="sc-tab-pill" data-tab="register">
                            <span>✨</span> Register
                        </button>
                    </div>

                    <div class="sc-dialog-body">
                        <!-- 1. Citizen Sign-In Form -->
                        <form id="scCitizenForm" class="sc-form">
                            <div class="sc-citizen-quick-demo">
                                <div>
                                    <div style="font-size: 11px; font-weight: 800; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.5px;">⚡ Instant 1-Click Access</div>
                                    <div style="font-size: 11px; color: #94a3b8;">Pre-verified citizen demo account</div>
                                </div>
                                <button type="button" class="sc-cit-demo-btn" onclick="SmartCityAuth.quickLoginPersona('citizen')">
                                    <span>👤</span> Sign In as Citizen (Rahul) ➔
                                </button>
                            </div>

                            <div class="sc-field-group">
                                <label class="sc-field-label">Mobile Number or Email <span class="req">*</span></label>
                                <div class="sc-input-wrapper">
                                    <span class="sc-input-icon">📱</span>
                                    <input type="text" id="scCitLoginId" class="sc-input-control" required placeholder="e.g. 6306880179 or citizen@smartcity.gov" />
                                </div>
                            </div>
                            <div class="sc-field-group">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <label class="sc-field-label">Password <span class="req">*</span></label>
                                    <span style="font-size: 11px; color: #38bdf8;">Demo: password123</span>
                                </div>
                                <div class="sc-input-wrapper">
                                    <span class="sc-input-icon">🔒</span>
                                    <input type="password" id="scCitPassword" class="sc-input-control" required placeholder="••••••••" />
                                    <button type="button" class="sc-eye-btn" onclick="const p=document.getElementById('scCitPassword'); p.type = p.type==='password'?'text':'password'; this.textContent = p.type==='password'?'👁️':'🙈';">👁️</button>
                                </div>
                            </div>
                            <button type="submit" class="sc-submit-btn">
                                <span>🚀</span> Sign In to Citizen Portal
                            </button>
                        </form>

                        <!-- 2. Staff & Officers Form -->
                        <form id="scStaffForm" class="sc-form" style="display: none;">
                            <div class="sc-quick-demo-card">
                                <div class="sc-quick-demo-header">
                                    <div class="sc-quick-demo-title">
                                        <span>⚡ 1-Click Quick Demo Login</span>
                                    </div>
                                    <span class="sc-demo-sub">Auto-fills ID &amp; password instantly</span>
                                </div>
                                <div class="sc-quick-demo-pills">
                                    <button type="button" class="sc-demo-pill sc-pill-admin" onclick="SmartCityAuth.fillStaffPreset('STAFF-001','admin123',true)" title="Super Admin ICCC">
                                        <span>👑</span> Super Admin
                                    </button>
                                    <button type="button" class="sc-demo-pill sc-pill-traffic" onclick="SmartCityAuth.fillStaffPreset('TR-VERMA','verma123',true)" title="Traffic Sub-Inspector">
                                        <span>🚦</span> Traffic Police
                                    </button>
                                    <button type="button" class="sc-demo-pill sc-pill-waste" onclick="SmartCityAuth.fillStaffPreset('WST001','123456',true)" title="Sanitation &amp; Waste">
                                        <span>🗑️</span> Waste Staff
                                    </button>
                                    <button type="button" class="sc-demo-pill sc-pill-doctor" onclick="SmartCityAuth.fillStaffPreset('DOC-101','admin',true)" title="Doctor AIIMS">
                                        <span>🩺</span> AIIMS Doctor
                                    </button>
                                    <button type="button" class="sc-demo-pill sc-pill-water" onclick="SmartCityAuth.fillStaffPreset('WTR-ADMIN','smartcity2026',true)" title="Water Jal Sansthan">
                                        <span>💧</span> Jal Sansthan
                                    </button>
                                    <button type="button" class="sc-demo-pill sc-pill-police" onclick="SmartCityAuth.fillStaffPreset('POL-SHO-01','police123',true)" title="City Police SHO">
                                        <span>👮</span> Police SHO
                                    </button>
                                </div>

                                <div class="sc-more-roles-row">
                                    <span style="font-size: 11px; color: #94a3b8; font-weight: 600;">More Roles:</span>
                                    <select class="sc-role-select" onchange="if(this.value){SmartCityAuth.quickLoginPersona(this.value); this.value='';}">
                                        <option value="">Select Department Persona to Launch...</option>
                                        <optgroup label="👑 Central Command &amp; Admin">
                                            <option value="super_admin">👑 GKP Super Admin (STAFF-001)</option>
                                            <option value="admin">🛡️ ICCC Operations Admin (STAFF-002)</option>
                                        </optgroup>
                                        <optgroup label="🚦 Traffic &amp; Mobility">
                                            <option value="traffic">🚦 Insp. Verma (TR-VERMA)</option>
                                            <option value="traffic_pandey">🚦 Insp. Pandey (TR-PANDEY)</option>
                                            <option value="traffic_admin">🚦 Traffic Chief (TRF-ADMIN)</option>
                                        </optgroup>
                                        <optgroup label="🗑️ Sanitation &amp; Waste Management">
                                            <option value="waste_control_center">🎧 Control Center (WST-CC-01)</option>
                                            <option value="waste_worker">👷 Field Sanitation Crew (WRK-001)</option>
                                            <option value="waste_worker_2">🚛 Garbage Truck Driver (WRK-002)</option>
                                            <option value="waste_bin_staff">🗑️ Smart Dustbin Staff (BIN-GOL-01)</option>
                                        </optgroup>
                                        <optgroup label="🩺 Healthcare &amp; AIIMS">
                                            <option value="hospital">🩺 AIIMS Physician (DOC-101)</option>
                                            <option value="hospital_admin">🏥 Hospital Admin (HOSP-ADMIN)</option>
                                            <option value="ambulance">🚑 Ambulance Fleet Lead (AMB-01)</option>
                                        </optgroup>
                                        <optgroup label="💧 Jal Sansthan &amp; SCADA Grid">
                                            <option value="water_admin">💧 Jal Sansthan Admin (WTR-ADMIN)</option>
                                            <option value="water_staff">🔧 Pumping Engineer (WTR-ENG-01)</option>
                                            <option value="sewage_staff">🌊 Sewage Network Engineer (SEW-ENG-01)</option>
                                        </optgroup>
                                        <optgroup label="🅿️ Smart Parking &amp; Utilities">
                                            <option value="parking_staff">🅿️ Parking Officer (PRK-STAFF-01)</option>
                                            <option value="emergency">🚨 Emergency Dispatcher (EMG-01)</option>
                                            <option value="electricity">💡 Power Grid &amp; Streetlights (ELE-01)</option>
                                            <option value="environment">🍃 Environmental AQI Lead (ENV-01)</option>
                                        </optgroup>
                                    </select>
                                </div>
                            </div>

                            <div class="sc-field-group">
                                <label class="sc-field-label">Official Staff / Officer ID <span class="req">*</span></label>
                                <div class="sc-input-wrapper">
                                    <span class="sc-input-icon">🪪</span>
                                    <input type="text" id="scStaffId" class="sc-input-control" required placeholder="e.g. STAFF-001, TR-VERMA, WST001" />
                                </div>
                            </div>
                            <div class="sc-field-group">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <label class="sc-field-label">Official Password <span class="req">*</span></label>
                                    <span style="font-size: 11px; color: #38bdf8;">Hint: admin123 / verma123 / 123456</span>
                                </div>
                                <div class="sc-input-wrapper">
                                    <span class="sc-input-icon">🔒</span>
                                    <input type="password" id="scStaffPassword" class="sc-input-control" required placeholder="••••••••" />
                                    <button type="button" class="sc-eye-btn" onclick="const p=document.getElementById('scStaffPassword'); p.type = p.type==='password'?'text':'password'; this.textContent = p.type==='password'?'👁️':'🙈';" title="Toggle Password">👁️</button>
                                </div>
                            </div>
                            <button type="submit" class="sc-submit-btn sc-btn-staff">
                                <span>🛡️</span> Sign In to Command Department
                            </button>
                        </form>

                        <!-- 3. Register Form -->
                        <form id="scRegisterForm" class="sc-form" style="display: none;">
                            <div class="sc-field-group">
                                <label class="sc-field-label">Full Citizen Name <span class="req">*</span></label>
                                <div class="sc-input-wrapper">
                                    <span class="sc-input-icon">👤</span>
                                    <input type="text" id="scRegName" class="sc-input-control" required placeholder="Enter full name (e.g. Rahul Sharma)" />
                                </div>
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                <div class="sc-field-group">
                                    <label class="sc-field-label">Mobile Number <span class="req">*</span></label>
                                    <div class="sc-input-wrapper">
                                        <span class="sc-input-icon">📱</span>
                                        <input type="tel" id="scRegMobile" class="sc-input-control" required placeholder="10-digit mobile" />
                                    </div>
                                </div>
                                <div class="sc-field-group">
                                    <label class="sc-field-label">Email Address <span class="req">*</span></label>
                                    <div class="sc-input-wrapper">
                                        <span class="sc-input-icon">✉️</span>
                                        <input type="email" id="scRegEmail" class="sc-input-control" required placeholder="name@example.com" />
                                    </div>
                                </div>
                            </div>
                            <div class="sc-field-group">
                                <label class="sc-field-label">Create Password <span class="req">*</span></label>
                                <div class="sc-input-wrapper">
                                    <span class="sc-input-icon">🔒</span>
                                    <input type="password" id="scRegPassword" class="sc-input-control" required placeholder="Minimum 6 characters" />
                                </div>
                            </div>
                            <button type="submit" class="sc-submit-btn sc-btn-emerald">
                                <span>✨</span> Create New Citizen Account
                            </button>
                        </form>

                        <div id="scModalMsg" class="sc-message-box"></div>
                    </div> <!-- /sc-dialog-body -->
                </div> <!-- /sc-dialog-scroll -->
            </div> <!-- /sc-dialog-card -->\`;`;

const normalizedNewHtml = isCRLF ? newInnerHtml.replace(/\n/g, '\r\n') : newInnerHtml;
const updatedCode = code.substring(0, startIdx) + normalizedNewHtml + code.substring(endIdx);

fs.writeFileSync(authPath, updatedCode, 'utf8');
console.log('Successfully applied new Login Modal UI to frontend/auth.js!');

