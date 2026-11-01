const fs = require('fs');

const authJs = fs.readFileSync('frontend/auth.js', 'utf8');
const personaIdx = authJs.indexOf('quickLoginPersona');
console.log(authJs.substring(personaIdx - 100, personaIdx + 1500));

