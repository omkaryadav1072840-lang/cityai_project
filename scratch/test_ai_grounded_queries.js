const http = require('http');

function postChat(message, token = null) {
    return new Promise((resolve) => {
        const payload = JSON.stringify({ message });
        const headers = {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const req = http.request({
            hostname: 'localhost',
            port: 5000,
            path: '/api/ai/chat',
            method: 'POST',
            headers
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(body) });
                } catch (e) {
                    resolve({ status: res.statusCode, text: body });
                }
            });
        });

        req.on('error', (err) => resolve({ status: 0, error: err.message }));
        req.write(payload);
        req.end();
    });
}

async function loginCitizen() {
    return new Promise((resolve) => {
        const payload = JSON.stringify({ loginId: 'citizen@smartcity.gorakhpur.in', password: 'citizen123' });
        const req = http.request({
            hostname: 'localhost',
            port: 5000,
            path: '/api/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve(JSON.parse(body).token));
        });
        req.write(payload);
        req.end();
    });
}

async function testAllAIQueries() {
    const token = await loginCitizen();
    console.log("Logged in with citizen token:", !!token);

    const testQueries = [
        "Nearest hospital?",
        "ICU bed kaha hai?",
        "Parking kaha available hai?",
        "Meri booking kya hai?",
        "Traffic kaha hai?",
        "Police station near me?",
        "Ramgarh Tal ka route batao."
    ];

    console.log("=== TESTING AI GROUNDED RESPONSES ===");
    for (const q of testQueries) {
        console.log(`\n🗣️ Query: "${q}"`);
        const res = await postChat(q, token);
        console.log(`Status: ${res.status}`);
        const reply = res.data?.response || res.data?.reply || res.data?.message || 'NO_REPLY';
        const toolsUsed = res.data?.toolsUsed || res.data?.toolCalls || [];
        console.log(`🛠️ Tools Used: ${JSON.stringify(toolsUsed)}`);
        console.log(`🤖 AI Response: ${reply.substring(0, 150)}...`);
    }
    process.exit(0);
}

testAllAIQueries();
