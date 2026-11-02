const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function checkDir(dir) {
    let count = 0;
    let errors = 0;
    const files = fs.readdirSync(dir, { recursive: true });
    for (const f of files) {
        if (!f.endsWith('.js') || f.includes('node_modules') || f.includes('.git') || f.includes('backups')) continue;
        const full = path.join(dir, f);
        try {
            execSync(`node --check "${full}"`, { stdio: 'pipe' });
            count++;
        } catch (e) {
            console.error('Syntax error in:', full);
            errors++;
        }
    }
    console.log(`${dir}: checked ${count} files, ${errors} errors.`);
    return errors;
}

const e1 = checkDir('frontend');
const e2 = checkDir('backend');
if (e1 + e2 === 0) {
    console.log('✅ ALL CHECKED JS FILES HAVE ZERO SYNTAX ERRORS!');
} else {
    process.exit(1);
}

