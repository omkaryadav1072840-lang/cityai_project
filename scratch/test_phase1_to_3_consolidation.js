/**
 * SMARTCITY AI - PHASES 1, 2 & 3 CONSOLIDATED VERIFICATION SUITE
 * Tests architecture cleanup, domain models, controllers, AI predictors,
 * recommendations, tourist guide, chatbot, and frontend assets.
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.join(__dirname, "..");

async function runTestSuite() {
    console.log("========================================================");
    console.log("  🚀 SMARTCITY AI - PHASES 1, 2 & 3 MASTER TEST SUITE");
    console.log("========================================================");

    let passed = 0;
    let failed = 0;

    function test(name, fn) {
        return (async () => {
            try {
                await fn();
                console.log(`  ✅ [PASS] ${name}`);
                passed++;
            } catch (err) {
                console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
                failed++;
            }
        })();
    }

    // ---------------------------------------------------------
    // TEST GROUP 1: Phase 1 Standardized API Envelopes
    // ---------------------------------------------------------
    console.log("\n[TEST GROUP 1: Phase 1 Standardized API Envelopes & Utils]");

    await test("apiSuccess formats envelope correctly with custom metadata", async () => {
        const { apiSuccess } = require("../backend/utils/response");
        let resData = null;
        let resCode = 0;
        const mockRes = {
            status: (code) => {
                resCode = code;
                return {
                    json: (data) => { resData = data; }
                };
            }
        };

        apiSuccess(mockRes, { item: "sample" }, "Item fetched", 200, { count: 1 });
        assert.strictEqual(resCode, 200);
        assert.strictEqual(resData.success, true);
        assert.strictEqual(resData.message, "Item fetched");
        assert.deepStrictEqual(resData.data, { item: "sample" });
        assert.strictEqual(resData.count, 1);
        assert.strictEqual(resData.error, null);
    });

    await test("apiError formats envelope correctly with error code & details", async () => {
        const { apiError } = require("../backend/utils/response");
        let resData = null;
        let resCode = 0;
        const mockRes = {
            status: (code) => {
                resCode = code;
                return {
                    json: (data) => { resData = data; }
                };
            }
        };

        apiError(mockRes, "Slot unavailable", 409, "SLOT_CONFLICT", "Already reserved");
        assert.strictEqual(resCode, 409);
        assert.strictEqual(resData.success, false);
        assert.strictEqual(resData.data, null);
        assert.strictEqual(resData.error.code, "SLOT_CONFLICT");
        assert.strictEqual(resData.error.details, "Already reserved");
    });

    // ---------------------------------------------------------
    // TEST GROUP 2: Domain Models & Controllers
    // ---------------------------------------------------------
    console.log("\n[TEST GROUP 2: Separation of Concerns (Models & Controllers)]");

    await test("TrafficModel, ParkingModel, HospitalModel, AIModel methods exist", async () => {
        const TrafficModel = require("../backend/models/traffic.model");
        const ParkingModel = require("../backend/models/parking.model");
        const HospitalModel = require("../backend/models/hospital.model");
        const AIModel = require("../backend/models/ai.model");

        assert.strictEqual(typeof TrafficModel.getAllJunctions, "function");
        assert.strictEqual(typeof ParkingModel.getAllLots, "function");
        assert.strictEqual(typeof HospitalModel.getAllHospitals, "function");
        assert.strictEqual(typeof AIModel.getPredictions, "function");
    });

    await test("AIController, TrafficController, ParkingController, HospitalController exist", async () => {
        const AIController = require("../backend/controllers/ai.controller");
        const TrafficController = require("../backend/controllers/traffic.controller");
        const ParkingController = require("../backend/controllers/parking.controller");
        const HospitalController = require("../backend/controllers/hospital.controller");

        assert.strictEqual(typeof AIController.chat, "function");
        assert.strictEqual(typeof AIController.predictTraffic, "function");
        assert.strictEqual(typeof AIController.predictWaste, "function");
        assert.strictEqual(typeof AIController.predictAQI, "function");
        assert.strictEqual(typeof AIController.recommendParking, "function");
        assert.strictEqual(typeof AIController.recommendHospital, "function");
        assert.strictEqual(typeof AIController.generateItinerary, "function");

        assert.strictEqual(typeof TrafficController.getJunctions, "function");
        assert.strictEqual(typeof ParkingController.getLots, "function");
        assert.strictEqual(typeof HospitalController.getHospitals, "function");
    });

    // ---------------------------------------------------------
    // TEST GROUP 3: AI Facade & Predictions
    // ---------------------------------------------------------
    console.log("\n[TEST GROUP 3: Phase 3 AI Predictors, Recommendations & Tourism]");

    await test("AI unified facade exports all required components", async () => {
        const ai = require("../backend/ai");
        assert(ai.chatbot, "chatbot must exist");
        assert(ai.tools, "tools must exist");
        assert(ai.models, "models must exist");
        assert(ai.predictions.traffic, "traffic predictor must exist");
        assert(ai.predictions.parking, "parking predictor must exist");
        assert(ai.predictions.hospital, "hospital predictor must exist");
        assert(ai.predictions.waste, "waste predictor must exist");
        assert(ai.predictions.aqi, "aqi predictor must exist");
        assert(ai.recommendations.hospital, "hospital recommender must exist");
        assert(ai.recommendations.parking, "parking recommender must exist");
        assert(ai.tourist, "tourist guide must exist");
    });

    await test("Traffic Predictor produces valid level, congestion %, and speed", async () => {
        const trafficPredictor = require("../backend/ai/predictions/traffic/traffic_predictor");
        const res = await trafficPredictor.predictTraffic({ junction_id: "JNC-01", horizon_minutes: 15 });
        assert.strictEqual(res.success, true);
        assert(["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(res.predicted_traffic_level), "Invalid traffic level: " + res.predicted_traffic_level);
        assert(typeof res.predicted_congestion_percent === "number", "Congestion % must be number");
        assert(typeof res.expected_speed_kmh === "number", "Speed must be number");
        assert(res.source === "PYTHON_ML_SERVICE" || res.source === "STATISTICAL_FALLBACK", "Valid source required");
    });

    await test("Waste Predictor forecasts fill and overflow risk", async () => {
        const wastePredictor = require("../backend/ai/predictions/waste/waste_predictor");
        const res = await wastePredictor.predictBinOverflow({ bin_code: "WB-01" });
        assert.strictEqual(res.success, true);
        assert(["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(res.overflow_risk), "Invalid risk: " + res.overflow_risk);
        assert(typeof res.hours_until_overflow === "number", "Hours to overflow must be number");
    });

    await test("AQI Predictor categorizes AQI and differentiates actual vs forecast", async () => {
        const aqiPredictor = require("../backend/ai/predictions/aqi/aqi_predictor");
        const res = await aqiPredictor.predictAQI({ station_code: "AQI-01" });
        assert.strictEqual(res.success, true);
        assert(res.actual_measurement.data_type === "REAL_SENSOR_MEASUREMENT");
        assert(res.prediction.data_type === "ML_STATISTICAL_FORECAST");
        assert(typeof res.prediction.predicted_aqi === "number");
        assert(["Good", "Satisfactory", "Moderate", "Poor", "Very Poor", "Severe"].includes(res.prediction.predicted_category));
    });

    await test("Hospital Recommender upholds strict non-diagnosis medical disclaimer", async () => {
        const hospitalRecommender = require("../backend/ai/recommendations/hospital_recommender");
        const res = await hospitalRecommender.recommend({
            latitude: 26.7606,
            longitude: 83.3732,
            department: "Cardiology",
            require_icu: true
        });
        assert.strictEqual(res.success, true);
        assert(Array.isArray(res.recommendations), "Recommendations must be array");
        assert(res.medical_disclaimer.includes("DO NOT use this AI recommendation as medical advice"), "Disclaimer missing");
    });

    await test("Parking Recommender calculates explainable scoring and reasons", async () => {
        const parkingRecommender = require("../backend/ai/recommendations/parking_recommender");
        const res = await parkingRecommender.recommend({
            user_lat: 26.7606,
            user_lng: 83.3732,
            vehicle_type: "Four-Wheeler"
        });
        assert.strictEqual(res.success, true);
        assert(Array.isArray(res.recommendations), "Recommendations must be array");
        if (res.recommendations.length > 0) {
            const first = res.recommendations[0];
            assert(typeof first.score === "number", "Score must be number");
            assert(first.reasons && first.reasons.length > 0, "Explanation reasons required");
        }
    });

    await test("Tourist Guide generates realistic 1-day Gorakhpur itinerary", async () => {
        const touristGuide = require("../backend/ai/tourist/tourist_guide");
        const res = await touristGuide.generateOneDayItinerary({ theme: "Heritage & Culture" });
        assert.strictEqual(res.success, true);
        assert.strictEqual(res.city, "Gorakhpur, Uttar Pradesh");
        assert(Array.isArray(res.itinerary), "Itinerary must be array");
        assert.strictEqual(res.itinerary.length, 4, "Must contain morning, mid-day, lunch, and evening phases");
        assert(res.data_source === "VERIFIED_GROUNDED_DATA");
    });

    await test("Bilingual Chatbot understands Hindi query and calls grounded tool", async () => {
        const chatbot = require("../backend/ai/chatbot/chatbot_engine");
        const res = await chatbot.processQuery("Nearest hospital batao");
        assert.strictEqual(res.success, true);
        assert.strictEqual(res.tool_executed, "find_hospitals");
        assert(res.reply.length > 10, "Reply must be informative");
    });

    await test("Bilingual Chatbot understands English query and calls grounded tool", async () => {
        const chatbot = require("../backend/ai/chatbot/chatbot_engine");
        const res = await chatbot.processQuery("Where is parking available?");
        assert.strictEqual(res.success, true);
        assert.strictEqual(res.tool_executed, "find_parking");
        assert(res.reply.length > 10, "Reply must be informative");
    });

    await test("All 14 MySQL Grounded Tools execute without errors", async () => {
        const groundedTools = require("../backend/ai/tools/smartcity_tools");
        const toolsList = [
            "find_hospitals",
            "find_available_beds",
            "find_doctors",
            "find_parking",
            "get_parking_availability",
            "get_traffic_status",
            "get_nearby_services",
            "get_emergency_services",
            "get_police_stations",
            "get_waste_status",
            "get_water_status",
            "get_tourist_places",
            "get_route_information",
            "get_user_bookings"
        ];

        for (const tName of toolsList) {
            assert.strictEqual(typeof groundedTools[tName], "function", `Tool ${tName} must be a function`);
            const result = await groundedTools[tName]({});
            assert.strictEqual(result.success, true, `Tool ${tName} execution failed`);
        }
    });

    // ---------------------------------------------------------
    // TEST GROUP 4: Frontend Reusable Components & API Client
    // ---------------------------------------------------------
    console.log("\n[TEST GROUP 4: Frontend Reusable Components & API Client Assets]");

    await test("ui_components.css and ui_components.js exist and are populated", async () => {
        const cssPath = path.join(ROOT_DIR, "frontend/components/ui_components.css");
        const jsPath = path.join(ROOT_DIR, "frontend/components/ui_components.js");

        assert(fs.existsSync(cssPath), "ui_components.css missing");
        assert(fs.existsSync(jsPath), "ui_components.js missing");

        const cssContent = fs.readFileSync(cssPath, "utf8");
        const jsContent = fs.readFileSync(jsPath, "utf8");

        assert(cssContent.includes(".sc-toast"), "Toast styling missing");
        assert(cssContent.includes(".sc-loading-overlay"), "Loading styling missing");
        assert(cssContent.includes(".sc-state-box"), "State box styling missing");
        assert(cssContent.includes(".sc-modal-dialog"), "Modal styling missing");

        assert(jsContent.includes("SmartCityUI.toast"), "toast method missing");
        assert(jsContent.includes("SmartCityUI.showLoading"), "showLoading missing");
        assert(jsContent.includes("SmartCityUI.renderEmpty"), "renderEmpty missing");
        assert(jsContent.includes("SmartCityUI.renderError"), "renderError missing");
        assert(jsContent.includes("SmartCityUI.openModal"), "openModal missing");
    });

    await test("smartcity_map.js exists and implements Leaflet controller", async () => {
        const mapPath = path.join(ROOT_DIR, "frontend/components/smartcity_map.js");
        assert(fs.existsSync(mapPath), "smartcity_map.js missing");
        const mapContent = fs.readFileSync(mapPath, "utf8");
        assert(mapContent.includes("class SmartCityMap"), "SmartCityMap class missing");
        assert(mapContent.includes("locateUser"), "locateUser method missing");
        assert(mapContent.includes("addMarker"), "addMarker method missing");
    });

    await test("Centralized API client and all sub-clients exist", async () => {
        const apiFiles = [
            "frontend/api/client.js",
            "frontend/api/auth.api.js",
            "frontend/api/traffic.api.js",
            "frontend/api/parking.api.js",
            "frontend/api/hospital.api.js",
            "frontend/api/waste.api.js",
            "frontend/api/water.api.js",
            "frontend/api/emergency.api.js",
            "frontend/api/police.api.js",
            "frontend/api/ai.api.js",
            "frontend/api/index.js"
        ];

        for (const file of apiFiles) {
            const fPath = path.join(ROOT_DIR, file);
            assert(fs.existsSync(fPath), `Missing API file: ${file}`);
            const content = fs.readFileSync(fPath, "utf8");
            assert(content.length > 50, `API file empty: ${file}`);
        }
    });

    console.log("\n========================================================");
    console.log(`  SCORE: ${passed} PASSED | ${failed} FAILED`);
    console.log("========================================================");

    process.exit(failed === 0 ? 0 : 1);
}

runTestSuite();
