const fs = require('fs');

const authRoutes = fs.readFileSync('backend/routes/auth.routes.js', 'utf8');

// Find handleOfflineDemoStaffAuth
const fnIdx = authRoutes.indexOf('function handleOfflineDemoStaffAuth');
console.log(authRoutes.substring(fnIdx, fnIdx + 1600));

