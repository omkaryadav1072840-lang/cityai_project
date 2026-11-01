const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function walk(dir) {
  let files = [];
  try {
    fs.readdirSync(dir).forEach(f => {
      if (f === 'node_modules' || f === '.git' || f === 'scratch' || f === 'dist' || f === '.gemini') return;
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) files = files.concat(walk(full));
      else if (f.endsWith('.js')) files.push(full);
    });
  } catch(e) {}
  return files;
}

const jsFiles = walk('backend').concat(walk('frontend'));
console.log('Checking', jsFiles.length, 'JavaScript files for syntax errors...');
let errCount = 0;
jsFiles.forEach(f => {
  try {
    execSync(`node --check "${f}"`, { stdio: 'pipe' });
  } catch (err) {
    console.error('SYNTAX ERROR in', f, ':\n', err.stderr ? err.stderr.toString() : err.message);
    errCount++;
  }
});
console.log('Completed syntax check! Errors found:', errCount);
