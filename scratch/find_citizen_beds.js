const fs = require('fs');

const lines = fs.readFileSync('frontend/pages/hospital/hospital.js', 'utf8').split('\n');

function findLines(pattern) {
    const res = [];
    lines.forEach((line, idx) => {
        if (line.includes(pattern)) {
            res.push({ line: idx + 1, content: line.trim() });
        }
    });
    return res;
}

console.log('loadBeds:', findLines('loadBeds'));
console.log('renderBed:', findLines('renderBed'));
console.log('/beds:', findLines('/beds'));
console.log('bedSummary:', findLines('bedSummary'));
