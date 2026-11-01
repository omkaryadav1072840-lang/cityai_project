const fs = require('fs');

const authMid = fs.readFileSync('backend/middleware/auth.middleware.js', 'utf8');
console.log(authMid.substring(9000));
