/**
 * SmartCity AI - Waste Management Comprehensive Test Suite
 * Validates Citizen, Staff, Admin, RBAC, CRUD, Analytics, and Priority features.
 */

const API_BASE = "http://localhost:5000";

async function runTests() {
    console.log("🧪 Starting Waste Management Integration Tests...\n");
    let passed = 0;
    let failed = 0;

    async function test(name, fn) {
        try {
            await fn();
            console.log(`  ✅ PASS: ${name}`);
            passed++;
        } catch (err) {
            console.error(`  ❌ FAIL: ${name} -> ${err.message}`);
            failed++;
        }
    }

    let citizenToken = null;
    let citizenUser = null;
    let staffToken = null;
    let staffUser = null;
    let testRequestId = null;
    let testRequestCode = null;

    // 1. Citizen Login
    await test("Citizen Login", async () => {
        const res = await fetch(`${API_BASE}/api/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ loginId: "6306880179", password: "omkar123" })
        });
        const data = await res.json();
        if (!res.ok || !data.token) throw new Error(data.message || "Failed to login as citizen");
        citizenToken = data.token;
        citizenUser = data.user;
    });

    // 2. Staff Login (WST001)
    await test("Staff Login (WST001)", async () => {
        const res = await fetch(`${API_BASE}/api/staff-login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ staffId: "WST001", password: "123456" })
        });
        const data = await res.json();
        if (!res.ok || !data.token) throw new Error(data.message || "Failed to login as staff");
        staffToken = data.token;
        staffUser = data.user;
        if (staffUser.department !== "waste") throw new Error("Staff department is not waste");
    });

    // 3. Public Bins API
    await test("Get Public Smart Bins", async () => {
        const res = await fetch(`${API_BASE}/api/waste/bins`);
        const data = await res.json();
        if (!res.ok || !data.success || !Array.isArray(data.bins)) throw new Error("Invalid response");
        if (data.bins.length === 0) throw new Error("No bins returned");
    });

    // 4. Citizen Submit Waste Report
    await test("Citizen Submit Waste Report", async () => {
        const res = await fetch(`${API_BASE}/api/waste/reports`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${citizenToken}`
            },
            body: JSON.stringify({
                category: "Garbage Dump",
                wasteType: "Plastic Waste",
                location: "Golghar Market Square",
                latitude: 26.7606,
                longitude: 83.3732,
                description: "Huge pile of uncollected plastic bottles and garbage near main market gate."
            })
        });
        const data = await res.json();
        if (!res.ok || !data.success || !data.request) throw new Error(data.message || "Report failed");
        testRequestId = data.request.id;
        testRequestCode = data.request.requestCode;
        if (!testRequestCode.startsWith("REQ-WAS-")) throw new Error("Invalid request code format");
    });

    // 5. Citizen Submit Scheduled Pickup
    await test("Citizen Submit Scheduled Pickup", async () => {
        const res = await fetch(`${API_BASE}/api/waste/pickups`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${citizenToken}`
            },
            body: JSON.stringify({
                wasteType: "Dry Waste",
                pickupDate: "2026-09-22",
                pickupTime: "10:00 AM - 12:00 PM",
                location: "Civil Lines, Gorakhpur",
                description: "Old newspapers and cardboard packaging pickup."
            })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || "Pickup failed");
    });

    // 6. Citizen My Requests
    await test("Citizen View My Requests", async () => {
        const res = await fetch(`${API_BASE}/api/waste/my-requests`, {
            headers: { "Authorization": `Bearer ${citizenToken}` }
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error("My requests failed");
        if (!data.reports.some(r => r.request_code === testRequestCode)) {
            throw new Error("Created report not found in citizen my-requests");
        }
    });

    // 7. RBAC Check: Citizen Token rejected on Staff Endpoint
    await test("RBAC: Citizen Access Denied on Staff Requests API", async () => {
        const res = await fetch(`${API_BASE}/api/waste/requests`, {
            headers: { "Authorization": `Bearer ${citizenToken}` }
        });
        if (res.status !== 403) throw new Error(`Expected 403 Forbidden, got ${res.status}`);
    });

    // 8. Staff View Requests
    await test("Staff List Waste Requests", async () => {
        const res = await fetch(`${API_BASE}/api/waste/requests`, {
            headers: { "Authorization": `Bearer ${staffToken}` }
        });
        const data = await res.json();
        if (!res.ok || !data.success || !Array.isArray(data.data)) throw new Error("Staff list failed");
        const found = data.data.find(r => r.request_code === testRequestCode);
        if (!found) throw new Error("Report not visible in staff list");
    });

    // 9. Staff Operational Edit (Assign Worker, Vehicle, Route, Update Status)
    await test("Staff Operational Edit (Assign & In Progress)", async () => {
        const res = await fetch(`${API_BASE}/api/waste/requests/${testRequestId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${staffToken}`
            },
            body: JSON.stringify({
                status: "In Progress",
                priority: "HIGH",
                assigned_worker_id: 1,
                assigned_worker_name: "Ramesh Chandra",
                assigned_vehicle_id: 1,
                assigned_vehicle_number: "UP-53-WM-1001",
                assigned_route_id: 1,
                internal_remarks: "Dispatched compactor truck to clear market garbage.",
                resolution_notes: "Operation underway."
            })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || "Staff edit failed");
        if (data.data.status !== "In Progress") throw new Error("Status was not updated");
        if (data.data.assigned_worker_name !== "Ramesh Chandra") throw new Error("Worker was not assigned");
    });

    // 10. Staff Mark Resolved
    await test("Staff Mark Request Resolved", async () => {
        const res = await fetch(`${API_BASE}/api/waste/requests/${testRequestId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${staffToken}`
            },
            body: JSON.stringify({
                status: "Resolved",
                resolution_notes: "Garbage cleared and sanitized with lime powder."
            })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error("Resolve failed");
        if (data.data.status !== "Resolved") throw new Error("Status is not Resolved");
    });

    // 11. Staff Reopen Request
    await test("Staff Reopen Resolved Request", async () => {
        const res = await fetch(`${API_BASE}/api/waste/requests/${testRequestId}/reopen`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${staffToken}`
            },
            body: JSON.stringify({ reason: "Citizen reported lingering smell, need secondary wash." })
        });
        const data = await res.json();
        if (!res.ok || !data.success || data.status !== "In Progress") throw new Error("Reopen failed");
    });

    // 12. Staff Asset CRUD: Bins
    let createdBinId = null;
    await test("Admin/Staff Create Smart Dustbin", async () => {
        const res = await fetch(`${API_BASE}/api/waste/bins`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${staffToken}`
            },
            body: JSON.stringify({
                name: "Bin - Test Chowk",
                location: "Test Location",
                latitude: 26.7650,
                longitude: 83.3750,
                capacity_liters: 700,
                bin_type: "Recyclable/Dry",
                fill_level: 40
            })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error("Bin creation failed");
        createdBinId = data.bin.id;
    });

    await test("Staff Update Bin Fill Level", async () => {
        const res = await fetch(`${API_BASE}/api/waste/bins/${createdBinId}/fill`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${staffToken}`
            },
            body: JSON.stringify({ fill_level: 92 })
        });
        const data = await res.json();
        if (!res.ok || !data.success || data.status !== "Overflowing") throw new Error("Fill update failed");
    });

    await test("Staff Deactivate Smart Dustbin", async () => {
        const res = await fetch(`${API_BASE}/api/waste/bins/${createdBinId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${staffToken}` }
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error("Delete bin failed");
    });

    // 13. Staff Asset Management: Vehicles, Workers, Routes
    await test("Staff Get Vehicles, Workers, and Routes", async () => {
        const [vRes, wRes, rRes] = await Promise.all([
            fetch(`${API_BASE}/api/waste/vehicles`, { headers: { "Authorization": `Bearer ${staffToken}` } }),
            fetch(`${API_BASE}/api/waste/workers`, { headers: { "Authorization": `Bearer ${staffToken}` } }),
            fetch(`${API_BASE}/api/waste/routes`, { headers: { "Authorization": `Bearer ${staffToken}` } })
        ]);
        const vData = await vRes.json();
        const wData = await wRes.json();
        const rData = await rRes.json();

        if (!vData.success || !wData.success || !rData.success) throw new Error("Asset retrieval failed");
        if (vData.vehicles.length === 0 || wData.workers.length === 0 || rData.routes.length === 0) {
            throw new Error("Asset lists empty");
        }
    });

    // 14. Operations Summary & Analytics
    await test("Staff Operations Summary & Analytics", async () => {
        const [sRes, aRes] = await Promise.all([
            fetch(`${API_BASE}/api/waste/operations/summary`, { headers: { "Authorization": `Bearer ${staffToken}` } }),
            fetch(`${API_BASE}/api/waste/analytics`, { headers: { "Authorization": `Bearer ${staffToken}` } })
        ]);
        const sData = await sRes.json();
        const aData = await aRes.json();
        if (!sData.success || !aData.success) throw new Error("Summary/Analytics failed");
        if (typeof aData.analytics.summary.collectionEfficiency !== "number") throw new Error("Efficiency missing");
    });

    // 15. Hotspots Detection
    await test("Waste Hotspots Detection API", async () => {
        const res = await fetch(`${API_BASE}/api/waste/hotspots`);
        const data = await res.json();
        if (!res.ok || !data.success || !Array.isArray(data.hotspots)) throw new Error("Hotspots failed");
    });

    // 16. Smart Priority Calculation
    await test("Smart Priority Rule Assessment", async () => {
        const res = await fetch(`${API_BASE}/api/waste/smart-priority`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                category: "Overflowing Dumpster",
                wasteType: "Hazardous Chemical Waste",
                fillLevel: 98
            })
        });
        const data = await res.json();
        if (!res.ok || data.priority !== "CRITICAL") throw new Error("Expected CRITICAL priority");
    });

    console.log(`\n==================================================`);
    console.log(`Results: ${passed} Passed, ${failed} Failed.`);
    console.log(`==================================================\n`);
    if (failed > 0) process.exit(1);
}

runTests().then(() => process.exit(0)).catch(err => {
    console.error("Test Suite crashed:", err);
    process.exit(1);
});
