// Native fetch is global in Node 18+
const db = require('../backend/config/db');

async function testInactiveHospitalStaffLogin() {
    const p = db.promise();
    console.log("Setting HOSP-002 temporarily to Inactive...");
    await p.query("UPDATE hospitals SET status = 'Inactive' WHERE hospital_id = 'HOSP-002'");

    try {
        const res = await fetch("http://localhost:5000/api/staff-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ staffId: "STAFF-BRD-ADMIN", password: "admin" })
        });
        const data = await res.json();
        console.log(`Login response status: ${res.status}, message: ${data.message}`);
        
        if (res.status === 403 && data.message.includes("inactive")) {
            console.log("✅ PASS: Inactive Hospital Staff Login correctly rejected with 403 Forbidden!");
        } else {
            console.log("❌ FAIL: Inactive Hospital Staff Login was not rejected as expected.");
        }
    } finally {
        console.log("Restoring HOSP-002 back to Operational...");
        await p.query("UPDATE hospitals SET status = 'Operational' WHERE hospital_id = 'HOSP-002'");
        console.log("HOSP-002 restored.");
        process.exit(0);
    }
}

testInactiveHospitalStaffLogin().catch(err => {
    console.error(err);
    process.exit(1);
});
