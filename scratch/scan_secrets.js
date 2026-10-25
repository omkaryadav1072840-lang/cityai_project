const fs = require('fs');
const path = require('path');

const SECRET_PATTERNS = [
    { name: 'Private Key', regex: /-----BEGIN [A-Z]+ PRIVATE KEY-----/ },
    { name: 'AWS Access Key', regex: /\bAKIA[0-9A-Z]{16}\b/ },
    { name: 'GitHub Personal Access Token', regex: /\bghp_[0-9a-zA-Z]{36}\b/ },
    { name: 'Google API Key', regex: /\bAIza[0-9A-Za-z\-_]{35}\b/ },
    { name: 'Stripe Secret Key', regex: /\bsk_live_[0-9a-zA-Z]{24}\b/ },
    { name: 'Slack Bot Token', regex: /\bxoxb-[0-9]{11,13}-[0-9]{11,13}-[a-zA-Z0-9]{24}\b/ }
];

const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', '.gemini', 'package-lock.json'];

let findings = [];

function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        if (IGNORE_DIRS.includes(entry.name)) continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            scanDir(fullPath);
        } else if (entry.isFile() && !entry.name.endsWith('.png') && !entry.name.endsWith('.jpg') && !entry.name.endsWith('.jpeg')) {
            try {
                const content = fs.readFileSync(fullPath, 'utf8');
                for (const pat of SECRET_PATTERNS) {
                    const match = content.match(pat.regex);
                    if (match) {
                        findings.push({
                            file: fullPath.replace(__dirname, ''),
                            type: pat.name,
                            snippet: match[0].slice(0, 8) + '...'
                        });
                    }
                }
            } catch (e) {}
        }
    }
}

scanDir(path.join(__dirname, '..'));
console.log('Secret Scanning Complete. Total findings:', findings.length);
findings.forEach(f => console.log(`- [${f.type}] in ${f.file}: ${f.snippet}`));
