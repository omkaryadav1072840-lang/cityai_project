const fs = require('fs');

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const keywords = ['green', 'emerald', 'orange', 'amber', 'purple', 'violet', 'yellow', '#10b981', '#22c55e', '#16a34a', '#8b5cf6', '#a855f7', '#f59e0b', '#d97706', '#ea580c', '#34d399', '#fde047', '#a78bfa', '#ec4899', '#f43f5e', '#dcfce7', '#ffedd5', '#fef3c7', '#f3e8ff'];
  
  console.log('=== SCANNING: ' + filePath + ' ===');
  lines.forEach((line, idx) => {
    const lower = line.toLowerCase();
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        console.log(`Line ${(idx + 1).toString().padStart(4)}: ${line.trim()}`);
        break;
      }
    }
  });
}

scanFile('frontend/pages/water/water.css');
scanFile('frontend/pages/water/water.html');
