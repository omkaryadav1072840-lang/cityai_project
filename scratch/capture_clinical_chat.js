const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port = 9226;

const proc = spawn(browserPath, [
    '--headless',
    `--remote-debugging-port=${port}`,
    '--disable-gpu',
    '--window-size=1280,1024',
    'http://localhost:3000/pages/hospital/hospital.html'
]);

async function run() {
    await new Promise(r => setTimeout(r, 2500));
    try {
        const listRes = await fetch(`http://127.0.0.1:${port}/json`);
        const tabs = await listRes.json();
        const hospTab = tabs.find(t => t.url.includes('hospital.html'));
        if (!hospTab) {
            console.error('hospital.html tab not found');
            proc.kill();
            return;
        }

        const ws = new WebSocket(hospTab.webSocketDebuggerUrl);

        ws.onopen = () => {
            ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));

            // Step 1: Check if Doctor View button is present
            setTimeout(() => {
                ws.send(JSON.stringify({
                    id: 2,
                    method: 'Runtime.evaluate',
                    params: {
                        expression: `(() => {
                            const docBtn = document.querySelector('.cca-btn-doctor');
                            const docModal = document.getElementById('ccaDoctorModalBackdrop');
                            const chatInput = document.getElementById('ccaChatInput');
                            const sendBtn = document.querySelector('.cca-send-btn');
                            
                            // Send a test message
                            if (chatInput && sendBtn) {
                                chatInput.value = 'mujhe bukhar aur gas hai';
                                sendBtn.click();
                            }
                            
                            return JSON.stringify({
                                hasDoctorBtn: !!docBtn,
                                hasDoctorModal: !!docModal,
                                inputFound: !!chatInput
                            });
                        })()`
                    }
                }));
            }, 1000);

            // Step 2: After 3.5s, inspect message area for medicine card and feedback buttons
            setTimeout(() => {
                ws.send(JSON.stringify({
                    id: 3,
                    method: 'Runtime.evaluate',
                    params: {
                        expression: `(() => {
                            const medCard = document.querySelector('.cca-medicine-card');
                            const medName = medCard ? medCard.querySelector('.cca-med-name')?.innerText : null;
                            const feedbackBar = document.querySelector('.cca-feedback-bar');
                            const msgText = document.querySelector('.cca-message-item.assistant .cca-message-bubble')?.innerText;
                            
                            return JSON.stringify({
                                hasMedicineCard: !!medCard,
                                medicineName: medName,
                                hasFeedbackBar: !!feedbackBar,
                                msgSnippet: msgText ? msgText.slice(0, 150) : null
                            });
                        })()`
                    }
                }));
            }, 4500);

            // Step 3: Scroll to section and capture screenshot
            setTimeout(() => {
                ws.send(JSON.stringify({
                    id: 41,
                    method: 'Runtime.evaluate',
                    params: {
                        expression: `document.getElementById('aiClinicalCareSection').scrollIntoView({ behavior: 'instant', block: 'start' });`
                    }
                }));
                setTimeout(() => {
                    ws.send(JSON.stringify({
                        id: 4,
                        method: 'Page.captureScreenshot',
                        params: { format: 'png' }
                    }));
                }, 500);
            }, 5500);
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.id === 2) {
                console.log("DOM Check 1 (Buttons & Modals):", data.result?.result?.value);
            } else if (data.id === 3) {
                console.log("DOM Check 2 (Medicine Card & Chat):", data.result?.result?.value);
            } else if (data.id === 4) {
                if (data.result && data.result.data) {
                    const buffer = Buffer.from(data.result.data, 'base64');
                    const outPath = path.join(__dirname, 'hospital_chat_verified.png');
                    fs.writeFileSync(outPath, buffer);
                    console.log("📸 Screenshot saved to:", outPath);
                }
                ws.close();
                proc.kill();
                process.exit(0);
            }
        };

    } catch (err) {
        console.error("CDP error:", err.message);
        proc.kill();
        process.exit(1);
    }
}

run();
