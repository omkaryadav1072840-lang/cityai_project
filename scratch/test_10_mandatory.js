const jwt = require("../backend/node_modules/jsonwebtoken");
const http = require("http");

const BASE_URL = "http://localhost:5000";
const JWT_SECRET = "smartcity_super_secret_jwt_key_gorakhpur_2026";
const token = jwt.sign(
    { id: 1, userId: 1, role: "citizen", patientId: "SC-2026-318028", name: "omkar" },
    JWT_SECRET,
    { expiresIn: "2h" }
);

async function postChat(body) {
    const res = await fetch(`${BASE_URL}/api/ai/clinical-care/chat`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(body)
    });
    return await res.json();
}

async function run() {
    const queries = [
        { id: 1, text: "bet derd akr rah h" },
        { id: 2, text: "meri kamar me drd h" },
        { id: 3, text: "meri dava safe h?" },
        { id: 4, text: "ye dono medicine ek sath le sakta hu?" },
        { id: 5, text: "meri medicine se chakkar aa raha" },
        { id: 6, text: "isko save kr lo" },
        { id: 7, text: "kal 8 baje yaad dila dena" },
        { id: 8, text: "saans lene me bahut dikkat ho rahi hai" },
        { id: 9, text: "kuch theek nahi lag raha" },
        { id: 10, text: "hello" }
    ];

    for (const q of queries) {
        const res = await postChat({
            message: q.text,
            patientId: "SC-2026-318028",
            language: "hi"
        });
        console.log(`\n==================================================`);
        console.log(`[TEST ${q.id}] Input: "${q.text}"`);
        console.log(`Intent: ${res.intent}`);
        console.log(`Safety Badge: ${res.safety_badge}`);
        console.log(`Entities: ${JSON.stringify(res.entities || res.structured_data || {})}`);
        console.log(`Sources: ${res.sources_used?.join(", ")}`);
        console.log(`Message Preview:\n${res.message?.slice(0, 180)}...`);
    }
}

run().catch(console.error);
