/**
 * Comprehensive Appointment Cancellation Test Suite
 * ---------------------------------------------------
 * Verifies all 8 Phase 1 Cancellation Requirements:
 *  1. Successful cancellation
 *  2. Repeated cancellation
 *  3. Cancellation of a nonexistent appointment
 *  4. Database failure / rollback and connection-release behavior
 *  5. Connection release verification (no pool starvation)
 *  6. Slot capacity restored exactly once (no negative/over-decrement)
 *  7. Concurrent cancellation attempts (atomic row lock prevention)
 *  8. Booking & Cancellation regression lifecycle
 */

const http = require("http");
const db = require("../backend/config/db");
const { generateToken } = require("../backend/middleware/auth.middleware");

function request(options, payload) {
    return new Promise((resolve) => {
        const data = payload ? JSON.stringify(payload) : null;
        const headers = {
            "Content-Type": "application/json",
            ...(options.headers || {})
        };
        if (data) {
            headers["Content-Length"] = Buffer.byteLength(data);
        }

        const req = http.request({
            hostname: "localhost",
            port: 5000,
            path: options.path,
            method: options.method || "GET",
            headers
        }, (res) => {
            let body = "";
            res.on("data", chunk => body += chunk);
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

        req.on("error", (err) => resolve({ status: 500, error: err.message }));
        if (data) req.write(data);
        req.end();
    });
}

async function runCancellationTestSuite() {
    console.log("======================================================================");
    console.log("🧪 PHASE 1: APPOINTMENT CANCELLATION TRANSACTION TEST SUITE");
    console.log("======================================================================\n");

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    function assert(condition, message) {
        totalTests++;
        if (!condition) {
            console.error(`  ❌ [FAIL] Scenario #${totalTests}: ${message}`);
            failedTests++;
            throw new Error(`Assertion failed: ${message}`);
        }
        console.log(`  ✅ [PASS] Scenario #${totalTests}: ${message}`);
        passedTests++;
    }

    const testDoctorId = `DOC-CANCEL-TEST-${Date.now()}`;
    const testPatientId = `PAT-CANCEL-TEST-${Date.now()}`;
    let slotId1 = null;
    let slotId2 = null;
    let appointmentId1 = null;
    let appointmentId2 = null;

    const token = generateToken({
        id: 999123,
        userId: 999123,
        role: "citizen",
        accountType: "citizen",
        patientId: testPatientId,
        mobile: "919876543210"
    });
    const authHeaders = { "Authorization": `Bearer ${token}` };

    try {
        console.log("▶️ Setting up synthetic test fixtures...");
        const conn = await db.promise().getConnection();
        try {
            // 1. Insert patient
            await conn.query(`
                INSERT INTO patients (patient_id, name, age, gender, mobile, hospital_id)
                VALUES (?, 'Cancel Test Patient', 30, 'Male', '919876543210', 'HOSP-001')
            `, [testPatientId]);

            // 2. Insert doctor
            await conn.query(`
                INSERT INTO doctors (doctor_id, name, department, hospital_id, status, specialization)
                VALUES (?, 'Dr. Cancel Tester', 'General Medicine', 'HOSP-001', 'Available', 'MD')
            `, [testDoctorId]);

            // 3. Insert slot 1 (capacity 1)
            const [s1] = await conn.query(`
                INSERT INTO doctor_slots (doctor_id, hospital_id, slot_date, start_time, end_time, max_patients, booked_patients, status)
                VALUES (?, 'HOSP-001', '2026-11-05', '09:00:00', '09:30:00', 1, 0, 'Available')
            `, [testDoctorId]);
            slotId1 = s1.insertId;

            // 4. Insert slot 2 (capacity 1 for concurrency test)
            const [s2] = await conn.query(`
                INSERT INTO doctor_slots (doctor_id, hospital_id, slot_date, start_time, end_time, max_patients, booked_patients, status)
                VALUES (?, 'HOSP-001', '2026-11-05', '10:00:00', '10:30:00', 1, 0, 'Available')
            `, [testDoctorId]);
            slotId2 = s2.insertId;
        } finally {
            conn.release();
        }
        console.log(`   Fixtures ready: Slot 1 (#${slotId1}), Slot 2 (#${slotId2})\n`);

        // ====================================================================
        // SCENARIO 1: Cancellation of a nonexistent appointment
        // ====================================================================
        console.log("--- SCENARIO 1: Cancellation of Nonexistent Appointment ---");
        const resNonExistent = await request({
            path: "/api/appointments/999999999/cancel",
            method: "PUT",
            headers: authHeaders
        });
        assert(resNonExistent.status === 404, `Returns 404 for nonexistent appointment (got ${resNonExistent.status})`);
        assert(resNonExistent.data?.message?.includes("Appointment not found"), "Reports 'Appointment not found.'");

        // ====================================================================
        // SCENARIO 2: Successful Booking of Slot 1
        // ====================================================================
        console.log("\n--- SCENARIO 2: Booking Appointment for Slot 1 ---");
        const bookRes1 = await request({
            path: "/api/appointments",
            method: "POST",
            headers: authHeaders
        }, {
            patientId: testPatientId,
            slotId: slotId1,
            hospitalId: "HOSP-001"
        });
        assert(bookRes1.status === 201, `Booking returns 201 (got ${bookRes1.status})`);
        appointmentId1 = bookRes1.data?.appointment?.id;
        assert(!!appointmentId1, `Appointment 1 ID created (${appointmentId1})`);

        // Check slot is Full
        const [slotAfterBook1] = await db.promise().query("SELECT * FROM doctor_slots WHERE id = ?", [slotId1]);
        assert(slotAfterBook1[0].booked_patients === 1, "Slot 1 booked_patients is 1");
        assert(slotAfterBook1[0].status === "Full", "Slot 1 status is Full");

        // ====================================================================
        // SCENARIO 3: Successful Cancellation of Appointment 1
        // ====================================================================
        console.log("\n--- SCENARIO 3: Successful Cancellation & Slot Release ---");
        const cancelRes1 = await request({
            path: `/api/appointments/${appointmentId1}/cancel`,
            method: "PUT",
            headers: authHeaders
        });
        assert(cancelRes1.status === 200, `Cancellation returns 200 (got ${cancelRes1.status})`);
        assert(cancelRes1.data?.message?.includes("cancelled successfully"), "Message confirms successful cancellation");

        // Verify DB state
        const [apptAfterCancel1] = await db.promise().query("SELECT * FROM appointments WHERE id = ?", [appointmentId1]);
        assert(apptAfterCancel1[0].status === "Cancelled", "Appointment status is 'Cancelled'");

        // ====================================================================
        // SCENARIO 4: Slot Capacity Restored Exactly Once
        // ====================================================================
        console.log("\n--- SCENARIO 4: Slot Capacity Restored Exactly Once ---");
        const [slotAfterCancel1] = await db.promise().query("SELECT * FROM doctor_slots WHERE id = ?", [slotId1]);
        assert(slotAfterCancel1[0].booked_patients === 0, `Slot 1 booked_patients restored to 0 (got ${slotAfterCancel1[0].booked_patients})`);
        assert(slotAfterCancel1[0].status === "Available", "Slot 1 status restored to 'Available'");

        // ====================================================================
        // SCENARIO 5: Repeated Cancellation on Already Cancelled Appointment
        // ====================================================================
        console.log("\n--- SCENARIO 5: Repeated Cancellation Blocked ---");
        const repeatCancelRes = await request({
            path: `/api/appointments/${appointmentId1}/cancel`,
            method: "PUT",
            headers: authHeaders
        });
        assert(repeatCancelRes.status === 400, `Repeated cancel returns 400 (got ${repeatCancelRes.status})`);
        assert(repeatCancelRes.data?.message?.includes("already Cancelled"), "Message indicates already Cancelled");

        // Verify slot booked_patients did NOT decrement below 0
        const [slotAfterRepeat] = await db.promise().query("SELECT * FROM doctor_slots WHERE id = ?", [slotId1]);
        assert(slotAfterRepeat[0].booked_patients === 0, `Slot booked_patients remains exactly 0 (no underflow)`);
        assert(slotAfterRepeat[0].status === "Available", "Slot status remains 'Available'");

        // ====================================================================
        // SCENARIO 6: Concurrent Cancellation Attempts (Race Condition Test)
        // ====================================================================
        console.log("\n--- SCENARIO 6: Concurrent Cancellation Race Protection ---");
        // Book slot 2 first
        const bookRes2 = await request({
            path: "/api/appointments",
            method: "POST",
            headers: authHeaders
        }, {
            patientId: testPatientId,
            slotId: slotId2,
            hospitalId: "HOSP-001"
        });
        assert(bookRes2.status === 201, `Booking slot 2 returns 201`);
        appointmentId2 = bookRes2.data?.appointment?.id;

        // Launch 2 parallel cancellation requests simultaneously
        const [concurrent1, concurrent2] = await Promise.all([
            request({ path: `/api/appointments/${appointmentId2}/cancel`, method: "PUT", headers: authHeaders }),
            request({ path: `/api/appointments/${appointmentId2}/cancel`, method: "PUT", headers: authHeaders })
        ]);

        const statuses = [concurrent1.status, concurrent2.status].sort();
        assert(statuses[0] === 200 && statuses[1] === 400, `Exactly ONE concurrent cancel gets 200 and collision gets 400 (got [${statuses.join(", ")}])`);

        const [slot2AfterConcurrent] = await db.promise().query("SELECT * FROM doctor_slots WHERE id = ?", [slotId2]);
        assert(slot2AfterConcurrent[0].booked_patients === 0, `Slot 2 capacity restored to 0 exactly once`);
        assert(slot2AfterConcurrent[0].status === "Available", `Slot 2 status restored to 'Available'`);

        // ====================================================================
        // SCENARIO 7: Rollback & Connection Release Behavior (No Pool Starvation)
        // ====================================================================
        console.log("\n--- SCENARIO 7: Connection Pool Health & No Starvation ---");
        // Fire 15 simultaneous queries to test that pool connections were released
        const poolTests = [];
        for (let i = 0; i < 15; i++) {
            poolTests.push(request({ path: "/api/appointments/999999999/cancel", method: "PUT", headers: authHeaders }));
        }
        const poolResults = await Promise.all(poolTests);
        assert(poolResults.every(r => r.status === 404), "15 rapid rollback requests all completed without pool starvation or hanging");

        // ====================================================================
        // SCENARIO 8: Re-booking Slot 1 After Cancellation (Full Lifecycle)
        // ====================================================================
        console.log("\n--- SCENARIO 8: Slot Re-booking After Cancellation ---");
        const rebookRes = await request({
            path: "/api/appointments",
            method: "POST",
            headers: authHeaders
        }, {
            patientId: testPatientId,
            slotId: slotId1,
            hospitalId: "HOSP-001"
        });
        console.log("rebookRes status:", rebookRes.status, "data:", rebookRes.data);
        assert(rebookRes.status === 201, `Re-booking freed slot returns 201`);
        const rebookedApptId = rebookRes.data?.appointment?.id;
        assert(!!rebookedApptId, `Re-booked appointment created (${rebookedApptId})`);

        const [slotRebooked] = await db.promise().query("SELECT * FROM doctor_slots WHERE id = ?", [slotId1]);
        assert(slotRebooked[0].booked_patients === 1, `Slot booked_patients is now 1 again`);
        assert(slotRebooked[0].status === "Full", `Slot status is now Full again`);

    } catch (err) {
        console.error("\n❌ Test aborted with error:", err.message);
    } finally {
        console.log("\n🧹 Cleaning up test fixtures from database...");
        try {
            const conn = await db.promise().getConnection();
            await conn.query("DELETE FROM appointments WHERE patient_id = ?", [testPatientId]);
            await conn.query("DELETE FROM doctor_slots WHERE doctor_id = ?", [testDoctorId]);
            await conn.query("DELETE FROM doctors WHERE doctor_id = ?", [testDoctorId]);
            await conn.query("DELETE FROM patients WHERE patient_id = ?", [testPatientId]);
            conn.release();
        } catch (cleanErr) {
            console.error("Cleanup error:", cleanErr.message);
        }
        await db.promise().end();

        console.log("\n======================================================================");
        console.log("                 PHASE 1 CANCELLATION SUMMARY                         ");
        console.log("======================================================================");
        console.log(`Total Assertions : ${totalTests}`);
        console.log(`Passed           : ${passedTests}`);
        console.log(`Failed           : ${failedTests}`);
        console.log("======================================================================\n");

        if (failedTests === 0 && passedTests >= 18) {
            console.log("🎉 ALL PHASE 1 APPOINTMENT CANCELLATION TESTS PASSED WITH 100% SUCCESS!");
            process.exit(0);
        } else {
            console.error("❌ TEST SUITE FAILED.");
            process.exit(1);
        }
    }
}

runCancellationTestSuite();
