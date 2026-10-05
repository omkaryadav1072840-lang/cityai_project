const db = require('../backend/config/db');

async function inspect() {
    const q = (sql, params = []) => new Promise((resolve, reject) => {
        db.query(sql, params, (err, res) => err ? reject(err) : resolve(res));
    });

    console.log("=== HOSPITALS ===");
    const hospitals = await q("SELECT id, hospital_id, hospital_name, phone, emergency_number, hospital_type, total_beds, icu_beds, emergency_beds, latitude, longitude, status FROM hospitals LIMIT 10");
    console.table(hospitals);

    console.log("\n=== HOSPITAL BEDS ===");
    const beds = await q("SELECT * FROM hospital_beds LIMIT 10");
    console.table(beds);

    console.log("\n=== DOCTORS ===");
    const doctors = await q("SELECT id, doctor_id, name, specialization, department, hospital_id, qualification, experience, status FROM doctors LIMIT 10");
    console.table(doctors);

    console.log("\n=== AMBULANCES ===");
    const ambulances = await q("SELECT id, ambulance_id, vehicle_number, driver_name, driver_mobile, ambulance_type, hospital_name, location, status FROM ambulances LIMIT 10");
    console.table(ambulances);

    console.log("\n=== EMERGENCY DEPARTMENTS ===");
    const emg = await q("SELECT * FROM emergency_departments LIMIT 10");
    console.table(emg);

    console.log("\n=== HOSPITAL STAFF ===");
    const staff = await q("SELECT id, staff_id, name, department, role, hospital_id FROM staff WHERE department IN ('hospital', 'healthcare', 'admin') OR role = 'admin' LIMIT 10");
    console.table(staff);

    process.exit(0);
}

inspect().catch(err => {
    console.error(err);
    process.exit(1);
});
