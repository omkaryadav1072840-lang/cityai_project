const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'frontend', 'index.html');
const content = fs.readFileSync(filePath, 'utf8');

const startMarker = '<!-- =====================================================\r\n     SMART HEALTHCARE';
const altStartMarker = '<!-- =====================================================\n     SMART HEALTHCARE';

const endMarker = '<!-- =====================================================\r\n     SMARTCITY AI AUTH SYSTEM';
const altEndMarker = '<!-- =====================================================\n     SMARTCITY AI AUTH SYSTEM';

let startIndex = content.indexOf(startMarker);
if (startIndex === -1) startIndex = content.indexOf(altStartMarker);

let endIndex = content.indexOf(endMarker);
if (endIndex === -1) endIndex = content.indexOf(altEndMarker);

console.log('Start index:', startIndex, 'End index:', endIndex);

if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
    const before = content.substring(0, startIndex);
    const after = content.substring(endIndex);
    const newContent = before + after;
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log('Successfully trimmed legacy embedded mock sections from index.html!');
    console.log('Before length:', content.length, 'After length:', newContent.length);
} else {
    console.error('Markers not found or invalid indices!');
    process.exit(1);
}
