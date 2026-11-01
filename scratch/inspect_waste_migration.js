const fs = require('fs');

const mig = fs.readFileSync('backend/migrations/waste_migration.js', 'utf8');
console.log(mig);

