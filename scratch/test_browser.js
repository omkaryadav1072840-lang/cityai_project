const fs = require('fs');
const { execSync, spawn } = require('child_process');
const http = require('http');

const candidates = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
];

let browserPath = candidates.find(p => fs.existsSync(p));
console.log('Found browser:', browserPath);

if (!browserPath) {
  console.log('No browser found in default paths');
  process.exit(1);
}

// Launch browser headless with remote debugging port 9222
const proc = spawn(browserPath, [
  '--headless',
  '--remote-debugging-port=9222',
  '--disable-gpu',
  'http://localhost:5000/pages/traffic/traffic.html'
]);

setTimeout(async () => {
  try {
    const listRes = await fetch('http://127.0.0.1:9222/json');
    const tabs = await listRes.json();
    console.log('Open tabs:', tabs.map(t => ({ title: t.title, url: t.url, ws: t.webSocketDebuggerUrl })));
    
    // Connect to WebSocket debugger or query page
    if (tabs.length > 0 && tabs[0].webSocketDebuggerUrl) {
      console.log('Debugger URL found!');
    }
  } catch (e) {
    console.error('Debug query error:', e.message);
  } finally {
    proc.kill();
  }
}, 3000);
