const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let errors = 0;
let total = 0;

function checkDir(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name !== 'node_modules' && entry.name !== '.git') {
                checkDir(full);
            }
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
            total++;
            try {
                execSync(`node --check "${full}"`, { stdio: 'pipe' });
            } catch (err) {
                console.error('❌ SYNTAX ERROR in ' + full + ':\n' + err.stderr.toString());
                errors++;
            }
        }
    }
}

console.log('Running syntax validation across backend and frontend...');
checkDir(path.resolve('./backend'));
checkDir(path.resolve('./frontend'));
console.log(`Finished: ${total} files checked, ${errors} syntax errors found.`);
