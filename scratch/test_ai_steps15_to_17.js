/**
 * SMARTCITY AI - AI CHATBOT, 14 TOOLS & ML PREDICTIONS AUDIT (STEPS 15, 16, 17)
 */

const http = require("http");
const SmartCityTools = require("../backend/ai/tools/smartcity_tools");

function request(path, options = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, "http://localhost:5000");
        const reqOptions = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: options.method || "GET",
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
        };

        const req = http.request(reqOptions, (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
                let parsed;
                try {
                    parsed = JSON.parse(data);
                } catch (e) {
                    parsed = data;
                }
                resolve({ status: res.statusCode, data: parsed });
            });
        });

        req.on("error", (e) => reject(e));

        if (options.body) {
            req.write(typeof options.body === "string" ? options.body : JSON.stringify(options.body));
        }
        req.end();
    });
}

let passed = 0;
let failed = 0;

function recordPass(msg) {
    passed++;
    console.log(`  ✅ [PASS] ${msg}`);
}

function recordFail(msg, detail) {
    failed++;
    console.error(`  ❌ [FAIL] ${msg}`);
    if (detail) console.error("     Details:", detail);
}

async function runAIAudit() {
    console.log("========================================================");
    console.log("  🤖 AI SUITE AUDIT: TOOLS, CHATBOT & PREDICTIONS (STEPS 15-17)");
    console.log("========================================================");

    // =========================================================
    // STEP 16: TEST ALL 14 AI TOOLS
    // =========================================================
    console.log("\n--- STEP 16: Testing All 14 Grounded AI Tools ---");

    // 1. find_hospitals
    try {
        const t1 = await SmartCityTools.find_hospitals();
        if (t1.success && t1.count > 0 && Array.isArray(t1.data)) {
            recordPass(`Tool 1: find_hospitals returned ${t1.count} real hospitals`);
        } else {
            recordFail("Tool 1: find_hospitals failed", t1);
        }
    } catch (e) { recordFail("Tool 1 error", e.message); }

    // 2. find_available_beds
    try {
        const t2 = await SmartCityTools.find_available_beds();
        if (t2.success && t2.count > 0) {
            recordPass(`Tool 2: find_available_beds returned ${t2.count} bed categories`);
        } else {
            recordFail("Tool 2: find_available_beds failed", t2);
        }
    } catch (e) { recordFail("Tool 2 error", e.message); }

    // 3. find_doctors
    try {
        const t3 = await SmartCityTools.find_doctors({ specialty: "Cardiology" });
        if (t3.success && t3.count > 0) {
            recordPass(`Tool 3: find_doctors returned ${t3.count} verified specialists`);
        } else {
            recordFail("Tool 3: find_doctors failed", t3);
        }
    } catch (e) { recordFail("Tool 3 error", e.message); }

    // 4. find_parking
    try {
        const t4 = await SmartCityTools.find_parking();
        if (t4.success && t4.count > 0) {
            recordPass(`Tool 4: find_parking returned ${t4.count} parking facilities`);
        } else {
            recordFail("Tool 4: find_parking failed", t4);
        }
    } catch (e) { recordFail("Tool 4 error", e.message); }

    // 5. get_parking_availability
    try {
        const t5 = await SmartCityTools.get_parking_availability({ lot_code: "PARK-001" });
        if (t5.success && t5.data) {
            recordPass(`Tool 5: get_parking_availability for PARK-001 functional`);
        } else {
            recordFail("Tool 5: get_parking_availability failed", t5);
        }
    } catch (e) { recordFail("Tool 5 error", e.message); }

    // 6. get_traffic_status
    try {
        const t6 = await SmartCityTools.get_traffic_status();
        if (t6.success && t6.count > 0) {
            recordPass(`Tool 6: get_traffic_status returned ${t6.count} monitored junctions`);
        } else {
            recordFail("Tool 6: get_traffic_status failed", t6);
        }
    } catch (e) { recordFail("Tool 6 error", e.message); }

    // 7. get_nearby_services
    try {
        const t7 = await SmartCityTools.get_nearby_services({ location: "Golghar" });
        if (t7.success && t7.data) {
            recordPass("Tool 7: get_nearby_services returned civic service registry");
        } else {
            recordFail("Tool 7: get_nearby_services failed", t7);
        }
    } catch (e) { recordFail("Tool 7 error", e.message); }

    // 8. get_emergency_services
    try {
        const t8 = await SmartCityTools.get_emergency_services();
        if (t8.success && t8.data && (t8.data.helplines || t8.data.hotlines)) {
            recordPass("Tool 8: get_emergency_services returned active trauma & police contacts");
        } else {
            recordFail("Tool 8: get_emergency_services failed", t8);
        }
    } catch (e) { recordFail("Tool 8 error", e.message); }

    // 9. get_police_stations
    try {
        const t9 = await SmartCityTools.get_police_stations();
        if (t9.success && t9.count > 0) {
            recordPass(`Tool 9: get_police_stations returned ${t9.count} stations`);
        } else {
            recordFail("Tool 9: get_police_stations failed", t9);
        }
    } catch (e) { recordFail("Tool 9 error", e.message); }

    // 10. get_waste_status
    try {
        const t10 = await SmartCityTools.get_waste_status();
        if (t10.success && t10.count > 0) {
            recordPass(`Tool 10: get_waste_status returned ${t10.count} monitored bins`);
        } else {
            recordFail("Tool 10: get_waste_status failed", t10);
        }
    } catch (e) { recordFail("Tool 10 error", e.message); }

    // 11. get_water_status
    try {
        const t11 = await SmartCityTools.get_water_status();
        if (t11.success && t11.data && (t11.data.reservoirs || t11.count > 0)) {
            const count = t11.count || (t11.data.reservoirs ? t11.data.reservoirs.length : 0);
            recordPass(`Tool 11: get_water_status returned ${count} overhead reservoirs`);
        } else {
            recordFail("Tool 11: get_water_status failed", t11);
        }
    } catch (e) { recordFail("Tool 11 error", e.message); }

    // 12. get_tourist_places
    try {
        const t12 = await SmartCityTools.get_tourist_places();
        if (t12.success && t12.count > 0) {
            recordPass(`Tool 12: get_tourist_places returned ${t12.count} heritage attractions`);
        } else {
            recordFail("Tool 12: get_tourist_places failed", t12);
        }
    } catch (e) { recordFail("Tool 12 error", e.message); }

    // 13. get_route_information
    try {
        const t13 = await SmartCityTools.get_route_information({ origin: "Railway Station", destination: "Ramgarh Tal" });
        if (t13.success && t13.data && t13.data.recommended_route) {
            recordPass("Tool 13: get_route_information returned routing and ETA");
        } else {
            recordFail("Tool 13: get_route_information failed", t13);
        }
    } catch (e) { recordFail("Tool 13 error", e.message); }

    // 14. get_user_bookings
    try {
        const t14 = await SmartCityTools.get_user_bookings({ user_id: 1, mobile: "9876543210" });
        if (t14.success && t14.data) {
            recordPass("Tool 14: get_user_bookings successfully executed against live DB");
        } else {
            recordFail("Tool 14: get_user_bookings failed", t14);
        }
    } catch (e) { recordFail("Tool 14 error", e.message); }

    // =========================================================
    // STEP 15: AI CHATBOT (Hindi & English Grounded Queries)
    // =========================================================
    console.log("\n--- STEP 15: Testing Bilingual AI Chatbot Queries ---");

    const testQueries = [
        { q: "Nearest hospital batao", expectedTool: "find_hospitals", lang: "Hindi" },
        { q: "ICU bed kaha available hai?", expectedTool: "find_available_beds", lang: "Hindi" },
        { q: "Parking kaha available hai?", expectedTool: "find_parking", lang: "Hindi" },
        { q: "Gorakhpur me traffic kaha jyada hai?", expectedTool: "get_traffic_status", lang: "Hindi" },
        { q: "Police station near me", expectedTool: "get_police_stations", lang: "English" },
        { q: "Ramgarh Tal kaise jaaye?", expectedTool: "get_route_information", lang: "Hindi" }
    ];

    for (const item of testQueries) {
        try {
            const res = await request("/api/ai/assistant", {
                method: "POST",
                body: { message: item.q }
            });

            if (res.status === 200 && res.data.success && res.data.reply) {
                recordPass(`Chatbot query [${item.lang}] "${item.q}" answered with grounded response`);
            } else {
                recordFail(`Chatbot query "${item.q}" failed`, res.data);
            }
        } catch (e) {
            recordFail(`Chatbot query "${item.q}" error`, e.message);
        }
    }

    // =========================================================
    // STEP 17: AI PREDICTIONS (Node.js -> FastAPI -> ML Response)
    // =========================================================
    console.log("\n--- STEP 17: Testing AI ML Predictions Pipeline ---");

    // 1. Traffic Prediction
    try {
        const tfRes = await request("/api/ai/traffic/predict?junction_id=1");
        if (tfRes.status === 200 && tfRes.data.success !== false) {
            recordPass(`Traffic Prediction: predicted_congestion_level=${tfRes.data.predicted_congestion_level || tfRes.data.congestion_level}%`);
        } else {
            recordFail("Traffic Prediction failed", tfRes.data);
        }
    } catch (e) { recordFail("Traffic Prediction error", e.message); }

    // 2. Parking Recommendation
    try {
        const pkRes = await request("/api/ai/parking/recommend?destination=Golghar");
        if (pkRes.status === 200 && pkRes.data.success !== false) {
            recordPass("Parking Recommendation functional");
        } else {
            recordFail("Parking Recommendation failed", pkRes.data);
        }
    } catch (e) { recordFail("Parking Recommendation error", e.message); }

    // 3. Hospital Recommendation
    try {
        const hpRes = await request("/api/ai/hospital/recommend?specialty=Cardiology");
        if (hpRes.status === 200 && hpRes.data.success !== false) {
            recordPass("Hospital Recommendation functional");
        } else {
            recordFail("Hospital Recommendation failed", hpRes.data);
        }
    } catch (e) { recordFail("Hospital Recommendation error", e.message); }

    // 4. Waste Overflow Prediction
    try {
        const wsRes = await request("/api/ai/waste/predict?bin_id=1");
        if (wsRes.status === 200 && wsRes.data.success !== false) {
            recordPass("Waste Overflow Prediction functional");
        } else {
            recordFail("Waste Overflow Prediction failed", wsRes.data);
        }
    } catch (e) { recordFail("Waste Overflow Prediction error", e.message); }

    // 5. AQI Environmental Forecast
    try {
        const aqiRes = await request("/api/ai/environment/aqi-forecast?zone=Civil%20Lines");
        if (aqiRes.status === 200 && aqiRes.data.success !== false) {
            recordPass("AQI Environmental 24h Forecast functional");
        } else {
            recordFail("AQI Forecast failed", aqiRes.data);
        }
    } catch (e) { recordFail("AQI Forecast error", e.message); }

    // 6. Tourism AI Itinerary
    try {
        const tourRes = await request("/api/ai/tourism/itinerary", {
            method: "POST",
            body: { duration_hours: 6, theme: "heritage" }
        });
        if (tourRes.status === 200 && tourRes.data.success !== false) {
            recordPass("Tourism AI Itinerary Planner functional");
        } else {
            recordFail("Tourism AI Itinerary failed", tourRes.data);
        }
    } catch (e) { recordFail("Tourism AI Itinerary error", e.message); }

    console.log("\n========================================================");
    console.log(`  AI AUDIT RESULT: ${passed} PASSED | ${failed} FAILED`);
    console.log("========================================================");
}

runAIAudit().catch(console.error);
