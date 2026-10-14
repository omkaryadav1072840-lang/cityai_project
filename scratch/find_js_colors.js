const fs = require('fs');

function scanJS(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const keywords = ['#10b981', '#22c55e', '#16a34a', '#8b5cf6', '#a855f7', '#f59e0b', '#d97706', '#ea580c', '#34d399', '#fde047', '#a78bfa', 'dcfce7', 'ffedd5', 'fef3c7'];
  
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

scanJS('frontend/pages/water/water.js');
scanJS('frontend/pages/water/water_intelligence_ui.js');
