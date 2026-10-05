const fs = require('fs');

const lines = fs.readFileSync('frontend/pages/hospital/hospital_dashboard.html', 'utf8').split('\n');

function findLines(pattern) {
    const res = [];
    lines.forEach((line, idx) => {
        if (line.includes(pattern)) {
            res.push({ line: idx + 1, content: line.trim() });
        }
    });
    return res;
}

console.log('adminWardStructureContainer:', findLines('adminWardStructureContainer'));
console.log('panel-beds:', findLines('panel-beds'));
console.log('modalAddWard:', findLines('modalAddWard'));
console.log('modalAssignBed:', findLines('modalAssignBed'));
