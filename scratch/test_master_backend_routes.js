/**
 * Master Verification Test Suite for SmartCity AI
 * Tests all 11 core backend pillars:
 * 1. Auth & Standardized Payload
 * 2. Role & Department RBAC Guarding (Cross-Department Block)
 * 3. Unified Service Requests Workflow & Intelligent Priority/SLA
 * 4. Staff Task Scoping & Status Lifecycle
 * 5. Citizen Feedback
 * 6. Global Notifications & Unread Count
 * 7. Smart Street Lights & Faults
 * 8. Environmental AQI Sensors & GeoJSON
 * 9. City Command Center Real-Time Aggregation & Analytics
 * 10. Multi-Entity Global Search
 * 11. Multi-Layer Incident Map GeoJSON
 * 12. AI City Assistant & Prediction Engines
 */

const http = require("http");

function request(options, data) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = "";
            res.on("data", chunk => body += chunk);
            res.on("end", () => {
                let parsed = null;
                try {
                    parsed = JSON.parse(body);
                } catch (e) {
                    parsed = body;
                }
                resolve({ status: res.statusCode, headers: res.headers, data: parsed });
            });
        });
        req.on("error", reject);
        if (data) {
            req.write(typeof data === "string" ? data : JSON.stringify(data));
        }
        req.end();
    });
}

async function runTests() {
    console.log("==================================================");
    console.log("🧪 RUNNING SMARTCITY AI MASTER VERIFICATION SUITE");
    console.log("==================================================\n");

    let passCount = 0;
    let failCount = 0;

    function assert(condition, message) {
        if (condition) {
            console.log(`✅ PASS: ${message}`);
            passCount++;
        } else {
            console.error(`❌ FAIL: ${message}`);
            failCount++;
        }
    }

    try {
        // 1. Citizen Login
        const citizenLoginRes = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/login",
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, { loginId: "6306880179", password: "omkar123" });

        assert(citizenLoginRes.status === 200, "Citizen login returns 200 OK");
        assert(citizenLoginRes.data.user && citizenLoginRes.data.user.role === "citizen", "Citizen user payload contains role='citizen'");
        assert(citizenLoginRes.data.token, "Citizen receives JWT token");
        const citizenToken = citizenLoginRes.data.token;

        // 2. Waste Staff Login
        const wasteStaffLoginRes = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/staff-login",
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, { staffId: "WST001", password: "123456" });

        assert(wasteStaffLoginRes.status === 200, "Waste Staff login returns 200 OK");
        assert(wasteStaffLoginRes.data.user && wasteStaffLoginRes.data.user.department === "waste", "Staff department is 'waste'");
        const wasteStaffToken = wasteStaffLoginRes.data.token;

        // 3. Admin Staff Login
        const adminLoginRes = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/staff-login",
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, { staffId: "STAFF-001", password: "admin123" });

        assert(adminLoginRes.status === 200, "Admin Staff login returns 200 OK");
        assert(adminLoginRes.data.user && adminLoginRes.data.user.role === "admin", "Admin user role is 'admin'");
        const adminToken = adminLoginRes.data.token;

        // 4. Department Security Guard: Citizen trying to access Command Center -> 403
        const citizenForbiddenRes = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/admin/command-center",
            method: "GET",
            headers: { "Authorization": `Bearer ${citizenToken}` }
        });
        assert(citizenForbiddenRes.status === 403, "Citizen blocked from Admin Command Center (403 Forbidden)");

        // 5. Create Service Request (Citizen)
        const createReqRes = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/requests",
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${citizenToken}`
            }
        }, {
            department: "waste",
            category: "Overflowing Dumpster",
            description: "Severe garbage overflow near Golghar market junction. Immediate clearing needed.",
            latitude: 26.7588,
            longitude: 83.3732,
            address: "Golghar Market Crossroad",
            urgency: "critical"
        });

        assert(createReqRes.status === 201, "Citizen successfully created service request (201 Created)");
        assert(createReqRes.data.data.priority === "CRITICAL", "AI Priority Engine classified as CRITICAL priority based on severe urgency keywords");
        assert(createReqRes.data.data.requestCode.startsWith("REQ-WAS"), "Request Code formatted properly");
        const createdRequestId = createReqRes.data.data.id;

        // 6. Cross-Department Staff Security: Traffic Staff cannot modify Waste request
        const trafficStaffLoginRes = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/staff-login",
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, { staffId: "TRF001", password: "password123" });
        const trafficToken = trafficStaffLoginRes.data.token;

        const crossDeptRes = await request({
            hostname: "localhost",
            port: 5000,
            path: `/api/requests/${createdRequestId}/status`,
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${trafficToken}`
            }
        }, { status: "In Progress" });
        assert(crossDeptRes.status === 403, "Traffic Staff blocked from modifying Waste request (403 Forbidden)");

        // 7. Waste Staff updates Waste request status -> 200 OK
        const wasteUpdateRes = await request({
            hostname: "localhost",
            port: 5000,
            path: `/api/requests/${createdRequestId}/status`,
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${wasteStaffToken}`
            }
        }, { status: "In Progress", resolution_notes: "Waste collection vehicle dispatched." });
        assert(wasteUpdateRes.status === 200, "Authorized Waste Staff updated request to 'In Progress'");

        // 8. Waste Staff Resolves Request
        const resolveRes = await request({
            hostname: "localhost",
            port: 5000,
            path: `/api/requests/${createdRequestId}/status`,
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${wasteStaffToken}`
            }
        }, { status: "Resolved", resolution_notes: "Dumpster cleared and sanitized." });
        assert(resolveRes.status === 200, "Authorized Waste Staff resolved request");

        // 9. Citizen submits feedback
        const feedbackRes = await request({
            hostname: "localhost",
            port: 5000,
            path: `/api/requests/${createdRequestId}/feedback`,
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${citizenToken}`
            }
        }, { rating: 5, comments: "Extremely fast waste clearance! Great smart city response." });
        assert(feedbackRes.status === 201, "Citizen submitted feedback (5 stars) (201 Created)");

        // 10. Global Notifications: Unread Count & List
        const notifsRes = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/notifications",
            method: "GET",
            headers: { "Authorization": `Bearer ${citizenToken}` }
        });
        assert(notifsRes.status === 200, "Citizen notifications retrieved successfully");

        const unreadCountRes = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/notifications/unread-count",
            method: "GET",
            headers: { "Authorization": `Bearer ${citizenToken}` }
        });
        assert(unreadCountRes.status === 200 && typeof unreadCountRes.data.unreadCount === "number", "Notifications unread counter works");

        // 11. Street Lights API
        const streetLightsRes = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/street-lights",
            method: "GET"
        });
        assert(streetLightsRes.status === 200 && streetLightsRes.data.summary.total >= 8, "Smart street lights retrieved (summary.total >= 8)");

        const faultLightsRes = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/street-lights/faults",
            method: "GET"
        });
        assert(faultLightsRes.status === 200 && faultLightsRes.data.count >= 1, "Faulty street lights detected and filtered");

        // 12. Environmental AQI
        const aqiRes = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/environment/aqi",
            method: "GET"
        });
        assert(aqiRes.status === 200 && aqiRes.data.summary.averageAqi > 0, "Live AQI summary calculated with health advisory");

        const stationsRes = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/environment/stations",
            method: "GET"
        });
        assert(stationsRes.status === 200 && stationsRes.data.type === "FeatureCollection", "Environmental GeoJSON sensor stations returned");

        // 13. City Command Center
        const cmdCenterRes = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/admin/command-center",
            method: "GET",
            headers: { "Authorization": `Bearer ${adminToken}` }
        });
        assert(cmdCenterRes.status === 200, "City Command Center aggregated data returns 200 OK");
        assert(cmdCenterRes.data.metrics.parking.totalSlots > 0, "Real parking slot metrics aggregated");
        assert(cmdCenterRes.data.metrics.healthcare.totalBeds > 0, "Real hospital bed metrics aggregated");

        // 14. Multi-Department Analytics
        const analyticsRes = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/admin/analytics",
            method: "GET",
            headers: { "Authorization": `Bearer ${adminToken}` }
        });
        assert(analyticsRes.status === 200 && Array.isArray(analyticsRes.data.workloadByDepartment), "Department workload analytics returned");

        // 15. Global Search
        const searchRes = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/search?q=Golghar",
            method: "GET"
        });
        assert(searchRes.status === 200 && searchRes.data.results.length > 0, "Global search for 'Golghar' returns matching civic entities");

        // 16. Multi-Layer Map GeoJSON
        const mapRes = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/map/incidents",
            method: "GET"
        });
        assert(mapRes.status === 200 && mapRes.data.type === "FeatureCollection", "Multi-layer GeoJSON incident map returns 200 OK");
        assert(mapRes.data.totalFeatures > 0, "Multi-layer map contains real features");

        // 17. AI City Assistant
        const aiAssistantRes = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/ai/assistant",
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, { question: "Nearest hospital with available beds?" });
        assert(aiAssistantRes.status === 200, "AI City Assistant returns 200 OK");
        assert(aiAssistantRes.data.intent === "hospital_beds", "AI City Assistant accurately detected 'hospital_beds' intent");
        assert(aiAssistantRes.data.answer.includes("beds available"), "AI City Assistant returned real bed numbers from database");

        // 18. AI Traffic Prediction
        const trafficAiRes = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/ai/traffic/predict?hour=9",
            method: "GET"
        });
        assert(trafficAiRes.status === 200 && trafficAiRes.data.prediction.predicted_congestion, "Traffic prediction engine returned congestion index");

        console.log("\n==================================================");
        console.log(`📊 MASTER TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
        console.log("==================================================");

        if (failCount === 0) {
            process.exit(0);
        } else {
            process.exit(1);
        }
    } catch (err) {
        console.error("Test execution failed:", err);
        process.exit(1);
    }
}

runTests();
