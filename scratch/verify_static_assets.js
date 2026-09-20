const http = require('http');

function checkAsset(path, keyword) {
    return new Promise((resolve) => {
        http.get(`http://localhost:5000/${path}`, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                const found = data.includes(keyword);
                console.log(`Asset /${path} [Status: ${res.statusCode}]: contains '${keyword}' -> ${found}`);
                resolve(found);
            });
        }).on('error', err => {
            console.error(`Asset /${path} error:`, err.message);
            resolve(false);
        });
    });
}

async function run() {
    await checkAsset('index.css', '.sc-sla-timer-pill');
    await checkAsset('index.css', '.ai-voice-btn.listening');
    await checkAsset('script.js', 'initVoiceAssistant');
    await checkAsset('script.js', 'openGrievanceModal');
    await checkAsset('script.js', 'openCommandCenterModal');
    await checkAsset('script.js', 'showSimulatedDispatchAlert');
    await checkAsset('auth.js', 'showLoginModal');
    await checkAsset('realtime.js', 'notification:new');
}

run();
