const path = require('path');
const groundedTools = require('../backend/services/grounded_tools');
const aiOrchestrator = require('../backend/services/ai_orchestrator');
const pool = require('../backend/config/db').promise();

async function runPhase1Tests() {
    console.log("==================================================");
    console.log("🧪 TESTING SMARTCITY AI PHASE 1 ARCHITECTURE");
    console.log("==================================================\n");

    let passed = 0;
    let failed = 0;

    function assert(cond, desc) {
        if (cond) {
            console.log(`✅ PASS: ${desc}`);
            passed++;
        } else {
            console.error(`❌ FAIL: ${desc}`);
            failed++;
        }
    }

    // 1. TEST GROUNDED TOOLS
    console.log("--- 1. Testing Grounded Tools (17 Tools) ---");
    const hospRes = await groundedTools.find_hospitals();
    assert(hospRes.count > 0 && hospRes.data_source === "REAL", "find_hospitals returns real hospitals");

    const bedRes = await groundedTools.find_hospital_beds();
    assert(bedRes.total_reporting > 0, "find_hospital_beds returns live ward beds");

    const parkRes = await groundedTools.find_parking();
    assert(parkRes.count > 0, "find_parking returns real parking lots");

    const trfRes = await groundedTools.get_traffic_status();
    assert(trfRes.junctions.length > 0, "get_traffic_status returns live junctions");

    const trfPred = await groundedTools.get_traffic_prediction({ hour: 10, junction_id: "JNC-01" });
    assert(trfPred.predicted_traffic_level && trfPred.confidence > 0, "get_traffic_prediction returns valid forecast");

    const polRes = await groundedTools.get_nearby_police();
    assert(polRes.stations.length > 0 && polRes.helpline.includes("112"), "get_nearby_police returns 112 helpline and stations");

    const emRes = await groundedTools.get_emergency_services();
    assert(emRes.helplines.length >= 5, "get_emergency_services returns full helpline catalog");

    const ambRes = await groundedTools.get_ambulances();
    assert(ambRes.ambulances.length > 0, "get_ambulances returns active fleet");

    const wasteRes = await groundedTools.get_waste_status();
    assert(wasteRes.bins.length > 0, "get_waste_status returns monitored bins");

    const waterRes = await groundedTools.get_water_status();
    assert(waterRes.tanks.length > 0, "get_water_status returns storage tanks");

    const aqiRes = await groundedTools.get_aqi();
    assert(aqiRes.stations.length > 0, "get_aqi returns environmental sensors");

    const tourRes = await groundedTools.get_tourist_places();
    assert(tourRes.count > 0, "get_tourist_places returns verified attractions");

    const routeRes = await groundedTools.get_route();
    assert(routeRes.navigation_url && routeRes.estimated_time_mins > 0, "get_route returns navigation link and ETA");

    // 2. TEST AI ORCHESTRATOR WITH BILINGUAL & HINGLISH PROMPTS
    console.log("\n--- 2. Testing AI Orchestrator Grounded Bilingual Queries ---");

    const testQueries = [
        { q: "Golghar ke paas parking kaha hai?", expectedTool: "find_parking" },
        { q: "Which hospital has ICU beds available?", expectedTool: "find_hospital_beds" },
        { q: "आज Gorakhpur में traffic कहाँ ज्यादा है?", expectedTool: "get_traffic_status" },
        { q: "Nearest police station and helpline?", expectedTool: "get_nearby_police" },
        { q: "Ramgarh Tal ke liye one-day trip batao", expectedTool: "get_tourist_places" },
        { q: "What happens if Golghar crossing is closed?", expectedTool: "what_if_simulation" }
    ];

    let lastPredId = null;

    for (const t of testQueries) {
        const res = await aiOrchestrator.orchestrate({ query: t.q });
        assert(res.success === true, `Orchestrator processed: "${t.q}"`);
        assert(res.reply && res.reply.length > 20, `Grounded reply generated for: "${t.q}"`);
        assert(res.prediction_id && res.prediction_id.startsWith("PRED-"), `Inference recorded with prediction_id: ${res.prediction_id}`);
        assert(res.data_source === "REAL" || res.data_source === "PREDICTED" || res.data_source === "SIMULATED", `Data source verified: ${res.data_source}`);
        lastPredId = res.prediction_id;
    }

    // 3. TEST DATABASE PERSISTENCE IN LEDGER & TOOL LOGS
    console.log("\n--- 3. Testing Database Persistence (AI Ledger & Tool Logs) ---");
    const [predRows] = await pool.query(
        "SELECT prediction_id, model_name, module, data_source, confidence_score, status FROM ai_predictions WHERE prediction_id = ?",
        [lastPredId]
    );
    assert(predRows.length === 1, `Ledger entry persisted for prediction_id ${lastPredId}`);
    assert(predRows[0].status === "COMPLETED", "Ledger entry status is COMPLETED");

    const [toolLogRows] = await pool.query("SELECT COUNT(*) AS total FROM ai_tool_logs");
    assert(toolLogRows[0].total > 0, `ai_tool_logs has ${toolLogRows[0].total} recorded invocations`);

    const [chatMsgRows] = await pool.query("SELECT COUNT(*) AS total FROM ai_chat_messages");
    assert(chatMsgRows[0].total > 0, `ai_chat_messages has ${chatMsgRows[0].total} recorded messages`);

    // 4. TEST FEEDBACK LOOP & OVERRIDE
    console.log("\n--- 4. Testing AI Feedback Loop & Override ---");
    const [fbResult] = await pool.query(
        `INSERT INTO ai_feedback (prediction_id, module, model_name, actual_value, accuracy_score, feedback_type, submitted_by, comments)
         VALUES (?, 'simulation', 'grounded-local-orchestrator-v2.0', 'Valid simulated diversion', 1.0000, 'STAFF_REVIEW', 'admin-evaluator', 'Accurate traffic diversion scenario')`,
        [lastPredId]
    );
    assert(fbResult.insertId > 0, "Human-in-the-loop feedback successfully recorded in ai_feedback table");

    console.log("\n==================================================");
    console.log(`📊 PHASE 1 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================");

    process.exit(failed === 0 ? 0 : 1);
}

runPhase1Tests().catch(err => {
    console.error("Test execution error:", err);
    process.exit(1);
});
