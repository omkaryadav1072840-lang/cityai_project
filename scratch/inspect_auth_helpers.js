const fs = require('fs');

if (fs.existsSync('frontend/js/auth-helpers.js')) {
  console.log(fs.readFileSync('frontend/js/auth-helpers.js', 'utf8').substring(0, 1000));
}

