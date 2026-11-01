const fs = require('fs');

const authRoutes = fs.readFileSync('backend/routes/auth.routes.js', 'utf8');
const idx = authRoutes.indexOf('/api/staff-login');
console.log(authRoutes.substring(idx - 100, idx + 1200));

