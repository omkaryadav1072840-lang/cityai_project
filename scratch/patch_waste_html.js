const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/pages/waste/waste.html');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add tab button
const oldTabs = `<button class="waste-tab-btn" data-tab="tab-analytics" onclick="switchWasteTab('tab-analytics')">📊 Analytics & Hotspots</button>
                </div>`;
const newTabs = `<button class="waste-tab-btn" data-tab="tab-analytics" onclick="switchWasteTab('tab-analytics')">📊 Analytics & Hotspots</button>
                    <button class="waste-tab-btn" data-tab="tab-workforce" onclick="switchWasteTab('tab-workforce')">👥 Workforce Management & Roles</button>
                </div>`;

if (!content.includes('data-tab="tab-workforce"')) {
    content = content.replace(oldTabs, newTabs);
}

// 2. Add Dedicated Terminal button to dustbin sub-navbar if missing
if (!content.includes('dtBtnOpenDedicated')) {
    const targetSubNav = `<button class="small-btn" onclick="toggleSensorTester()" style="background: #eab308; color: #172033; font-weight: 800; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer;">
                                🧪 Hardware Tester
                            </button>`;
    const replacementSubNav = `<button class="small-btn" onclick="toggleSensorTester()" style="background: #eab308; color: #172033; font-weight: 800; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer;">
                                🧪 Hardware Tester
                            </button>
                            <a href="bin_dashboard.html?binCode=BIN-GOL-01" id="dtBtnOpenDedicated" class="small-btn" style="background: #10b981; color: white; text-decoration: none; font-weight: 700; padding: 6px 12px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;">
                                🖥️ Dedicated Operator Terminal
                            </a>`;
    content = content.replace(targetSubNav, replacementSubNav);
}

// 3. Add tab-workforce content panel
const workforcePanel = `
                <!-- TAB CONTENT: WORKFORCE MANAGEMENT & ROLES (PHASE 2) -->
                <div id="tab-workforce" class="waste-tab-content" style="display: none;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
                        <div>
                            <h3 style="font-size: 16px; margin: 0 0 4px; display: flex; align-items: center; gap: 8px;">
                                <span>👥</span> Municipal Sanitation Workforce Directory & Governance
                            </h3>
                            <p style="font-size: 12px; color: #64748b; margin: 0;">
                                Admin RBAC governance across Control Center, Field Collection Crews, and Smart Bin Operators.
                            </p>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn green-btn" onclick="openAddStaffModal()" style="padding: 8px 16px; font-size: 12px; font-weight: 700;">
                                + Add Staff Account
                            </button>
                            <button class="btn outline-btn" onclick="openAuditLogModal()" style="padding: 8px 14px; font-size: 12px;">
                                📜 View Audit History
                            </button>
                            <button class="btn outline-btn" onclick="loadAdminStaffTable(true)" style="padding: 8px 12px; font-size: 12px;">
                                🔄 Refresh
                            </button>
                        </div>
                    </div>

                    <div style="overflow-x: auto;">
                        <table class="waste-data-table" id="workforceStaffTable">
                            <thead>
                                <tr>
                                    <th>Staff ID</th>
                                    <th>Officer / Employee Name</th>
                                    <th>Role Classification</th>
                                    <th>Assigned Operations</th>
                                    <th>Account Status</th>
                                    <th>Security & Actions</th>
                                </tr>
                            </thead>
                            <tbody id="workforceStaffTableBody">
                                <tr><td colspan="6" style="text-align:center; padding: 20px;">Loading municipal workforce accounts...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
`;

if (!content.includes('id="tab-workforce"')) {
    const endOfAnalytics = `</tbody>
                        </table>
                    </div>
                </div>
            </section>`;
    const replacementEndOfAnalytics = `</tbody>
                        </table>
                    </div>
                </div>
${workforcePanel}
            </section>`;
    content = content.replace(endOfAnalytics, replacementEndOfAnalytics);
}

// 4. Add Workforce Modals before <!-- LEAFLET -->
const workforceModals = `
<!-- ================= WORKFORCE MANAGEMENT MODALS ================= -->

<!-- 1. ADD STAFF EMPLOYEE MODAL -->
<div class="modal" id="addStaffModal" style="display: none;">
    <div class="modal-content" style="max-width: 520px;">
        <span class="close" onclick="closeAddStaffModal()">&times;</span>
        <h2 style="font-size: 18px; margin-bottom: 4px;">👤 Add Sanitation Employee Account</h2>
        <p class="modal-subtitle" style="margin-bottom: 16px;">Create credentials and allocate role-based operational permissions.</p>

        <form id="addStaffForm" onsubmit="handleCreateStaffSubmit(event)">
            <div class="form-group" style="margin-bottom: 12px;">
                <label class="form-label" style="font-size: 12px; font-weight: 700;">Official Staff ID <span style="color: #ef4444;">*</span></label>
                <input type="text" id="newStaffId" class="form-control" required placeholder="e.g. WST-CC-02, WRK-004, BIN-CIV-03">
                <small style="color: #64748b; font-size: 10px;">Unique municipal badge identifier</small>
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
                <label class="form-label" style="font-size: 12px; font-weight: 700;">Full Name <span style="color: #ef4444;">*</span></label>
                <input type="text" id="newStaffName" class="form-control" required placeholder="e.g. Anand Prakash">
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
                <label class="form-label" style="font-size: 12px; font-weight: 700;">Official Email <span style="color: #ef4444;">*</span></label>
                <input type="email" id="newStaffEmail" class="form-control" required placeholder="e.g. anand@smartcity.gorakhpur.gov.in">
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
                <label class="form-label" style="font-size: 12px; font-weight: 700;">Department Role Classification <span style="color: #ef4444;">*</span></label>
                <select id="newStaffRole" class="form-control" required onchange="handleStaffRoleChange(this.value)">
                    <option value="CONTROL_CENTER">🎧 Control Center Staff (City GIS, Triage, AI Assignment)</option>
                    <option value="WORKING_STAFF">👷 Working Staff / Field Crew (Tasks, Navigation, Proof)</option>
                    <option value="BIN_STAFF">🗑️ Bin Staff / Smart Bin Operator (Dedicated to single bin)</option>
                </select>
            </div>

            <!-- Dynamic role assignment inputs -->
            <div id="assignRouteGroup" class="form-group" style="margin-bottom: 12px; display: none;">
                <label class="form-label" style="font-size: 12px; font-weight: 700;">Assigned Route & Area</label>
                <input type="text" id="newStaffArea" class="form-control" placeholder="e.g. Golghar & Ward 14">
            </div>

            <div id="assignBinGroup" class="form-group" style="margin-bottom: 12px; display: none;">
                <label class="form-label" style="font-size: 12px; font-weight: 700;">Assigned Smart Bin Code</label>
                <input type="text" id="newStaffBinCode" class="form-control" placeholder="e.g. BIN-GOL-01, BIN-CMK-02">
            </div>

            <div class="form-group" style="margin-bottom: 16px;">
                <label class="form-label" style="font-size: 12px; font-weight: 700;">Initial Account Password <span style="color: #ef4444;">*</span></label>
                <input type="password" id="newStaffPassword" class="form-control" required placeholder="Min 6 characters">
            </div>

            <button type="submit" id="btnSubmitAddStaff" class="submit-btn" style="width: 100%;">
                ✨ Create & Provision Account
            </button>
        </form>
    </div>
</div>

<!-- 2. EDIT ASSIGNMENT MODAL -->
<div class="modal" id="editAssignmentModal" style="display: none;">
    <div class="modal-content" style="max-width: 480px;">
        <span class="close" onclick="closeEditAssignmentModal()">&times;</span>
        <h2 style="font-size: 18px; margin-bottom: 4px;">🔄 Change Employee Operational Assignment</h2>
        <p class="modal-subtitle" id="editAssignSubtitle" style="margin-bottom: 14px;">Update sector, route, or smart bin assignment.</p>

        <form id="editAssignmentForm" onsubmit="handleUpdateAssignmentSubmit(event)">
            <input type="hidden" id="editAssignStaffId" value="">

            <div class="form-group" style="margin-bottom: 12px;">
                <label class="form-label" style="font-size: 12px; font-weight: 700;">Assigned Area / Route</label>
                <input type="text" id="editAssignArea" class="form-control" placeholder="e.g. Medical College & Ward 22">
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
                <label class="form-label" style="font-size: 12px; font-weight: 700;">Assigned Bin Code (for Bin Staff)</label>
                <input type="text" id="editAssignBinCode" class="form-control" placeholder="e.g. BIN-MED-05">
            </div>

            <div class="form-group" style="margin-bottom: 16px;">
                <label class="form-label" style="font-size: 12px; font-weight: 700;">Audit Reason for Change <span style="color: #ef4444;">*</span></label>
                <textarea id="editAssignReason" class="form-control" required rows="2" placeholder="e.g. Routine sector rotation / Ward reallocation"></textarea>
            </div>

            <button type="submit" class="submit-btn" style="width: 100%;">
                💾 Save Updated Assignment
            </button>
        </form>
    </div>
</div>

<!-- 3. RESET PASSWORD MODAL -->
<div class="modal" id="resetPasswordModal" style="display: none;">
    <div class="modal-content" style="max-width: 440px;">
        <span class="close" onclick="closeResetPasswordModal()">&times;</span>
        <h2 style="font-size: 18px; margin-bottom: 4px;">🔑 Secure Password Reset</h2>
        <p class="modal-subtitle" id="resetPassSubtitle" style="margin-bottom: 14px;">Reset staff login credentials using secure scrypt cryptographic hashing.</p>

        <form id="resetPasswordForm" onsubmit="handleResetPasswordSubmit(event)">
            <input type="hidden" id="resetPassStaffId" value="">

            <div class="form-group" style="margin-bottom: 16px;">
                <label class="form-label" style="font-size: 12px; font-weight: 700;">New Official Password <span style="color: #ef4444;">*</span></label>
                <input type="password" id="resetNewPassword" class="form-control" required placeholder="Minimum 6 characters">
            </div>

            <button type="submit" class="submit-btn" style="width: 100%; background: #ea580c;">
                🔒 Confirm Password Reset
            </button>
        </form>
    </div>
</div>

<!-- 4. AUDIT LOG MODAL -->
<div class="modal" id="auditLogModal" style="display: none;">
    <div class="modal-content" style="max-width: 760px; max-height: 85vh; overflow-y: auto;">
        <span class="close" onclick="closeAuditLogModal()">&times;</span>
        <h2 style="font-size: 18px; margin-bottom: 4px;">📜 Workforce Administration Audit Trail</h2>
        <p class="modal-subtitle" style="margin-bottom: 16px;">Cryptographically secured immutable history of staff assignments, credential changes, and role modifications.</p>

        <div style="overflow-x: auto;">
            <table class="waste-data-table" id="auditLogTable">
                <thead>
                    <tr>
                        <th>Timestamp</th>
                        <th>Action Performed</th>
                        <th>Target Employee</th>
                        <th>Performed By</th>
                        <th>Audit Reason & Notes</th>
                    </tr>
                </thead>
                <tbody id="auditLogTableBody">
                    <tr><td colspan="5" style="text-align:center; padding: 20px;">Loading audit logs...</td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>
`;

if (!content.includes('id="addStaffModal"')) {
    content = content.replace('<!-- LEAFLET -->', `${workforceModals}\n\n<!-- LEAFLET -->`);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched waste.html with workforce tab, sub-navbar dedicated link, and workforce modals!');

