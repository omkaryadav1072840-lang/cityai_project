const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log("=== COMPREHENSIVE SYNTAX & ERROR SCANNER ===");

function getAllFiles(dir, exts) {
    let results = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
        if (file === 'node_modules' || file === '.git') continue;
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            results = results.concat(getAllFiles(filePath, exts));
        } else if (exts.some(ext => file.endsWith(ext))) {
            results.push(filePath);
        }
    }
    return results;
}

const jsFiles = [
    ...getAllFiles(path.join(__dirname, '../backend'), ['.js']),
    ...getAllFiles(path.join(__dirname, '../frontend'), ['.js'])
];

console.log(`Scanning ${jsFiles.length} JavaScript files for syntax errors...`);
let syntaxErrors = [];

for (const file of jsFiles) {
    try {
        execSync(`node --check "${file}"`, { stdio: 'pipe' });
    } catch (err) {
        syntaxErrors.push({ file, error: err.stderr ? err.stderr.toString() : err.message });
    }
}

if (syntaxErrors.length === 0) {
    console.log(`✅ All ${jsFiles.length} JavaScript files passed syntax verification (0 syntax errors).`);
} else {
    console.error(`❌ Found ${syntaxErrors.length} syntax errors:`);
    for (const err of syntaxErrors) {
        console.error(`File: ${err.file}\nError: ${err.error}\n---`);
    }
}
