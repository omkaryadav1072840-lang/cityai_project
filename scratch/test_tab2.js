const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const candidates = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
];
const browserPath = candidates.find(p => fs.existsSync(p));
const port = 9223;
const outPath = path.join(__dirname, 'bed_tab2_preview.png');

const child = spawn(browserPath, [
  '--headless',
  '--disable-gpu',
  `--remote-debugging-port=${port}`,
  '--window-size=1280,1050',
  'http://localhost:3000/pages/hospital/hospital.html#beds'
]);

setTimeout(async () => {
  try {
    const listRes = await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json());
    const page = listRes.find(p => p.type === 'page');
    if (!page) throw new Error('No page found');

    const WebSocket = require('ws') || null;
    // If ws is not installed or available, let's use another method
  } catch (e) {
    console.log('Error:', e.message);
  }
}, 2000);
