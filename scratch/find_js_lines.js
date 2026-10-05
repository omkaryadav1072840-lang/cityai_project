const fs = require('fs');

const lines = fs.readFileSync('frontend/pages/hospital/hospital_dashboard.js', 'utf8').split('\n');

function findLines(pattern) {
    const res = [];
    lines.forEach((line, idx) => {
        if (line.includes(pattern)) {
            res.push({ line: idx + 1, content: line.trim() });
        }
    });
    return res;
}

console.log('loadAdminWardStructure:', findLines('loadAdminWardStructure'));
console.log('loadBedsAndWards:', findLines('loadBedsAndWards'));
console.log('openAssignBedModal:', findLines('openAssignBedModal'));
console.log('handleAssignBedSubmit:', findLines('handleAssignBedSubmit'));
console.log('releaseBed:', findLines('releaseBed'));
