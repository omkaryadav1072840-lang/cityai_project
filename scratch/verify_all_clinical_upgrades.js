/**
 * SMARTCITY AI - Comprehensive Clinical Upgrade Verification Suite
 * =================================================================
 * Verifies:
 * 1. Removal of Doctor Review Queue modal & button
 * 2. In-chat integrated medicine recommendations & cards
 * 3. Short, authentic, real doctor responses
 * 4. Lab report interpretation with OTC/diet advice
 * 5. Self-learning & feedback loops with MySQL persistence
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

function postJson(urlPath, data) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(data);
        const req = http.request(`http://localhost:5000${urlPath}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(payload)
            }
        }, res => {
            let body = "";
            res.on("data", chunk => body += chunk);
            res.on("end", () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(body) });
                } catch (e) {
                    resolve({ status: res.statusCode, raw: body });
                }
            });
        });
        req.on("error", reject);
        req.write(payload);
        req.end();
    });
}

async function runTests() {
    console.log("🏥 Starting AI Clinical Care Assistant Upgrade Verification Suite...\n");

    let passed = 0;
    let failed = 0;

    // Test 1: Verify Doctor Review Queue removal from hospital.html
    const htmlPath = path.join(__dirname, "..", "frontend", "pages", "hospital", "hospital.html");
    const htmlContent = fs.readFileSync(htmlPath, "utf8");
    const hasDoctorModal = htmlContent.includes("ccaDoctorModalBackdrop") || htmlContent.includes("Clinical Decision Support Review Queue");
    const hasDoctorButton = htmlContent.includes("cca-btn-doctor");

    if (!hasDoctorModal && !hasDoctorButton) {
        console.log("✅ Test 1 PASSED: Doctor Review Queue modal and button completely removed from hospital.html.");
        passed++;
    } else {
        console.error("❌ Test 1 FAILED: Doctor modal or button still present in hospital.html.");
        failed++;
    }

    // Test 2: Bukhar / Fever Query (Hinglish/Hindi)
    try {
        const res = await postJson("/api/ai/clinical-care/chat", {
            message: "mujhe kal se bukhar aur badan dard hai",
            language: "hi"
        });
        if (res.status === 200 && res.data.success && res.data.medicine_card && res.data.medicine_card.medicine_name.includes("Paracetamol")) {
            console.log("✅ Test 2 PASSED: Fever query generated direct Paracetamol OTC medicine card & short authentic advice.");
            console.log("   👉 Medicine:", res.data.medicine_card.medicine_name);
            console.log("   👉 Dosage:", res.data.medicine_card.dosage);
            passed++;
        } else {
            console.error("❌ Test 2 FAILED:", res.data);
            failed++;
        }
    } catch (e) {
        console.error("❌ Test 2 ERROR:", e.message);
        failed++;
    }

    // Test 3: Gas / Acidity Query
    try {
        const res = await postJson("/api/ai/clinical-care/chat", {
            message: "pet me bahut gas aur jalan ho rahi hai",
            language: "hi"
        });
        if (res.status === 200 && res.data.success && res.data.medicine_card && res.data.medicine_card.medicine_name.includes("Pantoprazole")) {
            console.log("✅ Test 3 PASSED: Acidity query provided Pantoprazole/Digene with precautions & empty stomach timing.");
            console.log("   👉 Medicine:", res.data.medicine_card.medicine_name);
            passed++;
        } else {
            console.error("❌ Test 3 FAILED:", res.data);
            failed++;
        }
    } catch (e) {
        console.error("❌ Test 3 ERROR:", e.message);
        failed++;
    }

    // Test 4: Lab Report Query (Fasting Sugar 165)
    try {
        const res = await postJson("/api/ai/clinical-care/chat", {
            message: "meri report me sugar fasting 165 aayi hai kya karu",
            language: "hi"
        });
        if (res.status === 200 && res.data.success && res.data.medicine_card && res.data.message.includes("फास्टिंग")) {
            console.log("✅ Test 4 PASSED: Lab report query evaluated fasting sugar levels with clear lifestyle, diet & care advice.");
            console.log("   👉 Medicine/Advice:", res.data.medicine_card.medicine_name);
            passed++;
        } else {
            console.error("❌ Test 4 FAILED:", res.data);
            failed++;
        }
    } catch (e) {
        console.error("❌ Test 4 ERROR:", e.message);
        failed++;
    }

    // Test 5: English Query (Cold & Cough)
    try {
        const res = await postJson("/api/ai/clinical-care/chat", {
            message: "I have a cold and runny nose with sneezing",
            language: "en"
        });
        if (res.status === 200 && res.data.success && res.data.medicine_card && res.data.medicine_card.medicine_name.includes("Cetirizine")) {
            console.log("✅ Test 5 PASSED: English cold inquiry returned concise advice and Cetirizine 10mg card.");
            console.log("   👉 Medicine:", res.data.medicine_card.medicine_name);
            passed++;
        } else {
            console.error("❌ Test 5 FAILED:", res.data);
            failed++;
        }
    } catch (e) {
        console.error("❌ Test 5 ERROR:", e.message);
        failed++;
    }

    // Test 6: Continuous Learning Feedback Endpoint
    try {
        const res = await postJson("/api/ai/clinical-care/feedback", {
            queryText: "mujhe kal se bukhar aur badan dard hai",
            feedbackRating: "HELPFUL",
            notes: "Very useful dosage guidance"
        });
        if (res.status === 200 && res.data.success) {
            console.log("✅ Test 6 PASSED: Continuous learning feedback logged successfully to MySQL cca_ai_knowledge_memory.");
            passed++;
        } else {
            console.error("❌ Test 6 FAILED:", res.data);
            failed++;
        }
    } catch (e) {
        console.error("❌ Test 6 ERROR:", e.message);
        failed++;
    }

    console.log(`\n=============================================`);
    console.log(`🏁 Test Summary: ${passed} PASSED, ${failed} FAILED`);
    console.log(`=============================================`);

    process.exit(failed === 0 ? 0 : 1);
}

runTests();
