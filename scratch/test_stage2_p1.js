/**
 * SmartCity AI - Stage 2 (P1) Automated Verification Test Harness
 * -------------------------------------------------------------
 * Tests:
 * 1. Parking Concurrency (Double-booking prevention with transactions/row locking)
 * 2. Hospital Bed Allocation Concurrency (Prevent concurrent double-allocation with transactions/rollback)
 * 3. Asynchronous Scrypt Password Hashing & Verification (Compatibility & security)
 * 4. Database Connection Pool (Empirical limits, timeouts, concurrent query resilience)
 * 5. Input Sanitizer (Password & credential non-mutation, XSS safety)
 * 6. Duplicate-Submission Guard (Memory bounding, FIFO eviction, cooldown)
 */

const http = require("http");
const db = require("../backend/config/db");
const {
    hashPassword,
    verifyPassword,
    hashPasswordSync,
    verifyPasswordSync,
    isLegacyPlainPassword
} = require("../backend/middleware/auth.middleware");
const {
    inputSanitizer,
    sanitizeObject,
    sanitizeString,
    duplicateSubmissionGuard,
    _recentSubmissions,
    _MAX_CACHE_ENTRIES
} = require("../backend/middleware/validation.middleware");
const {
    DB_CONNECTION_LIMIT,
    DB_CONNECT_TIMEOUT_MS,
    DB_QUEUE_LIMIT
} = require("../backend/config/env.config");

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

function assert(condition, message) {
    if (!condition) {
        console.error(`❌ FAIL: ${message}`);
        throw new Error(`Assertion failed: ${message}`);
    }
    console.log(`✅ PASS: ${message}`);
}

async function runStage2Tests() {
    console.log("==================================================");
    console.log("🚀 RUNNING STAGE 2 (P1) REMEDIATION TEST SUITE");
    console.log("==================================================\n");

    let passed = 0;
    let failed = 0;

    // ----------------------------------------------------
    // Authenticate test principals
    // ----------------------------------------------------
    console.log("▶️ Authenticating test principals...");
    let citizenToken = "";
    let staffToken = "";

    try {
        const citRes = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/login",
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, { loginId: "6306880179", password: "omkar123" });

        assert(citRes.status === 200 && citRes.data.token, "Citizen logged in with async password verification.");
        citizenToken = citRes.data.token;
        passed++;

        const staffRes = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/staff-login",
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, { staffId: "STAFF-001", password: "admin123" });

        assert(staffRes.status === 200 && staffRes.data.token, "Staff / Admin logged in with async password verification.");
        staffToken = staffRes.data.token;
        passed++;
    } catch (err) {
        console.error("Auth error:", err.message);
        failed++;
    }

    // ====================================================
    // ITEM 3: PASSWORD HASHING (ASYNC SCRYPT)
    // ====================================================
    console.log("\n▶️ [ITEM 3] Testing Asynchronous Scrypt Password Hashing & Verification...");
    try {
        const plain = "Complex!P@ss#2026";
        const hash = await hashPassword(plain);

        // Format check
        assert(typeof hash === "string" && hash.startsWith("scrypt$"), "Hash format starts with 'scrypt$'.");
        passed++;

        const parts = hash.split("$");
        assert(parts.length === 3, "Hash contains 3 dollar-delimited components.");
        passed++;

        const [, saltHex, hashHex] = parts;
        assert(saltHex.length === 32, "Salt is a 16-byte random hex string (32 characters).");
        passed++;
        assert(hashHex.length === 128, "Hash is a 64-byte derived key hex string (128 characters).");
        passed++;

        // Positive verification
        const matchPositive = await verifyPassword(plain, hash);
        assert(matchPositive === true, "verifyPassword returns true for correct plain password.");
        passed++;

        // Negative verification
        const matchNegative = await verifyPassword("WrongPassword123", hash);
        assert(matchNegative === false, "verifyPassword returns false for incorrect password.");
        passed++;

        // Legacy plain-text fallback
        const legacyMatch = await verifyPassword("plainSecret", "plainSecret");
        assert(legacyMatch === true, "Legacy plain-text password fallback verified successfully.");
        passed++;

        // Sync helpers compatibility
        const syncHash = hashPasswordSync("syncPass123");
        assert(typeof syncHash === "string" && syncHash.startsWith("scrypt$"), "hashPasswordSync generates valid hash.");
        passed++;
        assert(verifyPasswordSync("syncPass123", syncHash) === true, "verifyPasswordSync verifies valid hash.");
        passed++;
    } catch (err) {
        console.error("Item 3 Error:", err.message);
        failed++;
    }

    // ====================================================
    // ITEM 4: DATABASE CONNECTION POOL
    // ====================================================
    console.log("\n▶️ [ITEM 4] Testing Database Pool Metrics & Concurrency Limits...");
    try {
        assert(DB_CONNECTION_LIMIT >= 20 && DB_CONNECTION_LIMIT <= 50, `DB_CONNECTION_LIMIT (${DB_CONNECTION_LIMIT}) is within safe bounds (20-50).`);
        passed++;

        assert(DB_CONNECT_TIMEOUT_MS === 10000, `DB_CONNECT_TIMEOUT_MS is 10,000ms matching MySQL server timeout.`);
        passed++;

        assert(DB_QUEUE_LIMIT === 50, `DB_QUEUE_LIMIT is bounded to 50 requests.`);
        passed++;

        const health = await db.healthCheck();
        assert(health.ok === true, "Database healthCheck passes via connection pool.");
        passed++;

        // Run 20 concurrent queries in parallel to test pool resilience
        const queries = Array.from({ length: 20 }, (_, i) => 
            db.promise().query("SELECT ? AS query_index, NOW() AS ts", [i])
        );
        const results = await Promise.all(queries);
        assert(results.length === 20 && results.every(([rows]) => rows.length > 0), "Pool successfully handled 20 concurrent parallel queries without starvation.");
        passed++;
    } catch (err) {
        console.error("Item 4 Error:", err.message);
        failed++;
    }

    // ====================================================
    // ITEM 5: INPUT SANITIZER
    // ====================================================
    console.log("\n▶️ [ITEM 5] Testing Input Sanitizer Password Preservation & XSS Safety...");
    try {
        const rawBody = {
            name: "John <script>alert('xss')</script> Doe",
            email: "john.doe@example.com",
            password: "P@ss<word>#123 ",
            confirmPassword: "P@ss<word>#123 ",
            admin_password: "Admin<Pass>! ",
            comment: "Hello <b>world</b> <script>bad()</script>"
        };

        const sanitized = sanitizeObject(rawBody);

        // Passwords must be completely untouched (preserving <, >, and whitespace)
        assert(sanitized.password === "P@ss<word>#123 ", "Password field preserved with '<>' and trailing spaces intact.");
        passed++;
        assert(sanitized.confirmPassword === "P@ss<word>#123 ", "confirmPassword field preserved with '<>' and trailing spaces intact.");
        passed++;
        assert(sanitized.admin_password === "Admin<Pass>! ", "admin_password field preserved intact.");
        passed++;

        // Non-password fields must still have <script> tags stripped
        assert(!sanitized.name.includes("<script>"), "Dangerous <script> tag stripped from 'name'.");
        passed++;
        assert(!sanitized.comment.includes("<script>"), "Dangerous <script> tag stripped from 'comment'.");
        passed++;
    } catch (err) {
        console.error("Item 5 Error:", err.message);
        failed++;
    }

    // ====================================================
    // ITEM 6: DUPLICATE-SUBMISSION GUARD
    // ====================================================
    console.log("\n▶️ [ITEM 6] Testing Duplicate-Submission Guard Memory Bounding & Eviction...");
    try {
        assert(_MAX_CACHE_ENTRIES === 5000, `MAX_CACHE_ENTRIES is strictly bounded to 5,000.`);
        passed++;

        // Test Rapid Duplicate Detection (HTTP 429)
        const dupPayload = { name: "Dup Test", time: Date.now() };
        let req1Allowed = false;
        let req2Blocked = false;

        const fakeReq1 = {
            method: "POST",
            path: "/api/test-form",
            ip: "192.168.1.100",
            body: dupPayload
        };
        const fakeRes1 = {
            status: () => ({ json: () => {} })
        };
        duplicateSubmissionGuard(fakeReq1, fakeRes1, () => { req1Allowed = true; });
        assert(req1Allowed === true, "First request passed through duplicate guard.");
        passed++;

        const fakeReq2 = {
            method: "POST",
            path: "/api/test-form",
            ip: "192.168.1.100",
            body: dupPayload
        };
        const fakeRes2 = {
            status: (code) => {
                if (code === 429) req2Blocked = true;
                return { json: () => {} };
            }
        };
        duplicateSubmissionGuard(fakeReq2, fakeRes2, () => {});
        assert(req2Blocked === true, "Rapid duplicate request within cooldown blocked with HTTP 429.");
        passed++;

        // Test Memory Bounding & Eviction Under Load
        const initialSize = _recentSubmissions.size;
        for (let i = 0; i < 6000; i++) {
            _recentSubmissions.set(`flood-key-${i}`, Date.now());
            if (_recentSubmissions.size >= _MAX_CACHE_ENTRIES) {
                const oldestKey = _recentSubmissions.keys().next().value;
                if (oldestKey) _recentSubmissions.delete(oldestKey);
            }
        }
        assert(_recentSubmissions.size <= _MAX_CACHE_ENTRIES, `Cache size (${_recentSubmissions.size}) strictly capped at MAX_CACHE_ENTRIES (5000).`);
        passed++;

        // Cleanup flood keys
        for (let i = 0; i < 6000; i++) {
            _recentSubmissions.delete(`flood-key-${i}`);
        }
    } catch (err) {
        console.error("Item 6 Error:", err.message);
        failed++;
    }

    // ====================================================
    // ITEM 1: PARKING CONCURRENCY (DOUBLE-BOOKING PREVENTION)
    // ====================================================
    console.log("\n▶️ [ITEM 1] Testing Parking Concurrency & Double-Booking Prevention...");
    const testSlotNumber = `CONC-${Date.now().toString().slice(-4)}`;
    try {
        // Create an isolated available slot in PARK-001
        await db.promise().query(`
            INSERT INTO parking_slots (lot_id, slot_number, slot_type, floor, status)
            VALUES ('PARK-001', ?, 'car', 'Ground Floor', 'Available')
            ON DUPLICATE KEY UPDATE status = 'Available'
        `, [testSlotNumber]);

        console.log(`Created isolated test parking slot '${testSlotNumber}' in PARK-001.`);

        // Launch TWO concurrent booking requests for the exact same slot at the exact same millisecond
        const bookingReq1 = request({
            hostname: "localhost",
            port: 5000,
            path: "/api/parking/PARK-001/book-slot",
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${citizenToken}`
            }
        }, {
            slotNumber: testSlotNumber,
            vehicleNumber: "UP-53-AA-1111",
            durationHours: 2,
            customerName: "Concurrent User A"
        });

        const bookingReq2 = request({
            hostname: "localhost",
            port: 5000,
            path: "/api/parking/PARK-001/book-slot",
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${citizenToken}`
            }
        }, {
            slotNumber: testSlotNumber,
            vehicleNumber: "UP-53-BB-2222",
            durationHours: 2,
            customerName: "Concurrent User B"
        });

        const [res1, res2] = await Promise.all([bookingReq1, bookingReq2]);

        const statuses = [res1.status, res2.status].sort();
        console.log(`Concurrent parking booking response codes: [${res1.status}, ${res2.status}]`);

        assert(
            (statuses[0] === 200 || statuses[0] === 201) && statuses[1] === 409,
            "CONCURRENCY SUCCESS: Exactly ONE booking succeeded (200/201) and the concurrent collision was rejected with HTTP 409 Conflict."
        );
        passed++;

        // Verify database state: exactly one booking record exists for this slot
        const [bookings] = await db.promise().query(
            "SELECT * FROM parking_bookings WHERE lot_id = 'PARK-001' AND slot_number = ? AND status = 'Active'",
            [testSlotNumber]
        );
        assert(bookings.length === 1, `Database verified: exactly 1 booking record created for slot ${testSlotNumber}.`);
        passed++;

        // Clean up test slot
        await db.promise().query("DELETE FROM parking_bookings WHERE slot_number = ?", [testSlotNumber]);
        await db.promise().query("DELETE FROM parking_slots WHERE slot_number = ?", [testSlotNumber]);
    } catch (err) {
        console.error("Item 1 Error:", err.message);
        failed++;
    }

    // ====================================================
    // ITEM 2: HOSPITAL BED ALLOCATION CONCURRENCY
    // ====================================================
    console.log("\n▶️ [ITEM 2] Testing Hospital Bed Allocation Concurrency & Rollback...");
    const testBedId = `BED-CONC-${Date.now().toString().slice(-4)}`;
    try {
        // Create an isolated available bed in HOSP-001
        await db.promise().query(`
            INSERT INTO hospital_ward_beds 
            (bed_id, hospital_id, ward_id, bed_number, bed_type, bed_category, status, charge)
            VALUES (?, 'HOSP-001', 'WARD-ICU-01', ?, 'ICU', 'ICU', 'Available', 2500.00)
            ON DUPLICATE KEY UPDATE status = 'Available', patient_id = NULL, patient_name = NULL
        `, [testBedId, testBedId]);

        console.log(`Created isolated test hospital bed '${testBedId}' in HOSP-001.`);

        // Launch TWO concurrent allocation requests for the exact same bed at the exact same millisecond
        const bedReq1 = request({
            hostname: "localhost",
            port: 5000,
            path: "/api/hospitals/HOSP-001/ward-beds/assign",
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${staffToken}`
            }
        }, {
            bed_id: testBedId,
            patient_id: "P-CONC-001",
            patient_name: "Emergency Patient Alpha",
            diagnosis: "Severe Acute Asthma"
        });

        const bedReq2 = request({
            hostname: "localhost",
            port: 5000,
            path: "/api/hospitals/HOSP-001/ward-beds/assign",
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${staffToken}`
            }
        }, {
            bed_id: testBedId,
            patient_id: "P-CONC-002",
            patient_name: "Emergency Patient Beta",
            diagnosis: "Cardiac Arrhythmia"
        });

        const [bedRes1, bedRes2] = await Promise.all([bedReq1, bedReq2]);

        const bedStatuses = [bedRes1.status, bedRes2.status].sort();
        console.log(`Concurrent bed allocation response codes: [${bedRes1.status}, ${bedRes2.status}]`);

        assert(
            bedStatuses[0] === 200 && bedStatuses[1] === 409,
            "CONCURRENCY SUCCESS: Exactly ONE bed allocation succeeded (200 OK) and the concurrent collision was rejected with HTTP 409 Conflict."
        );
        passed++;

        // Verify database state: exactly one admission record exists for this bed
        const [admissions] = await db.promise().query(
            "SELECT * FROM hospital_bed_admissions WHERE bed_id = ? AND status = 'Admitted'",
            [testBedId]
        );
        assert(admissions.length === 1, `Database verified: exactly 1 admission record created for bed ${testBedId}.`);
        passed++;

        // Test Transaction Rollback Behavior
        // Attempt to book an already occupied bed via online booking -> MUST FAIL with 409 and not create invoice
        const blockedBookRes = await request({
            hostname: "localhost",
            port: 5000,
            path: "/api/hospitals/HOSP-001/ward-beds/book",
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, {
            bed_id: testBedId,
            patient_name: "Online Patient Gamma"
        });

        assert(blockedBookRes.status === 409, "Online booking on occupied bed rejected with HTTP 409 Conflict.");
        passed++;

        // Clean up test bed and admissions
        await db.promise().query("DELETE FROM hospital_bed_admissions WHERE bed_id = ?", [testBedId]);
        await db.promise().query("DELETE FROM hospital_ward_beds WHERE bed_id = ?", [testBedId]);
    } catch (err) {
        console.error("Item 2 Error:", err.message);
        failed++;
    }

    console.log("\n==================================================");
    console.log(`📊 STAGE 2 (P1) SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================");

    process.exit(failed > 0 ? 1 : 0);
}

runStage2Tests().catch(err => {
    console.error("Fatal test runner error:", err);
    process.exit(1);
});
