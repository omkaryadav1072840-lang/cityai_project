const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { reportUpload } = require("../middleware/upload.middleware");

// =========================================================
// PATIENT REGISTRATION
// =========================================================

router.post("/api/patients", (req, res) => {
    const { patientId, name, age, gender, mobile, bloodGroup, address } = req.body;

    if (!patientId || !name || !mobile) {
        return res.status(400).json({
            message: "Patient ID, name and mobile are required."
        });
    }

    const sql = `
        INSERT INTO patients (patient_id, name, age, gender, mobile, blood_group, address)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            patientId,
            name,
            age || null,
            gender || null,
            mobile,
            bloodGroup || null,
            address || null
        ],
        (err, result) => {
            if (err) {
                console.error("Patient registration error:", err);
                if (err.code === "ER_DUP_ENTRY") {
                    return res.status(409).json({
                        message: "Patient ID already exists."
                    });
                }
                return res.status(500).json({
                    message: "Database error."
                });
            }

            res.status(201).json({
                message: "Patient registered successfully.",
                patient: {
                    id: result.insertId,
                    patientId,
                    name,
                    age: age || null,
                    gender: gender || null,
                    mobile,
                    bloodGroup: bloodGroup || null,
                    address: address || null
                }
            });
        }
    );
});

// =========================================================
// GET ALL PATIENTS
// =========================================================

router.get("/api/patients", (req, res) => {
    const sql = `
        SELECT id, patient_id, name, age, gender, mobile, blood_group, address, created_at
        FROM patients
        ORDER BY created_at DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Get patients error:", err);
            return res.status(500).json({
                message: "Database error."
            });
        }

        res.json({
            message: "Patients fetched successfully.",
            patients: results
        });
    });
});

// =========================================================
// GET PATIENT BY PATIENT ID
// =========================================================

router.get("/api/patients/:patientId", (req, res) => {
    const patientId = req.params.patientId;

    const sql = `
        SELECT id, patient_id, name, age, gender, mobile, blood_group, address, created_at
        FROM patients
        WHERE patient_id = ?
        LIMIT 1
    `;

    db.query(sql, [patientId], (err, results) => {
        if (err) {
            console.error("Patient fetch error:", err);
            return res.status(500).json({
                message: "Database error."
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: "Patient not found."
            });
        }

        res.json({
            message: "Patient found.",
            patient: results[0]
        });
    });
});

// =========================================================
// SEARCH PATIENT
// =========================================================

router.get("/api/patients/search/:patientId", (req, res) => {
    const patientId = req.params.patientId.trim();

    if (!patientId) {
        return res.status(400).json({
            message: "Patient ID is required."
        });
    }

    const sql = `
        SELECT id, patient_id, name, age, gender, mobile, blood_group, address, created_at
        FROM patients
        WHERE patient_id = ?
        LIMIT 1
    `;

    db.query(sql, [patientId], (err, results) => {
        if (err) {
            console.error("Patient search error:", err);
            return res.status(500).json({
                message: "Database error."
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: "Patient not found."
            });
        }

        res.json({
            message: "Patient found.",
            patient: results[0]
        });
    });
});

// =========================================================
// PATIENT MEDICAL RECORDS
// =========================================================

router.get("/api/patients/:patientId/records", (req, res) => {
    const patientId = req.params.patientId.trim();

    if (!patientId) {
        return res.status(400).json({
            success: false,
            message: "Patient ID is required."
        });
    }

    const sql = `
        SELECT id, patient_id, doctor_name, diagnosis, symptoms, treatment, notes, record_date, created_at
        FROM patient_records
        WHERE patient_id = ?
        ORDER BY record_date DESC, id DESC
    `;

    db.query(sql, [patientId], (err, results) => {
        if (err) {
            console.error("Fetch records error:", err);
            return res.status(500).json({
                success: false,
                message: "Database error."
            });
        }

        res.json({
            success: true,
            records: results
        });
    });
});

router.post("/api/patients/:patientId/records", (req, res) => {
    const patientId = req.params.patientId.trim();
    const { doctorName, diagnosis, symptoms, treatment, notes, recordDate } = req.body;

    if (!patientId) {
        return res.status(400).json({
            success: false,
            message: "Patient ID is required."
        });
    }

    if (!diagnosis && !symptoms && !treatment && !notes) {
        return res.status(400).json({
            success: false,
            message: "At least one of diagnosis, symptoms, treatment or notes is required."
        });
    }

    db.query(
        "SELECT id FROM patients WHERE patient_id = ? LIMIT 1",
        [patientId],
        (lookupErr, lookupResults) => {
            if (lookupErr) {
                console.error("Record patient lookup error:", lookupErr);
                return res.status(500).json({
                    success: false,
                    message: "Database error."
                });
            }

            if (lookupResults.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Patient not found."
                });
            }

            const sql = `
                INSERT INTO patient_records
                (patient_id, doctor_name, diagnosis, symptoms, treatment, notes, record_date)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;

            db.query(
                sql,
                [
                    patientId,
                    doctorName || null,
                    diagnosis || null,
                    symptoms || null,
                    treatment || null,
                    notes || null,
                    recordDate || new Date()
                ],
                (err, result) => {
                    if (err) {
                        console.error("Create record error:", err);
                        return res.status(500).json({
                            success: false,
                            message: "Database error."
                        });
                    }

                    res.status(201).json({
                        success: true,
                        message: "Record added successfully.",
                        recordId: result.insertId
                    });
                }
            );
        }
    );
});

// =========================================================
// PATIENT REPORTS
// =========================================================

router.get("/api/patients/:patientId/reports", (req, res) => {
    const patientId = req.params.patientId.trim();

    if (!patientId) {
        return res.status(400).json({
            success: false,
            message: "Patient ID is required."
        });
    }

    const sql = `
        SELECT id, patient_id, title, report_type, doctor_name, hospital_name, status, file_path, report_date, created_at
        FROM patient_reports
        WHERE patient_id = ?
        ORDER BY report_date DESC, id DESC
    `;

    db.query(sql, [patientId], (err, results) => {
        if (err) {
            console.error("Fetch reports error:", err);
            return res.status(500).json({
                success: false,
                message: "Database error."
            });
        }

        res.json({
            success: true,
            reports: results
        });
    });
});

router.post(
    "/api/patients/:patientId/reports",
    (req, res, next) => {
        reportUpload.single("file")(req, res, (uploadErr) => {
            if (uploadErr) {
                console.error("Report upload error:", uploadErr);
                return res.status(400).json({
                    success: false,
                    message: uploadErr.message || "File upload failed."
                });
            }
            next();
        });
    },
    (req, res) => {
        const patientId = req.params.patientId.trim();
        const { title, reportType, doctorName, hospitalName, status, reportDate } = req.body;

        if (!patientId || !title) {
            return res.status(400).json({
                success: false,
                message: "Patient ID and report title are required."
            });
        }

        db.query(
            "SELECT id FROM patients WHERE patient_id = ? LIMIT 1",
            [patientId],
            (lookupErr, lookupResults) => {
                if (lookupErr) {
                    console.error("Report patient lookup error:", lookupErr);
                    return res.status(500).json({
                        success: false,
                        message: "Database error."
                    });
                }

                if (lookupResults.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: "Patient not found."
                    });
                }

                const filePath = req.file
                    ? `/uploads/reports/${req.file.filename}`
                    : null;

                const sql = `
                    INSERT INTO patient_reports
                    (patient_id, title, report_type, doctor_name, hospital_name, status, file_path, report_date)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `;

                db.query(
                    sql,
                    [
                        patientId,
                        title,
                        reportType || null,
                        doctorName || null,
                        hospitalName || null,
                        status || "Completed",
                        filePath,
                        reportDate || new Date()
                    ],
                    (err, result) => {
                        if (err) {
                            console.error("Create report error:", err);
                            return res.status(500).json({
                                success: false,
                                message: "Database error."
                            });
                        }

                        res.status(201).json({
                            success: true,
                            message: "Report added successfully.",
                            reportId: result.insertId,
                            filePath
                        });
                    }
                );
            }
        );
    }
);

module.exports = router;
