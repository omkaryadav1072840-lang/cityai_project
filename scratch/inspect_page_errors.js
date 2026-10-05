const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const candidates = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
];

const browserPath = candidates.find(p => fs.existsSync(p));

console.log('Testing page console errors using node-puppeteer or fetch/browser inspect...');

// Let's create an inspector script that loads hospital.html and listens to console errors and unhandled promise rejections
const testScript = `
const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '${browserPath.replace(/\\/g, '\\\\')}',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  const errors = [];
  const warnings = [];
  const failedRequests = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
    if (msg.type() === 'warning') warnings.push(msg.text());
  });
  
  page.on('pageerror', err => {
    errors.push('Page error: ' + err.message);
  });
  
  page.on('requestfailed', req => {
    failedRequests.push({ url: req.url(), failure: req.failure() ? req.failure().errorText : 'failed' });
  });

  console.log('Navigating to hospital.html...');
  await page.goto('http://localhost:3000/pages/hospital/hospital.html', { waitUntil: 'networkidle2', timeout: 30000 });
  
  console.log('--- BROWSER CONSOLE ERRORS ---');
  console.log(errors);
  console.log('--- FAILED REQUESTS ---');
  console.log(failedRequests);
  
  await browser.close();
  process.exit(0);
})().catch(err => {
  console.error('Puppeteer test error:', err.message);
  process.exit(1);
});
`;

fs.writeFileSync(path.join(__dirname, 'run_page_inspect.js'), testScript);
console.log('Inspector written. Now checking puppeteer availability...');
