const fs = require('fs');
const path = require('path');
const trafficAIService = require('../backend/services/traffic_ai_service');
const cvAndANPRService = require('../backend/services/cv_anpr_service');
const grievanceAIService = require('../backend/services/grievance_ai_service');
const wasteAIService = require('../backend/services/waste_ai_service');
const aiOrchestrator = require('../backend/services/ai_orchestrator');
const pool = require('../backend/config/db').promise();

async function runPhases2To6Tests() {
    console.log("==================================================");
    console.log("🧪 TESTING SMARTCITY AI PHASES 2 TO 6");
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

    // --- PHASE 2: UNIVERSAL AI WIDGET & BILINGUAL GROUNDED CHAT ---
    console.log("--- PHASE 2: Universal AI Widget & Grounded Chatbot ---");
    const widgetJsPath = path.join(__dirname, '../frontend/components/ai_widget.js');
    const widgetCssPath = path.join(__dirname, '../frontend/components/ai_widget.css');
    assert(fs.existsSync(widgetJsPath), "frontend/components/ai_widget.js exists and is deployed");
    assert(fs.existsSync(widgetCssPath), "frontend/components/ai_widget.css exists and is deployed");

    const chatRes = await aiOrchestrator.orchestrate({ query: "Golghar ke paas parking kaha hai?" });
    assert(chatRes.success === true && chatRes.tool_called === "find_parking", "Grounded tool 'find_parking' executed for parking query");
    assert(chatRes.data_source === "REAL", "Chatbot marks verified database data as REAL");
    assert(chatRes.reply && chatRes.reply.includes("Parking"), "Bilingual reply generated with parking lots");

    // --- PHASE 3: TRAFFIC AI (PREDICTION, WEBSTER OPTIMIZATION, AMBULANCE WAVE) ---
    console.log("\n--- PHASE 3: Traffic AI ---");
    // Multi-Horizon Prediction (15m, 30m, 60m)
    const multiPred = await trafficAIService.predictMultiHorizon({ junction_id: "JNC-01", vehicle_count: 95 });
    assert(multiPred.success === true && multiPred.horizons.length === 3, "Multi-horizon prediction returns 15, 30, and 60-min forecasts");
    assert(multiPred.horizons[0].predicted_vehicle_count > 0 && multiPred.horizons[0].traffic_level, "15m prediction contains vehicle count and traffic level");
    assert(multiPred.horizons[2].horizon_minutes === 60, "60m horizon forecast generated successfully");

    // Webster Signal Optimization Formula: C0 = (1.5L + 5) / (1 - Y)
    const websterOpt = await trafficAIService.optimizeSignalWebster({ junction_id: "JNC-01" });
    assert(websterOpt.success === true, "Webster signal optimization executed");
    assert(websterOpt.webster_calculated_cycle_sec >= 45 && websterOpt.webster_calculated_cycle_sec <= 150, `Calculated cycle length ${websterOpt.webster_calculated_cycle_sec}s within safe operational bounds`);
    assert(websterOpt.phase_allocations.phase_A_NS.green_sec > 0, "Phase A allocated effective green time");

    // Multi-Junction Coordination
    const coordRes = await trafficAIService.coordinateCorridor({ corridor_name: "Golghar Arterial" });
    assert(coordRes.success === true && coordRes.coordinated_signals.length >= 3, "Multi-junction arterial coordination generated green wave offsets");

    // Ambulance Green Wave (600m Preemption)
    const ambNear = await trafficAIService.processAmbulanceApproaching({
        ambulance_id: "AMB-01",
        latitude: 26.7610,
        longitude: 83.3735,
        junction_id: "JNC-01"
    });
    assert(ambNear.success === true, "Ambulance approach tracking executed");
    assert(ambNear.is_within_600m === true && ambNear.corridor_status === "GREEN_PREEMPTION_ACTIVE", "Active green preemption corridor triggered within 600m");

    // --- PHASE 4: COMPUTER VISION & ANPR PIPELINE ---
    console.log("\n--- PHASE 4: Computer Vision & ANPR Human-in-the-Loop ---");
    // Telemetry & Vehicle Classification
    const frameRes = await cvAndANPRService.analyzeFrame({ camera_id: "CAM-JNC01-01", junction_id: "JNC-01" });
    assert(frameRes.success === true && frameRes.total_vehicle_count > 0, "CV frame analysis detected multi-class vehicles");
    assert(frameRes.vehicle_counts.car !== undefined && frameRes.queue_length_meters >= 0, "Vehicle classification counts and queue length computed");

    // Plate & Violation Staging
    const plateRes = await cvAndANPRService.processPlateAndViolation({
        camera_id: "CAM-JNC01-01",
        junction_id: "JNC-01",
        vehicle_number: "UP53AK9988",
        violation_type: "Red-Light Violation",
        measured_speed_kmh: 42
    });
    assert(plateRes.success === true && plateRes.status === "AI_FLAGGED", "Violation staged as AI_FLAGGED for mandatory staff review");
    assert(plateRes.fine_amount === 1000, "Fine amount mapped to ₹1000 for Red-Light Violation");

    // Staff Human Review (Approval)
    const reviewRes = await cvAndANPRService.reviewViolation({
        violation_id: plateRes.violation_id,
        decision: "APPROVED",
        staff_username: "traffic_officer_sharma",
        notes: "Clear evidence of stop-line crossing on amber/red transition"
    });
    assert(reviewRes.success === true && reviewRes.new_status === "VERIFIED_CHALLAN_REFERRED", "Human verification transitioned violation to VERIFIED_CHALLAN_REFERRED");
    assert(reviewRes.echallan_issued === true, "E-challan officially issued following officer verification");

    // --- PHASE 5: CITIZEN GRIEVANCE AI ---
    console.log("\n--- PHASE 5: Citizen Grievance AI & Image Detection ---");
    // NLP Analysis & SLA Assignment (Critical Fire / Electric Hazard -> 2h SLA)
    const critGrievance = grievanceAIService.analyzeGrievanceText("Main road transformer sparking and loose live electric wire hanging near school");
    assert(critGrievance.predicted_priority === "CRITICAL" && critGrievance.sla_hours === 2, "Hazardous electrical complaint classified as CRITICAL with 2-hour SLA");

    // Water Pipe Leakage -> 6h SLA
    const waterGrievance = grievanceAIService.analyzeGrievanceText("Huge water pipeline leak in front of Golghar bank, water wasting continuously");
    assert(waterGrievance.predicted_priority === "HIGH" && waterGrievance.sla_hours === 6, "Water leak complaint classified as HIGH with 6-hour SLA");

    // Garbage Overflow -> 24h SLA
    const wasteGrievance = grievanceAIService.analyzeGrievanceText("Dustbin overflowing with garbage and bad smell on Mohaddipur road");
    assert(wasteGrievance.predicted_priority === "MEDIUM" && wasteGrievance.sla_hours === 24, "Garbage complaint classified as MEDIUM with 24-hour SLA");

    // Pothole -> 72h SLA
    const roadGrievance = grievanceAIService.analyzeGrievanceText("Deep pothole in the road near medical college gate");
    assert(roadGrievance.predicted_priority === "LOW" && roadGrievance.sla_hours === 72, "Pothole classified as LOW with 72-hour SLA");

    // Spam Detection
    const spamGrievance = grievanceAIService.analyzeGrievanceText("test asdf");
    assert(spamGrievance.is_spam === true, "Short gibberish query filtered as spam");

    // Image-Based Grievance Detection
    const imgGrievance = await grievanceAIService.analyzeGrievanceImage({ image_name: "pothole_crater_mohaddipur.jpg" });
    assert(imgGrievance.success === true && imgGrievance.classification.includes("Pothole"), "Image-based AI correctly classified road pothole");
    assert(imgGrievance.suggested_department === "Public Works (PWD)", "Suggested department routed to Public Works (PWD)");

    // --- PHASE 6: SMART WASTE AI ---
    console.log("\n--- PHASE 6: Smart Waste AI ---");
    // Bin Fill-Level Prediction
    const binPred = await wasteAIService.predictBinFillLevel({ bin_code: "WB-01" });
    assert(binPred.success === true && binPred.forecast.hours_until_100_pct !== undefined, "Bin fill-level forecast computed hours to capacity");
    assert(binPred.collection_urgency, `Assigned collection urgency: ${binPred.collection_urgency}`);

    // Dynamic Route Optimization (TSP nearest-neighbor)
    const routeOpt = await wasteAIService.optimizeCollectionRoute({ ward_number: "Ward 12", min_fill_threshold: 60 });
    assert(routeOpt.success === true && routeOpt.optimal_pickup_sequence.length > 0, "TSP collection route generated optimal pickup sequence");
    assert(routeOpt.estimated_total_time_mins > 0 && routeOpt.assigned_vehicle_type, "Calculated total route duration and vehicle assignment");

    // Ward Daily Waste Forecast
    const wardForecast = await wasteAIService.forecastWardWaste({ ward_number: "Ward 12" });
    assert(wardForecast.success === true && wardForecast.predicted_tonnage > 0, "Ward waste forecast estimated daily tonnage");
    assert(wardForecast.composition_forecast.wet_organic_pct > 0, "Composition forecast broken down into organic, recyclable, and plastic streams");

    // Database Ledger Verification
    console.log("\n--- Verifying Database Ledgers for Phases 2-6 ---");
    const [trfRows] = await pool.query("SELECT COUNT(*) AS total FROM traffic_predictions");
    assert(trfRows[0].total > 0, `traffic_predictions ledger has ${trfRows[0].total} rows`);

    const [sigRows] = await pool.query("SELECT COUNT(*) AS total FROM signal_optimizations");
    assert(sigRows[0].total > 0, `signal_optimizations ledger has ${sigRows[0].total} rows`);

    const [ambRows] = await pool.query("SELECT COUNT(*) AS total FROM ambulance_green_waves");
    assert(ambRows[0].total > 0, `ambulance_green_waves ledger has ${ambRows[0].total} rows`);

    const [cvRows] = await pool.query("SELECT COUNT(*) AS total FROM cv_detections");
    assert(cvRows[0].total > 0, `cv_detections ledger has ${cvRows[0].total} rows`);

    const [wstRows] = await pool.query("SELECT COUNT(*) AS total FROM waste_predictions");
    assert(wstRows[0].total > 0, `waste_predictions ledger has ${wstRows[0].total} rows`);

    console.log("\n==================================================");
    console.log(`📊 PHASES 2 TO 6 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================");

    process.exit(failed === 0 ? 0 : 1);
}

runPhases2To6Tests().catch(err => {
    console.error("Test execution error:", err);
    process.exit(1);
});
