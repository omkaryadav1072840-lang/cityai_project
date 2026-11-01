const fs = require('fs');

// Let's inspect the entire authenticateDustbinTerminal function in waste.js
const js = fs.readFileSync('frontend/pages/waste/waste.js', 'utf8');

const fnStart = js.indexOf('window.authenticateDustbinTerminal =');
const fnEnd = js.indexOf('window.quickFillAndOpenDustbin =');

console.log('=== AUTHENTICATE DUSTBIN TERMINAL CODE ===\n');
console.log(js.substring(fnStart, fnEnd));

