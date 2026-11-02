const fs = require('fs'); 33
const html = fs.readFileSync('frontend/pages/traffic/traffic.html', 'utf8');

const regex = /<section[^>]*id="([^"]+)"/g;
let match;
while ((match = regex.exec(html)) !== null) {
  console.log('Section found:', match[1]);
}
