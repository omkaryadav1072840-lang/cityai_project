const fs = require('fs');
const path = require('path');

const wasteRoutesPath = path.join('backend', 'routes', 'waste.routes.js');
let js = fs.readFileSync(wasteRoutesPath, 'utf8');

const target = `module.exports = router;`;
const replacement = `// Mount Workforce, 3-Role Management, and AI Complaint Assignment Sub-Router
const workforceRouter = require("./waste_workforce.routes");
router.use(workforceRouter);

module.exports = router;`;

if (!js.includes('require("./waste_workforce.routes")')) {
    js = js.replace(target, replacement);
    fs.writeFileSync(wasteRoutesPath, js, 'utf8');
    console.log('✅ Mounted waste_workforce.routes into waste.routes.js');
} else {
    console.log('ℹ️ waste_workforce.routes already mounted in waste.routes.js');
}

