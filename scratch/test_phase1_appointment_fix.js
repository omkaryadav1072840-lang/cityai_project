/**
 * SmartCity AI - Phase 1 Verification Test Suite
 * -----------------------------------------------
 * Tests slot-based appointment booking transaction handling,
 * error branches, concurrency/capacity rules, and cancellation.
 */

const http = require("http");
const jwt = require("../backend/node_modules/jsonwebtoken");
const db = require("../backend/config/db");
const { JWT_SECRET } = require("../backend/config/env.config");

const BASE_URL = "http://localhost:5000";

function request(options, postData) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = "";
            res.on("data", (chunk) => body += chunk);
            res.on("end", () => {
                let parsed = null;
                try {
                    parsed = JSON.parse(body);
                } catch {
                    parsed = body;
                }
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    data: parsed
                });
            });
        });

        req.on("error", reject);

        if (postData) {
            req.write(typeof postData === "string" ? postData : JSON.stringify(postData));
        }
        req.end();
    });
}

async function runTests() {
    console.log("================================================================");
    console.log("🧪 PHASE 1: APPOINTMENT BOOKING RUNTIME CRASH & TRANSACTION TEST");
    console.log("================================================================\n");

    let passed = 0;
    let failed = 0;

    function assert(condition, message) {
        if (!condition) {
            console.error(`  ❌ [FAIL] ${message}`);
            failed++;
            throw new Error(`Assertion failed: ${message}`);
        }
        console.log(`  ✅ [PASS] ${message}`);
        passed++;
    }

    const testPatientId = "TEST-PAT-P2-001";
    const testDoctorActiveId = "TEST-DOC-P2-01";
    const testDoctorInactiveId = "TEST-DOC-P2-02";
    let activeSlotId = null;
    let inactiveSlotId = null;
    let createdAppointmentId = null;

    const token = jwt.sign(
        { id: 99991, userId: 99991, role: "citizen", patientId: testPatientId, mobile: "9990001111" },
        JWT_SECRET || "smartcity_super_secret_jwt_key_gorakhpur_2026",
        { expiresIn: "1h" }
    );

    try {
        console.log("▶️ Setting up test fixtures in database...");
        const conn = await db.promise().getConnection();
        try {
            // 1. Clean up any previous test leftovers
            await conn.query("DELETE FROM appointments WHERE patient_id = ?", [testPatientId]);
            await conn.query("DELETE FROM doctor_slots WHERE doctor_id IN (?, ?)", [testDoctorActiveId, testDoctorInactiveId]);
            await conn.query("DELETE FROM doctors WHERE doctor_id IN (?, ?)", [testDoctorActiveId, testDoctorInactiveId]);
            await conn.query("DELETE FROM patients WHERE patient_id = ?", [testPatientId]);

            // 2. Insert test patient (user_id can be NULL)
            await conn.query(`
                INSERT INTO patients (user_id, patient_id, name, gender, mobile, status)
                VALUES (NULL, ?, 'P2 Test Patient', 'Male', '9990001111', 'Active')
            `, [testPatientId]);

            // 3. Insert active doctor
            await conn.query(`
                INSERT INTO doctors (doctor_id, name, specialization, department, hospital_id, status)
                VALUES (?, 'Dr. Active P2', 'Cardiology', 'Cardiology', 'HOSP-001', 'Active')
            `, [testDoctorActiveId]);

            // 4. Insert inactive doctor
            await conn.query(`
                INSERT INTO doctors (doctor_id, name, specialization, department, hospital_id, status)
                VALUES (?, 'Dr. Inactive P2', 'Cardiology', 'Cardiology', 'HOSP-001', 'Inactive')
            `, [testDoctorInactiveId]);

            // 5. Insert active doctor slot with max_patients = 1
            const [slot1Res] = await conn.query(`
                INSERT INTO doctor_slots (doctor_id, hospital_id, slot_date, start_time, end_time, max_patients, booked_patients, status)
                VALUES (?, 'HOSP-001', '2026-11-01', '10:00:00', '10:30:00', 1, 0, 'Available')
            `, [testDoctorActiveId]);
            activeSlotId = slot1Res.insertId;

            // 6. Insert inactive doctor slot
            const [slot2Res] = await conn.query(`
                INSERT INTO doctor_slots (doctor_id, hospital_id, slot_date, start_time, end_time, max_patients, booked_patients, status)
                VALUES (?, 'HOSP-001', '2026-11-01', '11:00:00', '11:30:00', 1, 0, 'Available')
            `, [testDoctorInactiveId]);
            inactiveSlotId = slot2Res.insertId;

        } finally {
            conn.release();
        }
        console.log(`   Test fixtures ready (Active Slot ID: ${activeSlotId}, Inactive Slot ID: ${inactiveSlotId})\n`);

        // TEST 1: Non-existent patientId
        console.log("--- TEST 1: Attempt booking with non-existent patientId ---");
        const res1 = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/appointments",
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, {
            patientId: "NON-EXISTENT-PAT-99999",
            slotId: activeSlotId
        });
        assert(res1.status === 404, `HTTP status is 404 (got ${res1.status})`);
        assert(res1.data && res1.data.success === false, `Response success is false`);
        assert(res1.data && res1.data.message.includes("Patient ID not found"), `Error message indicates patient not found: "${res1.data?.message}"`);

        // TEST 2: Non-existent slotId
        console.log("\n--- TEST 2: Attempt booking with non-existent slotId ---");
        const res2 = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/appointments",
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, {
            patientId: testPatientId,
            slotId: 99999999
        });
        assert(res2.status === 404, `HTTP status is 404 (got ${res2.status})`);
        assert(res2.data && res2.data.message.includes("Slot not found"), `Error message indicates slot not found: "${res2.data?.message}"`);

        // TEST 3: Inactive doctor
        console.log("\n--- TEST 3: Attempt booking with inactive doctor ---");
        const res3 = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/appointments",
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, {
            patientId: testPatientId,
            slotId: inactiveSlotId
        });
        assert(res3.status === 400, `HTTP status is 400 (got ${res3.status})`);
        assert(res3.data && res3.data.message.includes("Doctor is currently inactive or unavailable"), `Error message indicates doctor inactive: "${res3.data?.message}"`);

        // TEST 4: Cross-hospital booking mismatch
        console.log("\n--- TEST 4: Attempt cross-hospital booking mismatch ---");
        const res4 = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/appointments",
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, {
            patientId: testPatientId,
            slotId: activeSlotId,
            hospitalId: "HOSP-MISMATCH-999"
        });
        assert(res4.status === 400, `HTTP status is 400 (got ${res4.status})`);
        assert(res4.data && res4.data.message.includes("Cross-hospital booking rejected"), `Error message indicates cross-hospital rejection: "${res4.data?.message}"`);

        // TEST 5: Successful slot-based booking
        console.log("\n--- TEST 5: Successful slot-based booking ---");
        const res5 = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/appointments",
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, {
            patientId: testPatientId,
            slotId: activeSlotId,
            hospitalId: "HOSP-001"
        });
        assert(res5.status === 201, `HTTP status is 201 Created (got ${res5.status})`);
        assert(res5.data && res5.data.success === true, `Response success is true`);
        assert(res5.data && res5.data.appointment && res5.data.appointment.id, `Appointment ID returned: ${res5.data?.appointment?.id}`);
        createdAppointmentId = res5.data.appointment.id;

        // Verify in DB
        const [appts] = await db.promise().query("SELECT * FROM appointments WHERE id = ?", [createdAppointmentId]);
        assert(appts.length === 1, `Appointment row exists in database`);
        assert(appts[0].status === "Confirmed", `Appointment status is 'Confirmed'`);
        assert(appts[0].patient_id === testPatientId, `Appointment patient_id matches`);

        const [slotRows] = await db.promise().query("SELECT * FROM doctor_slots WHERE id = ?", [activeSlotId]);
        assert(slotRows.length === 1, `Doctor slot found`);
        assert(slotRows[0].booked_patients === 1, `Slot booked_patients incremented to 1 (got ${slotRows[0].booked_patients})`);
        assert(slotRows[0].status === "Full", `Slot status updated to 'Full' (max_patients was 1)`);

        // TEST 6: Attempting to book an already full slot
        console.log("\n--- TEST 6: Attempt booking an already full slot ---");
        const res6 = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/appointments",
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, {
            patientId: testPatientId,
            slotId: activeSlotId
        });
        assert(res6.status === 409, `HTTP status is 409 Conflict (got ${res6.status})`);
        assert(res6.data && res6.data.message.includes("already fully booked"), `Message indicates slot full: "${res6.data?.message}"`);

        // Verify DB unchanged after 409
        const [slotRowsAfter409] = await db.promise().query("SELECT * FROM doctor_slots WHERE id = ?", [activeSlotId]);
        assert(slotRowsAfter409[0].booked_patients === 1, `Slot booked_patients remains 1`);
        assert(slotRowsAfter409[0].status === "Full", `Slot status remains 'Full'`);

        // TEST 7: Cancel appointment and verify slot seat restoration
        console.log("\n--- TEST 7: Cancel appointment and verify slot release ---");
        const res7 = await request({
            hostname: "localhost",
            port: 5000,
            path: `/api/appointments/${createdAppointmentId}/cancel`,
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });
        assert(res7.status === 200, `HTTP status is 200 OK (got ${res7.status})`);
        assert(res7.data && res7.data.message.includes("cancelled successfully"), `Message confirms cancellation: "${res7.data?.message}"`);

        // Verify DB after cancel
        const [apptsAfterCancel] = await db.promise().query("SELECT * FROM appointments WHERE id = ?", [createdAppointmentId]);
        assert(apptsAfterCancel[0].status === "Cancelled", `Appointment status is now 'Cancelled'`);

        const [slotRowsAfterCancel] = await db.promise().query("SELECT * FROM doctor_slots WHERE id = ?", [activeSlotId]);
        assert(slotRowsAfterCancel[0].booked_patients === 0, `Slot booked_patients decremented to 0`);
        assert(slotRowsAfterCancel[0].status === "Available", `Slot status restored to 'Available'`);

    } catch (err) {
        console.error("Test execution aborted with error:", err.message);
    } finally {
        console.log("\n🧹 Cleaning up test fixtures from database...");
        try {
            const conn = await db.promise().getConnection();
            await conn.query("DELETE FROM appointments WHERE patient_id = ?", [testPatientId]);
            await conn.query("DELETE FROM doctor_slots WHERE doctor_id IN (?, ?)", [testDoctorActiveId, testDoctorInactiveId]);
            await conn.query("DELETE FROM doctors WHERE doctor_id IN (?, ?)", [testDoctorActiveId, testDoctorInactiveId]);
            await conn.query("DELETE FROM patients WHERE patient_id = ?", [testPatientId]);
            conn.release();
        } catch (cleanErr) {
            console.error("Cleanup error:", cleanErr.message);
        }
        await db.promise().end();

        console.log("\n================================================================");
        console.log("                  PHASE 1 VERIFICATION SUMMARY                 ");
        console.log("================================================================");
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${failed}`);
        if (failed === 0 && passed >= 15) {
            console.log("🎉 ALL PHASE 1 APPOINTMENT CRASH TESTS PASSED PERFECTLY!");
            process.exit(0);
        } else {
            console.error("❌ SOME TESTS FAILED.");
            process.exit(1);
        }
    }
}

runTests();
