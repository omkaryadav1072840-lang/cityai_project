const fs = require('fs');

console.log('Testing dedicated dustbin mode concept on DOM structure...');

const html = fs.readFileSync('frontend/pages/waste/waste.html', 'utf8');

// Verify selectors exist
const hasTabs = html.includes('class="layer-tabs-container"');
const hasRoleBanner = html.includes('id="roleBanner"');
const hasSharedMap = html.includes('id="sharedMapSection"');
const hasCitizen = html.includes('id="layer-citizen-content"');
const hasStaff = html.includes('id="layer-staff-content"');
const hasStaffMain = html.includes('id="staffOperationsMain"');
const hasTerminal = html.includes('id="dustbinTerminalSection"');
const hasAuthCard = html.includes('id="dustbinAuthCard"');
const hasActiveDash = html.includes('id="dustbinActiveDashboard"');

console.log({
    hasTabs,
    hasRoleBanner,
    hasSharedMap,
    hasCitizen,
    hasStaff,
    hasStaffMain,
    hasTerminal,
    hasAuthCard,
    hasActiveDash
});

