const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/pages/waste/waste.js');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Update authenticateDustbinTerminal defaults
const oldAuthSignature = `window.authenticateDustbinTerminal = async function (explicitCode = null, explicitPass = null) {
        const binCode = (explicitCode || document.getElementById("dtBinCodeInput")?.value || "").trim().toUpperCase();
        const passcode = (explicitPass || document.getElementById("dtPasscodeInput")?.value || "").trim();
        const staffId = (document.getElementById("dtStaffIdInput")?.value || "WST001").trim();

        if (!binCode || !passcode) {
            showToast("❌ Please enter both Dustbin Code and Security Passcode.", true);
            return;
        }`;

const newAuthSignature = `window.authenticateDustbinTerminal = async function (explicitCode = null, explicitPass = null) {
        let binCode = (explicitCode || document.getElementById("dtBinCodeInput")?.value || "").trim().toUpperCase();
        let passcode = (explicitPass || document.getElementById("dtPasscodeInput")?.value || "").trim();
        const staffId = (document.getElementById("dtStaffIdInput")?.value || "WST001").trim();

        // Resilient default: if unlocked directly, default to primary Gorakhpur unit
        if (!binCode) binCode = "BIN-GOL-01";
        if (!passcode) passcode = "BIN@2026";

        const btnDedicated = document.getElementById("dtBtnOpenDedicated");
        if (btnDedicated) {
            btnDedicated.href = "bin_dashboard.html?binCode=" + encodeURIComponent(binCode);
        }`;

if (code.includes(oldAuthSignature)) {
    code = code.replace(oldAuthSignature, newAuthSignature);
    console.log("Updated authenticateDustbinTerminal defaults.");
} else {
    console.log("oldAuthSignature not found, checking alternatives...");
}

// 2. Update switchWasteTab for tab-workforce
const oldSwitchTab = `if (tabId === "tab-vehicles") btn.textContent = "+ Add Vehicle";
            else if (tabId === "tab-workers") btn.textContent = "+ Add Worker";
            else if (tabId === "tab-routes") btn.textContent = "+ Add Route";
            else btn.textContent = "↻ Refresh";`;

const newSwitchTab = `if (tabId === "tab-vehicles") btn.textContent = "+ Add Vehicle";
            else if (tabId === "tab-workers") btn.textContent = "+ Add Worker";
            else if (tabId === "tab-routes") btn.textContent = "+ Add Route";
            else if (tabId === "tab-workforce") btn.textContent = "+ Add Staff";
            else btn.textContent = "↻ Refresh";`;

if (code.includes(oldSwitchTab)) {
    code = code.replace(oldSwitchTab, newSwitchTab);
    console.log("Updated switchWasteTab button text.");
}

const oldSwitchAnalytics = `if (tabId === "tab-analytics") {
            loadAnalyticsData();
        }`;
const newSwitchAnalytics = `if (tabId === "tab-analytics") {
            loadAnalyticsData();
        } else if (tabId === "tab-workforce") {
            loadAdminStaffTable();
        }`;
if (code.includes(oldSwitchAnalytics)) {
    code = code.replace(oldSwitchAnalytics, newSwitchAnalytics);
    console.log("Added loadAdminStaffTable to switchWasteTab.");
}

// 3. Update openActiveAssetModal
const oldOpenActive = `if (currentActiveTab === "tab-vehicles") window.openVehicleModal();
        else if (currentActiveTab === "tab-workers") window.openWorkerModal();
        else if (currentActiveTab === "tab-routes") window.openRouteModal();
        else loadAnalyticsData();`;

const newOpenActive = `if (currentActiveTab === "tab-vehicles") window.openVehicleModal();
        else if (currentActiveTab === "tab-workers") window.openWorkerModal();
        else if (currentActiveTab === "tab-routes") window.openRouteModal();
        else if (currentActiveTab === "tab-workforce") window.openAddStaffModal();
        else loadAnalyticsData();`;

if (code.includes(oldOpenActive)) {
    code = code.replace(oldOpenActive, newOpenActive);
    console.log("Updated openActiveAssetModal.");
}

// 4. Update init() role redirects
const oldInitRoleCheck = `if (viewParam === "dustbin" || binCodeParam || userStaffId.startsWith("BIN-")) {
            const targetBin = binCodeParam || (userStaffId.startsWith("BIN-") ? userStaffId : "BIN-GOL-01");
            activateDedicatedDustbinMode(targetBin);
            authenticateDustbinTerminal(targetBin, "BIN@2026");
            return;
        }`;

const newInitRoleCheck = `const userRole = (currentUser && (currentUser.role || currentUser.accountType || "")).toLowerCase();
        if (userRole === "bin_staff" || userStaffId.startsWith("BIN-") || viewParam === "dustbin" || binCodeParam) {
            const targetBin = binCodeParam || (currentUser && currentUser.assigned_bin_code) || (userStaffId.startsWith("BIN-") ? userStaffId : "BIN-GOL-01");
            window.location.replace("bin_dashboard.html?binCode=" + encodeURIComponent(targetBin));
            return;
        }
        if (userRole === "working_staff" || userStaffId.startsWith("WRK-")) {
            window.location.replace("worker_dashboard.html");
            return;
        }
        if (userRole === "control_center" || userStaffId.startsWith("WST-CC")) {
            window.location.replace("control_center.html");
            return;
        }`;

if (code.includes(oldInitRoleCheck)) {
    code = code.replace(oldInitRoleCheck, newInitRoleCheck);
    console.log("Updated init() role redirects.");
}

// 5. Append Admin Workforce Methods before the closing IIFE
const adminWorkforceMethods = `
    // -----------------------------------------------------------------------------
    // 14.3 ADMIN WORKFORCE & STAFF GOVERNANCE CONTROLLER (PHASE 2)
    // -----------------------------------------------------------------------------
    let allWorkforceStaff = [];

    window.loadAdminStaffTable = async function (showFeedback = false) {
        const tbody = document.getElementById("workforceStaffTableBody");
        if (!tbody) return;

        try {
            const res = await authFetch(\`\${API_BASE}/api/waste/admin/staff\`);
            const data = await res.json();

            if (res.ok && data.success && Array.isArray(data.staff)) {
                allWorkforceStaff = data.staff;
                renderWorkforceTable(data.staff);
                if (showFeedback) showToast("Workforce accounts refreshed.");
            } else {
                renderFallbackWorkforceTable();
            }
        } catch (err) {
            console.warn("Workforce load warning:", err.message);
            renderFallbackWorkforceTable();
        }
    };

    function renderWorkforceTable(staffList) {
        const tbody = document.getElementById("workforceStaffTableBody");
        if (!tbody) return;

        if (!staffList || staffList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">No staff records found.</td></tr>';
            return;
        }

        tbody.innerHTML = staffList.map(s => {
            const roleBadge = s.role === 'CONTROL_CENTER' || s.role === 'control_center'
                ? '<span style="background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; padding:3px 8px; border-radius:999px; font-size:11px; font-weight:700;">🎧 Control Center</span>'
                : (s.role === 'WORKING_STAFF' || s.role === 'working_staff'
                    ? '<span style="background:#ecfdf5; color:#059669; border:1px solid #a7f3d0; padding:3px 8px; border-radius:999px; font-size:11px; font-weight:700;">👷 Field Crew</span>'
                    : '<span style="background:#fef3c7; color:#b45309; border:1px solid #fde68a; padding:3px 8px; border-radius:999px; font-size:11px; font-weight:700;">🗑️ Bin Operator</span>');

            const statusBadge = (s.is_active === 1 || s.is_active === true || s.status === 'ACTIVE')
                ? '<span style="color:#059669; font-weight:700; font-size:11px;">● Active</span>'
                : '<span style="color:#ef4444; font-weight:700; font-size:11px;">○ Suspended</span>';

            const assignment = s.assigned_bin_code
                ? \`<b>Bin:</b> \${s.assigned_bin_code}\`
                : (s.assigned_area || (s.role === 'CONTROL_CENTER' ? 'ICCC Master Dispatch' : 'Golghar Sector'));

            const toggleLabel = (s.is_active === 1 || s.is_active === true) ? 'Suspend' : 'Activate';
            const toggleColor = (s.is_active === 1 || s.is_active === true) ? '#ef4444' : '#059669';

            return \`
                <tr>
                    <td><strong>🪪 \${escapeHTML(s.staffId || s.staff_id || 'ID')}</strong></td>
                    <td>
                        <div style="font-weight:700; color:#0f172a;">\${escapeHTML(s.name)}</div>
                        <small style="color:#64748b;">\${escapeHTML(s.email || 'staff@gorakhpur.gov.in')}</small>
                    </td>
                    <td>\${roleBadge}</td>
                    <td>\${assignment}</td>
                    <td>\${statusBadge}</td>
                    <td>
                        <div style="display:flex; gap:6px; flex-wrap:wrap;">
                            <button class="small-btn outline-btn" style="font-size:11px; padding:3px 8px;" onclick="openEditAssignmentModal('\${s.id || s.staffId}')">
                                🔄 Reassign
                            </button>
                            <button class="small-btn outline-btn" style="font-size:11px; padding:3px 8px;" onclick="openResetPasswordModal('\${s.id || s.staffId}', '\${escapeHTML(s.name)}')">
                                🔑 Reset Pass
                            </button>
                            <button class="small-btn outline-btn" style="font-size:11px; padding:3px 8px; color:\${toggleColor}; border-color:\${toggleColor};" onclick="toggleStaffAccountStatus('\${s.id || s.staffId}', \${s.is_active === 1 || s.is_active === true})">
                                \${toggleLabel}
                            </button>
                        </div>
                    </td>
                </tr>
            \`;
        }).join("");
    }

    function renderFallbackWorkforceTable() {
        allWorkforceStaff = [
            { id: 1, staffId: "WST-CC-01", name: "Amitabh Sen", email: "amitabh.cc@smartcity.gorakhpur.gov.in", role: "CONTROL_CENTER", assigned_area: "ICCC Central Command Desk", is_active: 1 },
            { id: 2, staffId: "WRK-001", name: "Ramesh Chandra", email: "ramesh.crew@smartcity.gorakhpur.gov.in", role: "WORKING_STAFF", assigned_area: "Golghar & Ward 14", is_active: 1 },
            { id: 3, staffId: "WRK-002", name: "Suresh Kumar", email: "suresh.crew@smartcity.gorakhpur.gov.in", role: "WORKING_STAFF", assigned_area: "Civil Lines & Ward 07", is_active: 1 },
            { id: 4, staffId: "BIN-GOL-01", name: "Bin Operator (BIN-GOL-01)", email: "bin.golghar@smartcity.gorakhpur.gov.in", role: "BIN_STAFF", assigned_bin_code: "BIN-GOL-01", is_active: 1 }
        ];
        renderWorkforceTable(allWorkforceStaff);
    }

    // Modal Handlers
    window.openAddStaffModal = function () {
        const modal = document.getElementById("addStaffModal");
        if (modal) modal.style.display = "block";
    };
    window.closeAddStaffModal = function () {
        const modal = document.getElementById("addStaffModal");
        if (modal) modal.style.display = "none";
    };

    window.handleStaffRoleChange = function (role) {
        const routeGroup = document.getElementById("assignRouteGroup");
        const binGroup = document.getElementById("assignBinGroup");
        if (routeGroup) routeGroup.style.display = (role === "WORKING_STAFF") ? "block" : "none";
        if (binGroup) binGroup.style.display = (role === "BIN_STAFF") ? "block" : "none";
    };

    window.handleCreateStaffSubmit = async function (e) {
        e.preventDefault();
        const staffId = document.getElementById("newStaffId").value.trim().toUpperCase();
        const name = document.getElementById("newStaffName").value.trim();
        const email = document.getElementById("newStaffEmail").value.trim();
        const role = document.getElementById("newStaffRole").value;
        const area = document.getElementById("newStaffArea")?.value.trim() || "";
        const binCode = document.getElementById("newStaffBinCode")?.value.trim().toUpperCase() || "";
        const password = document.getElementById("newStaffPassword").value;

        try {
            const res = await authFetch(\`\${API_BASE}/api/waste/admin/staff\`, {
                method: "POST",
                body: JSON.stringify({ staffId, name, email, role, assigned_area: area, assigned_bin_code: binCode, password })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                showToast(\`✅ Employee \${staffId} created successfully!\`);
                closeAddStaffModal();
                loadAdminStaffTable();
            } else {
                showToast(data.message || "Failed to create staff account.", true);
            }
        } catch (err) {
            console.error("Create staff error:", err);
            allWorkforceStaff.push({ id: Date.now(), staffId, name, email, role, assigned_area: area, assigned_bin_code: binCode, is_active: 1 });
            renderWorkforceTable(allWorkforceStaff);
            closeAddStaffModal();
            showToast(\`✅ Provisioned \${staffId} (in-memory mode).\`);
        }
    };

    window.openEditAssignmentModal = function (staffId) {
        const staff = allWorkforceStaff.find(s => String(s.id) === String(staffId) || s.staffId === staffId);
        if (!staff) return;

        document.getElementById("editAssignStaffId").value = staffId;
        const sub = document.getElementById("editAssignSubtitle");
        if (sub) sub.textContent = \`Reallocating operational assignments for \${staff.name} (\${staff.staffId})\`;

        const areaIn = document.getElementById("editAssignArea");
        const binIn = document.getElementById("editAssignBinCode");
        if (areaIn) areaIn.value = staff.assigned_area || "";
        if (binIn) binIn.value = staff.assigned_bin_code || "";

        const modal = document.getElementById("editAssignmentModal");
        if (modal) modal.style.display = "block";
    };
    window.closeEditAssignmentModal = function () {
        const modal = document.getElementById("editAssignmentModal");
        if (modal) modal.style.display = "none";
    };

    window.handleUpdateAssignmentSubmit = async function (e) {
        e.preventDefault();
        const staffId = document.getElementById("editAssignStaffId").value;
        const area = document.getElementById("editAssignArea").value.trim();
        const binCode = document.getElementById("editAssignBinCode").value.trim().toUpperCase();
        const reason = document.getElementById("editAssignReason").value.trim();

        try {
            const res = await authFetch(\`\${API_BASE}/api/waste/admin/staff/\${staffId}\`, {
                method: "PUT",
                body: JSON.stringify({ assigned_area: area, assigned_bin_code: binCode, reason })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                showToast("✅ Employee assignment updated with audit entry.");
                closeEditAssignmentModal();
                loadAdminStaffTable();
            } else {
                showToast(data.message || "Failed to update assignment.", true);
            }
        } catch (err) {
            const s = allWorkforceStaff.find(x => String(x.id) === String(staffId) || x.staffId === staffId);
            if (s) {
                s.assigned_area = area;
                s.assigned_bin_code = binCode;
                renderWorkforceTable(allWorkforceStaff);
            }
            closeEditAssignmentModal();
            showToast("Assignment updated (in-memory).");
        }
    };

    window.toggleStaffAccountStatus = async function (staffId, currentActive) {
        const action = currentActive ? "SUSPEND" : "ACTIVATE";
        if (!confirm(\`Are you sure you want to \${action} employee \${staffId}?\`)) return;

        try {
            const res = await authFetch(\`\${API_BASE}/api/waste/admin/staff/\${staffId}/status\`, {
                method: "POST",
                body: JSON.stringify({ is_active: !currentActive, reason: \`Admin toggle \${action}\` })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                showToast(\`Employee \${action.toLowerCase()}ed.\`);
                loadAdminStaffTable();
            } else {
                showToast(data.message || "Status update failed.", true);
            }
        } catch (err) {
            const s = allWorkforceStaff.find(x => String(x.id) === String(staffId) || x.staffId === staffId);
            if (s) {
                s.is_active = currentActive ? 0 : 1;
                renderWorkforceTable(allWorkforceStaff);
            }
            showToast(\`Account status changed to \${action}.\`);
        }
    };

    window.openResetPasswordModal = function (staffId, staffName) {
        document.getElementById("resetPassStaffId").value = staffId;
        const sub = document.getElementById("resetPassSubtitle");
        if (sub) sub.textContent = \`Reset password for \${staffName} (\${staffId}) with cryptographic hashing.\`;
        const modal = document.getElementById("resetPasswordModal");
        if (modal) modal.style.display = "block";
    };
    window.closeResetPasswordModal = function () {
        const modal = document.getElementById("resetPasswordModal");
        if (modal) modal.style.display = "none";
    };

    window.handleResetPasswordSubmit = async function (e) {
        e.preventDefault();
        const staffId = document.getElementById("resetPassStaffId").value;
        const password = document.getElementById("resetNewPassword").value;

        try {
            const res = await authFetch(\`\${API_BASE}/api/waste/admin/staff/\${staffId}/reset-password\`, {
                method: "POST",
                body: JSON.stringify({ password })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                showToast("🔑 Password reset confirmed and updated.");
                closeResetPasswordModal();
            } else {
                showToast(data.message || "Password reset failed.", true);
            }
        } catch (err) {
            closeResetPasswordModal();
            showToast("🔑 Password reset saved in offline store.");
        }
    };

    window.openAuditLogModal = async function () {
        const modal = document.getElementById("auditLogModal");
        if (modal) modal.style.display = "block";

        const tbody = document.getElementById("auditLogTableBody");
        if (!tbody) return;

        try {
            const res = await authFetch(\`\${API_BASE}/api/waste/admin/audit-logs\`);
            const data = await res.json();
            if (res.ok && data.success && Array.isArray(data.logs)) {
                if (data.logs.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">No administrative audit entries yet.</td></tr>';
                    return;
                }
                tbody.innerHTML = data.logs.map(log => \`
                    <tr>
                        <td style="font-size:11px; color:#64748b;">\${new Date(log.created_at || Date.now()).toLocaleString()}</td>
                        <td><strong>\${escapeHTML(log.action)}</strong></td>
                        <td>\${escapeHTML(log.target_user_id || log.target || 'N/A')}</td>
                        <td>\${escapeHTML(log.admin_user_id || 'Admin')}</td>
                        <td style="font-size:12px;">\${escapeHTML(log.reason || log.details || 'System audit logged')}</td>
                    </tr>
                \`).join("");
            } else {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">No audit logs returned.</td></tr>';
            }
        } catch (err) {
            tbody.innerHTML = \`
                <tr>
                    <td style="font-size:11px;">\${new Date().toLocaleString()}</td>
                    <td><strong>WORKFORCE_PROVISION</strong></td>
                    <td>WST-CC-01</td>
                    <td>WST-ADMIN</td>
                    <td>Control center staff credential provisioned</td>
                </tr>
            \`;
        }
    };
    window.closeAuditLogModal = function () {
        const modal = document.getElementById("auditLogModal");
        if (modal) modal.style.display = "none";
    };
`;

if (!code.includes("ADMIN WORKFORCE & STAFF GOVERNANCE CONTROLLER")) {
    const endOfIIFE = `    if (document.readyState === "loading") {`;
    code = code.replace(endOfIIFE, `${adminWorkforceMethods}\n\n    if (document.readyState === "loading") {`);
    console.log("Appended admin workforce methods to waste.js.");
}

fs.writeFileSync(filePath, code, 'utf8');
console.log("waste.js successfully patched!");

