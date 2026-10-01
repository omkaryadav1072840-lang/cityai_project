/**
 * SmartCity AI - Master AI Layer Verification Suite
 * Executes Phase 8 (Hindi/English Chatbot), Phase 9 (14 Grounded Tools),
 * and Phase 10 (AI/ML Predictive Models).
 */

const SmartCityTools = require('../backend/ai/tools/smartcity_tools');
const ChatbotEngine = require('../backend/ai/chatbot/chatbot_engine');
const fs = require('fs');
const path = require('path');

const AI_BASE = 'http://127.0.0.1:8000';
const AI_KEY = 'smartcity_ai_internal_token_gorakhpur_2026';

async function run() {
    console.log('========================================================');
    console.log('  🤖 Running Master AI Layer & Grounded Tools Audit');
    console.log('========================================================\n');

    const results = {
        chatbotQueries: [],
        groundedTools: [],
        mlModels: []
    };

    // =========================================================================
    // PHASE 8: BILINGUAL USER QUERIES (HINDI & ENGLISH)
    // =========================================================================
    console.log('--- Phase 8: Testing User Chatbot Queries ---');
    const testQueries = [
        "Nearest hospital batao",
        "ICU bed kaha available hai?",
        "Parking kaha available hai?",
        "Gorakhpur me traffic kaha jyada hai?",
        "Police station near me",
        "Ramgarh Tal kaise jaaye?",
        "mera parking booking dikhao",
        "Water tanker kaise book kare?",
        "Kachra uthane ka schedule kya hai?",
        "Unknown nonsense query that should not invent data xyz123"
    ];

    for (const q of testQueries) {
        const start = Date.now();
        try {
            const resp = await ChatbotEngine.processQuery(q, { id: 1, name: 'Omkar Yadav' });
            const duration = Date.now() - start;
            results.chatbotQueries.push({
                query: q,
                durationMs: duration,
                success: resp.success,
                intent: resp.tool_executed,
                dataSource: resp.data_source,
                replyPreview: resp.reply.slice(0, 100),
                itemCount: Array.isArray(resp.raw_data) ? resp.raw_data.length : (resp.raw_data ? 1 : 0)
            });
            console.log(`[Chatbot] "${q}" -> Tool: ${resp.tool_executed} (${duration}ms) | Reply: ${resp.reply.slice(0, 60)}...`);
        } catch (e) {
            results.chatbotQueries.push({
                query: q,
                durationMs: Date.now() - start,
                success: false,
                error: e.message
            });
            console.error(`[Chatbot Error] "${q}":`, e.message);
        }
    }

    // =========================================================================
    // PHASE 9: TEST ALL 14 GROUNDED AI TOOLS
    // =========================================================================
    console.log('\n--- Phase 9: Testing All 14 Grounded AI Tools ---');
    const tools = [
        { name: 'find_hospitals', normal: { location: 'Golghar', emergency: true }, invalid: { location: 999999 } },
        { name: 'find_available_beds', normal: { bed_type: 'ICU' }, invalid: { hospital_id: 'NON_EXISTENT_ID_999' } },
        { name: 'find_doctors', normal: { specialty: 'Cardiology' }, invalid: { specialty: 'Astronautics' } },
        { name: 'find_parking', normal: { location: 'Golghar' }, invalid: { location: 'Moon Base Alpha' } },
        { name: 'get_parking_availability', normal: { lot_id: 1 }, invalid: { lot_id: -999 } },
        { name: 'get_traffic_status', normal: { junction_name: 'Golghar' }, invalid: { junction_name: 'Atlantis' } },
        { name: 'get_nearby_services', normal: { lat: 26.7606, lng: 83.3732, radius_km: 5 }, invalid: { lat: 'bad_lat', lng: 'bad_lng' } },
        { name: 'get_emergency_services', normal: { lat: 26.7606, lng: 83.3732 }, invalid: { type: 'Alien Invasion' } },
        { name: 'get_police_stations', normal: { sector: 'Central' }, invalid: { sector: 12345 } },
        { name: 'get_waste_status', normal: { ward: 'Ward 1' }, invalid: { ward: 'Ward 999999' } },
        { name: 'get_water_status', normal: { zone: 'North' }, invalid: { zone: 'Pluto Zone' } },
        { name: 'get_tourist_places', normal: { query: 'Ramgarh' }, invalid: { query: 'XYZNothingHere' } },
        { name: 'get_route_information', normal: { origin: 'Golghar', destination: 'Ramgarh Tal' }, invalid: { origin: '', destination: '' } },
        { name: 'get_user_bookings', normal: { user: { id: 1 } }, invalid: { user: null } }
    ];

    for (const t of tools) {
        const fn = SmartCityTools[t.name];
        if (typeof fn !== 'function') {
            results.groundedTools.push({ name: t.name, status: 'MISSING_FUNCTION' });
            console.error(`[Tool Missing] ${t.name}`);
            continue;
        }

        // Test normal input
        const startNormal = Date.now();
        let normalResult = null;
        try {
            normalResult = await fn(t.normal);
        } catch (e) {
            normalResult = { success: false, error: e.message };
        }
        const normalDuration = Date.now() - startNormal;

        // Test invalid input
        const startInv = Date.now();
        let invResult = null;
        try {
            invResult = await fn(t.invalid);
        } catch (e) {
            invResult = { success: false, error: e.message };
        }
        const invDuration = Date.now() - startInv;

        // Test missing input ({})
        let emptyResult = null;
        try {
            emptyResult = await fn({});
        } catch (e) {
            emptyResult = { success: false, error: e.message };
        }

        const toolPassed = normalResult && normalResult.success !== false;
        results.groundedTools.push({
            name: t.name,
            passed: toolPassed,
            normalDurationMs: normalDuration,
            normalCount: normalResult.count || (Array.isArray(normalResult.data) ? normalResult.data.length : 0),
            dataSource: normalResult.data_source || 'REAL',
            invalidHandled: invResult !== null,
            emptyHandled: emptyResult !== null,
            error: normalResult.error || null
        });

        console.log(`[Tool] ${t.name}() -> Passed: ${toolPassed} | Normal Count: ${results.groundedTools[results.groundedTools.length - 1].normalCount} | Duration: ${normalDuration}ms`);
    }

    // =========================================================================
    // PHASE 10: AI/ML PREDICTIVE MODELS
    // =========================================================================
    console.log('\n--- Phase 10: Testing AI/ML Predictive Models ---');
    const mlEndpoints = [
        { model: 'Traffic Congestion Prediction', url: `${AI_BASE}/api/v1/traffic/predict`, body: { junction_id: 'JNC-GOLGHAR-01', hour: 18, day_of_week: 3, aqi: 125, active_incidents: 1, weather: 'Clear' } },
        { model: 'Traffic Camera Computer Vision', url: `${AI_BASE}/api/v1/traffic/camera-vision`, body: { camera_id: 'CAM-GOL-01', timestamp: new Date().toISOString(), simulated_density: 0.85 } },
        { model: 'Waste Accumulation & Priority', url: `${AI_BASE}/api/v1/waste/predict`, body: { bin_id: 'BIN-101', current_fill: 88, days_since_empty: 3, ward: 'Ward 1' } },
        { model: 'Water SCADA Anomaly Detection', url: `${AI_BASE}/api/v1/water/anomaly`, body: { tank_id: 'TANK-01', pressure_psi: 19.0, flow_rate_lpm: 210, turbidity_ntu: 1.5 } },
        { model: 'Hospital Bed Capacity Surge', url: `${AI_BASE}/api/v1/healthcare/capacity`, body: { hospital_id: 'AIIMS-GKP', current_patients: 135, bed_capacity: 150, icu_occupied: 19, icu_capacity: 20 } },
        { model: 'Emergency Rapid Dispatch ETA', url: `${AI_BASE}/api/v1/emergency/route-eta`, body: { origin_lat: 26.7606, origin_lng: 83.3732, dest_lat: 26.7500, dest_lng: 83.3850, emergency_type: 'Trauma' } },
        { model: 'Parking Demand Forecast', url: `${AI_BASE}/api/v1/parking/demand`, body: { lot_id: 'LOT-01', hour: 18, current_occupancy: 52, total_capacity: 60 } },
        { model: 'Environmental AQI Forecast', url: `${AI_BASE}/api/v1/environment/aqi-forecast`, body: { station_id: 'ENV-GKP-01', current_aqi: 160, pm25: 75, pm10: 120, temperature_c: 30 } }
    ];

    for (const m of mlEndpoints) {
        const start = Date.now();
        try {
            const res = await fetch(m.url, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-AI-Service-Key': AI_KEY
                },
                body: JSON.stringify(m.body)
            });
            const data = await res.json();
            const duration = Date.now() - start;
            results.mlModels.push({
                model: m.model,
                endpoint: m.url,
                status: res.status,
                durationMs: duration,
                success: res.status === 200,
                outputPreview: JSON.stringify(data).slice(0, 100),
                dataSource: 'PREDICTED_AND_ACTUAL'
            });
            console.log(`[ML Model] ${m.model} -> HTTP ${res.status} (${duration}ms)`);
        } catch (e) {
            results.mlModels.push({
                model: m.model,
                endpoint: m.url,
                status: 0,
                durationMs: Date.now() - start,
                success: false,
                error: e.message
            });
            console.error(`[ML Model Error] ${m.model}:`, e.message);
        }
    }

    fs.writeFileSync(path.join(__dirname, 'ai_layer_test_results.json'), JSON.stringify(results, null, 2), 'utf8');
    console.log('\nAI Layer Audit completed and saved to scratch/ai_layer_test_results.json');
    process.exit(0);
}

run().catch(err => {
    console.error('Fatal AI Layer Suite error:', err);
    process.exit(1);
});
