const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const jwt = require(path.join(__dirname, '..', 'backend', 'node_modules', 'jsonwebtoken'));

const candidates = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
];

const browserPath = candidates.find(p => fs.existsSync(p));
const token = jwt.sign(
    { id: 1, role: 'citizen', patientId: 'SC-2026-318028', mobile: '9876543210' },
    'smartcity_super_secret_jwt_key_gorakhpur_2026',
    { expiresIn: '7d' }
);

// We will inject a tiny script in hospital.html test harness or directly evaluate
// Let's create a temporary test wrapper page that opens hospital.html and simulates a file upload!
const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
</head>
<body style="margin:0; background:#0f172a;">
    <iframe id="appFrame" src="http://localhost:3000/pages/hospital/hospital.html?token=${encodeURIComponent(token)}&patient_id=SC-2026-318028#prescription" style="width:100vw; height:100vh; border:none;"></iframe>
    <script>
        const frame = document.getElementById('appFrame');
        frame.onload = () => {
            setTimeout(() => {
                const doc = frame.contentDocument;
                const dropEmpty = doc.getElementById('rxDropEmpty');
                const dropPreview = doc.getElementById('rxDropPreview');
                const fileName = doc.getElementById('rxFileName');
                const fileMeta = doc.getElementById('rxFileMeta');
                const docInput = doc.getElementById('prescriptionDoctorName');
                const recentSec = doc.getElementById('rxRecentSection');
                const recentList = doc.getElementById('rxRecentList');

                if (dropEmpty) dropEmpty.style.display = 'none';
                if (dropPreview) dropPreview.style.display = 'flex';
                if (fileName) fileName.textContent = 'OPD_Cardiology_AIIMS_Gorakhpur_Slip.pdf';
                if (fileMeta) fileMeta.textContent = '2.4 MB • Ready for AI verification';
                if (docInput) docInput.value = 'Dr. Alok Nath Tripathi (AIIMS Gorakhpur)';

                if (recentSec && recentList) {
                    recentSec.style.display = 'block';
                    recentList.innerHTML = \`
                        <div class="rx-recent-card">
                            <div class="rx-rc-info">
                                <span class="rx-rc-doctor">👨‍⚕️ Dr. Sunita Patel (Endocrinology)</span>
                                <span class="rx-rc-meds">💊 Metformin 500mg BD + Glimepiride 1mg</span>
                            </div>
                            <div class="rx-rc-meta">
                                <span class="rx-rc-date">18 May 2026</span>
                                <span class="rx-rc-status active">Active</span>
                            </div>
                        </div>
                    \`;
                }
            }, 1500);
        };
    </script>
</body>
</html>
`;

const wrapperPath = path.join(__dirname, '..', 'frontend', 'pages', 'hospital', 'rx_preview_test.html');
fs.writeFileSync(wrapperPath, html);

const outPath = path.join(__dirname, 'prescription_file_selected_preview.png');
const artifactDest = 'C:\\Users\\Omkar\\.gemini\\antigravity-ide\\brain\\20443c78-30e1-40dc-87be-4de20968da24\\prescription_file_selected_preview.png';

console.log('Capturing File Selected & Recent Rx preview...');
const res = spawnSync(browserPath, [
    '--headless',
    '--disable-gpu',
    '--window-size=1380,1100',
    `--screenshot=${outPath}`,
    '--virtual-time-budget=6000',
    'http://localhost:3000/pages/hospital/rx_preview_test.html'
], { timeout: 35000 });

console.log('Capture status:', res.status);
if (fs.existsSync(outPath)) {
    fs.copyFileSync(outPath, artifactDest);
    console.log('Preview saved to:', artifactDest);
}

// Clean up temporary test file
if (fs.existsSync(wrapperPath)) fs.unlinkSync(wrapperPath);
