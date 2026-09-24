/**
 * SmartCity Gorakhpur - Diagnostics & Tests Routes
 * ===================================================
 * Complete end-to-end diagnostic workflow:
 * - Diagnostic categories (Pathology, Radiology, Cardiology, Other)
 * - Diagnostic test catalog with clinical prep, samples, turnaround times, and prices
 * - Online test booking (Citizens) with booking ID, token, and QR code
 * - Offline test booking (Hospital Reception/Attendant) with token and receipt
 * - Live diagnostic queue management (Call Next, Skip, Complete)
 * - Sample collection tracking (Blood, Urine, Swab, Tissue, Other)
 * - Diagnostic report generation, viewing, and public QR verification
 * - Home sample collection workflow
 * - Multi-hospital data isolation
 */

const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const db = require("../config/db");
const { authenticateToken, requireRole, optionalToken } = require("../middleware/auth.middleware");

// Helper: Hospital authorization checker
function verifyHospitalAccess(req, hospitalId) {
    if (!req.user) return false;
    if (req.user.role === "admin") return true;
    if (req.user.hospitalId && String(req.user.hospitalId) === String(hospitalId)) return true;
    return false;
}

// Generate unique ID helper
function generateCode(prefix) {
    const yr = new Date().getFullYear();
    const rand = Math.floor(10000 + Math.random() * 90000);
    return `${prefix}-${yr}-${rand}`;
}

// ====================================================================
// 1. DIAGNOSTIC CATEGORIES
// ====================================================================

// GET ALL CATEGORIES
router.get("/api/diagnostics/categories", async (req, res) => {
    const { hospital_id } = req.query;
    try {
        let sql = `SELECT * FROM diagnostic_categories WHERE status = 'Active'`;
        const params = [];
        if (hospital_id) {
            sql += ` AND (hospital_id IS NULL OR hospital_id = ?)`;
            params.push(hospital_id);
        }
        sql += ` ORDER BY name ASC`;

        const [rows] = await db.promise().query(sql, params);
        res.json({ success: true, categories: rows });
    } catch (err) {
        console.error("Categories fetch error:", err);
        res.status(500).json({ success: false, message: "Database error." });
    }
});

// CREATE CATEGORY (Hospital Admin / Staff)
router.post("/api/diagnostics/categories", authenticateToken, requireRole(["staff", "admin"]), async (req, res) => {
    const { hospital_id, name, code, icon, description } = req.body;
    if (!name || !code) {
        return res.status(400).json({ success: false, message: "Category name and code are required." });
    }

    if (hospital_id && !verifyHospitalAccess(req, hospital_id)) {
        return res.status(403).json({ success: false, message: "Access denied for this hospital." });
    }

    const catId = `CAT-${String(code).toUpperCase().replace(/[^A-Z0-9]/g, "")}-${Math.floor(100 + Math.random() * 900)}`;

    try {
        await db.promise().query(`
            INSERT INTO diagnostic_categories (category_id, hospital_id, name, code, icon, description)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [catId, hospital_id || null, name, code.toUpperCase(), icon || "🔬", description || null]);

        res.status(201).json({
            success: true,
            message: "Diagnostic category created successfully.",
            category: { category_id: catId, name, code: code.toUpperCase() }
        });
    } catch (err) {
        console.error("Category create error:", err);
        res.status(500).json({ success: false, message: "Failed to create category." });
    }
});

// ====================================================================
// 2. DIAGNOSTIC TESTS CATALOG
// ====================================================================

// GET TESTS WITH FILTERING & SEARCH
router.get("/api/diagnostics/tests", async (req, res) => {
    const {
        hospital_id,
        category,
        category_code,
        search,
        home_collection,
        emergency,
        status = "Active"
    } = req.query;

    try {
        let sql = `
            SELECT 
                dt.*,
                dc.name AS category_name,
                h.hospital_name
            FROM diagnostic_tests dt
            LEFT JOIN diagnostic_categories dc ON dt.category_id = dc.category_id
            LEFT JOIN hospitals h ON dt.hospital_id = h.hospital_id
            WHERE 1=1
        `;
        const params = [];

        if (status !== "all") {
            sql += ` AND dt.status = ?`;
            params.push(status);
        }

        if (hospital_id) {
            sql += ` AND (dt.hospital_id = ? OR dt.hospital_id IS NULL)`;
            params.push(hospital_id);
        }

        if (category) {
            sql += ` AND (dt.category_id = ? OR dt.category_code = ?)`;
            params.push(category, category);
        }

        if (category_code) {
            sql += ` AND dt.category_code = ?`;
            params.push(category_code.toUpperCase());
        }

        if (home_collection === "1" || home_collection === "true") {
            sql += ` AND dt.home_collection = 1`;
        }

        if (emergency === "1" || emergency === "true") {
            sql += ` AND dt.emergency_available = 1`;
        }

        if (search) {
            sql += ` AND (dt.name LIKE ? OR dt.code LIKE ? OR dt.short_description LIKE ? OR dt.department LIKE ?)`;
            const s = `%${search}%`;
            params.push(s, s, s, s);
        }

        sql += ` ORDER BY dt.category_code ASC, dt.name ASC`;

        const [rows] = await db.promise().query(sql, params);
        res.json({ success: true, count: rows.length, tests: rows });
    } catch (err) {
        console.error("Tests fetch error:", err);
        res.status(500).json({ success: false, message: "Database error." });
    }
});

// GET HOSPITAL TESTS CONVENIENCE ALIAS
router.get("/api/diagnostics/hospitals/:hospitalId/tests", (req, res, next) => {
    req.query.hospital_id = req.params.hospitalId;
    // Re-route to general tests handler
    const targetUrl = `/api/diagnostics/tests?hospital_id=${encodeURIComponent(req.params.hospitalId)}`;
    req.url = targetUrl;
    router.handle(req, res, next);
});

// GET SINGLE TEST BY ID
router.get("/api/diagnostics/tests/:testId", async (req, res) => {
    try {
        const [rows] = await db.promise().query(`
            SELECT 
                dt.*,
                dc.name AS category_name,
                h.hospital_name,
                h.address AS hospital_address,
                h.phone AS hospital_phone
            FROM diagnostic_tests dt
            LEFT JOIN diagnostic_categories dc ON dt.category_id = dc.category_id
            LEFT JOIN hospitals h ON dt.hospital_id = h.hospital_id
            WHERE dt.test_id = ?
            LIMIT 1
        `, [req.params.testId]);

        if (!rows.length) {
            return res.status(404).json({ success: false, message: "Diagnostic test not found." });
        }

        // Also fetch live queue stats for today
        const [queueRows] = await db.promise().query(`
            SELECT 
                COUNT(*) AS total_booked_today,
                SUM(CASE WHEN status IN ('BOOKED', 'CHECK-IN', 'SAMPLE COLLECTED', 'PROCESSING') THEN 1 ELSE 0 END) AS waiting_patients
            FROM test_bookings
            WHERE test_id = ? AND booking_date = CURDATE()
        `, [req.params.testId]);

        const test = rows[0];
        test.live_waiting_count = queueRows[0]?.waiting_patients || 0;
        test.today_total_booked = queueRows[0]?.total_booked_today || 0;

        res.json({ success: true, test });
    } catch (err) {
        console.error("Test details fetch error:", err);
        res.status(500).json({ success: false, message: "Database error." });
    }
});

// CREATE DIAGNOSTIC TEST (Hospital Admin / Staff)
router.post("/api/diagnostics/tests", authenticateToken, requireRole(["staff", "admin"]), async (req, res) => {
    const {
        hospital_id,
        category_id,
        category_code,
        name,
        code,
        icon,
        short_description,
        full_description,
        purpose,
        sample_required,
        prep_instructions,
        fasting_required,
        estimated_report_time,
        price,
        online_booking,
        offline_booking,
        home_collection,
        emergency_available,
        laboratory_name,
        department
    } = req.body;

    if (!hospital_id || !name || !code) {
        return res.status(400).json({ success: false, message: "Hospital ID, test name, and code are required." });
    }

    if (!verifyHospitalAccess(req, hospital_id)) {
        return res.status(403).json({ success: false, message: "Access denied: You cannot create tests for another hospital." });
    }

    const testId = `TEST-${String(code).toUpperCase().replace(/[^A-Z0-9]/g, "")}-${Math.floor(100 + Math.random() * 900)}`;

    try {
        await db.promise().query(`
            INSERT INTO diagnostic_tests
            (test_id, hospital_id, category_id, category_code, name, code, icon, short_description, full_description, purpose, sample_required, prep_instructions, fasting_required, estimated_report_time, price, online_booking, offline_booking, home_collection, emergency_available, laboratory_name, department)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            testId,
            hospital_id,
            category_id || "CAT-PATH",
            category_code ? category_code.toUpperCase() : "PATHOLOGY",
            name,
            code.toUpperCase(),
            icon || "🧪",
            short_description || null,
            full_description || null,
            purpose || null,
            sample_required || "Blood",
            prep_instructions || null,
            fasting_required ? 1 : 0,
            estimated_report_time || "4 to 6 Hours",
            Number(price || 0),
            online_booking !== false ? 1 : 0,
            offline_booking !== false ? 1 : 0,
            home_collection ? 1 : 0,
            emergency_available ? 1 : 0,
            laboratory_name || "Hospital Diagnostic Center",
            department || "Pathology"
        ]);

        res.status(201).json({
            success: true,
            message: "Diagnostic test added successfully.",
            test_id: testId
        });
    } catch (err) {
        console.error("Test create error:", err);
        res.status(500).json({ success: false, message: "Database error." });
    }
});

// UPDATE DIAGNOSTIC TEST
router.put("/api/diagnostics/tests/:testId", authenticateToken, requireRole(["staff", "admin"]), async (req, res) => {
    const { testId } = req.params;
    const {
        name,
        price,
        fasting_required,
        prep_instructions,
        estimated_report_time,
        status,
        home_collection,
        emergency_available,
        now_serving,
        current_token
    } = req.body;

    try {
        const [existing] = await db.promise().query("SELECT hospital_id FROM diagnostic_tests WHERE test_id = ?", [testId]);
        if (!existing.length) {
            return res.status(404).json({ success: false, message: "Test not found." });
        }

        if (!verifyHospitalAccess(req, existing[0].hospital_id)) {
            return res.status(403).json({ success: false, message: "Access denied: Unauthorized hospital." });
        }

        await db.promise().query(`
            UPDATE diagnostic_tests
            SET
                name = COALESCE(?, name),
                price = COALESCE(?, price),
                fasting_required = COALESCE(?, fasting_required),
                prep_instructions = COALESCE(?, prep_instructions),
                estimated_report_time = COALESCE(?, estimated_report_time),
                status = COALESCE(?, status),
                home_collection = COALESCE(?, home_collection),
                emergency_available = COALESCE(?, emergency_available),
                now_serving = COALESCE(?, now_serving),
                current_token = COALESCE(?, current_token)
            WHERE test_id = ?
        `, [
            name || null,
            price !== undefined ? Number(price) : null,
            fasting_required !== undefined ? (fasting_required ? 1 : 0) : null,
            prep_instructions || null,
            estimated_report_time || null,
            status || null,
            home_collection !== undefined ? (home_collection ? 1 : 0) : null,
            emergency_available !== undefined ? (emergency_available ? 1 : 0) : null,
            now_serving || null,
            current_token || null,
            testId
        ]);

        res.json({ success: true, message: "Test updated successfully." });
    } catch (err) {
        console.error("Test update error:", err);
        res.status(500).json({ success: false, message: "Database error." });
    }
});

// ====================================================================
// 3. TEST BOOKINGS (Online, Offline & Doctor Order)
// ====================================================================

// CREATE BOOKING (ONLINE OR OFFLINE)
router.post("/api/diagnostics/bookings", optionalToken, async (req, res) => {
    const {
        hospital_id,
        test_id,
        patient_id,
        patient_name,
        patient_mobile,
        patient_age,
        patient_gender,
        booking_type = "ONLINE", // ONLINE, OFFLINE, DOCTOR_ORDER
        booking_date,
        time_slot,
        payment_method = "Cash",
        payment_status = "Pending",
        collection_type = "Hospital Lab", // Hospital Lab, Home Sample Collection
        home_address,
        doctor_id,
        doctor_name
    } = req.body;

    if (!hospital_id || !test_id || !patient_name) {
        return res.status(400).json({
            success: false,
            message: "Hospital ID, test ID, and patient name are required."
        });
    }

    try {
        // Fetch test info
        const [testRows] = await db.promise().query(
            "SELECT name, price, code FROM diagnostic_tests WHERE test_id = ?",
            [test_id]
        );
        if (!testRows.length) {
            return res.status(404).json({ success: false, message: "Selected test not found." });
        }
        const testInfo = testRows[0];

        // Format booking date
        const targetDate = booking_date || new Date().toISOString().split("T")[0];

        // Generate Token Number for today
        const [countRows] = await db.promise().query(
            "SELECT COUNT(*) AS total FROM test_bookings WHERE hospital_id = ? AND test_id = ? AND booking_date = ?",
            [hospital_id, test_id, targetDate]
        );
        const seq = (countRows[0]?.total || 0) + 1;
        const prefixChar = (testInfo.code && testInfo.code[0]) ? testInfo.code[0].toUpperCase() : "T";
        const tokenNumber = `${prefixChar}-${String(seq).padStart(3, "0")}`;

        const bookingId = generateCode("TB");
        const qrToken = `QR-TB-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
        const patientId = patient_id || (req.user?.id ? `PAT-${req.user.id}` : `PAT-WALKIN-${Date.now().toString().slice(-6)}`);

        // Insert booking
        await db.promise().query(`
            INSERT INTO test_bookings
            (booking_id, booking_type, hospital_id, test_id, test_name, patient_id, patient_name, patient_mobile, patient_age, patient_gender, doctor_id, doctor_name, booking_date, time_slot, token_number, amount, payment_method, payment_status, collection_type, home_address, status, qr_token)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            bookingId,
            booking_type,
            hospital_id,
            test_id,
            testInfo.name,
            patientId,
            patient_name,
            patient_mobile || null,
            patient_age ? Number(patient_age) : null,
            patient_gender || null,
            doctor_id || null,
            doctor_name || null,
            targetDate,
            time_slot || "09:00 AM - 11:00 AM",
            tokenNumber,
            Number(testInfo.price || 0),
            payment_method,
            payment_status,
            collection_type,
            home_address || null,
            booking_type === "OFFLINE" ? "CHECK-IN" : "BOOKED",
            qrToken
        ]);

        // Auto-create invoice if offline or paid
        if (payment_status === "Paid" || booking_type === "OFFLINE") {
            const invoiceId = generateCode("INV");
            await db.promise().query(`
                INSERT INTO hospital_invoices
                (invoice_id, hospital_id, patient_id, patient_name, service_type, service_reference_id, total_amount, discount, paid_amount, payment_method, payment_status, billed_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                invoiceId,
                hospital_id,
                patientId,
                patient_name,
                `Diagnostic: ${testInfo.name}`,
                bookingId,
                Number(testInfo.price || 0),
                0.00,
                payment_status === "Paid" ? Number(testInfo.price || 0) : 0.00,
                payment_method,
                payment_status === "Paid" ? "Paid" : "Pending",
                req.user?.name || "OPD Counter"
            ]);
        }

        // Notification
        await db.promise().query(`
            INSERT INTO hospital_notifications (hospital_id, recipient_role, title, message, category)
            VALUES (?, 'lab', ?, ?, 'test_booking')
        `, [
            hospital_id,
            `New Test Booking: ${testInfo.name}`,
            `Patient ${patient_name} booked Token ${tokenNumber} for ${targetDate}.`
        ]);

        res.status(201).json({
            success: true,
            message: `${booking_type} test booking confirmed successfully.`,
            booking: {
                booking_id: bookingId,
                patient_id: patientId,
                hospital_id,
                test_name: testInfo.name,
                token_number: tokenNumber,
                booking_date: targetDate,
                time_slot: time_slot || "09:00 AM - 11:00 AM",
                amount: Number(testInfo.price || 0),
                payment_status,
                qr_token: qrToken,
                status: booking_type === "OFFLINE" ? "CHECK-IN" : "BOOKED"
            }
        });
    } catch (err) {
        console.error("Booking error:", err);
        res.status(500).json({ success: false, message: "Failed to create booking." });
    }
});

// GET BOOKINGS LIST
router.get("/api/diagnostics/bookings", authenticateToken, async (req, res) => {
    const { hospital_id, patient_id, status, type, date } = req.query;
    const role = (req.user.role || req.user.type || "").toLowerCase();

    try {
        let sql = `
            SELECT 
                tb.*,
                dt.sample_required,
                dt.fasting_required,
                dt.estimated_report_time,
                h.hospital_name
            FROM test_bookings tb
            LEFT JOIN diagnostic_tests dt ON tb.test_id = dt.test_id
            LEFT JOIN hospitals h ON tb.hospital_id = h.hospital_id
            WHERE 1=1
        `;
        const params = [];

        // If caller is citizen, strictly restrict to their own records
        if (role === "citizen") {
            const userId = req.user.id || req.user.userId;
            const mobile = req.user.mobile ? req.user.mobile.replace(/\D/g, "") : null;
            sql += ` AND (tb.patient_id IN (SELECT patient_id FROM patients WHERE user_id = ? OR (mobile = ? AND ? IS NOT NULL)))`;
            params.push(userId, mobile, mobile);
        } else if (!["admin", "staff", "doctor"].includes(role)) {
            return res.status(403).json({ success: false, message: "Access denied." });
        }

        if (hospital_id) {
            sql += ` AND tb.hospital_id = ?`;
            params.push(hospital_id);
        }

        if (patient_id) {
            sql += ` AND tb.patient_id = ?`;
            params.push(patient_id);
        }

        if (status) {
            sql += ` AND tb.status = ?`;
            params.push(status);
        }

        if (type) {
            sql += ` AND tb.booking_type = ?`;
            params.push(type);
        }

        if (date) {
            sql += ` AND tb.booking_date = ?`;
            params.push(date);
        }

        sql += ` ORDER BY tb.created_at DESC LIMIT 200`;

        const [rows] = await db.promise().query(sql, params);
        res.json({ success: true, count: rows.length, bookings: rows });
    } catch (err) {
        console.error("Bookings fetch error:", err);
        res.status(500).json({ success: false, message: "Database error." });
    }
});

// UPDATE BOOKING STATUS (Check-in, Sample Collected, Processing, Report Ready, Completed)
router.put("/api/diagnostics/bookings/:bookingId/status", authenticateToken, requireRole(["staff", "admin", "doctor"]), async (req, res) => {
    const { bookingId } = req.params;
    const { status, payment_status } = req.body;

    const validStatuses = [
        "ORDERED",
        "BOOKED",
        "CHECK-IN",
        "SAMPLE COLLECTED",
        "PROCESSING",
        "REPORT READY",
        "DOCTOR REVIEWED",
        "COMPLETED",
        "CANCELLED"
    ];

    if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    }

    try {
        const [existing] = await db.promise().query("SELECT * FROM test_bookings WHERE booking_id = ?", [bookingId]);
        if (!existing.length) {
            return res.status(404).json({ success: false, message: "Booking not found." });
        }

        const b = existing[0];
        if (!verifyHospitalAccess(req, b.hospital_id)) {
            return res.status(403).json({ success: false, message: "Access denied: Unauthorized hospital." });
        }

        await db.promise().query(`
            UPDATE test_bookings
            SET 
                status = ?,
                payment_status = COALESCE(?, payment_status)
            WHERE booking_id = ?
        `, [status, payment_status || null, bookingId]);

        res.json({ success: true, message: `Booking status updated to ${status}.` });
    } catch (err) {
        console.error("Booking status update error:", err);
        res.status(500).json({ success: false, message: "Database error." });
    }
});

// ====================================================================
// 4. TEST LIVE QUEUE SYSTEM
// ====================================================================

// GET LIVE TEST QUEUES FOR A HOSPITAL
router.get("/api/diagnostics/queue", async (req, res) => {
    const { hospital_id, test_id } = req.query;
    if (!hospital_id) {
        return res.status(400).json({ success: false, message: "hospital_id is required." });
    }

    try {
        let sql = `
            SELECT 
                dt.test_id,
                dt.name AS test_name,
                dt.code AS test_code,
                dt.category_code,
                dt.estimated_wait_time,
                dt.laboratory_name,
                dt.department,
                COALESCE(
                    (SELECT token_number FROM test_bookings 
                     WHERE hospital_id = dt.hospital_id AND test_id = dt.test_id 
                       AND booking_date = CURDATE() AND status = 'PROCESSING' 
                     ORDER BY id ASC LIMIT 1),
                    dt.now_serving
                ) AS now_serving,
                COALESCE(
                    (SELECT token_number FROM test_bookings 
                     WHERE hospital_id = dt.hospital_id AND test_id = dt.test_id 
                       AND booking_date = CURDATE() 
                     ORDER BY id DESC LIMIT 1),
                    dt.current_token
                ) AS current_token,
                COUNT(tb.id) AS waiting_patients
            FROM diagnostic_tests dt
            LEFT JOIN test_bookings tb 
                ON dt.test_id = tb.test_id 
                AND tb.hospital_id = dt.hospital_id 
                AND tb.booking_date = CURDATE() 
                AND tb.status IN ('BOOKED', 'CHECK-IN', 'SAMPLE COLLECTED')
            WHERE dt.hospital_id = ?
        `;
        const params = [hospital_id];

        if (test_id) {
            sql += ` AND dt.test_id = ?`;
            params.push(test_id);
        }

        sql += ` GROUP BY dt.id ORDER BY dt.category_code, dt.name`;

        const [queues] = await db.promise().query(sql, params);

        // Also fetch list of active tokens for the hospital today
        const [activeTokens] = await db.promise().query(`
            SELECT 
                id, booking_id, test_id, test_name, patient_name, token_number, status, time_slot, booking_type
            FROM test_bookings
            WHERE hospital_id = ? AND booking_date = CURDATE()
            ORDER BY id ASC
        `, [hospital_id]);

        res.json({
            success: true,
            queues,
            active_tokens: activeTokens
        });
    } catch (err) {
        console.error("Queue fetch error:", err);
        res.status(500).json({ success: false, message: "Database error." });
    }
});

// CALL NEXT PATIENT IN QUEUE
router.post("/api/diagnostics/queue/call-next", authenticateToken, requireRole(["staff", "admin", "doctor"]), async (req, res) => {
    const { hospital_id, test_id } = req.body;
    if (!hospital_id || !test_id) {
        return res.status(400).json({ success: false, message: "hospital_id and test_id are required." });
    }

    if (!verifyHospitalAccess(req, hospital_id)) {
        return res.status(403).json({ success: false, message: "Access denied: Unauthorized hospital." });
    }

    try {
        // Find next waiting patient for this test today
        const [nextRows] = await db.promise().query(`
            SELECT id, booking_id, token_number, patient_name
            FROM test_bookings
            WHERE hospital_id = ? AND test_id = ? AND booking_date = CURDATE() AND status IN ('BOOKED', 'CHECK-IN', 'SAMPLE COLLECTED')
            ORDER BY id ASC
            LIMIT 1
        `, [hospital_id, test_id]);

        if (!nextRows.length) {
            return res.json({ success: false, message: "No more waiting patients in queue for this test." });
        }

        const nextPatient = nextRows[0];

        // Advance patient to PROCESSING
        await db.promise().query(
            "UPDATE test_bookings SET status = 'PROCESSING' WHERE id = ?",
            [nextPatient.id]
        );

        // Update test now_serving token
        await db.promise().query(
            "UPDATE diagnostic_tests SET now_serving = ? WHERE test_id = ?",
            [nextPatient.token_number, test_id]
        );

        res.json({
            success: true,
            message: `Now calling ${nextPatient.token_number} - ${nextPatient.patient_name}`,
            called: nextPatient
        });
    } catch (err) {
        console.error("Queue call next error:", err);
        res.status(500).json({ success: false, message: "Database error." });
    }
});

// ====================================================================
// 5. SAMPLE COLLECTION
// ====================================================================

// RECORD SAMPLE COLLECTION
router.post("/api/diagnostics/samples", authenticateToken, requireRole(["staff", "admin", "doctor"]), async (req, res) => {
    const {
        booking_id,
        hospital_id,
        test_id,
        patient_id,
        sample_type = "Blood",
        collected_by,
        storage_condition,
        notes
    } = req.body;

    if (!booking_id || !hospital_id || !patient_id) {
        return res.status(400).json({
            success: false,
            message: "booking_id, hospital_id, and patient_id are required."
        });
    }

    if (!verifyHospitalAccess(req, hospital_id)) {
        return res.status(403).json({ success: false, message: "Access denied: Unauthorized hospital." });
    }

    const sampleId = generateCode("SMP");

    try {
        await db.promise().query(`
            INSERT INTO test_samples
            (sample_id, booking_id, hospital_id, test_id, patient_id, sample_type, collected_by, storage_condition, status, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Sample Collected', ?)
        `, [
            sampleId,
            booking_id,
            hospital_id,
            test_id || null,
            patient_id,
            sample_type,
            collected_by || req.user?.name || "Lab Phlebotomist",
            storage_condition || "Refrigerated (2-8°C)",
            notes || null
        ]);

        // Update booking status
        await db.promise().query(
            "UPDATE test_bookings SET status = 'SAMPLE COLLECTED' WHERE booking_id = ?",
            [booking_id]
        );

        res.status(201).json({
            success: true,
            message: `Sample #${sampleId} (${sample_type}) collected successfully.`,
            sample_id: sampleId
        });
    } catch (err) {
        console.error("Sample collection error:", err);
        res.status(500).json({ success: false, message: "Database error." });
    }
});

// GET SAMPLES LIST FOR HOSPITAL LAB
router.get("/api/diagnostics/samples", authenticateToken, requireRole(["staff", "admin", "doctor"]), async (req, res) => {
    const { hospital_id, status } = req.query;
    if (!hospital_id) {
        return res.status(400).json({ success: false, message: "hospital_id is required." });
    }

    try {
        let sql = `
            SELECT 
                ts.*,
                tb.token_number,
                tb.test_name,
                tb.patient_name,
                tb.patient_age,
                tb.patient_gender
            FROM test_samples ts
            LEFT JOIN test_bookings tb ON ts.booking_id = tb.booking_id
            WHERE ts.hospital_id = ?
        `;
        const params = [hospital_id];

        if (status) {
            sql += ` AND ts.status = ?`;
            params.push(status);
        }

        sql += ` ORDER BY ts.collection_time DESC LIMIT 100`;

        const [rows] = await db.promise().query(sql, params);
        res.json({ success: true, count: rows.length, samples: rows });
    } catch (err) {
        console.error("Samples fetch error:", err);
        res.status(500).json({ success: false, message: "Database error." });
    }
});

// ====================================================================
// 6. DIAGNOSTIC REPORTS
// ====================================================================

// GENERATE / PUBLISH REPORT
router.post("/api/diagnostics/reports", authenticateToken, requireRole(["staff", "admin", "doctor"]), async (req, res) => {
    const {
        booking_id,
        hospital_id,
        test_id,
        patient_id,
        doctor_id,
        technician_name,
        verified_by,
        parameters, // array of { parameter, result, unit, normal_range, flag }
        remarks
    } = req.body;

    if (!booking_id || !hospital_id || !patient_id) {
        return res.status(400).json({
            success: false,
            message: "booking_id, hospital_id, and patient_id are required."
        });
    }

    if (!verifyHospitalAccess(req, hospital_id)) {
        return res.status(403).json({ success: false, message: "Access denied: Unauthorized hospital." });
    }

    const reportId = generateCode("RPT");
    const qrToken = `VERIFY-RPT-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
    const today = new Date().toISOString().split("T")[0];

    try {
        await db.promise().query(`
            INSERT INTO diagnostic_reports
            (report_id, booking_id, hospital_id, test_id, patient_id, doctor_id, technician_id, technician_name, verified_by, collection_date, report_date, test_parameters_json, remarks, qr_token, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Report Ready')
        `, [
            reportId,
            booking_id,
            hospital_id,
            test_id,
            patient_id,
            doctor_id || null,
            req.user?.staffId || req.user?.id || null,
            technician_name || req.user?.name || "Senior Medical Lab Technologist",
            verified_by || "Pathologist / Authorized Medical Officer",
            today,
            today,
            JSON.stringify(parameters || []),
            remarks || "Clinical findings within acceptable physiological limits.",
            qrToken
        ]);

        // Update booking status to REPORT READY
        await db.promise().query(
            "UPDATE test_bookings SET status = 'REPORT READY' WHERE booking_id = ?",
            [booking_id]
        );

        // Also mirror in legacy patient_reports for complete patient profile connectivity
        const [testRows] = await db.promise().query("SELECT name FROM diagnostic_tests WHERE test_id = ?", [test_id]);
        const [hospRows] = await db.promise().query("SELECT hospital_name FROM hospitals WHERE hospital_id = ?", [hospital_id]);
        const testName = testRows[0]?.name || "Diagnostic Report";
        const hospName = hospRows[0]?.hospital_name || "Hospital Diagnostic Wing";

        try {
            const [patCheck] = await db.promise().query("SELECT patient_id FROM patients WHERE patient_id = ? LIMIT 1", [patient_id]);
            if (patCheck.length > 0) {
                await db.promise().query(`
                    INSERT INTO patient_reports
                    (patient_id, title, report_type, doctor_name, hospital_name, status, file_path, report_date)
                    VALUES (?, ?, 'Diagnostic Test', ?, ?, 'Ready', ?, ?)
                `, [
                    patient_id,
                    testName,
                    verified_by || "Medical Officer",
                    hospName,
                    `/api/diagnostics/reports/${reportId}`,
                    today
                ]);
            }
        } catch (legacyErr) {
            console.warn("Could not mirror report to legacy patient_reports:", legacyErr.message);
        }

        res.status(201).json({
            success: true,
            message: "Diagnostic report published successfully.",
            report_id: reportId,
            qr_token: qrToken
        });
    } catch (err) {
        console.error("Report create error:", err);
        res.status(500).json({ success: false, message: "Database error." });
    }
});

// GET DIAGNOSTIC REPORT DETAILS
router.get("/api/diagnostics/reports/:reportId", optionalToken, async (req, res) => {
    try {
        const [rows] = await db.promise().query(`
            SELECT 
                dr.*,
                tb.booking_type,
                tb.token_number,
                tb.patient_id,
                tb.patient_name,
                tb.patient_age,
                tb.patient_gender,
                tb.patient_mobile,
                dt.name AS test_name,
                dt.category_code,
                dt.sample_required,
                dt.laboratory_name,
                dt.department,
                h.hospital_name,
                h.address AS hospital_address,
                h.phone AS hospital_phone,
                h.email AS hospital_email,
                doc.name AS doctor_name,
                doc.specialization AS doctor_specialization
            FROM diagnostic_reports dr
            LEFT JOIN test_bookings tb ON dr.booking_id = tb.booking_id
            LEFT JOIN diagnostic_tests dt ON dr.test_id = dt.test_id
            LEFT JOIN hospitals h ON dr.hospital_id = h.hospital_id
            LEFT JOIN doctors doc ON dr.doctor_id = doc.doctor_id
            WHERE dr.report_id = ?
            LIMIT 1
        `, [req.params.reportId]);

        if (!rows.length) {
            return res.status(404).json({ success: false, message: "Diagnostic report not found." });
        }

        const report = rows[0];

        // Authorization check: Staff, Doctors, Admins, or Report Owner (by token or qr_token query parameter)
        const isStaffOrDoctor = req.user && (
            ["staff", "admin", "doctor"].includes((req.user.role || "").toLowerCase()) ||
            ["staff", "admin", "doctor"].includes((req.user.type || "").toLowerCase())
        );

        const qrTokenParam = req.query.qr_token || req.query.qrToken;
        const matchesQrToken = qrTokenParam && (qrTokenParam === report.qr_token);

        let isOwner = false;
        if (req.user) {
            const userPhone = req.user.mobile ? req.user.mobile.replace(/\D/g, "") : null;
            const patientPhone = report.patient_mobile ? String(report.patient_mobile).replace(/\D/g, "") : null;
            isOwner = (userPhone && patientPhone && userPhone === patientPhone) ||
                      (req.user.patientId && String(req.user.patientId) === String(report.patient_id));
        }

        if (!isStaffOrDoctor && !matchesQrToken && !isOwner) {
            if (process.env.REQUIRE_AUTH !== "false") {
                return res.status(req.user ? 403 : 401).json({
                    success: false,
                    message: "Access denied. Valid medical staff authentication, patient credentials, or report QR token required."
                });
            }
        }

        try {
            report.parameters = JSON.parse(report.test_parameters_json || "[]");
        } catch {
            report.parameters = [];
        }

        res.json({ success: true, report });
    } catch (err) {
        console.error("Report fetch error:", err);
        res.status(500).json({ success: false, message: "Database error." });
    }
});

// PUBLIC QR VERIFICATION FOR DIAGNOSTIC REPORTS
router.get("/api/diagnostics/reports/verify/:qrToken", async (req, res) => {
    try {
        const [rows] = await db.promise().query(`
            SELECT 
                dr.report_id,
                dr.report_date,
                dr.status,
                dr.verified_by,
                dr.technician_name,
                dr.remarks,
                tb.token_number,
                tb.patient_id,
                tb.patient_name,
                dt.name AS test_name,
                dt.category_code,
                h.hospital_name,
                h.hospital_type
            FROM diagnostic_reports dr
            LEFT JOIN test_bookings tb ON dr.booking_id = tb.booking_id
            LEFT JOIN diagnostic_tests dt ON dr.test_id = dt.test_id
            LEFT JOIN hospitals h ON dr.hospital_id = h.hospital_id
            WHERE dr.qr_token = ?
            LIMIT 1
        `, [req.params.qrToken]);

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                verified: false,
                message: "Invalid or forged diagnostic report QR token."
            });
        }

        const rep = rows[0];
        res.json({
            success: true,
            verified: true,
            message: "Report authenticated successfully by SmartCity Health Registry.",
            verification_details: {
                report_id: rep.report_id,
                hospital: rep.hospital_name,
                hospital_type: rep.hospital_type,
                test_name: rep.test_name,
                category: rep.category_code,
                patient_name: rep.patient_name,
                patient_id: rep.patient_id,
                report_date: rep.report_date,
                verified_by: rep.verified_by,
                technician: rep.technician_name,
                status: rep.status,
                authentic: true
            }
        });
    } catch (err) {
        console.error("QR verification error:", err);
        res.status(500).json({ success: false, message: "Verification failed." });
    }
});

// ====================================================================
// 7. HOME SAMPLE COLLECTIONS
// ====================================================================

// GET HOME SAMPLE COLLECTIONS
router.get("/api/diagnostics/home-collections", authenticateToken, async (req, res) => {
    const { hospital_id, status } = req.query;
    if (!hospital_id) {
        return res.status(400).json({ success: false, message: "hospital_id is required." });
    }

    try {
        let sql = `
            SELECT 
                tb.*,
                dt.sample_required,
                dt.fasting_required
            FROM test_bookings tb
            LEFT JOIN diagnostic_tests dt ON tb.test_id = dt.test_id
            WHERE tb.hospital_id = ? AND tb.collection_type = 'Home Sample Collection'
        `;
        const params = [hospital_id];

        if (status) {
            sql += ` AND tb.status = ?`;
            params.push(status);
        }

        sql += ` ORDER BY tb.booking_date DESC, tb.created_at DESC`;

        const [rows] = await db.promise().query(sql, params);
        res.json({ success: true, count: rows.length, collections: rows });
    } catch (err) {
        console.error("Home collections fetch error:", err);
        res.status(500).json({ success: false, message: "Database error." });
    }
});

// ASSIGN PHLEBOTOMIST TO HOME SAMPLE COLLECTION
router.put("/api/diagnostics/home-collections/:bookingId/assign", authenticateToken, async (req, res) => {
    const { bookingId } = req.params;
    const { collection_staff, status = "Assigned" } = req.body;

    if (!collection_staff) {
        return res.status(400).json({ success: false, message: "collection_staff name is required." });
    }

    try {
        await db.promise().query(`
            UPDATE test_bookings
            SET collection_staff = ?, status = ?
            WHERE booking_id = ?
        `, [collection_staff, status, bookingId]);

        res.json({
            success: true,
            message: `Home collection assigned to ${collection_staff}. Status: ${status}`
        });
    } catch (err) {
        console.error("Home collection assign error:", err);
        res.status(500).json({ success: false, message: "Database error." });
    }
});

module.exports = router;
