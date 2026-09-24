const express = require("express");
const router = express.Router();
const db = require("../config/db");
const {
    authenticateToken,
    requireRole,
    generateToken,
    optionalToken,
    verifyPassword,
    hashPassword,
    isLegacyPlainPassword,
    requireDoctorOrStaff
} = require("../middleware/auth.middleware");

// =========================================================
// DOCTOR AUTHENTICATION & MANAGEMENT
// =========================================================

// DOCTOR LOGIN WITH DOCTOR ID & PASSWORD
router.post("/api/doctor/login", async (req, res) => {
    const { doctorId, password } = req.body;

    if (!doctorId || !String(doctorId).trim()) {
        return res.status(400).json({
            success: false,
            message: "Doctor ID or Registered Mobile/Email is required."
        });
    }

    if (!password) {
        return res.status(400).json({
            success: false,
            message: "Doctor password or PIN is required."
        });
    }

    const cleanId = String(doctorId).trim();

    try {
        const [results] = await db.promise().query(`
            SELECT 
                d.id,
                d.doctor_id,
                d.name,
                d.specialization,
                d.department,
                d.hospital_id,
                d.mobile,
                d.email,
                d.password,
                d.status,
                h.hospital_name
            FROM doctors d
            LEFT JOIN hospitals h ON d.hospital_id = h.hospital_id
            WHERE d.doctor_id = ? OR d.mobile = ? OR d.email = ?
            LIMIT 1
        `, [cleanId, cleanId, cleanId]);

        if (!results.length) {
            return res.status(401).json({
                success: false,
                message: `Doctor ID "${cleanId}" not found in hospital medical registry.`
            });
        }

        const doc = results[0];

        // Secure password verification
        if (!verifyPassword(password, doc.password)) {
            return res.status(401).json({
                success: false,
                message: "Incorrect password for Doctor profile."
            });
        }

        if (isLegacyPlainPassword(doc.password)) {
            db.promise().query(
                "UPDATE doctors SET password = ? WHERE id = ?",
                [hashPassword(password), doc.id]
            ).catch(e => console.warn("Doctor password upgrade error:", e.message));
        }

        const doctorData = {
            id: doc.id,
            doctorId: doc.doctor_id,
            name: doc.name,
            specialization: doc.specialization,
            department: doc.department || "healthcare",
            hospitalId: doc.hospital_id,
            hospitalName: doc.hospital_name || "SmartCity Hospital",
            role: "doctor",
            type: "doctor"
        };

        const token = generateToken(doctorData, "doctor");

        res.json({
            success: true,
            message: `Welcome back, ${doc.name}`,
            doctor: doctorData,
            token
        });
    } catch (err) {
        console.error("[DOCTOR LOGIN ERROR]", err);
        res.status(500).json({
            success: false,
            message: "Server error during doctor authentication."
        });
    }
});

// GET ALL DOCTORS
router.get("/api/doctors", (req, res) => {
    const sql = `
        SELECT
            id,
            doctor_id,
            hospital_id,
            name,
            specialization,
            department,
            qualification,
            experience,
            mobile,
            email,
            consultation_fee,
            status,
            created_at
        FROM doctors
        ORDER BY name ASC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Get doctors error:", err);
            return res.status(500).json({
                message: "Database error."
            });
        }

        res.json({
            message: "Doctors fetched successfully.",
            doctors: results
        });
    });
});

// ADD DOCTOR
router.post("/api/doctors", authenticateToken, requireRole(["staff", "admin"]), (req, res) => {
    const {
        doctorId,
        name,
        specialization,
        department,
        qualification,
        experience,
        mobile,
        email,
        consultationFee,
        status
    } = req.body;

    if (!doctorId || !name) {
        return res.status(400).json({
            message: "Doctor ID and name are required."
        });
    }

    const sql = `
        INSERT INTO doctors
        (
            doctor_id,
            name,
            specialization,
            department,
            qualification,
            experience,
            mobile,
            email,
            consultation_fee,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            doctorId,
            name,
            specialization || null,
            department || null,
            qualification || null,
            Number(experience || 0),
            mobile || null,
            email || null,
            Number(consultationFee || 0),
            status || "Available"
        ],
        (err, result) => {
            if (err) {
                console.error("Add doctor error:", err);
                if (err.code === "ER_DUP_ENTRY") {
                    return res.status(409).json({
                        message: "Doctor ID already exists."
                    });
                }
                return res.status(500).json({
                    message: "Database error."
                });
            }

            res.status(201).json({
                message: "Doctor added successfully.",
                doctor: {
                    id: result.insertId,
                    doctorId,
                    name,
                    specialization,
                    department,
                    qualification,
                    experience: Number(experience || 0),
                    mobile,
                    email,
                    consultationFee: Number(consultationFee || 0),
                    status: status || "Available"
                }
            });
        }
    );
});

// UPDATE DOCTOR
router.put("/api/doctors/:id", authenticateToken, requireRole(["staff", "admin"]), (req, res) => {
    const id = req.params.id;
    const {
        name,
        specialization,
        department,
        qualification,
        experience,
        mobile,
        email,
        consultationFee,
        status
    } = req.body;

    const sql = `
        UPDATE doctors
        SET
            name = ?,
            specialization = ?,
            department = ?,
            qualification = ?,
            experience = ?,
            mobile = ?,
            email = ?,
            consultation_fee = ?,
            status = ?
        WHERE id = ?
    `;

    db.query(
        sql,
        [
            name,
            specialization || null,
            department || null,
            qualification || null,
            Number(experience || 0),
            mobile || null,
            email || null,
            Number(consultationFee || 0),
            status || "Available",
            id
        ],
        (err, result) => {
            if (err) {
                console.error("Update doctor error:", err);
                return res.status(500).json({
                    message: "Database error."
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Doctor not found."
                });
            }

            res.json({
                message: "Doctor updated successfully."
            });
        }
    );
});

// DELETE DOCTOR
router.delete("/api/doctors/:id", authenticateToken, requireRole(["staff", "admin"]), (req, res) => {
    const id = req.params.id;

    const sql = `
        DELETE FROM doctors
        WHERE id = ?
    `;

    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error("Delete doctor error:", err);
            return res.status(500).json({
                message: "Database error."
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Doctor not found."
            });
        }

        res.json({
            message: "Doctor deleted successfully."
        });
    });
});

// =========================================================
// DOCTOR SLOTS
// =========================================================

// GET ALL SLOTS
router.get("/api/doctor-slots", (req, res) => {
    const sql = `
        SELECT
            s.id,
            s.doctor_id,
            d.name AS doctor_name,
            d.specialization,
            s.slot_date,
            s.start_time,
            s.end_time,
            s.max_patients,
            s.booked_patients,
            s.status
        FROM doctor_slots s
        LEFT JOIN doctors d
            ON s.doctor_id = d.doctor_id
        ORDER BY s.slot_date ASC, s.start_time ASC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Get doctor slots error:", err);
            return res.status(500).json({
                message: "Database error."
            });
        }

        res.json({
            message: "Doctor slots fetched successfully.",
            slots: results
        });
    });
});

// GET SLOTS OF ONE DOCTOR
router.get("/api/doctors/:doctorId/slots", (req, res) => {
    const doctorId = req.params.doctorId;

    const sql = `
        SELECT
            id,
            doctor_id,
            slot_date,
            start_time,
            end_time,
            max_patients,
            booked_patients,
            status
        FROM doctor_slots
        WHERE doctor_id = ?
        ORDER BY slot_date ASC, start_time ASC
    `;

    db.query(sql, [doctorId], (err, results) => {
        if (err) {
            console.error("Doctor slots error:", err);
            return res.status(500).json({
                message: "Database error."
            });
        }

        res.json({
            slots: results
        });
    });
});

// ADD SLOT
router.post("/api/doctor-slots", authenticateToken, requireRole(["staff", "admin"]), (req, res) => {
    const { doctorId, slotDate, startTime, endTime, maxPatients } = req.body;

    if (!doctorId || !slotDate || !startTime || !endTime) {
        return res.status(400).json({
            message: "Doctor, date, start time and end time are required."
        });
    }

    const sql = `
        INSERT INTO doctor_slots
        (
            doctor_id,
            slot_date,
            start_time,
            end_time,
            max_patients,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            doctorId,
            slotDate,
            startTime,
            endTime,
            Number(maxPatients || 1),
            "Available"
        ],
        (err, result) => {
            if (err) {
                console.error("Add slot error:", err);
                return res.status(500).json({
                    message: "Database error."
                });
            }

            res.status(201).json({
                message: "Doctor slot created successfully.",
                slot: {
                    id: result.insertId,
                    doctorId,
                    slotDate,
                    startTime,
                    endTime,
                    maxPatients: Number(maxPatients || 1),
                    bookedPatients: 0,
                    status: "Available"
                }
            });
        }
    );
});

// DELETE SLOT
router.delete("/api/doctor-slots/:id", authenticateToken, requireRole(["staff", "admin"]), (req, res) => {
    const id = req.params.id;

    const sql = `
        DELETE FROM doctor_slots
        WHERE id = ?
    `;

    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error("Delete slot error:", err);
            return res.status(500).json({
                message: "Database error."
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Slot not found."
            });
        }

        res.json({
            message: "Doctor slot deleted successfully."
        });
    });
});

// =========================================================
// DOCTOR CLINICAL DASHBOARD APIs
// =========================================================

/**
 * GET /api/doctor/:doctorId/appointments
 * Retrieves all appointments assigned to a specific doctor, joined with patient demographics.
 */
router.get("/api/doctor/:doctorId/appointments", authenticateToken, requireDoctorOrStaff, (req, res) => {
    const doctorId = req.params.doctorId;

    if (!doctorId) {
        return res.status(400).json({ success: false, message: "Doctor ID is required." });
    }

    const sql = `
        SELECT
            a.id,
            a.patient_id,
            a.doctor_id,
            a.doctor AS doctor_name,
            a.hospital_id,
            a.appointment_date,
            a.appointment_time,
            a.status,
            a.token_number,
            a.created_at,
            p.name AS patient_name,
            p.age AS patient_age,
            p.gender AS patient_gender,
            p.mobile AS patient_mobile,
            p.blood_group AS patient_blood_group,
            h.hospital_name
        FROM appointments a
        LEFT JOIN patients p ON a.patient_id = p.patient_id
        LEFT JOIN hospitals h ON a.hospital_id = h.hospital_id
        WHERE a.doctor_id = ?
           OR a.doctor_id = (SELECT doctor_id FROM doctors WHERE id = ? OR doctor_id = ? LIMIT 1)
           OR a.doctor = (SELECT name FROM doctors WHERE id = ? OR doctor_id = ? LIMIT 1)
        ORDER BY a.appointment_date DESC, a.appointment_time ASC
    `;

    db.query(sql, [doctorId, doctorId, doctorId, doctorId, doctorId], (err, results) => {
        if (err) {
            console.error("[DOCTOR APPOINTMENTS ERROR]", err);
            return res.status(500).json({ success: false, message: "Database error." });
        }

        res.json({
            success: true,
            doctorId,
            count: results.length,
            appointments: results
        });
    });
});

/**
 * GET /api/doctor/patient-history/:patientId
 * Instant comprehensive medical dossier: demographics, past visits, diagnoses, reports, prescriptions.
 */
router.get("/api/doctor/patient-history/:patientId", authenticateToken, requireDoctorOrStaff, async (req, res) => {
    const patientId = req.params.patientId.trim();

    if (!patientId) {
        return res.status(400).json({ success: false, message: "Patient ID is required." });
    }

    try {
        // 1. Patient Profile
        const [patients] = await db.promise().query(
            "SELECT id, patient_id, name, age, gender, mobile, blood_group, address, created_at FROM patients WHERE patient_id = ? LIMIT 1",
            [patientId]
        );

        if (!patients.length) {
            return res.status(404).json({ success: false, message: "Patient ID not found in hospital registry." });
        }
        const patient = patients[0];

        // 2. Past Consultations / Medical Records ("Kahan dawa karwaya")
        const [records] = await db.promise().query(
            "SELECT id, patient_id, doctor_name, diagnosis, symptoms, treatment, notes, record_date, created_at FROM patient_records WHERE patient_id = ? ORDER BY record_date DESC, id DESC",
            [patientId]
        );

        // 3. Diagnostic / Lab Reports (patient_reports + test_bookings)
        const [reports] = await db.promise().query(
            "SELECT id, patient_id, title, report_type, doctor_name, hospital_name, status, file_path, report_date, created_at FROM patient_reports WHERE patient_id = ? ORDER BY report_date DESC, id DESC",
            [patientId]
        );

        const [testBookings] = await db.promise().query(`
            SELECT 
                tb.id, 
                tb.patient_id, 
                tb.test_name AS title, 
                'Diagnostic Lab' AS report_type, 
                COALESCE(tb.doctor_name, 'Attending Pathologist') AS doctor_name, 
                COALESCE(h.hospital_name, 'Hospital Diagnostic Wing') AS hospital_name, 
                CONCAT(tb.status, ' (Token: ', COALESCE(tb.token_number, 'N/A'), ')') AS status, 
                NULL AS file_path, 
                tb.booking_date AS report_date, 
                tb.created_at,
                tb.booking_id,
                tb.token_number,
                tb.amount,
                tb.qr_token
            FROM test_bookings tb
            LEFT JOIN hospitals h ON tb.hospital_id = h.hospital_id
            WHERE tb.patient_id = ?
            ORDER BY tb.booking_date DESC, tb.id DESC
        `, [patientId]);

        const allReports = [...reports, ...testBookings];

        // 4. Prescriptions
        const [prescriptions] = await db.promise().query(
            "SELECT id, patient_id, doctor_name, prescription_file, status, created_at FROM prescriptions WHERE patient_id = ? ORDER BY created_at DESC, id DESC",
            [patientId]
        );

        // 5. Past Appointments
        const [appointments] = await db.promise().query(`
            SELECT a.id, a.doctor_id, a.doctor AS doctor_name, a.appointment_date, a.appointment_time, a.status, a.created_at, h.hospital_name
            FROM appointments a
            LEFT JOIN hospitals h ON a.hospital_id = h.hospital_id
            WHERE a.patient_id = ?
            ORDER BY a.appointment_date DESC, a.appointment_time DESC
        `, [patientId]);

        res.json({
            success: true,
            patient,
            records,
            reports: allReports,
            prescriptions,
            appointments
        });
    } catch (err) {
        console.error("[PATIENT HISTORY ERROR]", err);
        res.status(500).json({ success: false, message: "Failed to load patient medical history." });
    }
});

/**
 * POST /api/doctor/consultation
 * Doctor saves clinical consultation notes, diagnosis, and treatment for a patient.
 */
router.post("/api/doctor/consultation", authenticateToken, requireDoctorOrStaff, async (req, res) => {
    let { patientId, doctorId, doctorName, appointmentId, diagnosis, symptoms, treatment, notes, recordDate } = req.body;

    if (!patientId || (!diagnosis && !treatment && !notes)) {
        return res.status(400).json({
            success: false,
            message: "Patient ID and at least a diagnosis or treatment note are required."
        });
    }

    try {
        // Auto-lookup doctor name if doctorId was provided
        if (!doctorName && doctorId) {
            const [docRows] = await db.promise().query(
                "SELECT name, specialization FROM doctors WHERE doctor_id = ? OR id = ? LIMIT 1",
                [doctorId, doctorId]
            );
            if (docRows.length) {
                doctorName = docRows[0].name;
            }
        }

        // Insert into patient_records
        const insertSql = `
            INSERT INTO patient_records
            (patient_id, doctor_name, diagnosis, symptoms, treatment, notes, record_date)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const [insertRes] = await db.promise().query(insertSql, [
            patientId,
            doctorName || req.user.name || "Dr. Medical Officer",
            diagnosis || null,
            symptoms || null,
            treatment || null,
            notes || null,
            recordDate || new Date()
        ]);

        // If an appointment ID was provided, mark it Completed
        if (appointmentId) {
            await db.promise().query(
                "UPDATE appointments SET status = 'Completed' WHERE id = ?",
                [appointmentId]
            );

            // Emit real-time update
            const io = req.app.get("io");
            if (io) {
                io.emit("appointment:status-updated", {
                    appointmentId,
                    status: "Completed",
                    patientId,
                    doctorId
                });
            }
        }

        res.status(201).json({
            success: true,
            message: "Consultation record saved and appointment completed.",
            recordId: insertRes.insertId
        });
    } catch (err) {
        console.error("[CONSULTATION SAVE ERROR]", err);
        res.status(500).json({ success: false, message: "Failed to save consultation." });
    }
});

/**
 * PUT /api/appointments/:id/status
 * Updates appointment status (e.g. 'In Consultation', 'Completed', 'Cancelled', 'Confirmed')
 */
router.put("/api/appointments/:id/status", authenticateToken, requireDoctorOrStaff, (req, res) => {
    const appointmentId = req.params.id;
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ success: false, message: "Status is required." });
    }

    const sql = "UPDATE appointments SET status = ? WHERE id = ?";
    db.query(sql, [status, appointmentId], (err, result) => {
        if (err) {
            console.error("[APPOINTMENT STATUS ERROR]", err);
            return res.status(500).json({ success: false, message: "Database error." });
        }

        // Broadcast real-time status update
        const io = req.app.get("io");
        if (io) {
            io.emit("appointment:status-updated", {
                appointmentId,
                status
            });
        }

        res.json({
            success: true,
            message: `Appointment status updated to ${status}.`
        });
    });
});

/**
 * POST /api/doctor/order-tests
 * Doctor directly requests diagnostic tests for a patient during consultation
 */
router.post("/api/doctor/order-tests", authenticateToken, requireDoctorOrStaff, async (req, res) => {
    const {
        patientId,
        hospitalId,
        doctorId,
        doctorName,
        testIds, // array of test IDs e.g. ['TEST-CBC-001', 'TEST-LFT-001']
        notes
    } = req.body;

    if (!patientId || !testIds || !Array.isArray(testIds) || testIds.length === 0) {
        return res.status(400).json({
            success: false,
            message: "patientId and a non-empty array of testIds are required."
        });
    }

    try {
        const p = db.promise();

        // 1. Fetch patient details
        const [patRows] = await p.query("SELECT name, age, gender, mobile, hospital_id FROM patients WHERE patient_id = ?", [patientId]);
        const patient = patRows[0] || { name: "Patient", age: 30, gender: "Other", mobile: null };
        const effectiveHospitalId = hospitalId || patient.hospital_id || "HOSP-001";

        // 2. Fetch doctor details if needed
        let effectiveDocName = doctorName;
        if (!effectiveDocName && doctorId) {
            const [docRows] = await p.query("SELECT name FROM doctors WHERE doctor_id = ?", [doctorId]);
            if (docRows.length) effectiveDocName = docRows[0].name;
        }
        if (!effectiveDocName) effectiveDocName = "Dr. Consulting Physician";

        const today = new Date().toISOString().split("T")[0];
        const createdOrders = [];

        for (const testId of testIds) {
            const [tRows] = await p.query("SELECT name, code, price FROM diagnostic_tests WHERE test_id = ?", [testId]);
            if (!tRows.length) continue;
            const t = tRows[0];

            // Generate token number
            const [countRows] = await p.query(
                "SELECT COUNT(*) AS total FROM test_bookings WHERE hospital_id = ? AND test_id = ? AND booking_date = ?",
                [effectiveHospitalId, testId, today]
            );
            const seq = (countRows[0]?.total || 0) + 1;
            const prefix = (t.code && t.code[0]) ? t.code[0].toUpperCase() : "D";
            const tokenNumber = `${prefix}-${String(seq).padStart(3, "0")}`;

            const yr = new Date().getFullYear();
            const rand = Math.floor(10000 + Math.random() * 90000);
            const bookingId = `TB-DOC-${yr}-${rand}`;
            const qrToken = `QR-TB-DOC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

            await p.query(`
                INSERT INTO test_bookings
                (booking_id, booking_type, hospital_id, test_id, test_name, patient_id, patient_name, patient_mobile, patient_age, patient_gender, doctor_id, doctor_name, booking_date, time_slot, token_number, amount, payment_method, payment_status, status, qr_token)
                VALUES (?, 'DOCTOR_ORDER', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Immediate OPD Order', ?, ?, 'Hospital Desk', 'Pending', 'ORDERED', ?)
            `, [
                bookingId,
                effectiveHospitalId,
                testId,
                t.name,
                patientId,
                patient.name,
                patient.mobile,
                patient.age,
                patient.gender,
                doctorId || null,
                effectiveDocName,
                today,
                tokenNumber,
                Number(t.price || 0),
                qrToken
            ]);

            createdOrders.push({
                booking_id: bookingId,
                test_id: testId,
                test_name: t.name,
                token_number: tokenNumber,
                amount: Number(t.price || 0)
            });
        }

        // Notification for Lab
        await p.query(`
            INSERT INTO hospital_notifications (hospital_id, recipient_role, title, message, category)
            VALUES (?, 'lab', ?, ?, 'test_booking')
        `, [
            effectiveHospitalId,
            `Doctor Ordered Tests: ${patient.name}`,
            `${effectiveDocName} ordered ${createdOrders.length} diagnostic test(s) for patient ${patient.name} (${patientId}).`
        ]);

        res.status(201).json({
            success: true,
            message: `Successfully placed ${createdOrders.length} test order(s) for ${patient.name}.`,
            orders: createdOrders
        });
    } catch (err) {
        console.error("[DOCTOR ORDER TESTS ERROR]", err);
        res.status(500).json({ success: false, message: "Failed to order tests." });
    }
});

module.exports = router;

