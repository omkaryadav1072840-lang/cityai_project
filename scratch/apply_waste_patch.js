const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../frontend/pages/waste/waste.html');
let content = fs.readFileSync(file, 'utf8');

// 1. Tab button
if (!content.includes('data-tab="tab-workforce"')) {
    const needle = `data-tab="tab-analytics"`;
    const needleIdx = content.indexOf(needle);
    if (needleIdx !== -1) {
        const closeBtnIdx = content.indexOf('</button>', needleIdx);
        if (closeBtnIdx !== -1) {
            const insertPoint = closeBtnIdx + '</button>'.length;
            const newBtn = '\r\n                    <button class="waste-tab-btn" data-tab="tab-workforce" onclick="switchWasteTab(\'tab-workforce\')">👥 Workforce Management & Roles</button>';
            content = content.slice(0, insertPoint) + newBtn + content.slice(insertPoint);
            console.log('Successfully inserted tab-workforce button');
        }
    }
}

// 2. Dedicated button in sub-navbar
if (!content.includes('id="dtBtnOpenDedicated"')) {
    const needle = 'onclick="toggleSensorTester()"';
    const needleIdx = content.indexOf(needle);
    if (needleIdx !== -1) {
        const closeBtnIdx = content.indexOf('</button>', needleIdx);
        if (closeBtnIdx !== -1) {
            const insertPoint = closeBtnIdx + '</button>'.length;
            const newBtn = '\r\n                            <a href="bin_dashboard.html?binCode=BIN-GOL-01" id="dtBtnOpenDedicated" class="small-btn" style="background: #10b981; color: white; text-decoration: none; font-weight: 700; padding: 6px 12px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;">🖥️ Dedicated Operator Terminal</a>';
            content = content.slice(0, insertPoint) + newBtn + content.slice(insertPoint);
            console.log('Successfully inserted dtBtnOpenDedicated');
        }
    }
}

// 3. Tab content
if (!content.includes('id="tab-workforce"')) {
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
                </div>`;

    const idx = content.indexOf('id="tab-analytics"');
    if (idx !== -1) {
        const nextSecEnd = content.indexOf('</section>', idx);
        if (nextSecEnd !== -1) {
            content = content.slice(0, nextSecEnd) + workforcePanel + '\r\n            ' + content.slice(nextSecEnd);
            console.log('Successfully inserted tab-workforce panel');
        }
    }
}

fs.writeFileSync(file, content, 'utf8');
console.log('Done!');

