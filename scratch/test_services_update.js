const http = require('http');

async function runTests() {
    console.log("=== VERIFYING TOURISM SERVICES & MODULE INTEGRATION ===");

    // Test 1: Traffic Analysis
    try {
        const res = await fetch('http://localhost:5000/api/famous-places/1/traffic-analysis');
        const data = await res.json();
        console.log("1. Traffic Analysis API:", data.success ? "PASSED" : "FAILED");
        console.log("   Level:", data.traffic?.level, "Speed:", data.traffic?.averageSpeedKmH + " km/h", "Delay:", data.traffic?.expectedDelay);
    } catch (e) {
        console.error("1. Traffic Analysis API FAILED:", e.message);
    }

    // Test 2: Nearby Services (Hospitals, Parking, ATMs, Food)
    try {
        const res = await fetch('http://localhost:5000/api/famous-places/1/nearby-services');
        const data = await res.json();
        console.log("2. Nearby Services API:", data.success ? "PASSED" : "FAILED");
        const s = data.services;
        console.log("   Hospitals found:", s?.hospitals?.length, "(Nearest:", s?.hospitals?.[0]?.hospital_name, s?.hospitals?.[0]?.distance_km + "km, booking_url:", s?.hospitals?.[0]?.booking_url, ")");
        console.log("   Parking found:", s?.parking?.length, "(Nearest:", s?.parking?.[0]?.name, "slots:", s?.parking?.[0]?.available_slots, "booking_url:", s?.parking?.[0]?.booking_url, ")");
        console.log("   ATMs found:", s?.atms?.length, "(Nearest:", s?.atms?.[0]?.name, s?.atms?.[0]?.distance_km + "km)");
        console.log("   Food found:", s?.food?.length, "(Nearest:", s?.food?.[0]?.name, s?.food?.[0]?.distance_km + "km)");
    } catch (e) {
        console.error("2. Nearby Services API FAILED:", e.message);
    }

    // Test 3: Nearby ATMs API
    try {
        const res = await fetch('http://localhost:5000/api/famous-places/2/nearby-atms');
        const data = await res.json();
        console.log("3. Nearby ATMs API (Ramgarh Taal):", data.success ? "PASSED" : "FAILED");
        console.log("   Total ATMs:", data.atms?.length, "Nearest:", data.atms?.[0]?.bank_name, data.atms?.[0]?.distance_km + "km");
    } catch (e) {
        console.error("3. Nearby ATMs API FAILED:", e.message);
    }

    // Test 4: Nearby Food API
    try {
        const res = await fetch('http://localhost:5000/api/famous-places/2/nearby-food');
        const data = await res.json();
        const foods = data.restaurants || data.food || [];
        console.log("4. Nearby Food API (Ramgarh Taal):", data.success ? "PASSED" : "FAILED");
        console.log("   Total Food Outlets:", foods.length, "Nearest:", foods[0]?.name, foods[0]?.distance_km + "km", "Cuisine:", foods[0]?.cuisine);
    } catch (e) {
        console.error("4. Nearby Food API FAILED:", e.message);
    }

    // Test 5: Total Hospitals in DB
    try {
        const res = await fetch('http://localhost:5000/api/hospitals');
        const data = await res.json();
        console.log("5. Total Hospitals in System:", data.hospitals?.length, data.hospitals?.length >= 17 ? "(PASSED >= 17)" : "(FAILED < 17)");
    } catch (e) {
        console.error("5. Hospitals API FAILED:", e.message);
    }

    console.log("=== ALL API TESTS COMPLETED ===");
}

runTests();
