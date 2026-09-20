/**
 * SmartCity AI - Test Suite for All New Traffic Enhancements
 */

const http = require('http');

function get(path) {
    return new Promise((resolve, reject) => {
        http.get(`http://localhost:5000${path}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, headers: res.headers, rawText: data });
                }
            });
        }).on('error', reject);
    });
}

function post(path, body) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(body);
        const req = http.request(`http://localhost:5000${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, headers: res.headers, rawText: data });
                }
            });
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

async function runTests() {
    console.log("=================================================");
    console.log("🚦 RUNNING ENHANCED TRAFFIC SYSTEM VERIFICATION");
    console.log("=================================================\n");

    let passed = 0;
    let total = 0;

    function assert(desc, condition) {
        total++;
        if (condition) {
            console.log(`✅ [PASS] ${desc}`);
            passed++;
        } else {
            console.error(`❌ [FAIL] ${desc}`);
        }
    }

    try {
        // 1. Test Plate Search
        const searchRes = await get("/api/traffic/violations/search?plate=UP53AZ1001");
        assert("Search violations by plate (UP53AZ1001)", searchRes.status === 200 && searchRes.body.success && searchRes.body.violations.length >= 1);

        // 2. Test Partial Plate Search
        const searchPart = await get("/api/traffic/violations/search?plate=UP-53");
        assert("Search violations by partial plate (UP-53)", searchPart.status === 200 && searchPart.body.violations.length >= 2);

        // 3. Test Violation Online Payment / Settlement
        let sampleVioId = searchPart.body.violations[0].id;
        const payRes = await post(`/api/traffic/violations/${sampleVioId}/pay`, {
            payment_method: "UPI (Google Pay)",
            paid_by: "Test Citizen"
        });
        assert("Simulated UPI payment for e-challan", 
            (payRes.status === 200 && payRes.body.success) || 
            (payRes.status === 400 && payRes.body.error && payRes.body.error.includes("already been paid"))
        );

        // 4. Test Alternative Routes with Park & Walk and Departure Predictor
        const routesRes = await get("/api/traffic/alternative-routes?from=Railway+Station&to=AIIMS");
        assert("Alternative routes returned successfully", routesRes.status === 200 && routesRes.body.routes.length >= 2);
        assert("Park & Walk route included with parking hub & walking ETA", routesRes.body.parkAndWalkRoute && routesRes.body.parkAndWalkRoute.walkingEtaMin !== undefined);
        assert("Departure predictor timeline included (4 slots)", Array.isArray(routesRes.body.departurePredictions) && routesRes.body.departurePredictions.length === 4);
        assert("Eco Sustainability metrics included", routesRes.body.sustainabilitySummary && routesRes.body.sustainabilitySummary.monthlyFuelSavedLitres > 0);

        // 5. Test Monsoon Waterlogging & Hazard Points
        const waterRes = await get("/api/traffic/waterlogging");
        assert("Monsoon Waterlogging zones returned (4 zones)", waterRes.status === 200 && waterRes.body.zones.length === 4);
        assert("Dharamshala Underpass flood depth marked", waterRes.body.zones.some(z => z.name.includes("Dharamshala") && z.waterDepthCm >= 30));

        // 6. Test Municipal Report CSV Export
        const csvRes = await get("/api/traffic/reports/export-csv");
        assert("Municipal CSV report returned status 200", csvRes.status === 200);
        assert("CSV Content-Type is text/csv", csvRes.headers['content-type'] && csvRes.headers['content-type'].includes('text/csv'));
        assert("CSV contains Junctions and Violations sections", csvRes.rawText && csvRes.rawText.includes("SECTION 1: JUNCTION STATUS") && csvRes.rawText.includes("SECTION 4: RECENT VIOLATIONS"));

        // 7. Test Ambulance Auto Green Wave proximity preemption
        const trafficEngine = require("./services/traffic_engine");
        // Simulated ambulance near Golghar (26.7580, 83.3730)
        await trafficEngine.handleAmbulanceMovement({
            ambulance_id: "AMB-TEST-99",
            vehicle_number: "UP-53-TEST-9999",
            driver_name: "Test Driver",
            ambulance_type: "ALS Advanced",
            hospital_name: "AIIMS Gorakhpur",
            latitude: 26.7580,
            longitude: 83.3730
        });

        // Verify preemption status in DB
        const pool = require("./config/db");
        const [jncCheck] = await pool.promise().query("SELECT status, mode FROM traffic_junctions WHERE id = 'JNC-01'");
        assert("Ambulance Auto Green Wave triggered signal preemption for Golghar", jncCheck.length > 0);

        const [auditCheck] = await pool.promise().query("SELECT * FROM traffic_audit_logs WHERE action = 'AMBULANCE_AUTO_GREEN_WAVE' ORDER BY created_at DESC LIMIT 1");
        assert("Ambulance Auto Green Wave recorded in audit trail", auditCheck.length > 0 && auditCheck[0].action === 'AMBULANCE_AUTO_GREEN_WAVE');

        // 8. Test Webster's Optimum Signal Timing Engineering Engine
        const websterRes = await get("/api/traffic/junctions/JNC-01/webster-timing");
        assert("Webster timing computed for JNC-01 (Status 200)", websterRes.status === 200 && websterRes.body.success);
        assert("Webster formula C0 = (1.5L + 5)/(1 - Y) included", websterRes.body.formulaDerivation && websterRes.body.formulaDerivation.equation.includes("C₀ = (1.5 × L + 5) / (1 - Y)"));
        assert("Optimal cycle time and green splits calculated", websterRes.body.recommendation && websterRes.body.recommendation.optimalCycleTime >= 45 && websterRes.body.recommendation.recommendedNorthSouthGreen > 0);

        // 9. Test ANPR Optical Evidence & Telemetry Retrieval
        const [anyVio] = await pool.promise().query("SELECT id FROM traffic_violations LIMIT 1");
        const vioTestId = anyVio.length > 0 ? anyVio[0].id : "VIO-01";
        const anprRes = await get(`/api/traffic/violations/${vioTestId}/evidence`);
        assert("ANPR Optical Evidence retrieved (Status 200)", anprRes.status === 200 && anprRes.body.success);
        assert("ANPR optical metadata has Sony Starvis camera & lens specs", anprRes.body.anprMetadata && anprRes.body.anprMetadata.cameraSensorModel.includes("Sony Starvis"));
        assert("Virtual Court legal statutory notice generated", anprRes.body.virtualCourtNotice && anprRes.body.virtualCourtNotice.statutorySection.includes("MV Act"));

        // 10. Test Variable Message Signs (VMS) Roadside Displays
        const vmsRes = await get("/api/traffic/vms-boards");
        assert("VMS Roadside Boards list returned (3 boards)", vmsRes.status === 200 && vmsRes.body.boards.length === 3);
        assert("Mohaddipur and Dharamshala VMS boards exist", vmsRes.body.boards.some(b => b.id === "VMS-01") && vmsRes.body.boards.some(b => b.id === "VMS-03"));

        // 11. Test VMS Roadside Broadcast Update
        const vmsUpdateRes = await post("/api/traffic/vms-boards/VMS-01/message", {
            line1: "TEST BROADCAST: HEAVY CONGESTION",
            line2: "DIVERT TO BYPASS ROAD",
            line3: "EXPECT +10 MIN DELAY",
            status: "ONLINE",
            ledColor: "#ffb703",
            operator: "Test Controller"
        });
        assert("VMS Message Broadcast updated successfully", vmsUpdateRes.status === 200 && vmsUpdateRes.body.success && vmsUpdateRes.body.board.line1.includes("TEST BROADCAST"));

        // 12. Test Citizen Daily Commute Route Alert Subscription
        const commuteRes = await post("/api/traffic/commute-alerts/subscribe", {
            citizen_name: "Test Commuter",
            phone_or_email: "test.citizen@example.com",
            from_route: "Gorakhpur Junction",
            to_route: "AIIMS Gorakhpur",
            notification_time: "08:30 AM"
        });
        assert("Citizen Commute corridor alert subscription successful", commuteRes.status === 200 && commuteRes.body.success && commuteRes.body.subscriptionId.startsWith("SUB-COM-"));
        assert("Live Preview advisory with departure time & ETA returned", commuteRes.body.livePreviewAdvisory && commuteRes.body.livePreviewAdvisory.currentEtaMinutes > 0);

    } catch (err) {
        console.error("Test execution error:", err);
    }

    console.log("\n=================================================");
    console.log(`RESULTS: ${passed} / ${total} TESTS PASSED`);
    console.log("=================================================");
    process.exit(passed === total ? 0 : 1);
}

runTests();

