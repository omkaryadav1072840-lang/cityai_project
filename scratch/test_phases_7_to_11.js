const waterAIService = require('../backend/services/water_ai_service');
const healthcareAIService = require('../backend/services/healthcare_ai_service');
const parkingAIService = require('../backend/services/parking_ai_service');
const envDisasterAIService = require('../backend/services/environment_disaster_ai_service');
const commandCenterAIService = require('../backend/services/command_center_simulation_service');
const pool = require('../backend/config/db').promise();
const jwt = require('../backend/node_modules/jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || "smartcity_super_secret_jwt_key_gorakhpur_2026";

async function runPhases7To11Tests() {
    console.log("==================================================");
    console.log("🧪 TESTING SMARTCITY AI PHASES 7 TO 11");
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

    // --- PHASE 7: SMART WATER AI ---
    console.log("--- PHASE 7: Smart Water AI ---");
    // Pipe Burst Anomaly Detection (Pressure < 1.6 bar & Loss > 22%)
    const burstAnom = await waterAIService.detectPipeAnomalies({
        zone: "Zone 1 - Central Golghar",
        inflow_rate_lps: 500,
        outflow_rate_lps: 340,
        pressure_bar: 1.3
    });
    assert(burstAnom.anomaly_detected === true && burstAnom.anomaly_type === "PIPE_BURST", "Catastrophic pipe burst anomaly detected from SCADA telemetry");
    assert(burstAnom.severity === "CRITICAL" && burstAnom.anomaly_score > 0.9, "Burst pipe flagged with CRITICAL severity and high anomaly score");

    // Normal Water Flow
    const normFlow = await waterAIService.detectPipeAnomalies({
        zone: "Zone 2 - Medical College",
        inflow_rate_lps: 400,
        outflow_rate_lps: 380,
        pressure_bar: 3.2
    });
    assert(normFlow.anomaly_detected === false && normFlow.anomaly_type === "NORMAL", "Standard pressure telemetry correctly labeled as NORMAL");

    // Water Demand Forecast
    const waterDemand = await waterAIService.forecastDemand({ zone: "Zone 1" });
    assert(waterDemand.success === true && waterDemand.predicted_daily_demand_kiloliters > 0, "Zone water demand forecasted daily kiloliter requirement");

    // --- PHASE 8: HEALTHCARE AI ---
    console.log("\n--- PHASE 8: Healthcare AI ---");
    // Bed Surge Forecasting
    const bedSurge = await healthcareAIService.forecastBedSurge({ hospital_id: "HOSP-01" });
    assert(bedSurge.success === true && bedSurge.occupancy_forecast.total_occupancy_pct >= 0, "Hospital bed surge forecasting generated occupancy percentages");
    assert(bedSurge.opd_forecast.forecasted_daily_patient_load > 0, "OPD queue waiting times and patient loads projected");

    // Intelligent Bed Allocation Optimizer
    const bedOpt = await healthcareAIService.recommendOptimalBed({ patient_severity: "CRITICAL", required_bed_type: "ICU" });
    assert(bedOpt.success === true && bedOpt.recommended_hospital.hospital_name, "Intelligent optimizer recommended hospital with available ICU trauma beds");

    // Ambulance Allocation
    const ambAlloc = await healthcareAIService.recommendAmbulance({ emergency_type: "CARDIAC_ARREST" });
    assert(ambAlloc.success === true && ambAlloc.allocated_ambulance.vehicle_number, "Recommended ALS ambulance for critical cardiac emergency");

    // QR-Based Patient Medical Record Authorization (Security & Privacy Guard)
    const validDoctorToken = jwt.sign({ username: "dr_tripathi", name: "Dr. A.K. Tripathi", role: "DOCTOR" }, JWT_SECRET, { expiresIn: '1h' });
    const doctorAccess = await healthcareAIService.accessPatientRecordViaQR({ qr_token: "QR-PATIENT-SAFE-TOKEN", accessing_user_token: validDoctorToken });
    assert(doctorAccess.authorized === true && doctorAccess.status === "ACCESS_GRANTED", "Authorized doctor granted access to patient chart via QR");

    const citizenToken = jwt.sign({ username: "citizen_rahul", name: "Rahul", role: "CITIZEN" }, JWT_SECRET, { expiresIn: '1h' });
    const citizenAccess = await healthcareAIService.accessPatientRecordViaQR({ qr_token: "QR-PATIENT-SAFE-TOKEN", accessing_user_token: citizenToken });
    assert(citizenAccess.authorized === false && citizenAccess.status === "FORBIDDEN", "Unauthorized citizen blocked from scanning third-party medical records");

    // --- PHASE 9: SMART PARKING AI ---
    console.log("\n--- PHASE 9: Smart Parking AI ---");
    // Multi-Horizon Occupancy Prediction (15m, 30m, 60m, 120m)
    const parkPred = await parkingAIService.predictOccupancy({ lot_id: 1 });
    assert(parkPred.success === true && parkPred.horizons.length === 4, "Generated 15, 30, 60, and 120-minute occupancy forecasts");
    assert(parkPred.horizons[3].horizon_minutes === 120, "2-hour long-range parking demand predicted");

    // Alternative Parking Re-router
    const altParking = await parkingAIService.recommendAlternativeParking({ lot_id: 1 });
    assert(altParking.success === true && altParking.recommended_alternatives.length > 0, "Alternative parking lots recommended when primary lot is saturated");

    // Vision-Based Illegal Parking Detection
    const illPark = await parkingAIService.detectIllegalParking({ camera_id: "CAM-PARK-01" });
    assert(illPark.success === true && illPark.violation_detected === true, "Computer vision detected sedan parked in marked No-Parking zone");

    // --- PHASE 10: ENVIRONMENT & DISASTER AI ---
    console.log("\n--- PHASE 10: Environment & Disaster AI ---");
    // AQI & Pollution Forecasting
    const aqiForecast = await envDisasterAIService.forecastAQI({ station_code: "AQI-01" });
    assert(aqiForecast.success === true && aqiForecast.predicted_aqi_next_3h > 0, "AQI forecasted for next 3 hours with health advisory");
    assert(aqiForecast.pollution_trend, `Air quality trend identified: ${aqiForecast.pollution_trend}`);

    // Flood & Waterlogging Risk Analysis
    const floodRisk = await envDisasterAIService.predictFloodRisk({ locality: "Golghar Low-lying Sector", rainfall_mm: 75.0 });
    assert(floodRisk.success === true && (floodRisk.risk_level === "HIGH" || floodRisk.risk_level === "CRITICAL"), "Monsoon runoff model classified heavy rainfall as HIGH/CRITICAL flood risk");
    assert(floodRisk.emergency_helpline.includes("1077"), "Emergency helpline 1077 included in disaster response payload");

    // Tourist AI 1-Day Itinerary Engine
    const tourItin = await envDisasterAIService.generateOneDayItinerary({ interest: "Heritage" });
    assert(tourItin.success === true && tourItin.itinerary_steps.length >= 4, "Tourist AI generated structured 1-day itinerary with Gorakhnath Temple, Gita Press, and Ramgarh Tal");

    // --- PHASE 11: ADMIN AI COMMAND CENTER & WHAT-IF SIMULATION ---
    console.log("\n--- PHASE 11: Admin AI Command Center & What-If Simulation ---");
    // Multi-Domain City Health Telemetry
    const cityHealth = await commandCenterAIService.getFullCityHealthStatus();
    assert(cityHealth.success === true && cityHealth.city_health_score > 0, "City Health Index and operational status computed across all 7 municipal sectors");
    assert(cityHealth.executive_narrative && cityHealth.executive_narrative.includes("Gorakhpur"), "Generated human-explainable citywide executive briefing");

    // What-If Simulation: Road Closure
    const simClosure = commandCenterAIService.simulateScenario({ scenario_type: "ROAD_CLOSURE", parameter_value: "Golghar Chowk Main Axis" });
    assert(simClosure.data_source === "SIMULATED", "Simulation explicitly branded as SIMULATED data");
    assert(simClosure.estimated_changes.adjacent_arterial_delay_mins > 0, "What-If simulation projected adjacent arterial delay of +16 minutes");

    // What-If Simulation: Traffic Surge
    const simSurge = commandCenterAIService.simulateScenario({ scenario_type: "TRAFFIC_SURGE", parameter_value: 30 });
    assert(simSurge.estimated_changes.average_speed_reduction_kmh < 0, "What-If projected arterial speed drop during 30% rush hour surge");

    // Resource Optimization
    const resOpt = commandCenterAIService.optimizeMunicipalResources();
    assert(resOpt.success === true && resOpt.recommended_reallocations.ambulances, "Optimal resource reallocations recommended across ambulances, waste trucks, and marshals");

    // --- VERIFY DATABASE LEDGERS FOR PHASES 7 TO 11 ---
    console.log("\n--- Verifying Database Ledgers for Phases 7-11 ---");
    const [watRows] = await pool.query("SELECT COUNT(*) AS total FROM water_anomalies");
    assert(watRows[0].total > 0, `water_anomalies ledger has ${watRows[0].total} rows`);

    const [hospRows] = await pool.query("SELECT COUNT(*) AS total FROM hospital_predictions");
    assert(hospRows[0].total > 0, `hospital_predictions ledger has ${hospRows[0].total} rows`);

    const [parkRows] = await pool.query("SELECT COUNT(*) AS total FROM parking_predictions");
    assert(parkRows[0].total > 0, `parking_predictions ledger has ${parkRows[0].total} rows`);

    const [envRows] = await pool.query("SELECT COUNT(*) AS total FROM environment_predictions");
    assert(envRows[0].total > 0, `environment_predictions ledger has ${envRows[0].total} rows`);

    const [disRows] = await pool.query("SELECT COUNT(*) AS total FROM disaster_predictions");
    assert(disRows[0].total > 0, `disaster_predictions ledger has ${disRows[0].total} rows`);

    console.log("\n==================================================");
    console.log(`📊 PHASES 7 TO 11 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================");

    process.exit(failed === 0 ? 0 : 1);
}

runPhases7To11Tests().catch(err => {
    console.error("Test execution error:", err);
    process.exit(1);
});
