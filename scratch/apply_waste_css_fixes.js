const fs = require('fs');
const path = require('path');

const cssPath = path.join('frontend', 'pages', 'waste', 'waste.css');
let css = fs.readFileSync(cssPath, 'utf8');

const targetButtons = `/* ================= BUTTONS ================= */

.btn,
.small-btn,
.submit-btn {
    border: none;

    cursor: pointer;

    font-weight: 700;

    border-radius: 9px;
}

.btn {
    padding: 12px 15px;
}

.white-btn {
    background: white;
    color: #15803d;
}

.green-btn {
    background: #22c55e;
    color: white;
}

.outline-btn {
    color: white;

    background: transparent;

    border: 1px solid #ffffff66;
}`;

const replacementButtons = `/* ================= BUTTONS ================= */

.btn,
.small-btn,
.submit-btn {
    border: none;
    cursor: pointer;
    font-weight: 700;
    border-radius: 9px;
    font-family: inherit;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    text-decoration: none;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn {
    padding: 10px 18px;
    font-size: 13px;
}

.btn-sm {
    padding: 6px 12px;
    font-size: 12px;
    border-radius: 6px;
}

/* White button with visible border & shadow */
.white-btn {
    background: #ffffff;
    color: #15803d;
    border: 1.5px solid #86efac;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
}

.white-btn:hover {
    background: #f0fdf4;
    border-color: #22c55e;
    color: #166534;
    transform: translateY(-1px);
    box-shadow: 0 4px 10px rgba(34, 197, 94, 0.12);
}

/* Green primary button */
.green-btn {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: #ffffff;
    border: 1px solid transparent;
    box-shadow: 0 3px 10px rgba(16, 185, 129, 0.25);
}

.green-btn:hover {
    background: linear-gradient(135deg, #059669 0%, #047857 100%);
    color: #ffffff;
    transform: translateY(-1px);
    box-shadow: 0 5px 14px rgba(5, 150, 105, 0.35);
}

/* Default outline button for light surfaces - HIGH CONTRAST EMERALD */
.outline-btn {
    color: #065f46 !important;
    background: #ffffff !important;
    border: 1.5px solid #059669 !important;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.outline-btn:hover {
    background: #ecfdf5 !important;
    border-color: #047857 !important;
    color: #047857 !important;
    transform: translateY(-1px);
    box-shadow: 0 3px 8px rgba(5, 150, 105, 0.15);
}

/* Outline button on dark / green hero gradients */
.hero .outline-btn,
.citizen-hero .outline-btn {
    color: #ffffff !important;
    background: rgba(255, 255, 255, 0.15) !important;
    border: 1.5px solid rgba(255, 255, 255, 0.7) !important;
    box-shadow: none;
}

.hero .outline-btn:hover,
.citizen-hero .outline-btn:hover {
    background: rgba(255, 255, 255, 0.3) !important;
    border-color: #ffffff !important;
    color: #ffffff !important;
}

/* Small button */
.small-btn {
    background: #059669;
    color: #ffffff;
    padding: 6px 12px;
    font-size: 12px;
    border-radius: 6px;
}

.small-btn:hover {
    background: #047857;
}

/* Red button */
.red-btn {
    background: #ef4444;
    color: #ffffff;
    border: none;
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.25);
}

.red-btn:hover {
    background: #dc2626;
}`;

// Normalize line endings for replacement
const isCRLF = css.includes('\r\n');
const normalizedTarget = isCRLF ? targetButtons.replace(/\n/g, '\r\n') : targetButtons;
const normalizedReplacement = isCRLF ? replacementButtons.replace(/\n/g, '\r\n') : replacementButtons;

if (!css.includes(normalizedTarget)) {
    console.error('Target not found in waste.css! Let\'s debug:');
    process.exit(1);
}

css = css.replace(normalizedTarget, normalizedReplacement);

// Also add responsive table helper if not present
if (!css.includes('.table-responsive')) {
    const tableHelper = (isCRLF ? '\r\n' : '\n') + `
.table-responsive {
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    margin-bottom: 12px;
}
`;
    css += tableHelper;
}

fs.writeFileSync(cssPath, css, 'utf8');
console.log('✅ Successfully updated frontend/pages/waste/waste.css');

// Also sync to android assets if exists
const androidCssPath = path.join('android', 'app', 'src', 'main', 'assets', 'public', 'pages', 'waste', 'waste.css');
if (fs.existsSync(androidCssPath)) {
    fs.writeFileSync(androidCssPath, css, 'utf8');
    console.log('✅ Successfully synced to android/app/src/main/assets/public/pages/waste/waste.css');
}

