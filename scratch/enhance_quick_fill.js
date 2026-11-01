const fs = require('fs');

let content = fs.readFileSync('frontend/auth.js', 'utf8');

// 1. Add fillStaffPreset function after quickLoginPersona
const funcTarget = `    // -------------------------------------------------------
    // UNIVERSAL CITIZEN & STAFF PROFILE MODAL`;

const newFunc = `    // -------------------------------------------------------
    // QUICK STAFF PRESET FILL HELPER
    // -------------------------------------------------------

    function fillStaffPreset(staffId, password, autoSubmit = false) {
        const idInput = document.getElementById("scStaffId");
        const passInput = document.getElementById("scStaffPassword");
        const msgEl = document.getElementById("scModalMsg");
        if (idInput) {
            idInput.value = staffId;
            idInput.focus();
        }
        if (passInput) {
            passInput.value = password;
        }
        if (msgEl) {
            msgEl.style.color = "#38bdf8";
            msgEl.textContent = \`⚡ Selected: \${staffId} • Credentials filled. Click 'Sign In to Command Department' or press Enter.\`;
        }
        if (autoSubmit) {
            const staffForm = document.getElementById("scStaffForm");
            if (staffForm) {
                if (typeof staffForm.requestSubmit === "function") {
                    staffForm.requestSubmit();
                } else {
                    staffForm.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
                }
            }
        }
    }

    // -------------------------------------------------------
    // UNIVERSAL CITIZEN & STAFF PROFILE MODAL`;

if (!content.includes('function fillStaffPreset(')) {
    content = content.replace(funcTarget, newFunc);
}

// 2. Export fillStaffPreset in return object
content = content.replace(
    `quickLoginPersona,\n        refreshNotificationCount,`,
    `quickLoginPersona,\n        fillStaffPreset,\n        refreshNotificationCount,`
);

// 3. Export on window
content = content.replace(
    `window.quickLoginPersona = SmartCityAuth.quickLoginPersona;`,
    `window.quickLoginPersona = SmartCityAuth.quickLoginPersona;\n    window.fillStaffPreset = SmartCityAuth.fillStaffPreset;`
);

// 4. Update sc-staff-presets HTML block to use SmartCityAuth.fillStaffPreset and structured layout
const presetHtmlStart = `<div class="sc-staff-presets"`;
const presetHtmlEnd = `<div class="sc-field-group">\n                            <label class="sc-field-label">Official Staff / Officer ID`;

const pStartIdx = content.indexOf(presetHtmlStart);
const pEndIdx = content.indexOf(presetHtmlEnd);

if (pStartIdx !== -1 && pEndIdx !== -1) {
    const newPresetsBlock = `<div class="sc-staff-presets" style="display: flex; flex-direction: column; gap: 8px; padding: 12px 14px; background: rgba(15, 23, 42, 0.65); border: 1px dashed rgba(56, 189, 248, 0.3); border-radius: 10px; margin-bottom: 8px; max-height: 230px; overflow-y: auto;">
                            <div style="font-size: 11px; font-weight: 700; color: #94a3b8; display: flex; align-items: center; justify-content: space-between;">
                                <span>⚡ Quick Fill Staff Credentials (All Departments):</span>
                                <span style="font-size: 10px; color: #38bdf8;">1-Click: Auto-fill • 2-Click: Instant Login</span>
                            </div>
                            
                            <!-- Central Command -->
                            <div style="display: flex; flex-direction: column; gap: 3px;">
                                <div style="font-size: 10px; font-weight: 700; color: #fde047;">👑 Central Command:</div>
                                <div style="display: flex; flex-wrap: wrap; gap: 5px;">
                                    <button type="button" class="sc-preset-pill" onclick="SmartCityAuth.fillStaffPreset('STAFF-001','admin123')" ondblclick="SmartCityAuth.fillStaffPreset('STAFF-001','admin123',true)" title="1-Click: Fill, 2-Click: Login" style="background: rgba(245, 158, 11, 0.25); border: 1px solid rgba(245, 158, 11, 0.6); color: #fde047; border-radius: 999px; padding: 3px 9px; font-size: 11px; cursor: pointer; font-weight: 800;">👑 STAFF-001 (Super Admin)</button>
                                    <button type="button" class="sc-preset-pill" onclick="SmartCityAuth.fillStaffPreset('STAFF-002','admin123')" ondblclick="SmartCityAuth.fillStaffPreset('STAFF-002','admin123',true)" title="1-Click: Fill, 2-Click: Login" style="background: rgba(217, 119, 6, 0.25); border: 1px solid rgba(217, 119, 6, 0.6); color: #fde68a; border-radius: 999px; padding: 3px 9px; font-size: 11px; cursor: pointer;">🛡️ STAFF-002 (ICCC Ops)</button>
                                </div>
                            </div>

                            <!-- Waste Management -->
                            <div style="display: flex; flex-direction: column; gap: 3px;">
                                <div style="font-size: 10px; font-weight: 700; color: #60a5fa;">🗑️ Waste Management &amp; Sanitation:</div>
                                <div style="display: flex; flex-wrap: wrap; gap: 5px;">
                                    <button type="button" class="sc-preset-pill" onclick="SmartCityAuth.fillStaffPreset('WST-CC-01','control123')" ondblclick="SmartCityAuth.fillStaffPreset('WST-CC-01','control123',true)" title="1-Click: Fill, 2-Click: Login" style="background: rgba(37, 99, 235, 0.25); border: 1px solid rgba(37, 99, 235, 0.6); color: #93c5fd; border-radius: 999px; padding: 3px 9px; font-size: 11px; cursor: pointer; font-weight: 800;">🎧 WST-CC-01 (Control)</button>
                                    <button type="button" class="sc-preset-pill" onclick="SmartCityAuth.fillStaffPreset('WST-CC-02','control123')" ondblclick="SmartCityAuth.fillStaffPreset('WST-CC-02','control123',true)" title="1-Click: Fill, 2-Click: Login" style="background: rgba(37, 99, 235, 0.2); border: 1px solid rgba(37, 99, 235, 0.5); color: #bfdbfe; border-radius: 999px; padding: 3px 9px; font-size: 11px; cursor: pointer;">📋 WST-CC-02 (Triage)</button>
                                    <button type="button" class="sc-preset-pill" onclick="SmartCityAuth.fillStaffPreset('WRK-001','worker123')" ondblclick="SmartCityAuth.fillStaffPreset('WRK-001','worker123',true)" title="1-Click: Fill, 2-Click: Login" style="background: rgba(16, 185, 129, 0.25); border: 1px solid rgba(16, 185, 129, 0.6); color: #6ee7b7; border-radius: 999px; padding: 3px 9px; font-size: 11px; cursor: pointer; font-weight: 800;">👷 WRK-001 (Worker)</button>
                                    <button type="button" class="sc-preset-pill" onclick="SmartCityAuth.fillStaffPreset('WRK-002','worker123')" ondblclick="SmartCityAuth.fillStaffPreset('WRK-002','worker123',true)" title="1-Click: Fill, 2-Click: Login" style="background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.5); color: #a7f3d0; border-radius: 999px; padding: 3px 9px; font-size: 11px; cursor: pointer;">🚛 WRK-002 (Driver)</button>
                                    <button type="button" class="sc-preset-pill" onclick="SmartCityAuth.fillStaffPreset('WRK-003','worker123')" ondblclick="SmartCityAuth.fillStaffPreset('WRK-003','worker123',true)" title="1-Click: Fill, 2-Click: Login" style="background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.5); color: #6ee7b7; border-radius: 999px; padding: 3px 9px; font-size: 11px; cursor: pointer;">☣️ WRK-003 (Hazard)</button>
                                    <button type="button" class="sc-preset-pill" onclick="SmartCityAuth.fillStaffPreset('BIN-GOL-01','BIN@2026')" ondblclick="SmartCityAuth.fillStaffPreset('BIN-GOL-01','BIN@2026',true)" title="1-Click: Fill, 2-Click: Login" style="background: rgba(5, 150, 105, 0.25); border: 1px solid rgba(5, 150, 105, 0.6); color: #a7f3d0; border-radius: 999px; padding: 3px 9px; font-size: 11px; cursor: pointer; font-weight: 800;">🗑️ BIN-GOL-01 (Dustbin)</button>
                                    <button type="button" class="sc-preset-pill" onclick="SmartCityAuth.fillStaffPreset('BIN-CMK-02','BIN@2026')" ondblclick="SmartCityAuth.fillStaffPreset('BIN-CMK-02','BIN@2026',true)" title="1-Click: Fill, 2-Click: Login" style="background: rgba(5, 150, 105, 0.2); border: 1px solid rgba(5, 150, 105, 0.5); color: #6ee7b7; border-radius: 999px; padding: 3px 9px; font-size: 11px; cursor: pointer;">🏪 BIN-CMK-02</button>
                                    <button type="button" class="sc-preset-pill" onclick="SmartCityAuth.fillStaffPreset('BIN-MED-05','BIN@2026')" ondblclick="SmartCityAuth.fillStaffPreset('BIN-MED-05','BIN@2026',true)" title="1-Click: Fill, 2-Click: Login" style="background: rgba(5, 150, 105, 0.2); border: 1px solid rgba(5, 150, 105, 0.5); color: #a7f3d0; border-radius: 999px; padding: 3px 9px; font-size: 11px; cursor: pointer;">🏥 BIN-MED-05</button>
                                    <button type="button" class="sc-preset-pill" onclick="SmartCityAuth.fillStaffPreset('WST-ADMIN','admin123')" ondblclick="SmartCityAuth.fillStaffPreset('WST-ADMIN','admin123',true)" title="1-Click: Fill, 2-Click: Login" style="background: rgba(234, 88, 12, 0.25); border: 1px solid rgba(234, 88, 12, 0.6); color: #fdba74; border-radius: 999px; padding: 3px 9px; font-size: 11px; cursor: pointer; font-weight: 800;">👑 WST-ADMIN (Chief)</button>
                                </div>
                            </div>

                            <!-- Healthcare & AIIMS -->
                            <div style="display: flex; flex-direction: column; gap: 3px;">
                                <div style="font-size: 10px; font-weight: 700; color: #c084fc;">🏥 Healthcare &amp; AIIMS:</div>
                                <div style="display: flex; flex-wrap: wrap; gap: 5px;">
                                    <button type="button" class="sc-preset-pill" onclick="SmartCityAuth.fillStaffPreset('HOSP-ADMIN','admin')" ondblclick="SmartCityAuth.fillStaffPreset('HOSP-ADMIN','admin',true)" title="1-Click: Fill, 2-Click: Login" style="background: rgba(168, 85, 247, 0.25); border: 1px solid rgba(168, 85, 247, 0.6); color: #e9d5ff; border-radius: 999px; padding: 3px 9px; font-size: 11px; cursor: pointer; font-weight: 800;">👑 HOSP-ADMIN (AIIMS)</button>
                                    <button type="button" class="sc-preset-pill" onclick="SmartCityAuth.fillStaffPreset('DOC-101','admin')" ondblclick="SmartCityAuth.fillStaffPreset('DOC-101','admin',true)" title="1-Click: Fill, 2-Click: Login" style="background: rgba(59, 130, 246, 0.25); border: 1px solid rgba(59, 130, 246, 0.6); color: #93c5fd; border-radius: 999px; padding: 3px 9px; font-size: 11px; cursor: pointer; font-weight: 800;">🩺 DOC-101 (Cardio)</button>
                                    <button type="button" class="sc-preset-pill" onclick="SmartCityAuth.fillStaffPreset('DOC-102','admin')" ondblclick="SmartCityAuth.fillStaffPreset('DOC-102','admin',true)" title="1-Click: Fill, 2-Click: Login" style="background: rgba(59, 130, 246, 0.2); border: 1px solid rgba(59, 130, 246, 0.5); color: #bfdbfe; border-radius: 999px; padding: 3px 9px; font-size: 11px; cursor: pointer;">🩺 DOC-102 (ER)</button>
                                    <button type="button" class="sc-preset-pill" onclick="SmartCityAuth.fillStaffPreset('DOC-103','admin')" ondblclick="SmartCityAuth.fillStaffPreset('DOC-103','admin',true)" title="1-Click: Fill, 2-Click: Login" style="background: rgba(59, 130, 246, 0.2); border: 1px solid rgba(59, 130, 246, 0.5); color: #bfdbfe; border-radius: 999px; padding: 3px 9px; font-size: 11px; cursor: pointer;">🩺 DOC-103 (Pediatric)</button>
                                    <button type="button" class="sc-preset-pill" onclick="SmartCityAuth.fillStaffPreset('HOSP-PHARM','admin')" ondblclick="SmartCityAuth.fillStaffPreset('HOSP-PHARM','admin',true)" title="1-Click: Fill, 2-Click: Login" style="background: rgba(236, 72, 153, 0.25); border: 1px solid rgba(236, 72, 153, 0.6); color: #fbcfe8; border-radius: 999px; padding: 3px 9px; font-size: 11px; cursor: pointer; font-weight: 800;">💊 HOSP-PHARM (Pharmacy)</button>
                                    <button type="button" class="sc-preset-pill" onclick="SmartCityAuth.fillStaffPreset('HOSP-REC','admin')" ondblclick="SmartCityAuth.fillStaffPreset('HOSP-REC','admin',true)" title="1-Click: Fill, 2-Click: Login" style="background: rgba(99, 102, 241, 0.25); border: 1px solid rgba(99, 102, 241, 0.6); color: #c7d2fe; border-radius: 999px; padding: 3px 9px; font-size: 11px; cursor: pointer;">🏨 HOSP-REC (Desk)</button>
                                    <button type="button" class="sc-preset-pill" onclick="SmartCityAuth.fillStaffPreset('HOSP-NURSE','admin')" ondblclick="SmartCityAuth.fillStaffPreset('HOSP-NURSE','admin',true)" title="1-Click: Fill, 2-Click: Login" style="background: rgba(147, 51, 234, 0.25); border: 1px solid rgba(147, 51, 234, 0.6); color: #e9d5ff; border-radius: 999px; padding: 3px 9px; font-size: 11px; cursor: pointer;">👩‍⚕️ HOSP-NURSE (Ward)</button>
                                </div>
                            </div>

                            <!-- Water Supply & Sewerage -->
                            <div style="display: flex; flex-direction: column; gap: 3px;">
                                <div style="font-size: 10px; font-weight: 700; color: #38bdf8;">💧 Water Supply &amp; Sewerage:</div>
                                <div style="display: flex; flex-wrap: wrap; gap: 5px;">
                                    <button type="button" class="sc-preset-pill" onclick="SmartCityAuth.fillStaffPreset('WTR-ADMIN','smartcity2026')" ondblclick="SmartCityAuth.fillStaffPreset('WTR-ADMIN','smartcity2026',true)" title="1-Click: Fill, 2-Click: Login" style="background: rgba(14, 165, 233, 0.25); border: 1px solid rgba(14, 165, 233, 0.6); color: #7dd3fc; border-radius: 999px; padding: 3px 9px; font-size: 11px; cursor: pointer; font-weight: 800;">💧 WTR-ADMIN</button>
                                    <button type="button" class="sc-preset-pill" onclick="SmartCityAuth.fillStaffPreset('WTR-ENG-01','smartcity2026')" ondblclick="SmartCityAuth.fillStaffPreset('WTR-ENG-01','smartcity2026',true)" title="1-Click: Fill, 2-Click: Login" style="background: rgba(16, 185, 129, 0.25); border: 1px solid rgba(16, 185, 129, 0.6); color: #6ee7b7; border-radius: 999px; padding: 3px 9px; font-size: 11px; cursor: pointer;">🔧 WTR-ENG-01</button>
                                    <button type="button" class="sc-preset-pill" onclick="SmartCityAuth.fillStaffPreset('WTR-ENG-02','smartcity2026')" ondblclick="SmartCityAuth.fillStaffPreset('WTR-ENG-02','smartcity2026',true)" title="1-Click: Fill, 2-Click: Login" style="background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.5); color: #a7f3d0; border-radius: 999px; padding: 3px 9px; font-size: 11px; cursor: pointer;">🔧 WTR-ENG-02</button>
                                    <button type="button" class="sc-preset-pill" onclick="SmartCityAuth.fillStaffPreset('SEW-ENG-01','smartcity2026')" ondblclick="SmartCityAuth.fillStaffPreset('SEW-ENG-01','smartcity2026',true)" title="1-Click: Fill, 2-Click: Login" style="background: rgba(20, 184, 166, 0.25); border: 1px solid rgba(20, 184, 166, 0.6); color: #5eead4; border-radius: 999px; padding: 3px 9px; font-size: 11px; cursor: pointer;">🚰 SEW-ENG-01</button>
                                </div>
                            </div>

                            <!-- Traffic & Mobility -->
                            <div style="display: flex; flex-direction: column; gap: 3px;">
                                <div style="font-size: 10px; font-weight: 700; color: #fb923c;">🚦 Traffic &amp; Mobility:</div>
                                <div style="display: flex; flex-wrap: wrap; gap: 5px;">
                                    <button type="button" class="sc-preset-pill" onclick="SmartCityAuth.fillStaffPreset('TR-VERMA','traffic123')" ondblclick="SmartCityAuth.fillStaffPreset('TR-VERMA','traffic123',true)" title="1-Click: Fill, 2-Click: Login" style="background: rgba(249, 115, 22, 0.25); border: 1px solid rgba(249, 115, 22, 0.6); color: #fdba74; border-radius: 999px; padding: 3px 9px; font-size: 11px; cursor: pointer; font-weight: 800;">👮 TR-VERMA (Golghar)</button>
                                    <button type="button" class="sc-preset-pill" onclick="SmartCityAuth.fillStaffPreset('TR-PANDEY','traffic123')" ondblclick="SmartCityAuth.fillStaffPreset('TR-PANDEY','traffic123',true)" title="1-Click: Fill, 2-Click: Login" style="background: rgba(249, 115, 22, 0.2); border: 1px solid rgba(249, 115, 22, 0.5); color: #fed7aa; border-radius: 999px; padding: 3px 9px; font-size: 11px; cursor: pointer;">👮 TR-PANDEY (Mohaddipur)</button>
                                    <button type="button" class="sc-preset-pill" onclick="SmartCityAuth.fillStaffPreset('TRF-ADMIN','traffic123')" ondblclick="SmartCityAuth.fillStaffPreset('TRF-ADMIN','traffic123',true)" title="1-Click: Fill, 2-Click: Login" style="background: rgba(245, 158, 11, 0.25); border: 1px solid rgba(245, 158, 11, 0.6); color: #fde047; border-radius: 999px; padding: 3px 9px; font-size: 11px; cursor: pointer; font-weight: 800;">👑 TRF-ADMIN</button>
                                </div>
                            </div>

                            <!-- Police -->
                            <div style="display: flex; flex-direction: column; gap: 3px;">
                                <div style="font-size: 10px; font-weight: 700; color: #93c5fd;">👮 Police &amp; Law Enforcement:</div>
                                <div style="display: flex; flex-wrap: wrap; gap: 5px;">
                                    <button type="button" class="sc-preset-pill" onclick="SmartCityAuth.fillStaffPreset('POL-SHO-01','police123')" ondblclick="SmartCityAuth.fillStaffPreset('POL-SHO-01','police123',true)" title="1-Click: Fill, 2-Click: Login" style="background: rgba(30, 58, 138, 0.3); border: 1px solid rgba(59, 130, 246, 0.6); color: #93c5fd; border-radius: 999px; padding: 3px 9px; font-size: 11px; cursor: pointer; font-weight: 800;">🚓 POL-SHO-01 (Cantt)</button>
                                    <button type="button" class="sc-preset-pill" onclick="SmartCityAuth.fillStaffPreset('POL-SI-02','police123')" ondblclick="SmartCityAuth.fillStaffPreset('POL-SI-02','police123',true)" title="1-Click: Fill, 2-Click: Login" style="background: rgba(30, 58, 138, 0.2); border: 1px solid rgba(59, 130, 246, 0.4); color: #bfdbfe; border-radius: 999px; padding: 3px 9px; font-size: 11px; cursor: pointer;">👮 POL-SI-02 (Kotwali)</button>
                                    <button type="button" class="sc-preset-pill" onclick="SmartCityAuth.fillStaffPreset('POL-ADMIN','police123')" ondblclick="SmartCityAuth.fillStaffPreset('POL-ADMIN','police123',true)" title="1-Click: Fill, 2-Click: Login" style="background: rgba(67, 56, 202, 0.3); border: 1px solid rgba(99, 102, 241, 0.5); color: #a5b4fc; border-radius: 999px; padding: 3px 9px; font-size: 11px; cursor: pointer; font-weight: 800;">👑 POL-ADMIN</button>
                                </div>
                            </div>

                            <!-- Parking -->
                            <div style="display: flex; flex-direction: column; gap: 3px;">
                                <div style="font-size: 10px; font-weight: 700; color: #5eead4;">🅿️ Smart Parking:</div>
                                <div style="display: flex; flex-wrap: wrap; gap: 5px;">
                                    <button type="button" class="sc-preset-pill" onclick="SmartCityAuth.fillStaffPreset('PRK-STAFF-01','parking123')" ondblclick="SmartCityAuth.fillStaffPreset('PRK-STAFF-01','parking123',true)" title="1-Click: Fill, 2-Click: Login" style="background: rgba(6, 95, 70, 0.25); border: 1px solid rgba(16, 185, 129, 0.5); color: #6ee7b7; border-radius: 999px; padding: 3px 9px; font-size: 11px; cursor: pointer; font-weight: 800;">🅿️ PRK-STAFF-01 (Golghar)</button>
                                    <button type="button" class="sc-preset-pill" onclick="SmartCityAuth.fillStaffPreset('PRK-STAFF-02','parking123')" ondblclick="SmartCityAuth.fillStaffPreset('PRK-STAFF-02','parking123',true)" title="1-Click: Fill, 2-Click: Login" style="background: rgba(6, 95, 70, 0.2); border: 1px solid rgba(16, 185, 129, 0.4); color: #a7f3d0; border-radius: 999px; padding: 3px 9px; font-size: 11px; cursor: pointer;">🅿️ PRK-STAFF-02 (Station)</button>
                                    <button type="button" class="sc-preset-pill" onclick="SmartCityAuth.fillStaffPreset('PRK-ADMIN','parking123')" ondblclick="SmartCityAuth.fillStaffPreset('PRK-ADMIN','parking123',true)" title="1-Click: Fill, 2-Click: Login" style="background: rgba(15, 118, 110, 0.25); border: 1px solid rgba(20, 184, 166, 0.5); color: #5eead4; border-radius: 999px; padding: 3px 9px; font-size: 11px; cursor: pointer; font-weight: 800;">👑 PRK-ADMIN</button>
                                </div>
                            </div>

                            <!-- Emergency -->
                            <div style="display: flex; flex-direction: column; gap: 3px;">
                                <div style="font-size: 10px; font-weight: 700; color: #fca5a5;">🚨 Emergency &amp; Ambulance:</div>
                                <div style="display: flex; flex-wrap: wrap; gap: 5px;">
                                    <button type="button" class="sc-preset-pill" onclick="SmartCityAuth.fillStaffPreset('EMG-01','emergency123')" ondblclick="SmartCityAuth.fillStaffPreset('EMG-01','emergency123',true)" title="1-Click: Fill, 2-Click: Login" style="background: rgba(220, 38, 38, 0.25); border: 1px solid rgba(239, 68, 68, 0.6); color: #fca5a5; border-radius: 999px; padding: 3px 9px; font-size: 11px; cursor: pointer; font-weight: 800;">🚨 EMG-01 (SOS Lead)</button>
                                    <button type="button" class="sc-preset-pill" onclick="SmartCityAuth.fillStaffPreset('EMG-02','emergency123')" ondblclick="SmartCityAuth.fillStaffPreset('EMG-02','emergency123',true)" title="1-Click: Fill, 2-Click: Login" style="background: rgba(220, 38, 38, 0.2); border: 1px solid rgba(239, 68, 68, 0.4); color: #fecaca; border-radius: 999px; padding: 3px 9px; font-size: 11px; cursor: pointer;">⚡ EMG-02 (Rapid)</button>
                                    <button type="button" class="sc-preset-pill" onclick="SmartCityAuth.fillStaffPreset('AMB-01','ambulance123')" ondblclick="SmartCityAuth.fillStaffPreset('AMB-01','ambulance123',true)" title="1-Click: Fill, 2-Click: Login" style="background: rgba(185, 28, 28, 0.25); border: 1px solid rgba(248, 113, 113, 0.6); color: #fecaca; border-radius: 999px; padding: 3px 9px; font-size: 11px; cursor: pointer; font-weight: 800;">🚑 AMB-01 (Ambulance Lead)</button>
                                    <button type="button" class="sc-preset-pill" onclick="SmartCityAuth.fillStaffPreset('AMB-02','ambulance123')" ondblclick="SmartCityAuth.fillStaffPreset('AMB-02','ambulance123',true)" title="1-Click: Fill, 2-Click: Login" style="background: rgba(185, 28, 28, 0.2); border: 1px solid rgba(248, 113, 113, 0.4); color: #fee2e2; border-radius: 999px; padding: 3px 9px; font-size: 11px; cursor: pointer;">🚑 AMB-02 (Mobile Unit)</button>
                                </div>
                            </div>

                            <!-- Power & Environment -->
                            <div style="display: flex; flex-direction: column; gap: 3px;">
                                <div style="font-size: 10px; font-weight: 700; color: #fde047;">💡 Power Grid &amp; Environment:</div>
                                <div style="display: flex; flex-wrap: wrap; gap: 5px;">
                                    <button type="button" class="sc-preset-pill" onclick="SmartCityAuth.fillStaffPreset('ELE-01','electric123')" ondblclick="SmartCityAuth.fillStaffPreset('ELE-01','electric123',true)" title="1-Click: Fill, 2-Click: Login" style="background: rgba(234, 179, 8, 0.25); border: 1px solid rgba(234, 179, 8, 0.5); color: #fef08a; border-radius: 999px; padding: 3px 9px; font-size: 11px; cursor: pointer; font-weight: 800;">💡 ELE-01 (Lights)</button>
                                    <button type="button" class="sc-preset-pill" onclick="SmartCityAuth.fillStaffPreset('ELE-02','electric123')" ondblclick="SmartCityAuth.fillStaffPreset('ELE-02','electric123',true)" title="1-Click: Fill, 2-Click: Login" style="background: rgba(234, 179, 8, 0.15); border: 1px solid rgba(234, 179, 8, 0.4); color: #fef9c3; border-radius: 999px; padding: 3px 9px; font-size: 11px; cursor: pointer;">⚡ ELE-02 (Substation)</button>
                                    <button type="button" class="sc-preset-pill" onclick="SmartCityAuth.fillStaffPreset('ENV-01','enviro123')" ondblclick="SmartCityAuth.fillStaffPreset('ENV-01','enviro123',true)" title="1-Click: Fill, 2-Click: Login" style="background: rgba(34, 197, 94, 0.25); border: 1px solid rgba(34, 197, 94, 0.5); color: #86efac; border-radius: 999px; padding: 3px 9px; font-size: 11px; cursor: pointer; font-weight: 800;">🍃 ENV-01 (AQI Lead)</button>
                                    <button type="button" class="sc-preset-pill" onclick="SmartCityAuth.fillStaffPreset('ENV-02','enviro123')" ondblclick="SmartCityAuth.fillStaffPreset('ENV-02','enviro123',true)" title="1-Click: Fill, 2-Click: Login" style="background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.4); color: #bbf7d0; border-radius: 999px; padding: 3px 9px; font-size: 11px; cursor: pointer;">🌳 ENV-02 (Green Belt)</button>
                                </div>
                            </div>
                        </div>\n                        `;
    content = content.substring(0, pStartIdx) + newPresetsBlock + content.substring(pEndIdx);
    console.log('Successfully replaced presets block!');
} else {
    console.error('Presets block indices not found!', { pStartIdx, pEndIdx });
}

fs.writeFileSync('frontend/auth.js', content, 'utf8');
console.log('Updated frontend/auth.js!');

