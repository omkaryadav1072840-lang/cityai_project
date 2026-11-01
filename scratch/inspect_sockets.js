const fs = require('fs');

const sock = fs.readFileSync('backend/sockets/index.js', 'utf8');
console.log(sock.substring(1500, 3500));
