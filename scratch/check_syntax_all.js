const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function checkDir(dir) {
    let count = 0;
    fs.readdirSync(dir).forEach(f => {
        const full = path.join(dir, f);
        if (f === 'node_modules' || f === '.git') return;
        if (fs.statSync(full).isDirectory()) count += checkDir(full);
        else if (f.endsWith('.js')) {
            count++;
            try {
                execSync(`node --check "${full}"`, { stdio: 'pipe' });
            } catch (err) {
                console.error('SYNTAX ERROR IN: ' + full);
                console.error(err.stderr.toString());
                process.exit(1);
            }
        }
    });
    return count;
}

const total = checkDir('frontend') + checkDir('backend') + checkDir('scripts');
console.log('Checked syntax of ' + total + ' JavaScript files: All valid syntax!');

