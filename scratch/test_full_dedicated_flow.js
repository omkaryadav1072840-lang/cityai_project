const fs = require('fs');

console.log('=== TESTING DEDICATED DUSTBIN FLOW ===');

// Test 1: auth.routes.js handling
const authRoutes = fs.readFileSync('backend/routes/auth.routes.js', 'utf8');
const hasBinTarget = authRoutes.includes('pages/waste/waste.html?view=dustbin&binCode=');
console.log('Does auth.routes already have targetDashboard with ?view=dustbin?', hasBinTarget);

// Test 2: waste.routes.js auth endpoint
const wasteRoutes = fs.readFileSync('backend/routes/waste.routes.js', 'utf8');
console.log('waste.routes has dustbin-terminal/auth:', wasteRoutes.includes('/dustbin-terminal/auth'));
console.log('waste.routes has footfall_analysis:', wasteRoutes.includes('footfall_analysis'));
console.log('waste.routes has ai_time_to_full_prediction:', wasteRoutes.includes('ai_time_to_full_prediction'));

// Test 3: waste.html has dustbinTerminalSection
const wasteHtml = fs.readFileSync('frontend/pages/waste/waste.html', 'utf8');
console.log('waste.html has dustbinTerminalSection:', wasteHtml.includes('id="dustbinTerminalSection"'));
console.log('waste.html has dustbinActiveDashboard:', wasteHtml.includes('id="dustbinActiveDashboard"'));
console.log('waste.html has dustbinAuthCard:', wasteHtml.includes('id="dustbinAuthCard"'));

