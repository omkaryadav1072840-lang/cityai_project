const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'frontend', 'index.html');
const content = fs.readFileSync(htmlPath, 'utf8');

console.log('HTML file size:', content.length, 'bytes');

const sections = ['traffic', 'waste', 'water', 'emergency', 'parking', 'healthcare', 'police', 'famous'];
sections.forEach(id => {
    const hasSection = content.includes(`id="${id}"`);
    console.log(`Section #${id}:`, hasSection ? '✅ FOUND' : '❌ MISSING');
});

// Check nav links
sections.forEach(id => {
    const hasNav = content.includes(`href="#${id}"`);
    console.log(`Nav link href="#${id}":`, hasNav ? '✅ FOUND' : '❌ MISSING');
});

// Check if tags match
const openSections = (content.match(/<section/g) || []).length;
const closeSections = (content.match(/<\/section>/g) || []).length;
console.log(`Sections count - Open: ${openSections}, Close: ${closeSections} ->`, openSections === closeSections ? '✅ BALANCED' : '❌ MISMATCH');
