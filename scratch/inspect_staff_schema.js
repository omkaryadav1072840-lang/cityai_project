const fs = require('fs');

const schema = fs.readFileSync('backend/database/schema.sql', 'utf8');
const lines = schema.split('\n');
lines.forEach((l, i) => {
  if (l.toLowerCase().includes('staff') && (l.includes('CREATE TABLE') || l.includes('ALTER TABLE'))) {
    console.log((i + 1) + ': ' + l.trim());
  }
});

