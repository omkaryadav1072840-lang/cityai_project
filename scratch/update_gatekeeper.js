const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'frontend', 'pages', 'waste', 'waste.html');
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = `            <button class="btn green-btn" onclick="SmartCityAuth.showLoginModal('staff')" style="padding: 10px 22px; font-size: 14px;">
                🔑 Sign In as Staff (e.g. WST001)
            </button>`;

const replacementStr = `            <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                <button class="btn green-btn" onclick="directWasteStaffLogin()" style="padding: 10px 24px; font-size: 14px; font-weight: 800; background: linear-gradient(135deg, #059669 0%, #047857 100%); box-shadow: 0 4px 15px rgba(5, 150, 105, 0.3);">
                    ⚡ 1-Click Access as Waste Staff
                </button>
                <button class="btn outline-btn" onclick="SmartCityAuth.showLoginModal('staff')" style="padding: 10px 22px; font-size: 14px;">
                    🔑 Sign In with Credentials
                </button>
            </div>`;

const normContent = content.replace(/\r\n/g, '\n');
const normTarget = targetStr.replace(/\r\n/g, '\n');
const normReplacement = replacementStr.replace(/\r\n/g, '\n');

if (!normContent.includes(normTarget)) {
    console.error("Target not found!");
    process.exit(1);
}

const updated = normContent.replace(normTarget, normReplacement);
fs.writeFileSync(filePath, updated.replace(/\n/g, '\r\n'), 'utf8');
console.log("✅ Successfully added direct Waste Staff access button to waste.html!");

