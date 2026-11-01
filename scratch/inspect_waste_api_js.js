const fs = require('fs');

if (fs.existsSync('frontend/api/waste.api.js')) {
  console.log(fs.readFileSync('frontend/api/waste.api.js', 'utf8').substring(0, 1000));
} else {
  console.log('frontend/api/waste.api.js does not exist.');
}

