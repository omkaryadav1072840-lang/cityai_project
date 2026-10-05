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

        // Secure password verification (if provided)
        if (password && !verifyPassword(password, doc.password)) {
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
    const { hospitalId } = req.query;
    let sql = `
        SELECT
            d.id,
            d.doctor_id,
            d.hospital_id,
            d.name,
            d.specialization,
            d.department,
            d.qualification,
            d.experience,
            d.mobile,
            d.email,
            d.consultation_fee,
            d.opd_room_no,
            d.available_days,
            d.consultation_timings,
            d.status,
            d.created_at,
            h.hospital_name
        FROM doctors d
        LEFT JOIN hospitals h ON d.hospital_id = h.hospital_id
    `;
    const params = [];
    if (hospitalId) {
        sql += ` WHERE d.hospital_id = ?`;
        params.push(hospitalId);
    }
    sql += ` ORDER BY d.name ASC`;

    db.query(sql, params, (err, results) => {
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

// ADD DOCTOR (Hospital Admin or Super Admin)
router.post("/api/doctors", authenticateToken, requireRole(["staff", "admin"]), async (req, res) => {
    let {
        doctorId,
        hospitalId,
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

    const userRole = (req.user.role || req.user.type || "").toLowerCase();
    const staffHospitalId = req.user.hospitalId || req.user.hospital_id;

    // Enforce Hospital Admin Data Isolation
    if (userRole !== "admin") {
        if (!staffHospitalId) {
            return res.status(403).json({ success: false, message: "Access denied. Not authorized for hospital doctor management." });
        }
        if (hospitalId && String(hospitalId).toLowerCase() !== String(staffHospitalId).toLowerCase()) {
            return res.status(403).json({ success: false, message: `Access denied. You can only manage doctors in your hospital (${staffHospitalId}).` });
        }
        hospitalId = staffHospitalId;
    }

    if (!doctorId || !name || !hospitalId) {
        return res.status(400).json({
            message: "Doctor ID, name, and hospital ID are required."
        });
    }

    try {
        const sql = `
            INSERT INTO doctors
            (
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
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await db.promise().query(sql, [
            doctorId,
            hospitalId,
            name,
            specialization || null,
            department || null,
            qualification || null,
            Number(experience || 0),
            mobile || null,
            email || null,
            Number(consultationFee || 0),
            status || "Available"
        ]);

        // Auto-seed default OPD schedule for new doctor
        for (let day = 1; day <= 6; day++) {
            await db.promise().query(
                "INSERT INTO doctor_schedules (doctor_id, hospital_id, day_of_week, start_time, end_time, slot_duration, is_active) VALUES (?, ?, ?, '09:00:00', '14:00:00', 30, 1)",
                [doctorId, hospitalId, day]
            ).catch(() => {});
        }

        res.status(201).json({
            message: "Doctor added successfully.",
            doctor: {
                id: result.insertId,
                doctorId,
                hospitalId,
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
    } catch (err) {
        console.error("Add doctor error:", err);
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ message: "Doctor ID already exists." });
        }
        return res.status(500).json({ message: "Database error." });
    }
});

// UPDATE DOCTOR
router.put("/api/doctors/:id", authenticateToken, requireRole(["staff", "admin"]), (req, res) => {
    const id = req.params.id;
    const numericId = !isNaN(id) ? Number(id) : 0;
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

    const performDoctorUpdate = () => {
        const sql = `
            UPDATE doctors
            SET
                name = COALESCE(?, name),
                specialization = COALESCE(?, specialization),
                department = COALESCE(?, department),
                qualification = COALESCE(?, qualification),
                experience = COALESCE(?, experience),
                mobile = COALESCE(?, mobile),
                email = COALESCE(?, email),
                consultation_fee = COALESCE(?, consultation_fee),
                status = COALESCE(?, status)
            WHERE id = ? OR doctor_id = ?
        `;

        db.query(
            sql,
            [
                name || null,
                specialization || null,
                department || null,
                qualification || null,
                experience != null ? Number(experience) : null,
                mobile || null,
                email || null,
                consultationFee != null ? Number(consultationFee) : null,
                status || null,
                numericId,
                id
            ],
            (err, result) => {
                if (err) {
                    console.error("Update doctor error:", err);
                    return res.status(500).json({ message: "Database error." });
                }

                if (result.affectedRows === 0) {
                    return res.status(404).json({ message: "Doctor not found." });
                }

                res.json({ message: "Doctor updated successfully." });
            }
        );
    };

    db.query("SELECT * FROM doctors WHERE id = ? OR doctor_id = ? LIMIT 1", [numericId, id], (findErr, findRows) => {
        if (findErr) return res.status(500).json({ message: "Database error." });
        if (findRows.length === 0) return res.status(404).json({ message: "Doctor not found." });

        const doc = findRows[0];
        const userRole = (req.user.role || req.user.type || "").toLowerCase();

        if (userRole === "staff") {
            const staffHospitalId = req.user.hospitalId || req.user.hospital_id;
            if (staffHospitalId && doc.hospital_id && String(doc.hospital_id).toLowerCase() !== String(staffHospitalId).toLowerCase()) {
                return res.status(403).json({
                    message: `Access denied. Hospital staff can only manage doctors for their assigned hospital (${staffHospitalId}).`
                });
            }
        }

        performDoctorUpdate();
    });
});

// DELETE DOCTOR
router.delete("/api/doctors/:id", authenticateToken, requireRole(["staff", "admin"]), (req, res) => {
    const id = req.params.id;
    const numericId = !isNaN(id) ? Number(id) : 0;

    db.query("SELECT * FROM doctors WHERE id = ? OR doctor_id = ? LIMIT 1", [numericId, id], (findErr, findRows) => {
        if (findErr) return res.status(500).json({ message: "Database error." });
        if (findRows.length === 0) return res.status(404).json({ message: "Doctor not found." });

        const doc = findRows[0];
        const userRole = (req.user.role || req.user.type || "").toLowerCase();

        if (userRole === "staff") {
            const staffHospitalId = req.user.hospitalId || req.user.hospital_id;
            if (staffHospitalId && doc.hospital_id && String(doc.hospital_id).toLowerCase() !== String(staffHospitalId).toLowerCase()) {
                return res.status(403).json({
                    message: `Access denied. Hospital staff can only delete doctors for their assigned hospital (${staffHospitalId}).`
                });
            }
        }

        const sql = `
            DELETE FROM doctors
            WHERE id = ? OR doctor_id = ?
        `;

        db.query(sql, [numericId, id], (err, result) => {
            if (err) {
                console.error("Delete doctor error:", err);
                return res.status(500).json({ message: "Database error." });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "Doctor not found." });
            }

            res.json({ message: "Doctor deleted successfully." });
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
    const { date, hospitalId } = req.query;

    let sql = `
        SELECT
            id,
            doctor_id,
            hospital_id,
            slot_date,
            start_time,
            end_time,
            max_patients,
            booked_patients,
            status
        FROM doctor_slots
        WHERE (doctor_id = ? OR doctor_id = (SELECT doctor_id FROM doctors WHERE id = ?))
    `;
    const params = [doctorId, isNaN(doctorId) ? -1 : parseInt(doctorId, 10)];

    if (date) {
        sql += ` AND slot_date = ?`;
        params.push(date);
    }
    if (hospitalId) {
        sql += ` AND (hospital_id = ? OR hospital_id IS NULL)`;
        params.push(hospitalId);
    }

    sql += ` ORDER BY slot_date ASC, start_time ASC`;

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("Doctor slots error:", err);
            return res.status(500).json({
                message: "Database error."
            });
        }

        res.json({
            success: true,
            count: results.length,
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

    const userRole = (req.user.role || req.user.type || "").toLowerCase();
    const staffHospitalId = req.user.hospitalId || req.user.hospital_id;

    const performAddSlot = () => {
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
                    success: true,
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
    };

    if (userRole === "staff" && staffHospitalId) {
        db.query("SELECT hospital_id FROM doctors WHERE doctor_id = ? OR id = ? LIMIT 1", [doctorId, !isNaN(doctorId) ? Number(doctorId) : 0], (dErr, dRows) => {
            if (!dErr && dRows.length > 0) {
                const docHospitalId = dRows[0].hospital_id;
                if (docHospitalId && String(docHospitalId).toLowerCase() !== String(staffHospitalId).toLowerCase()) {
                    return res.status(403).json({
                        message: `Access denied. Hospital staff can only manage slots for doctors in their assigned hospital (${staffHospitalId}).`
                    });
                }
            }
            performAddSlot();
        });
    } else {
        performAddSlot();
    }
});

// DELETE SLOT
router.delete("/api/doctor-slots/:id", authenticateToken, requireRole(["staff", "admin"]), (req, res) => {
    const id = req.params.id;

    db.query("SELECT s.*, d.hospital_id FROM doctor_slots s LEFT JOIN doctors d ON s.doctor_id = d.doctor_id WHERE s.id = ? LIMIT 1", [id], (sErr, sRows) => {
        if (sErr) return res.status(500).json({ message: "Database error." });
        if (sRows.length === 0) return res.status(404).json({ message: "Slot not found." });

        const slot = sRows[0];
        const userRole = (req.user.role || req.user.type || "").toLowerCase();
        const staffHospitalId = req.user.hospitalId || req.user.hospital_id;

        if (userRole === "staff" && staffHospitalId && slot.hospital_id) {
            if (String(slot.hospital_id).toLowerCase() !== String(staffHospitalId).toLowerCase()) {
                return res.status(403).json({
                    message: `Access denied. Hospital staff can only delete slots for doctors in their assigned hospital (${staffHospitalId}).`
                });
            }
        }

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

            res.json({
                success: true,
                message: "Doctor slot deleted successfully."
            });
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
router.post(["/api/doctor/consultation", "/api/doctor/consultations/complete"], authenticateToken, requireDoctorOrStaff, async (req, res) => {
    let { 
        patientId, 
        doctorId, 
        doctorName, 
        appointmentId, 
        diagnosis, 
        symptoms, 
        treatment, 
        notes, 
        advice, 
        followUpDate, 
        recordDate 
    } = req.body;

    if (!patientId || (!diagnosis && !treatment && !notes)) {
        return res.status(400).json({
            success: false,
            message: "Patient ID and at least a diagnosis or treatment note are required."
        });
    }

    try {
        const pool = db.promise();
        let hospitalId = "HOSP-001";
        let docSpecialization = "Clinical Consultant";
        let docDepartment = "General Medicine";

        // 1. Resolve Doctor & Hospital Details
        if (doctorId || doctorName) {
            const [docRows] = await pool.query(
                "SELECT doctor_id, name, specialization, department, hospital_id FROM doctors WHERE doctor_id = ? OR id = ? OR name = ? LIMIT 1",
                [doctorId || "", doctorId || "", doctorName || ""]
            );
            if (docRows.length) {
                doctorName = docRows[0].name;
                doctorId = docRows[0].doctor_id;
                docSpecialization = docRows[0].specialization || docSpecialization;
                docDepartment = docRows[0].department || docDepartment;
                if (docRows[0].hospital_id) hospitalId = docRows[0].hospital_id;
            }
        }

        // Check appointment if hospitalId still default
        if (appointmentId) {
            const [appRows] = await pool.query("SELECT hospital_id, doctor, department FROM appointments WHERE id = ?", [appointmentId]);
            if (appRows.length && appRows[0].hospital_id) {
                hospitalId = appRows[0].hospital_id;
                if (!docDepartment && appRows[0].department) docDepartment = appRows[0].department;
            }
        }

        const docTitle = doctorName || req.user.name || "Dr. Medical Officer";
        const diagText = diagnosis || "Clinical OPD Consultation";
        const treatText = treatment || "Symptomatic treatment advised";
        const adviceText = advice || notes || "Rest, hydration, and adhere to prescription instructions.";
        const consultDate = recordDate || new Date();

        let hospitalLogoSnapshot = null;
        try {
            const [hRows] = await pool.query("SELECT logo FROM hospitals WHERE hospital_id = ? OR CAST(id AS CHAR) = ? LIMIT 1", [hospitalId, hospitalId]);
            if (hRows.length && hRows[0].logo) {
                hospitalLogoSnapshot = hRows[0].logo;
            }
        } catch (hErr) {}

        // 2. Insert into `prescriptions` table (with historical hospital_logo snapshot)
        const [rxRes] = await pool.query(`
            INSERT INTO prescriptions
            (patient_id, hospital_id, hospital_logo, doctor_id, appointment_id, prescription_file, doctor_name, diagnosis, medications_json, doctor_notes, advice, follow_up_date, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', NOW())
        `, [
            patientId,
            hospitalId,
            hospitalLogoSnapshot,
            doctorId || null,
            appointmentId || null,
            treatText,
            docTitle,
            diagText,
            JSON.stringify({ treatment: treatText, diagnosis: diagText, advice: adviceText }),
            notes || null,
            adviceText,
            followUpDate || null
        ]);
        const prescriptionId = rxRes.insertId;

        // 3. Insert into `patient_records` (Patient Permanent History)
        const [insertRes] = await pool.query(`
            INSERT INTO patient_records
            (patient_id, hospital_id, doctor_id, appointment_id, doctor_name, diagnosis, symptoms, treatment, notes, advice, prescription_id, record_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            patientId,
            hospitalId,
            doctorId || null,
            appointmentId || null,
            docTitle,
            diagText,
            symptoms || null,
            treatText,
            notes || null,
            adviceText,
            prescriptionId,
            consultDate
        ]);

        // 4. If appointment ID was provided, mark it Completed
        if (appointmentId) {
            await pool.query(
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
                    doctorId,
                    hospitalId
                });
            }
        }

        res.status(201).json({
            success: true,
            message: "Consultation and prescription record saved permanently.",
            recordId: insertRes.insertId,
            prescriptionId: prescriptionId,
            hospitalId: hospitalId
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

