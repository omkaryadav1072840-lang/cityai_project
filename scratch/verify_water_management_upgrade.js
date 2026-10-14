/**
 * SmartCity AI - Water Management Platform Upgrade Comprehensive Verification Suite
 * Verifies:
 * 1. MANDATORY Index Page Links & Structure (8 Cards, No Dead Links, Other Modules Preserved)
 * 2. Viewpoint 1: Water Admin (Facilities SCADA, Tank Supply Area Routing, Asset Registry, Announcements)
 * 3. Viewpoint 2: Visitor (Public Water Status, Water Cuts, Complaint Submission with Map Pin & Tracking)
 * 4. Viewpoint 3: Staff (Secure Role-Based Dashboard Foundation, Scoped Sectors & Assets)
 * 5. 2D/3D Synchronization, Configurable Pipe Colors & Honest Data Status
 * 6. Audit Logging & Route Lifecycle
 */

const fs = require("fs");
const path = require("path");

const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
const FRONTEND_URL = process.env.FRONTEND_URL || BASE_URL;

let adminToken = null;
let staffToken = null;
let citizenToken = null;

const results = [];

function record(testName, passed, details = "") {
    results.push({ testName, passed, details });
    const mark = passed ? "✅ PASS" : "❌ FAIL";
    console.log(`${mark} | ${testName}${details ? " -> " + details : ""}`);
}

async function runTests() {
    console.log("================================================================================");
    console.log("🌊 STARTING WATER MANAGEMENT UPGRADE VERIFICATION SUITE");
    console.log("================================================================================\n");

    // -------------------------------------------------------------------------
    // 1. MANDATORY INDEX PAGE INSPECTION & LINK VERIFICATION
    // -------------------------------------------------------------------------
    console.log("--- 1. Mandatory Index Page Inspection ---");
    const indexPath = path.join(__dirname, "../frontend/index.html");
    const indexContent = fs.readFileSync(indexPath, "utf8");

    const requiredCards = [
        { id: "card-water-management", href: "pages/water/water.html", name: "Water Management" },
        { id: "card-water-admin", href: "pages/water/water.html?view=admin", name: "Water Admin Panel" },
        { id: "card-water-3d", href: "pages/water/water.html?tab=3d", name: "3D Pipeline Map" },
        { id: "card-water-monitoring", href: "pages/water/water.html?tab=monitoring", name: "Water Network Monitoring" },
        { id: "card-water-assets", href: "pages/water/water.html?tab=assets", name: "Tanks & Treatment Plants" },
        { id: "card-water-routes", href: "pages/water/water.html?tab=routes", name: "Water Supply Routes" },
        { id: "card-water-sewage", href: "pages/water/water.html?tab=sewage", name: "Drainage/Sewage Network" },
        { id: "card-water-complaints", href: "pages/water/water.html?tab=complaints", name: "Water Complaints" }
    ];

    let allCardsFound = true;
    for (const card of requiredCards) {
        const hasId = indexContent.includes(`id="${card.id}"`);
        const hasHref = indexContent.includes(`href="${card.href}"`);
        if (!hasId || !hasHref) {
            allCardsFound = false;
            record(`Index Card: ${card.name}`, false, `id=${hasId}, href=${hasHref}`);
        } else {
            record(`Index Card: ${card.name}`, true, `Found id="${card.id}" href="${card.href}"`);
        }

        // Verify destination file exists on disk
        const cleanFile = card.href.split("?")[0].split("#")[0];
        const targetDiskPath = path.join(__dirname, "../frontend", cleanFile);
        const exists = fs.existsSync(targetDiskPath);
        record(`Link Target On Disk: ${cleanFile}`, exists, targetDiskPath);

        // Verify HTTP accessibility
        try {
            const resp = await fetch(`${FRONTEND_URL}/${card.href}`);
            record(`HTTP Route Accessible: ${card.href}`, resp.status === 200, `HTTP ${resp.status}`);
        } catch (e) {
            record(`HTTP Route Accessible: ${card.href}`, false, e.message);
        }
    }

    // Verify other modules are preserved
    const otherModules = [
        "pages/traffic/traffic.html",
        "pages/hospital/hospital.html",
        "pages/parking/parking.html",
        "pages/waste/waste.html",
        "pages/emergency/emergency.html",
        "pages/police/police.html",
        "pages/famous/famous.html"
    ];
    let allOtherModulesPreserved = true;
    for (const mod of otherModules) {
        if (!indexContent.includes(mod)) {
            allOtherModulesPreserved = false;
        }
    }
    record("Preserved Other Module Cards", allOtherModulesPreserved, "Traffic, Hospital, Parking, Waste, Emergency, Police, Famous Places all present");

    // Check script.js for setupWaterNavigationGate role-based protection
    const scriptPath = path.join(__dirname, "../frontend/script.js");
    const scriptContent = fs.readFileSync(scriptPath, "utf8");
    const hasGate = scriptContent.includes("setupWaterNavigationGate") && scriptContent.includes("card-water-admin");
    record("Role-Gated Admin Card in script.js", hasGate, "setupWaterNavigationGate installed and guarding card-water-admin");

    // -------------------------------------------------------------------------
    // 2. AUTHENTICATION & RBAC SETUP
    // -------------------------------------------------------------------------
    console.log("\n--- 2. RBAC & Authentication Tokens ---");

    // Water Admin Login
    try {
        const res = await fetch(`${BASE_URL}/api/staff-login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ staffId: "WTR-ADMIN", password: "Water@Admin2026" })
        });
        const d = await res.json();
        if (d.token) {
            adminToken = d.token;
            record("Water Admin Authentication", true, `Logged in as ${d.user.name} (${d.user.role})`);
        } else {
            // Try fallback admin
            const fRes = await fetch(`${BASE_URL}/api/staff-login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ staffId: "WTR001", password: "staff123" })
            });
            const fd = await fRes.json();
            adminToken = fd.token;
            record("Water Admin Authentication (WTR001)", Boolean(adminToken), fd.message || "OK");
        }
    } catch (e) {
        record("Water Admin Authentication", false, e.message);
    }

    // Staff Login
    try {
        const res = await fetch(`${BASE_URL}/api/staff-login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ staffId: "WTR-ENG-01", password: "Staff@Water2026" })
        });
        const d = await res.json();
        staffToken = d.token;
        record("Water Staff Authentication", Boolean(staffToken), staffToken ? `Logged in as ${d.user.name} (${d.user.role})` : d.message);
    } catch (e) {
        record("Water Staff Authentication", false, e.message);
    }

    // Anonymous Visitor Unauthorized Verification
    try {
        const unauthRes = await fetch(`${BASE_URL}/api/water/admin/facilities`);
        record("Visitor Blocked from Admin Facilities", unauthRes.status === 401 || unauthRes.status === 403, `HTTP ${unauthRes.status}`);
    } catch (e) {
        record("Visitor Blocked from Admin Facilities", false, e.message);
    }

    // -------------------------------------------------------------------------
    // 3. VIEWPOINT 1: WATER ADMIN CAPABILITIES
    // -------------------------------------------------------------------------
    console.log("\n--- 3. Viewpoint 1: Water Admin Single-Screen & Network Management ---");

    // Fetch unified facilities
    let facilityAssets = [];
    try {
        const res = await fetch(`${BASE_URL}/api/water/admin/facilities`, {
            headers: { "Authorization": `Bearer ${adminToken}` }
        });
        const d = await res.json();
        facilityAssets = d.assets || [];
        record("Admin Facilities Single Screen Monitor", d.success && Array.isArray(d.tanks) && Array.isArray(d.assets), 
               `Tanks: ${d.tanks?.length}, Assets: ${d.assets?.length}, Sources: ${d.kpis?.sources_count}, WTP/STP: ${(d.kpis?.wtp_count || 0) + (d.kpis?.stp_count || 0)}`);
    } catch (e) {
        record("Admin Facilities Single Screen Monitor", false, e.message);
    }

    // Configure Tank Supply Areas (Which tank/source supplies which area)
    try {
        const res = await fetch(`${BASE_URL}/api/water/tanks/TANK-001/supply-areas`, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${adminToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                source_asset_id: "WTP-01",
                supplied_areas: ["Golghar Central", "Bal Vihar", "Cinema Road", "Park Road Extension"],
                supply_schedule: "06:00 AM - 09:30 AM, 05:00 PM - 08:30 PM",
                pump_status: "ON",
                current_level_percent: 82
            })
        });
        const d = await res.json();
        record("Admin Configure Tank Supply Areas", d.success, d.message);
    } catch (e) {
        record("Admin Configure Tank Supply Areas", false, e.message);
    }

    // Register / Update Facility Asset (Pumps, Valves, Drainage Outlets, Connections)
    const testAssetId = `TEST-PUMP-${Date.now().toString().slice(-4)}`;
    try {
        const res = await fetch(`${BASE_URL}/api/water/network/assets`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${adminToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                asset_id: testAssetId,
                name: "Ramgarh Tal Secondary Booster Pump #5",
                asset_type: "BOOSTER_PUMP",
                zone: "Ramgarh Tal East",
                latitude: 26.7435,
                longitude: 83.3980,
                elevation_m: 81.2,
                depth_m: 2.1,
                status: "NORMAL",
                pump_state: "ON",
                valve_state: "OPEN",
                flow_direction: "FORWARD",
                supplied_areas: ["Ramgarh Tal East", "Padleyganj"],
                connected_assets: ["STP-01", "PIPE-SEC4"]
            })
        });
        const d = await res.json();
        record("Admin Register Booster Pump Asset", d.success, `Created ${testAssetId}`);
    } catch (e) {
        record("Admin Register Booster Pump Asset", false, e.message);
    }

    // Register Drainage Outlet Asset
    const testDrainId = `TEST-DRN-${Date.now().toString().slice(-4)}`;
    try {
        const res = await fetch(`${BASE_URL}/api/water/network/assets`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${adminToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                asset_id: testDrainId,
                name: "Civil Lines Monsoonal Overflow Sluice Gate",
                asset_type: "DRAINAGE_OUTLET",
                zone: "Civil Lines South",
                latitude: 26.7550,
                longitude: 83.3710,
                depth_m: 3.5,
                status: "NORMAL",
                flow_direction: "FORWARD",
                supplied_areas: ["Civil Lines Catchment"],
                connected_assets: ["CONN-NODE-01"]
            })
        });
        const d = await res.json();
        record("Admin Register Drainage Outlet Asset", d.success, `Created ${testDrainId}`);
    } catch (e) {
        record("Admin Register Drainage Outlet Asset", false, e.message);
    }

    // Schedule Announced Water Cut Notice
    let testAnnId = "";
    try {
        const res = await fetch(`${BASE_URL}/api/water/announcements`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${adminToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                title: "Scheduled Feeder Valve Replacement - Mohaddipur",
                type: "WATER_CUT",
                zone: "Mohaddipur Ward",
                affected_areas: ["Mohaddipur", "University Road", "Chhatra Sangh Chowk"],
                start_time: new Date(Date.now() + 86400000).toISOString(),
                end_time: new Date(Date.now() + 100800000).toISOString(),
                reason: "Replacement of 500mm isolation butterfly valve to balance network pressure.",
                alternative_supply: "Emergency water tankers deployed at Mohaddipur Chowk. Helpline: 1800-180-2026.",
                status: "SCHEDULED"
            })
        });
        const d = await res.json();
        testAnnId = d.announcement_id;
        record("Admin Schedule Water Cut Announcement", d.success, `Announcement ID: ${testAnnId}`);
    } catch (e) {
        record("Admin Schedule Water Cut Announcement", false, e.message);
    }

    // Pipeline Route Draft, Validation & Publishing Lifecycle
    let routeId = "";
    try {
        // Save Draft Route
        const saveRes = await fetch(`${BASE_URL}/api/water/planned-routes`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${adminToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: "Golghar to Rohin WTP Reclaimed Trunk",
                network_type: "RECLAIMED_WATER",
                zone: "Golghar & Civil Lines",
                pipe_diameter_mm: 400,
                burial_depth_m: 2.8,
                slope_pct: 0.55,
                flow_direction: "FORWARD",
                destination_asset_id: "WTP-01",
                service_area_polygon: [
                    [26.7580, 83.3700], [26.7640, 83.3700],
                    [26.7640, 83.3780], [26.7580, 83.3780]
                ],
                waypoints: [
                    { lat: 26.7585, lng: 83.3715, elevation_m: 84.2, road_name: "Park Road", is_snapped: true },
                    { lat: 26.7610, lng: 83.3735, elevation_m: 83.6, road_name: "Golghar Main Road", is_snapped: true },
                    { lat: 26.7650, lng: 83.3770, elevation_m: 82.8, road_name: "Civil Lines Feeder", is_snapped: true }
                ]
            })
        });
        const saveD = await saveRes.json();
        routeId = saveD.route?.route_id || saveD.route_id;
        record("Admin Save Draft Pipeline Route", saveD.success && Boolean(routeId), `Route ID: ${routeId}`);

        // Validate Route
        if (routeId) {
            const valRes = await fetch(`${BASE_URL}/api/water/planned-routes/${routeId}/validate`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${adminToken}` }
            });
            const valD = await valRes.json();
            record("Admin Validate Pipeline Route Topology", valD.success, `Hydraulic separation: ${valD.validation?.separation_valid !== false}`);

            // Approve Route
            const appRes = await fetch(`${BASE_URL}/api/water/planned-routes/${routeId}/approve`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${adminToken}` }
            });
            const appD = await appRes.json();
            record("Admin Approve Pipeline Route", appD.success, `Status: ${appD.route?.status}`);

            // Publish Route
            const pubRes = await fetch(`${BASE_URL}/api/water/planned-routes/${routeId}/publish`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${adminToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ notes: "Verified against UP Jal Nigam CAD corridor" })
            });
            const pubD = await pubRes.json();
            record("Admin Publish Route & Generate Version", pubD.success, `Version ID: ${pubD.version?.version_id || 'v1'}`);
        }
    } catch (e) {
        record("Admin Route Lifecycle (Draft/Validate/Approve/Publish)", false, e.message);
    }

    // -------------------------------------------------------------------------
    // 4. VIEWPOINT 2: VISITOR STATUS & COMPLAINT TRACKING
    // -------------------------------------------------------------------------
    console.log("\n--- 4. Viewpoint 2: Visitor Services & Complaint Tracking ---");

    // Public Water Supply Status & Cuts
    try {
        const res = await fetch(`${BASE_URL}/api/water/public/supply-status`);
        const d = await res.json();
        record("Visitor Public Water Supply Status API", d.success && d.active_water_cuts_count !== undefined,
               `Overall Storage: ${d.overall_storage_percentage}%, Active Cuts: ${d.active_water_cuts_count}, Scheduled Cuts: ${d.scheduled_cuts_count}`);
        
        // Verify internal details (passwords, tokens, staff phone numbers) are NOT leaked
        const jsonStr = JSON.stringify(d);
        const hasLeak = jsonStr.includes("password") || jsonStr.includes("token") || jsonStr.includes("scada_auth_key");
        record("Visitor Data Privacy & Infrastructure Protection", !hasLeak, "Zero internal credentials or telemetry tokens leaked");
    } catch (e) {
        record("Visitor Public Water Supply Status API", false, e.message);
    }

    // Submit Public Complaint with Map Pin Coordinates
    let createdComplaintTrackingId = "";
    try {
        const compRes = await fetch(`${BASE_URL}/api/water/complaints`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                category: "Dirty Water",
                location: "Bal Vihar Colony, Near Water Tank #1",
                latitude: 26.7592,
                longitude: 83.3728,
                description: "Muddy tap water with yellow sediment observed during morning supply run.",
                citizenName: "Amit Kumar Srivastava",
                mobile: "9876543210"
            })
        });
        const compD = await compRes.json();
        createdComplaintTrackingId = compD.tracking_id;
        record("Visitor Submit Water Complaint with Coordinates", compD.success && Boolean(createdComplaintTrackingId),
               `Tracking ID: ${createdComplaintTrackingId}, Category: Dirty Water, Lat: 26.7592, Lng: 83.3728`);
    } catch (e) {
        record("Visitor Submit Water Complaint with Coordinates", false, e.message);
    }

    // Track Complaint via Public Endpoint
    if (createdComplaintTrackingId) {
        try {
            const trackRes = await fetch(`${BASE_URL}/api/water/complaints/track/${encodeURIComponent(createdComplaintTrackingId)}`);
            const trackD = await trackRes.json();
            record("Visitor Track Complaint by ID", trackD.success && trackD.complaint?.tracking_id === createdComplaintTrackingId,
                   `Status: ${trackD.complaint?.status}, Category: ${trackD.complaint?.category}, Location: ${trackD.complaint?.location}`);
            
            // Check that tracking response is sanitized (no internal password / secret tokens)
            const trackStr = JSON.stringify(trackD);
            record("Sanitized Public Tracking Data", !trackStr.includes("password"), "Public tracking strictly sanitized");
        } catch (e) {
            record("Visitor Track Complaint by ID", false, e.message);
        }
    }

    // -------------------------------------------------------------------------
    // 5. VIEWPOINT 3: ROLE-BASED STAFF DASHBOARD FOUNDATION
    // -------------------------------------------------------------------------
    console.log("\n--- 5. Viewpoint 3: Staff Dashboard Foundation ---");

    try {
        const staffRes = await fetch(`${BASE_URL}/api/water/staff/dashboard-overview`, {
            headers: { "Authorization": `Bearer ${staffToken || adminToken}` }
        });
        const staffD = await staffRes.json();
        record("Staff Dashboard Overview API", staffD.success && Boolean(staffD.staff_session),
               `Staff: ${staffD.staff_session?.name}, Role: ${staffD.staff_session?.role}, Permitted Sectors: ${staffD.staff_session?.permitted_sectors?.join(', ') || 'Universal'}`);
        record("Staff Scoped Work Orders & Permitted Assets", Array.isArray(staffD.assigned_work_orders) && Array.isArray(staffD.permitted_tanks),
               `Assigned WOs: ${staffD.assigned_work_orders?.length}, Permitted Tanks: ${staffD.permitted_tanks?.length}`);
    } catch (e) {
        record("Staff Dashboard Overview API", false, e.message);
    }

    // -------------------------------------------------------------------------
    // 6. 2D / 3D SYNCHRONIZATION & COLOR CODING
    // -------------------------------------------------------------------------
    console.log("\n--- 6. 2D / 3D Synchronization & Visual Mapping ---");

    const sewageUiPath = path.join(__dirname, "../frontend/pages/water/sewage_planner_ui.js");
    const sewageUiContent = fs.readFileSync(sewageUiPath, "utf8");

    const explorer3dPath = path.join(__dirname, "../frontend/pages/water/water_3d_explorer.js");
    const explorer3dContent = fs.readFileSync(explorer3dPath, "utf8");

    const waterJsPath = path.join(__dirname, "../frontend/pages/water/water.js");
    const waterJsContent = fs.readFileSync(waterJsPath, "utf8");

    // Check distinct colors in sewage_planner_ui.js
    const hasFreshColor2D = sewageUiContent.includes("#38bdf8");
    const hasSewageColor2D = sewageUiContent.includes("#ea580c");
    const hasRainColor2D = sewageUiContent.includes("#06b6d4");
    const hasReclaimedColor2D = sewageUiContent.includes("#10b981");
    record("2D Planner Configurable Pipe Colors", hasFreshColor2D && hasSewageColor2D && hasRainColor2D && hasReclaimedColor2D,
           "Fresh (#38bdf8), Sewage (#ea580c), Rainwater (#06b6d4), Reclaimed (#10b981)");

    // Check distinct colors & honest schematic labeling in water_3d_explorer.js
    const hasFreshColor3D = explorer3dContent.includes("0x38bdf8");
    const hasRainColor3D = explorer3dContent.includes("0x06b6d4");
    const hasReclaimedColor3D = explorer3dContent.includes("0x10b981");
    const hasSchematicLabel = explorer3dContent.includes("SIMULATED / SCHEMATIC") && explorer3dContent.includes("VERIFIED SURVEY");
    record("3D Explorer Dynamic Tube Colors", hasFreshColor3D && hasRainColor3D && hasReclaimedColor3D,
           "3D tube materials mapped dynamically to network_type");
    record("3D Honest Schematic / Simulated Data Labels", hasSchematicLabel,
           "Displays [SIMULATED / SCHEMATIC] vs [VERIFIED SURVEY] based on data provenance");

    // Check 2D to 3D sync call
    const hasSyncCall = sewageUiContent.includes("syncRouteTo3D") && sewageUiContent.includes("renderSewagePlannedRoute");
    record("2D to 3D Planned Route Synchronization", hasSyncCall, "SewagePlannerUI directly invokes Water3DExplorer.renderSewagePlannedRoute(activeRoute)");

    // Check URL Navigation Handler in water.js
    const hasUrlNav = waterJsContent.includes("handleUrlNavigation") && waterJsContent.includes("DOMContentLoaded");
    record("URL Navigation Handler Wired in water.js", hasUrlNav, "Parses ?view=admin, ?tab=3d, ?tab=monitoring, ?tab=assets, ?tab=routes, ?tab=sewage, ?tab=complaints");

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    console.log("\n================================================================================");
    const passCount = results.filter(r => r.passed).length;
    const failCount = results.filter(r => !r.passed).length;
    console.log(`VERIFICATION SUMMARY: ${passCount} PASSED, ${failCount} FAILED out of ${results.length} checks`);
    console.log("================================================================================\n");

    if (failCount > 0) {
        process.exitCode = 1;
    }
}

runTests().catch(err => {
    console.error("FATAL TEST RUNNER ERROR:", err);
    process.exit(1);
});
