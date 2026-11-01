const fs = require('fs');
const crypto = require('crypto');

const src = 'logo1.png';
if (!fs.existsSync(src)) {
  console.error('ERROR: logo1.png not found!');
  process.exit(1);
}

const srcStat = fs.statSync(src);
const srcBuf = fs.readFileSync(src);
const srcHash = crypto.createHash('sha256').update(srcBuf).digest('hex');
console.log('Source: logo1.png');
console.log('Size:', srcStat.size, 'bytes');
console.log('Dimensions: 500 x 411');
console.log('SHA-256:', srcHash);

const targets = [
  'logo.png',
  'frontend/logo.png',
  'frontend/logo1.png',
  'frontend/ChatGPT_Image_Aug_11__2026__11_27_44_PM-removebg-preview.png',
  'frontend/favicon.png',
  'frontend/apple-touch-icon.png',
  'frontend/favicon.ico',
  'android/app/src/main/assets/public/logo.png',
  'android/app/src/main/assets/public/logo1.png',
  'android/app/src/main/assets/public/ChatGPT_Image_Aug_11__2026__11_27_44_PM-removebg-preview.png',
  'android/app/src/main/assets/public/favicon.png',
  'android/app/src/main/assets/public/apple-touch-icon.png',
  'android/app/src/main/assets/public/favicon.ico'
];

let successCount = 0;
targets.forEach(t => {
  fs.copyFileSync(src, t);
  const targetStat = fs.statSync(t);
  const targetHash = crypto.createHash('sha256').update(fs.readFileSync(t)).digest('hex');
  const match = (targetHash === srcHash && targetStat.size === srcStat.size);
  console.log(`[${match ? 'OK' : 'FAIL'}] ${t} -> ${targetStat.size} bytes`);
  if (match) successCount++;
});

console.log(`Successfully updated ${successCount} / ${targets.length} target files with logo1.png!`);

