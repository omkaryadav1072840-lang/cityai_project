const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const jwt = require('../backend/node_modules/jsonwebtoken');
const token = jwt.sign(
    { id: 1, role: 'citizen', patientId: 'SC-2026-318028', mobile: '9876543210' },
    'smartcity_super_secret_jwt_key_gorakhpur_2026',
    { expiresIn: '7d' }
);

const userObj = {
    id: 1,
    name: 'Rahul Sharma',
    role: 'citizen',
    patientId: 'SC-2026-318028',
    mobile: '9876543210'
};

const artifactDir = 'C:\\Users\\Omkar\\.gemini\\antigravity-ide\\brain\\20443c78-30e1-40dc-87be-4de20968da24';
const outPath = path.join(artifactDir, 'hospital_prescription_upload_redesign.png');
const outPreviewPath = path.join(artifactDir, 'hospital_prescription_preview_state.png');

console.log('Capturing Prescription Modal screenshots...');

// We will launch a small script that opens the page, injects token & opens prescription modal
const htmlInjectScript = `
    localStorage.setItem('smartCityJWT', '${token}');
    localStorage.setItem('token', '${token}');
    localStorage.setItem('smartCityCurrentUser', '${JSON.stringify(userObj)}');
    localStorage.setItem('hospital_patient_id', 'SC-2026-318028');
    if (typeof openPrescriptionUpload === 'function') {
        openPrescriptionUpload('SC-2026-318028');
    }
`;

// Let's create an evaluation script to capture both idle and file selected states
const runnerScript = `
const puppeteer = (() => {
    try { return require('puppeteer-core'); } catch (e) { return null; }
})();

async function run() {
    const edgePath = "C:\\\\Program Files (x86)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe";
    const { spawn } = require('child_process');
    const http = require('http');

    const edgeProc = spawn(edgePath, [
        '--remote-debugging-port=9225',
        '--headless=new',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        '--user-data-dir=' + require('os').tmpdir() + '/edge_rx_test_' + Date.now(),
        'http://localhost:3000/pages/hospital/hospital.html#prescription'
    ]);

    await new Promise(r => setTimeout(r, 2000));

    // Connect via CDP WebSocket
    http.get('http://127.0.0.1:9225/json/list', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', async () => {
            const list = JSON.parse(data);
            const target = list.find(t => t.type === 'page');
            if (!target) {
                console.error('No page target found');
                edgeProc.kill();
                process.exit(1);
            }

            const WebSocket = require('ws');
            const ws = new WebSocket(target.webSocketDebuggerUrl);

            let msgId = 1;
            function send(method, params = {}) {
                return new Promise((resolve) => {
                    const id = msgId++;
                    const handler = (raw) => {
                        const parsed = JSON.parse(raw);
                        if (parsed.id === id) {
                            ws.off('message', handler);
                            resolve(parsed.result);
                        }
                    };
                    ws.on('message', handler);
                    ws.send(JSON.stringify({ id, method, params }));
                });
            }

            ws.on('open', async () => {
                await send('Page.enable');
                await send('Runtime.enable');

                // Inject auth and open modal
                await send('Runtime.evaluate', {
                    expression: \`
                        localStorage.setItem('smartCityJWT', '${token}');
                        localStorage.setItem('token', '${token}');
                        localStorage.setItem('smartCityCurrentUser', JSON.stringify(${JSON.stringify(userObj)}));
                        localStorage.setItem('hospital_patient_id', 'SC-2026-318028');
                        if (typeof openPrescriptionUpload === 'function') {
                            openPrescriptionUpload('SC-2026-318028');
                        }
                    \`
                });

                await new Promise(r => setTimeout(r, 1200));

                // 1. Capture Idle/Open Modal Screenshot
                const idleShot = await send('Page.captureScreenshot', { format: 'png' });
                fs.writeFileSync('${outPath.replace(/\\/g, '\\\\')}', Buffer.from(idleShot.data, 'base64'));
                console.log('Saved idle modal screenshot to ${outPath.replace(/\\/g, '\\\\')}');

                // 2. Simulate File Selected inside dropzone
                await send('Runtime.evaluate', {
                    expression: \`
                        const dropEmpty = document.getElementById('rxDropEmpty');
                        const dropPreview = document.getElementById('rxDropPreview');
                        const fileNameEl = document.getElementById('rxFileName');
                        const fileMetaEl = document.getElementById('rxFileMeta');
                        if (dropEmpty) dropEmpty.style.display = 'none';
                        if (dropPreview) dropPreview.style.display = 'flex';
                        if (fileNameEl) fileNameEl.textContent = 'OPD_Cardiology_Slip_DrAlokNath.pdf';
                        if (fileMetaEl) fileMetaEl.textContent = '2.4 MB • Ready for submission';
                        const docInput = document.getElementById('prescriptionDoctorName');
                        if (docInput) docInput.value = 'Dr. Alok Nath Tripathi (AIIMS Gorakhpur)';
                    \`
                });

                await new Promise(r => setTimeout(r, 600));

                // Capture File Selected Screenshot
                const previewShot = await send('Page.captureScreenshot', { format: 'png' });
                fs.writeFileSync('${outPreviewPath.replace(/\\/g, '\\\\')}', Buffer.from(previewShot.data, 'base64'));
                console.log('Saved preview state screenshot to ${outPreviewPath.replace(/\\/g, '\\\\')}');

                ws.close();
                edgeProc.kill();
                process.exit(0);
            });
        });
    }).on('error', (e) => {
        console.error('CDP connect error:', e.message);
        edgeProc.kill();
        process.exit(1);
    });
}

run();
`;

fs.writeFileSync(path.join(__dirname, 'run_rx_capture.js'), runnerScript);
const child = spawnSync('node', ['scratch/run_rx_capture.js'], { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
console.log('Capture exited with code:', child.status);
