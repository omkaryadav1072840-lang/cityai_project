const db = require('../backend/config/db');
async function test() {
    const p = db.promise();
    const [h] = await p.query("SELECT hospital_id, hospital_name, total_beds, icu_beds, emergency_beds, doctors_count, ambulance_count FROM hospitals WHERE hospital_id = 'HOSP-002'");
    console.log('BRD HOSPITAL:', h[0]);

    const [wards] = await p.query("SELECT ward_id, ward_name, ward_type, total_beds, occupied_beds FROM hospital_wards WHERE hospital_id = 'HOSP-002'");
    console.table(wards);

    const [docs] = await p.query("SELECT COUNT(*) as count FROM doctors WHERE hospital_id = 'HOSP-002'");
    console.log('BRD DOCTORS COUNT IN DB:', docs[0].count);

    const [tests] = await p.query("SELECT COUNT(*) as count FROM diagnostic_tests WHERE hospital_id = 'HOSP-002'");
    console.log('BRD DIAGNOSTIC TESTS IN DB:', tests[0].count);

    const [meds] = await p.query("SELECT id, medicine_name, category, price FROM pharmacy WHERE id IN (1, 2, 3, 4)");
    console.table(meds);

    process.exit(0);
}
test();
