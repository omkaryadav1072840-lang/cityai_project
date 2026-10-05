/**
 * Comprehensive Integration Test Suite for Hospital Module & Role Architecture
 * Tests 1 through 14 as specified in PART 20.
 */

const BASE_URL = 'http://localhost:5000';
const db = require('../backend/config/db');

async function runTests() {
    console.log("============================================================");
    console.log("🏥 STARTING COMPREHENSIVE HOSPITAL MODULE & ROLE TESTS");
    console.log("============================================================\n");

    let passedCount = 0;
    let failedCount = 0;

    function assert(condition, message) {
        if (condition) {
            console.log(`  ✅ [PASS] ${message}`);
            passedCount++;
        } else {
            console.error(`  ❌ [FAIL] ${message}`);
            failedCount++;
        }
    }

    try {
        // -----------------------------------------------------------------
        // TEST 1: Open Hospital A (AIIMS Gorakhpur). Verify multiple doctors and each doctor's slots.
        // -----------------------------------------------------------------
        console.log("--- TEST 1: Multiple Doctors & Slots for Hospital A (HOSP-001) ---");
        const docResA = await fetch(`${BASE_URL}/api/hospitals/HOSP-001/doctors`).then(r => r.json());
        assert(docResA.doctors && docResA.doctors.length >= 2, `HOSP-001 has multiple doctors (got ${docResA.doctors ? docResA.doctors.length : 0})`);

        // Test slots for each doctor of HOSP-001
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (tomorrow.getDay() === 0) tomorrow.setDate(tomorrow.getDate() + 1); // skip Sunday
        const testDate = tomorrow.toISOString().split('T')[0];

        let allDoctorsHaveSlots = true;
        for (const doc of docResA.doctors) {
            const slotRes = await fetch(`${BASE_URL}/api/appointments/availability?hospitalId=HOSP-001&doctorId=${doc.doctor_id}&date=${testDate}`).then(r => r.json());
            if (!slotRes.success || !slotRes.slots || slotRes.slots.length === 0) {
                allDoctorsHaveSlots = false;
                console.error(`    Doctor ${doc.name} (${doc.doctor_id}) has no slots:`, slotRes.message);
            }
        }
        assert(allDoctorsHaveSlots, `Every doctor in Hospital A (HOSP-001) has their own slots available on ${testDate}`);

        // -----------------------------------------------------------------
        // TEST 2: Select Hospital A. Verify ONLY Hospital A doctors appear.
        // -----------------------------------------------------------------
        console.log("\n--- TEST 2: Hospital A Doctors Scoping ---");
        const invalidDocA = docResA.doctors.find(d => d.hospital_id && d.hospital_id !== 'HOSP-001');
        assert(!invalidDocA, "Only Hospital A doctors appear when Hospital A is queried");

        // -----------------------------------------------------------------
        // TEST 3: Select Hospital B (BRD Medical College). Verify Hospital A doctors disappear.
        // -----------------------------------------------------------------
        console.log("\n--- TEST 3: Hospital B (HOSP-002) Doctors Scoping ---");
        const docResB = await fetch(`${BASE_URL}/api/hospitals/HOSP-002/doctors`).then(r => r.json());
        assert(docResB.doctors && docResB.doctors.length >= 2, `HOSP-002 has doctors (got ${docResB.doctors ? docResB.doctors.length : 0})`);

        const hospADocInB = docResB.doctors.find(d => docResA.doctors.some(a => a.doctor_id === d.doctor_id));
        assert(!hospADocInB, "Hospital A doctors completely disappear from Hospital B list");

        // -----------------------------------------------------------------
        // TEST 4: Select Hospital B Doctor. Verify only that doctor's slots appear.
        // -----------------------------------------------------------------
        console.log("\n--- TEST 4: Hospital B Doctor Specific Slots ---");
        const sampleDocB = docResB.doctors[0];
        const slotResB = await fetch(`${BASE_URL}/api/appointments/availability?hospitalId=HOSP-002&doctorId=${sampleDocB.doctor_id}&date=${testDate}`).then(r => r.json());
        assert(slotResB.success && slotResB.slots && slotResB.slots.length > 0, `Slots fetched for ${sampleDocB.name} (${slotResB.slots ? slotResB.slots.length : 0} slots)`);
        assert(slotResB.doctorId === sampleDocB.doctor_id, `Slot response matches selected Doctor ID (${sampleDocB.doctor_id})`);

        // -----------------------------------------------------------------
        // TEST 5: Book valid appointment. Verify stored correctly.
        // -----------------------------------------------------------------
        console.log("\n--- TEST 5: Valid Appointment Booking & Storage ---");
        // Ensure patient exists
        const [patRows] = await db.promise().query("SELECT patient_id FROM patients LIMIT 1");
        let testPatientId = patRows.length ? patRows[0].patient_id : "PAT-TEST-001";
        if (!patRows.length) {
            await db.promise().query("INSERT INTO patients (patient_id, name, mobile) VALUES ('PAT-TEST-001', 'Test Citizen', '9876543210')");
        }

        const validTime = "11:30";
        // Clean any existing appointment for this test slot first
        await db.promise().query(
            "DELETE FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND (appointment_time = ? OR appointment_time LIKE '11:30%')",
            [sampleDocB.doctor_id, testDate, validTime]
        );

        const bookRes = await fetch(`${BASE_URL}/api/appointments/book-strict`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                patientId: testPatientId,
                hospitalId: "HOSP-002",
                doctorId: sampleDocB.doctor_id,
                appointmentDate: testDate,
                appointmentTime: validTime
            })
        }).then(r => r.json());

        assert(bookRes.success === true, `Valid appointment booked successfully (${bookRes.message})`);

        // Verify database record
        const [savedAppt] = await db.promise().query(
            "SELECT hospital_id, doctor_id, patient_id, appointment_date, appointment_time, token_number FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND appointment_time LIKE '11:30%' LIMIT 1",
            [sampleDocB.doctor_id, testDate]
        );
        assert(savedAppt.length > 0, "Appointment verified in database");
        if (savedAppt.length) {
            assert(savedAppt[0].hospital_id === "HOSP-002", `Correct hospital_id stored (${savedAppt[0].hospital_id})`);
            assert(savedAppt[0].doctor_id === sampleDocB.doctor_id, `Correct doctor_id stored (${savedAppt[0].doctor_id})`);
            assert(savedAppt[0].patient_id === testPatientId, `Correct patient_id stored (${savedAppt[0].patient_id})`);
            assert(Boolean(savedAppt[0].token_number), `Token number assigned (${savedAppt[0].token_number})`);
        }

        // -----------------------------------------------------------------
        // TEST 6: Try Cross-Hospital Booking (Hospital A + Hospital B Doctor) -> Must FAIL
        // -----------------------------------------------------------------
        console.log("\n--- TEST 6: Cross-Hospital Booking Prevention ---");
        const crossRes = await fetch(`${BASE_URL}/api/appointments/book-strict`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                patientId: testPatientId,
                hospitalId: "HOSP-001", // AIIMS
                doctorId: sampleDocB.doctor_id, // Belongs to BRD!
                appointmentDate: testDate,
                appointmentTime: "10:00"
            })
        }).then(r => r.json());

        assert(crossRes.success === false, `Cross-hospital booking rejected by backend (${crossRes.message})`);

        // -----------------------------------------------------------------
        // TEST 7: Try Doctor A + Doctor B Slot -> Must FAIL
        // -----------------------------------------------------------------
        console.log("\n--- TEST 7: Mismatched Doctor Slot Prevention ---");
        // Get a slot belonging to Doctor A
        const sampleDocA = docResA.doctors[0];
        const [slotRowsA] = await db.promise().query(
            "SELECT id FROM doctor_slots WHERE doctor_id = ? LIMIT 1",
            [sampleDocA.doctor_id]
        );

        if (slotRowsA.length) {
            const mismatchSlotRes = await fetch(`${BASE_URL}/api/appointments/book-strict`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    patientId: testPatientId,
                    hospitalId: "HOSP-002",
                    doctorId: sampleDocB.doctor_id, // Doctor B
                    slotId: slotRowsA[0].id, // Slot belongs to Doctor A!
                    appointmentDate: testDate,
                    appointmentTime: "10:00"
                })
            }).then(r => r.json());

            assert(mismatchSlotRes.success === false, `Mismatched slot rejected by backend (${mismatchSlotRes.message})`);
        }

        // -----------------------------------------------------------------
        // TEST 8: Try Already Booked Slot -> Must FAIL
        // -----------------------------------------------------------------
        console.log("\n--- TEST 8: Double-Booking / Unavailable Slot Prevention ---");
        // Try booking the exact same slot booked in TEST 5 with a different patient
        const doubleBookRes = await fetch(`${BASE_URL}/api/appointments/book-strict`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                patientId: "PAT-ANOTHER-999",
                hospitalId: "HOSP-002",
                doctorId: sampleDocB.doctor_id,
                appointmentDate: testDate,
                appointmentTime: validTime // already booked!
            })
        }).then(r => r.json());

        assert(doubleBookRes.success === false, `Duplicate appointment booking rejected (${doubleBookRes.message})`);

        // -----------------------------------------------------------------
        // TEST 9: Try Inactive Doctor -> Must FAIL
        // -----------------------------------------------------------------
        console.log("\n--- TEST 9: Inactive Doctor Booking Prevention ---");
        // Temporarily set a dummy doctor as Inactive
        await db.promise().query(
            "UPDATE doctors SET status = 'Inactive' WHERE doctor_id = 'DOC-106'"
        );
        const inactiveRes = await fetch(`${BASE_URL}/api/appointments/book-strict`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                patientId: testPatientId,
                hospitalId: "HOSP-004", // Fatima Hospital
                doctorId: "DOC-106",
                appointmentDate: testDate,
                appointmentTime: "09:30"
            })
        }).then(r => r.json());

        assert(inactiveRes.success === false, `Inactive doctor booking rejected (${inactiveRes.message})`);
        // Restore doctor status
        await db.promise().query("UPDATE doctors SET status = 'Active' WHERE doctor_id = 'DOC-106'");

        // -----------------------------------------------------------------
        // TEST 10: Login as Hospital Admin A. Verify only Hospital A data.
        // -----------------------------------------------------------------
        console.log("\n--- TEST 10: Hospital Admin A Login & Scoping ---");
        const adminLoginA = await fetch(`${BASE_URL}/api/staff-login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                staffId: "STAFF-HOSP-ADMIN",
                password: "admin123"
            })
        }).then(r => r.json());

        assert(adminLoginA.token && adminLoginA.user, `Hospital Admin A logged in (${adminLoginA.user?.name})`);
        assert(adminLoginA.user?.hospitalId === "HOSP-001", `Hospital Admin A assigned to HOSP-001 (${adminLoginA.user?.hospitalId})`);

        const dashResA = await fetch(`${BASE_URL}/api/hospitals/HOSP-001/dashboard`, {
            headers: { "Authorization": `Bearer ${adminLoginA.token}` }
        }).then(r => r.json());

        assert(dashResA.success === true, `Hospital Admin A accessed HOSP-001 dashboard (${dashResA.hospital?.hospital_name})`);

        // -----------------------------------------------------------------
        // TEST 11: Try Hospital Admin A accessing Hospital B -> Must FAIL
        // -----------------------------------------------------------------
        console.log("\n--- TEST 11: Cross-Hospital Access Prevention (Hospital Admin A -> Hospital B) ---");
        const crossDashRes = await fetch(`${BASE_URL}/api/hospitals/HOSP-002/dashboard`, {
            headers: { "Authorization": `Bearer ${adminLoginA.token}` }
        });
        const crossDashBody = await crossDashRes.json();

        assert(crossDashRes.status === 403, `Hospital Admin A forbidden from Hospital B dashboard (HTTP ${crossDashRes.status})`);
        assert(crossDashBody.success === false, `Response message: ${crossDashBody.message}`);

        // -----------------------------------------------------------------
        // TEST 12: Create / Assign Staff & Role -> Login as Staff
        // -----------------------------------------------------------------
        console.log("\n--- TEST 12: Staff Role Creation & Authentication ---");
        const testStaffId = "STAFF-TEST-NURSE-01";
        const addStaffRes = await fetch(`${BASE_URL}/api/hospitals/HOSP-001/staff`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${adminLoginA.token}`
            },
            body: JSON.stringify({
                name: "Nurse Sunita Sharma",
                staffId: testStaffId,
                department: "ICU Ward",
                hospitalRole: "nurse",
                email: "sunita.nurse@aiims.edu",
                password: "staff123"
            })
        }).then(r => r.json());

        assert(addStaffRes.success === true, `Staff member added by Hospital Admin (${addStaffRes.message})`);

        // Login as newly created Nurse
        const staffLogin = await fetch(`${BASE_URL}/api/staff-login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                staffId: testStaffId,
                password: "staff123"
            })
        }).then(r => r.json());

        assert(staffLogin.token && staffLogin.user, `Staff authenticated successfully (${staffLogin.user?.name})`);
        assert(staffLogin.user?.hospitalRole === "nurse", `Staff role is nurse (${staffLogin.user?.hospitalRole})`);

        // -----------------------------------------------------------------
        // TEST 13: Verify Staff Cannot Access Unauthorized Hospital Features
        // -----------------------------------------------------------------
        console.log("\n--- TEST 13: Staff Role Permission Enforcement ---");
        // Nurse tries to add another staff member -> Must FAIL (only hospital_admin/admin allowed)
        const unauthRes = await fetch(`${BASE_URL}/api/hospitals/HOSP-001/staff`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${staffLogin.token}`
            },
            body: JSON.stringify({
                name: "Rogue User",
                staffId: "ROGUE-01",
                hospitalRole: "hospital_admin"
            })
        });

        assert(unauthRes.status === 403, `Nurse blocked from managing staff directory (HTTP ${unauthRes.status})`);

        // -----------------------------------------------------------------
        // TEST 14: System Admin Login & Management
        // -----------------------------------------------------------------
        console.log("\n--- TEST 14: System/Super Admin Management ---");
        const sysAdminLogin = await fetch(`${BASE_URL}/api/staff-login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                staffId: "STAFF-001",
                password: "admin123"
            })
        }).then(r => r.json());

        assert(sysAdminLogin.token && sysAdminLogin.user?.role === "admin", `System Super Admin logged in (${sysAdminLogin.user?.name})`);

        // System Admin can access HOSP-001 AND HOSP-002
        const sysAccess1 = await fetch(`${BASE_URL}/api/hospitals/HOSP-001/dashboard`, {
            headers: { "Authorization": `Bearer ${sysAdminLogin.token}` }
        }).then(r => r.json());

        const sysAccess2 = await fetch(`${BASE_URL}/api/hospitals/HOSP-002/dashboard`, {
            headers: { "Authorization": `Bearer ${sysAdminLogin.token}` }
        }).then(r => r.json());

        assert(sysAccess1.success && sysAccess2.success, "System Admin has cross-hospital access to all hospitals");

        // System Admin assigns Hospital Admin to hospital
        const assignAdminRes = await fetch(`${BASE_URL}/api/admin/hospitals/HOSP-004/admin`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${sysAdminLogin.token}`
            },
            body: JSON.stringify({
                staffId: "STAFF-FATIMA-ADMIN",
                name: "Dr. Sister Fatima Thomas",
                email: "admin@fatimahospital.org",
                password: "admin123"
            })
        }).then(r => r.json());

        assert(assignAdminRes.success === true, `System Admin assigned Hospital Admin (${assignAdminRes.message})`);

        console.log("\n============================================================");
        console.log(`🏁 TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
        console.log("============================================================\n");

        process.exit(failedCount > 0 ? 1 : 0);
    } catch (err) {
        console.error("Test execution error:", err);
        process.exit(1);
    }
}

runTests();
