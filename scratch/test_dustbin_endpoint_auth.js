const path = require('path');
const express = require(path.join(__dirname, '..', 'backend', 'node_modules', 'express'));
const router = require(path.join(__dirname, '..', 'backend', 'routes', 'waste.routes'));

const app = express();
app.use(express.json());
app.use(router);

// Test auth with BIN-GOL-01 and BIN@2026
const req = {
  method: 'POST',
  url: '/api/waste/dustbin-terminal/auth',
  headers: { 'content-type': 'application/json' },
  body: {
    binCode: 'BIN-GOL-01',
    passcode: 'BIN@2026',
    staffId: 'WST001'
  }
};

let resData = null;
let resStatus = 200;

const mockRes = {
  status(c) { resStatus = c; return this; },
  json(d) { resData = d; return this; }
};

router.handle(req, mockRes, () => {});

setTimeout(() => {
  console.log('Status:', resStatus);
  console.log('Data success:', resData ? resData.success : null);
  console.log('Data message:', resData ? resData.message : null);
  console.log('Has bin:', !!(resData && resData.bin));
  if (resData && resData.bin) {
    console.log('Bin code:', resData.bin.bin_code);
    console.log('Has footfall:', !!resData.bin.footfall_analysis);
    console.log('Has ai prediction:', !!resData.bin.ai_time_to_full_prediction);
  }
}, 500);
