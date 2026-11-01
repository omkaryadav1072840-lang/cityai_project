const fs = require('fs');

const authRoutes = fs.readFileSync('backend/routes/auth.routes.js', 'utf8');
const demoIdx = authRoutes.indexOf('/api/auth/demo-login');
console.log(authRoutes.substring(demoIdx + 15500, demoIdx + 19500));
