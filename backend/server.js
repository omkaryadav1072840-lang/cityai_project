const multer = require("multer");
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");

require("dotenv").config();

// =========================================================
// PASSWORD HASHING (built-in crypto, no extra dependency)
// =========================================================
// Stored format for hashed passwords: "scrypt$<saltHex>$<hashHex>"
// Existing rows in the database still hold plain-text passwords from
// before this change. verifyPassword() understands both formats so
// no existing user is locked out, and silently upgrades a matching
// legacy password to a hash the next time that user logs in
// (see hashLegacyPasswordIfNeeded()).

function hashPassword(plainPassword) {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto
        .scryptSync(String(plainPassword), salt, 64)
        .toString("hex");
    return `scrypt$${salt}$${hash}`;
}

function verifyPassword(plainPassword, storedPassword) {
    if (!storedPassword) return false;

    if (storedPassword.startsWith("scrypt$")) {
        const parts = storedPassword.split("$");
        if (parts.length !== 3) return false;
        const [, salt, hashHex] = parts;
        const candidateHash = crypto.scryptSync(
            String(plainPassword),
            salt,
            64
        );
        const storedHash = Buffer.from(hashHex, "hex");
        if (candidateHash.length !== storedHash.length) return false;
        return crypto.timingSafeEqual(candidateHash, storedHash);
    }

    // Legacy plain-text password still stored in the database.
    return storedPassword === plainPassword;
}

function isLegacyPlainPassword(storedPassword) {
    return !!storedPassword && !storedPassword.startsWith("scrypt$");
}

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});



// =========================================================
// BASIC MIDDLEWARE
// =========================================================

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =========================================================
// MYSQL CONNECTION
// =========================================================

const db = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "omkar",
    database: process.env.DB_NAME || "smartcity"
});

// =========================================================
// SAFE ADDITIVE MIGRATION: MEDICAL RECORDS + REPORTS TABLES
// =========================================================
// These are brand-new tables (Step 7/8 of the spec — no existing
// patient_records/patient_reports tables were found in server.js).
// CREATE TABLE IF NOT EXISTS never touches existing tables/rows.

function ensureRecordsAndReportsTables() {

    const createRecordsTableSQL = `
        CREATE TABLE IF NOT EXISTS patient_records (
            id INT AUTO_INCREMENT PRIMARY KEY,
            patient_id VARCHAR(50) NOT NULL,
            doctor_name VARCHAR(150) NULL,
            diagnosis TEXT NULL,
            symptoms TEXT NULL,
            treatment TEXT NULL,
            notes TEXT NULL,
            record_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_patient_records_patient_id (patient_id)
        )
    `;

    const createReportsTableSQL = `
        CREATE TABLE IF NOT EXISTS patient_reports (
            id INT AUTO_INCREMENT PRIMARY KEY,
            patient_id VARCHAR(50) NOT NULL,
            title VARCHAR(200) NOT NULL,
            report_type VARCHAR(100) NULL,
            doctor_name VARCHAR(150) NULL,
            hospital_name VARCHAR(150) NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'Completed',
            file_path VARCHAR(500) NULL,
            report_date DATE NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_patient_reports_patient_id (patient_id)
        )
    `;

    db.query(createRecordsTableSQL, (err) => {
        if (err) {
            console.error(
                "❌ Failed to ensure patient_records table:",
                err.message
            );
        } else {
            console.log("✅ patient_records table ready");
        }
    });

    db.query(createReportsTableSQL, (err) => {
        if (err) {
            console.error(
                "❌ Failed to ensure patient_reports table:",
                err.message
            );
        } else {
            console.log("✅ patient_reports table ready");
        }
    });

}

db.connect((err) => {
    if (err) {
        console.error("❌ MySQL connection failed:", err.message);
        return;
    }

    console.log("✅ MySQL connected successfully");

    ensureRecordsAndReportsTables();
});

// =========================================================
// PRESCRIPTION UPLOAD DIRECTORY
// =========================================================

const prescriptionUploadDir = path.join(
    __dirname,
    "uploads",
    "prescriptions"
);

if (!fs.existsSync(prescriptionUploadDir)) {
    fs.mkdirSync(
        prescriptionUploadDir,
        { recursive: true }
    );
}

// =========================================================
// SERVE UPLOADED FILES
// =========================================================

app.use(
    "/uploads",
    express.static(
        path.join(__dirname, "uploads")
    )
);

// =========================================================
// MULTER PRESCRIPTION STORAGE
// =========================================================

const prescriptionStorage = multer.diskStorage({

    destination: function (req, file, cb) {

        cb(
            null,
            prescriptionUploadDir
        );

    },

    filename: function (req, file, cb) {

        const extension =
            path.extname(file.originalname);

        const uniqueName =
            "prescription-" +
            Date.now() +
            "-" +
            Math.round(
                Math.random() * 1000000
            ) +
            extension;

        cb(
            null,
            uniqueName
        );

    }

});

// =========================================================
// PRESCRIPTION FILE FILTER
// =========================================================

function prescriptionFileFilter(
    req,
    file,
    cb
) {

    const allowedMimeTypes = [

        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp"

    ];

    if (
        allowedMimeTypes.includes(
            file.mimetype
        )
    ) {

        cb(null, true);

    } else {

        cb(
            new Error(
                "Only PDF, JPG, PNG and WEBP files are allowed."
            )
        );

    }

}

// =========================================================
// PRESCRIPTION UPLOAD CONFIGURATION
// =========================================================

const prescriptionUpload = multer({

    storage:
        prescriptionStorage,

    fileFilter:
        prescriptionFileFilter,

    limits: {

        fileSize:
            10 * 1024 * 1024

    }

});

// =========================================================
// PATIENT REPORT UPLOAD DIRECTORY / CONFIGURATION
// =========================================================

const reportUploadDir = path.join(
    __dirname,
    "uploads",
    "reports"
);

if (!fs.existsSync(reportUploadDir)) {
    fs.mkdirSync(
        reportUploadDir,
        { recursive: true }
    );
}

const reportStorage = multer.diskStorage({

    destination: function (req, file, cb) {
        cb(null, reportUploadDir);
    },

    filename: function (req, file, cb) {

        const extension =
            path.extname(file.originalname);

        const uniqueName =
            "report-" +
            Date.now() +
            "-" +
            Math.round(
                Math.random() * 1000000
            ) +
            extension;

        cb(null, uniqueName);

    }

});

function reportFileFilter(req, file, cb) {

    const allowedMimeTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(
            new Error(
                "Only PDF, JPG, PNG and WEBP files are allowed."
            )
        );
    }

}

const reportUpload = multer({

    storage: reportStorage,
    fileFilter: reportFileFilter,

    limits: {
        fileSize: 10 * 1024 * 1024
    }

});

// =========================================================
// TEST BACKEND
// =========================================================

app.get("/", (req, res) => {

    res.json({
        message:
            "SmartCity AI Backend is running"
    });

});

// =========================================================
// CITY STATUS
// =========================================================

app.get(
    "/api/city-status",
    (req, res) => {

        res.json({

            traffic: "Moderate",
            aqi: 82,
            ambulances: 12,
            temperature: 31,
            hospitals: 8

        });

    }
);

// =========================================================
// CITIZEN REGISTER
// =========================================================

app.post(
    "/api/register",
    (req, res) => {

        const {
            name,
            mobile,
            email,
            password
        } = req.body;

        if (
            !name ||
            !mobile ||
            !email ||
            !password
        ) {

            return res.status(400).json({

                message:
                    "All fields are required."

            });

        }

        const sql = `

            INSERT INTO users
            (
                name,
                mobile,
                email,
                password
            )
            VALUES (?, ?, ?, ?)

        `;

        db.query(
            sql,
            [
                name,
                mobile,
                email,
                hashPassword(password)
            ],
            (err, result) => {

                if (err) {

                    console.error(
                        "Register error:",
                        err
                    );

                    if (
                        err.code ===
                        "ER_DUP_ENTRY"
                    ) {

                        return res
                            .status(409)
                            .json({

                                message:
                                    "Email or mobile already registered."

                            });

                    }

                    return res
                        .status(500)
                        .json({

                            message:
                                "Database error."

                        });

                }

                res.status(201).json({

                    message:
                        "Account created successfully.",

                    user: {

                        userId:
                            result.insertId,

                        name,
                        mobile,
                        email

                    }

                });

            }
        );

    }
);

// =========================================================
// CITIZEN LOGIN
// =========================================================

app.post(
    "/api/login",
    (req, res) => {

        const {
            loginId,
            password
        } = req.body;

        if (
            !loginId ||
            !password
        ) {

            return res.status(400).json({

                message:
                    "Email/mobile and password are required."

            });

        }

        const sql = `

            SELECT
                id,
                name,
                mobile,
                email,
                password

            FROM users

            WHERE email = ?
               OR mobile = ?

            LIMIT 1

        `;

        db.query(
            sql,
            [
                loginId,
                loginId
            ],
            (err, results) => {

                if (err) {

                    console.error(
                        "Login error:",
                        err
                    );

                    return res
                        .status(500)
                        .json({

                            message:
                                "Database error."

                        });

                }

                if (
                    results.length === 0
                ) {

                    return res
                        .status(401)
                        .json({

                            message:
                                "User not found."

                        });

                }

                const user =
                    results[0];

                if (
                    !verifyPassword(
                        password,
                        user.password
                    )
                ) {

                    return res
                        .status(401)
                        .json({

                            message:
                                "Incorrect password."

                        });

                }

                if (
                    isLegacyPlainPassword(
                        user.password
                    )
                ) {

                    db.query(
                        "UPDATE users SET password = ? WHERE id = ?",
                        [
                            hashPassword(password),
                            user.id
                        ],
                        (upgradeErr) => {
                            if (upgradeErr) {
                                console.error(
                                    "Password upgrade error:",
                                    upgradeErr
                                );
                            }
                        }
                    );

                }

                res.json({

                    message:
                        "Login successful.",

                    user: {

                        userId:
                            user.id,

                        name:
                            user.name,

                        mobile:
                            user.mobile,

                        email:
                            user.email,

                        type:
                            "citizen"

                    }

                });

            }
        );

    }
);

// =========================================================
// STAFF LOGIN
// =========================================================

app.post(
    "/api/staff-login",
    (req, res) => {

        const {
            staffId,
            password
        } = req.body;

        if (
            !staffId ||
            !password
        ) {

            return res.status(400).json({

                message:
                    "Staff ID and password are required."

            });

        }

        const sql = `

            SELECT
                id,
                name,
                staff_id,
                password,
                department

            FROM staff

            WHERE staff_id = ?

            LIMIT 1

        `;

        db.query(
            sql,
            [staffId],
            (err, results) => {

                if (err) {

                    console.error(
                        "Staff login error:",
                        err
                    );

                    return res
                        .status(500)
                        .json({

                            message:
                                "Database error."

                        });

                }

                if (
                    results.length === 0
                ) {

                    return res
                        .status(401)
                        .json({

                            message:
                                "Staff ID not found."

                        });

                }

                const staff =
                    results[0];

                if (
                    !verifyPassword(
                        password,
                        staff.password
                    )
                ) {

                    return res
                        .status(401)
                        .json({

                            message:
                                "Incorrect password."

                        });

                }

                if (
                    isLegacyPlainPassword(
                        staff.password
                    )
                ) {

                    db.query(
                        "UPDATE staff SET password = ? WHERE id = ?",
                        [
                            hashPassword(password),
                            staff.id
                        ],
                        (upgradeErr) => {
                            if (upgradeErr) {
                                console.error(
                                    "Staff password upgrade error:",
                                    upgradeErr
                                );
                            }
                        }
                    );

                }

                const permissions = {

                    traffic: [
                        "traffic"
                    ],

                    waste: [
                        "waste"
                    ],

                    water: [
                        "water"
                    ],

                    emergency: [
                        "emergency"
                    ],

                    parking: [
                        "parking"
                    ],

                    healthcare: [
                        "hospital",
                        "healthcare"
                    ],

                    hospital: [
                        "hospital",
                        "healthcare"
                    ],

                    pharmacy: [
                        "pharmacy"
                    ],

                    police: [
                        "police"
                    ],

                    places: [
                        "places"
                    ],

                    admin: [
                        "traffic",
                        "waste",
                        "water",
                        "emergency",
                        "parking",
                        "hospital",
                        "healthcare",
                        "pharmacy",
                        "police",
                        "places"
                    ]

                };

                const department =
                    String(
                        staff.department || ""
                    )
                        .trim()
                        .toLowerCase();

                const editable =
                    permissions[
                        department
                    ] || [];

                res.json({

                    message:
                        "Staff login successful.",

                    user: {

                        userId:
                            staff.id,

                        name:
                            staff.name,

                        staffId:
                            staff.staff_id,

                        department:
                            staff.department,

                        type:
                            "staff",

                        editable

                    }

                });

            }
        );

    }
);

// =========================================================
// PATIENT REGISTRATION
// =========================================================

app.post(
    "/api/patients",
    (req, res) => {

        const {
            patientId,
            name,
            age,
            gender,
            mobile,
            bloodGroup,
            address
        } = req.body;

        if (
            !patientId ||
            !name ||
            !mobile
        ) {

            return res.status(400).json({

                message:
                    "Patient ID, name and mobile are required."

            });

        }

        const sql = `

            INSERT INTO patients
            (
                patient_id,
                name,
                age,
                gender,
                mobile,
                blood_group,
                address
            )

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

                    console.error(
                        "Patient registration error:",
                        err
                    );

                    if (
                        err.code ===
                        "ER_DUP_ENTRY"
                    ) {

                        return res
                            .status(409)
                            .json({

                                message:
                                    "Patient ID already exists."

                            });

                    }

                    return res
                        .status(500)
                        .json({

                            message:
                                "Database error."

                        });

                }

                res.status(201).json({

                    message:
                        "Patient registered successfully.",

                    patient: {

                        id:
                            result.insertId,

                        patientId,

                        name,

                        age:
                            age || null,

                        gender:
                            gender || null,

                        mobile,

                        bloodGroup:
                            bloodGroup || null,

                        address:
                            address || null

                    }

                });

            }
        );

    }
);

// =========================================================
// GET ALL PATIENTS
// =========================================================

app.get(
    "/api/patients",
    (req, res) => {

        const sql = `

            SELECT
                id,
                patient_id,
                name,
                age,
                gender,
                mobile,
                blood_group,
                address,
                created_at

            FROM patients

            ORDER BY created_at DESC

        `;

        db.query(
            sql,
            (err, results) => {

                if (err) {

                    console.error(
                        "Get patients error:",
                        err
                    );

                    return res
                        .status(500)
                        .json({

                            message:
                                "Database error."

                        });

                }

                res.json({

                    message:
                        "Patients fetched successfully.",

                    patients:
                        results

                });

            }
        );

    }
);

// =========================================================
// GET PATIENT BY PATIENT ID
// =========================================================

app.get(
    "/api/patients/:patientId",
    (req, res) => {

        const patientId =
            req.params.patientId;

        const sql = `

            SELECT
                id,
                patient_id,
                name,
                age,
                gender,
                mobile,
                blood_group,
                address,
                created_at

            FROM patients

            WHERE patient_id = ?

            LIMIT 1

        `;

        db.query(
            sql,
            [patientId],
            (err, results) => {

                if (err) {

                    console.error(
                        "Patient fetch error:",
                        err
                    );

                    return res
                        .status(500)
                        .json({

                            message:
                                "Database error."

                        });

                }

                if (
                    results.length === 0
                ) {

                    return res
                        .status(404)
                        .json({

                            message:
                                "Patient not found."

                        });

                }

                res.json({

                    message:
                        "Patient found.",

                    patient:
                        results[0]

                });

            }
        );

    }
);

// =========================================================
// SEARCH PATIENT
// =========================================================

app.get(
    "/api/patients/search/:patientId",
    (req, res) => {

        const patientId =
            req.params.patientId.trim();

        if (!patientId) {

            return res.status(400).json({

                message:
                    "Patient ID is required."

            });

        }

        const sql = `

            SELECT
                id,
                patient_id,
                name,
                age,
                gender,
                mobile,
                blood_group,
                address,
                created_at

            FROM patients

            WHERE patient_id = ?

            LIMIT 1

        `;

        db.query(
            sql,
            [patientId],
            (err, results) => {

                if (err) {

                    console.error(
                        "Patient search error:",
                        err
                    );

                    return res
                        .status(500)
                        .json({

                            message:
                                "Database error."

                        });

                }

                if (
                    results.length === 0
                ) {

                    return res
                        .status(404)
                        .json({

                            message:
                                "Patient not found."

                        });

                }

                res.json({

                    message:
                        "Patient found.",

                    patient:
                        results[0]

                });

            }
        );

    }
);

// =========================================================
// PATIENT MEDICAL RECORDS
// =========================================================

app.get(
    "/api/patients/:patientId/records",
    (req, res) => {

        const patientId = req.params.patientId.trim();

        if (!patientId) {
            return res.status(400).json({
                success: false,
                message: "Patient ID is required."
            });
        }

        const sql = `
            SELECT
                id,
                patient_id,
                doctor_name,
                diagnosis,
                symptoms,
                treatment,
                notes,
                record_date,
                created_at
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

    }
);

app.post(
    "/api/patients/:patientId/records",
    (req, res) => {

        const patientId = req.params.patientId.trim();

        const {
            doctorName,
            diagnosis,
            symptoms,
            treatment,
            notes,
            recordDate
        } = req.body;

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

        // Verify the patient actually exists before attaching a record.
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

    }
);

// =========================================================
// PATIENT REPORTS
// =========================================================

app.get(
    "/api/patients/:patientId/reports",
    (req, res) => {

        const patientId = req.params.patientId.trim();

        if (!patientId) {
            return res.status(400).json({
                success: false,
                message: "Patient ID is required."
            });
        }

        const sql = `
            SELECT
                id,
                patient_id,
                title,
                report_type,
                doctor_name,
                hospital_name,
                status,
                file_path,
                report_date,
                created_at
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

    }
);

app.post(
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

        const {
            title,
            reportType,
            doctorName,
            hospitalName,
            status,
            reportDate
        } = req.body;

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

// =========================================================
// DYNAMIC APPOINTMENT AVAILABILITY ENGINE
// =========================================================
app.get("/api/appointments/availability", (req, res) => {
    const { hospitalId, doctorId, date } = req.query;

    console.log(`[APPOINTMENT AVAILABILITY] Hospital: ${hospitalId} | Doctor: ${doctorId} | Date: ${date}`);

    if (!hospitalId || !doctorId || !date) {
        return res.status(400).json({
            success: false,
            message: "Hospital ID, Doctor ID, and Date (YYYY-MM-DD) are required."
        });
    }

    // Parse date safely without timezone shift
    const [year, month, day] = date.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day);
    const dayOfWeek = targetDate.getDay();

    // 1. Fetch Doctor Schedule
    const scheduleSql = `
        SELECT start_time, end_time, slot_duration 
        FROM doctor_schedules 
        WHERE doctor_id = ? AND hospital_id = ? AND day_of_week = ? AND is_active = 1
    `;

    db.query(scheduleSql, [doctorId, hospitalId, dayOfWeek], (schedErr, schedRows) => {
        if (schedErr) {
            console.error("[SCHEDULE ERROR]", schedErr);
            return res.status(500).json({ success: false, message: "Unable to load appointment availability." });
        }

        if (!schedRows.length) {
            return res.json({ success: false, message: "Doctor is not available on this date." });
        }

        const { start_time, end_time, slot_duration } = schedRows[0];

        // 2. Fetch existing appointments for this doctor on the date
        const bookedSql = `
            SELECT appointment_time 
            FROM appointments 
            WHERE doctor_id = ? AND appointment_date = ? AND status != 'Cancelled'
        `;

        db.query(bookedSql, [doctorId, date], (bookErr, bookRows) => {
            if (bookErr) {
                console.error("[BOOKING LOOKUP ERROR]", bookErr);
                return res.status(500).json({ success: false, message: "Unable to load appointment availability." });
            }

            const bookedTimes = bookRows.map(b => String(b.appointment_time).substring(0, 5));

            // 3. Generate slots
            const slots = [];
            let [startH, startM] = start_time.split(':').map(Number);
            let [endH, endM] = end_time.split(':').map(Number);

            let currentMinutes = startH * 60 + startM;
            const endMinutes = endH * 60 + endM;

            const now = new Date();
            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const isToday = (todayStr === date);
            const currentDayMinutes = now.getHours() * 60 + now.getMinutes();

            while (currentMinutes < endMinutes) {
                const h = Math.floor(currentMinutes / 60);
                const m = currentMinutes % 60;
                const time24 = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

                const period = h >= 12 ? 'PM' : 'AM';
                const h12 = h % 12 || 12;
                const displayTime = `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;

                const isPast = isToday && (currentMinutes <= currentDayMinutes);
                const isBooked = bookedTimes.includes(time24);

                let status = "available";
                if (isBooked) status = "booked";
                else if (isPast) status = "unavailable";

                slots.push({
                    time: time24,
                    displayTime,
                    status
                });

                currentMinutes += slot_duration;
            }

            console.log(`Generated: ${slots.length} | Booked: ${bookedTimes.length}`);

            const remaining = slots.filter(s => s.status === "available");
            if (isToday && remaining.length === 0 && slots.every(s => s.status === 'unavailable')) {
                return res.json({ success: false, message: "No remaining slots for today." });
            }
            if (slots.every(s => s.status === 'booked')) {
                return res.json({ success: false, message: "All slots are already booked." });
            }

            res.json({
                success: true,
                hospitalId,
                doctorId,
                date,
                slots
            });
        });
    });
});

// =========================================================
// STRICT APPOINTMENT BOOKING API (With Validation & Double Booking Prevention)
// =========================================================
app.post("/api/appointments/book-strict", (req, res) => {
    const { patientId, hospitalId, doctorId, appointmentDate, appointmentTime } = req.body;

    if (!patientId || !hospitalId || !doctorId || !appointmentDate || !appointmentTime) {
        return res.status(400).json({
            success: false,
            message: "Patient ID, Hospital ID, Doctor ID, Date, and Time are required."
        });
    }

    // 1. Validate Patient ID
    db.query("SELECT id, name FROM patients WHERE patient_id = ?", [patientId], (pErr, pRows) => {
        if (pErr) return res.status(500).json({ success: false, message: "Database error." });
        if (!pRows.length) {
            return res.status(404).json({
                success: false,
                message: "Patient ID not found. Please register the patient first."
            });
        }

        // 2. Fetch Doctor and Hospital Name for reference
        const docSql = `
            SELECT d.name AS doctor_name, h.hospital_name 
            FROM doctors d 
            JOIN hospitals h ON h.hospital_id = ? 
            WHERE d.doctor_id = ?
        `;
        db.query(docSql, [hospitalId, doctorId], (dErr, dRows) => {
            if (dErr || !dRows.length) {
                return res.status(404).json({ success: false, message: "Doctor or Hospital mapping not found." });
            }

            const { doctor_name, hospital_name } = dRows[0];

            // 3. Insert Appointment with Duplicate Catch
            const insertSql = `
                INSERT INTO appointments 
                (patient_id, hospital_id, doctor_id, doctor, appointment_date, appointment_time, status)
                VALUES (?, ?, ?, ?, ?, ?, 'Confirmed')
            `;

            db.query(insertSql, [patientId, hospitalId, doctorId, doctor_name, appointmentDate, appointmentTime], (insErr, insRes) => {
                if (insErr) {
                    if (insErr.code === 'ER_DUP_ENTRY') {
                        return res.status(409).json({
                            success: false,
                            message: "This appointment slot has already been booked."
                        });
                    }
                    console.error("[BOOKING INSERT ERROR]", insErr);
                    return res.status(500).json({ success: false, message: "Appointment booking failed." });
                }

                const appointmentId = `APT-${100000 + insRes.insertId}`;

                res.status(201).json({
                    success: true,
                    message: "Appointment confirmed successfully.",
                    appointment: {
                        appointmentId,
                        patientId,
                        hospitalName: hospital_name,
                        doctorName: doctor_name,
                        date: appointmentDate,
                        time: appointmentTime
                    }
                });
            });
        });
    });
});

// =========================================================
// BOOK APPOINTMENT VIA doctor_slots (slot-based booking)
// =========================================================
// This is the endpoint the "Doctor Finder" booking flow
// (bookDoctorSlot() in hospital.js) calls. It was previously
// missing entirely — that flow was calling a route that didn't
// exist and always failed. Uses a transaction + row lock (FOR
// UPDATE) on the chosen slot so two concurrent bookings for the
// last open seat can't both succeed, independent of whether any
// unique index exists on the appointments table.

app.post("/api/appointments", (req, res) => {

    const { patientId, doctor, slotId } = req.body;

    if (!patientId || !slotId) {
        return res.status(400).json({
            success: false,
            message: "Patient ID and a time slot are required."
        });
    }

    db.beginTransaction((txErr) => {

        if (txErr) {
            console.error("Transaction start error:", txErr);
            return res.status(500).json({ success: false, message: "Database error." });
        }

        db.query(
            "SELECT id FROM patients WHERE patient_id = ? LIMIT 1",
            [patientId],
            (pErr, pRows) => {

                if (pErr) {
                    console.error("Patient lookup error:", pErr);
                    return db.rollback(() =>
                        res.status(500).json({ success: false, message: "Database error." })
                    );
                }

                if (!pRows.length) {
                    return db.rollback(() =>
                        res.status(404).json({
                            success: false,
                            message: "Patient ID not found. Please register the patient first."
                        })
                    );
                }

                db.query(
                    "SELECT * FROM doctor_slots WHERE id = ? FOR UPDATE",
                    [slotId],
                    (sErr, sRows) => {

                        if (sErr) {
                            console.error("Slot lookup error:", sErr);
                            return db.rollback(() =>
                                res.status(500).json({ success: false, message: "Database error." })
                            );
                        }

                        if (!sRows.length) {
                            return db.rollback(() =>
                                res.status(404).json({ success: false, message: "Slot not found." })
                            );
                        }

                        const slot = sRows[0];
                        const maxPatients = Number(slot.max_patients || 1);
                        const bookedPatients = Number(slot.booked_patients || 0);
                        const slotFull =
                            bookedPatients >= maxPatients ||
                            String(slot.status || "").toLowerCase() === "full";

                        if (slotFull) {
                            return db.rollback(() =>
                                res.status(409).json({
                                    success: false,
                                    message: "This slot is already fully booked. Please choose another."
                                })
                            );
                        }

                        db.query(
                            "SELECT name, hospital_id FROM doctors WHERE doctor_id = ? LIMIT 1",
                            [slot.doctor_id],
                            (dErr, dRows) => {

                                if (dErr) {
                                    console.error("Doctor lookup error:", dErr);
                                    return db.rollback(() =>
                                        res.status(500).json({ success: false, message: "Database error." })
                                    );
                                }

                                const doctorName = dRows[0]?.name || doctor || null;
                                const hospitalId = dRows[0]?.hospital_id || null;

                                const insertSql = `
                                    INSERT INTO appointments
                                    (patient_id, hospital_id, doctor_id, doctor, slot_id, appointment_date, appointment_time, status)
                                    VALUES (?, ?, ?, ?, ?, ?, ?, 'Confirmed')
                                `;

                                db.query(
                                    insertSql,
                                    [
                                        patientId,
                                        hospitalId,
                                        slot.doctor_id,
                                        doctorName,
                                        slotId,
                                        slot.slot_date,
                                        slot.start_time
                                    ],
                                    (iErr, iRes) => {

                                        if (iErr) {
                                            console.error("Slot-based booking insert error:", iErr);
                                            if (iErr.code === "ER_DUP_ENTRY") {
                                                return db.rollback(() =>
                                                    res.status(409).json({
                                                        success: false,
                                                        message: "This appointment slot has already been booked."
                                                    })
                                                );
                                            }
                                            return db.rollback(() =>
                                                res.status(500).json({
                                                    success: false,
                                                    message: "Appointment booking failed."
                                                })
                                            );
                                        }

                                        const newBookedCount = bookedPatients + 1;
                                        const newStatus =
                                            newBookedCount >= maxPatients ? "Full" : "Available";

                                        db.query(
                                            "UPDATE doctor_slots SET booked_patients = ?, status = ? WHERE id = ?",
                                            [newBookedCount, newStatus, slotId],
                                            (uErr) => {

                                                if (uErr) {
                                                    console.error("Slot update error:", uErr);
                                                    return db.rollback(() =>
                                                        res.status(500).json({
                                                            success: false,
                                                            message: "Appointment booking failed."
                                                        })
                                                    );
                                                }

                                                db.commit((cErr) => {

                                                    if (cErr) {
                                                        console.error("Commit error:", cErr);
                                                        return db.rollback(() =>
                                                            res.status(500).json({
                                                                success: false,
                                                                message: "Appointment booking failed."
                                                            })
                                                        );
                                                    }

                                                    res.status(201).json({
                                                        success: true,
                                                        message: "Appointment confirmed successfully.",
                                                        appointment: {
                                                            id: iRes.insertId,
                                                            patientId,
                                                            doctorName,
                                                            hospitalId,
                                                            appointmentDate: slot.slot_date,
                                                            appointmentTime: slot.start_time,
                                                            slotId
                                                        }
                                                    });

                                                });

                                            }
                                        );

                                    }
                                );

                            }
                        );

                    }
                );

            }
        );

    });

});

// =========================================================
// CANCEL APPOINTMENT (releases the slot seat back)
// =========================================================

app.put(
    "/api/appointments/:id/cancel",
    (req, res) => {

        const appointmentId = req.params.id;

        db.beginTransaction((txErr) => {

            if (txErr) {
                console.error("Transaction start error:", txErr);
                return res.status(500).json({ message: "Database error." });
            }

            const findSql = `
                SELECT id, slot_id, status
                FROM appointments
                WHERE id = ?
                FOR UPDATE
            `;

            db.query(findSql, [appointmentId], (findErr, rows) => {

                if (findErr) {
                    console.error("Appointment lookup error:", findErr);
                    return db.rollback(() => {
                        res.status(500).json({ message: "Database error." });
                    });
                }

                if (!rows.length) {
                    return db.rollback(() => {
                        res.status(404).json({ message: "Appointment not found." });
                    });
                }

                const appointment = rows[0];

                if (["Cancelled", "Completed"].includes(appointment.status)) {
                    return db.rollback(() => {
                        res.status(400).json({
                            message: `Appointment is already ${appointment.status}.`
                        });
                    });
                }

                const cancelSql = `
                    UPDATE appointments SET status = 'Cancelled' WHERE id = ?
                `;

                db.query(cancelSql, [appointmentId], (cancelErr) => {

                    if (cancelErr) {
                        console.error("Appointment cancel error:", cancelErr);
                        return db.rollback(() => {
                            res.status(500).json({ message: "Cancellation failed." });
                        });
                    }

                    if (!appointment.slot_id) {
                        return db.commit((commitErr) => {
                            if (commitErr) {
                                return db.rollback(() => {
                                    res.status(500).json({ message: "Cancellation failed." });
                                });
                            }
                            res.json({ message: "Appointment cancelled successfully." });
                        });
                    }

                    const freeSlotSql = `
                        UPDATE doctor_slots
                        SET booked_patients = GREATEST(booked_patients - 1, 0),
                            status = 'Available'
                        WHERE id = ?
                    `;

                    db.query(freeSlotSql, [appointment.slot_id], (slotErr) => {

                        if (slotErr) {
                            console.error("Slot release error:", slotErr);
                            return db.rollback(() => {
                                res.status(500).json({ message: "Cancellation failed." });
                            });
                        }

                        db.commit((commitErr) => {
                            if (commitErr) {
                                console.error("Commit error:", commitErr);
                                return db.rollback(() => {
                                    res.status(500).json({ message: "Cancellation failed." });
                                });
                            }
                            res.json({ message: "Appointment cancelled successfully." });
                        });

                    });

                });

            });

        });

    }
);


// =========================================================
// GET PATIENT APPOINTMENTS
// =========================================================

app.get(
    "/api/appointments/:patientId",
    (req, res) => {

        const patientId =
            req.params.patientId;

        if (!patientId) {

            return res.status(400).json({

                message:
                    "Patient ID is required."

            });

        }

        const sql = `

            SELECT
                id,
                patient_id,
                doctor,
                slot_id,
                doctor_id,
                appointment_date,
                appointment_time,
                status,
                created_at

            FROM appointments

            WHERE patient_id = ?

            ORDER BY
                appointment_date DESC,
                appointment_time DESC

        `;

        db.query(
            sql,
            [patientId],
            (err, results) => {

                if (err) {

                    console.error(
                        "Appointment fetch error:",
                        err
                    );

                    return res
                        .status(500)
                        .json({

                            message:
                                "Database error."

                        });

                }

                res.json({

                    message:
                        "Appointments fetched successfully.",

                    appointments:
                        results

                });

            }
        );

    }
);

// =========================================================
// GET BED AVAILABILITY
// =========================================================

app.get(
    "/api/hospital/beds",
    (req, res) => {

        const sql = `

            SELECT
                id,
                hospital_name,
                general_beds,
                icu_beds,
                emergency_beds,
                private_beds,
                updated_at

            FROM hospital_beds

            ORDER BY hospital_name

        `;

        db.query(
            sql,
            (err, results) => {

                if (err) {

                    console.error(
                        "Bed fetch error:",
                        err
                    );

                    return res
                        .status(500)
                        .json({

                            message:
                                "Database error."

                        });

                }

                res.json({

                    message:
                        "Bed availability fetched successfully.",

                    beds:
                        results

                });

            }
        );

    }
);
// =========================================================
// DOCTOR MANAGEMENT
// =========================================================

// GET ALL DOCTORS
app.get("/api/doctors", (req, res) => {

    const sql = `
        SELECT
            id,
            doctor_id,
            name,
            specialization,
            department,
            qualification,
            experience,
            mobile,
            email,
            consultation_fee,
            status,
            created_at,
            updated_at
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
app.post("/api/doctors", (req, res) => {

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
                    consultationFee:
                        Number(consultationFee || 0),
                    status:
                        status || "Available"
                }

            });

        }
    );

});


// UPDATE DOCTOR
app.put("/api/doctors/:id", (req, res) => {

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
app.delete("/api/doctors/:id", (req, res) => {

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
app.get("/api/doctor-slots", (req, res) => {

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
app.get("/api/doctors/:doctorId/slots", (req, res) => {

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
app.post("/api/doctor-slots", (req, res) => {

    const {
        doctorId,
        slotDate,
        startTime,
        endTime,
        maxPatients
    } = req.body;

    if (
        !doctorId ||
        !slotDate ||
        !startTime ||
        !endTime
    ) {

        return res.status(400).json({
            message:
                "Doctor, date, start time and end time are required."
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
                    maxPatients:
                        Number(maxPatients || 1),
                    bookedPatients: 0,
                    status: "Available"
                }

            });

        }
    );

});


// DELETE SLOT
app.delete("/api/doctor-slots/:id", (req, res) => {

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
// AMBULANCE MANAGEMENT
// =========================================================
// =========================================================
// GET SINGLE AMBULANCE
// =========================================================
// =========================================================
// AMBULANCE MANAGEMENT
// =========================================================

// =========================================================
// GET ALL AMBULANCES (Yeh humne naya add kiya hai 👇)
// =========================================================
app.get("/api/ambulances", (req, res) => {
    const sql = `
        SELECT 
            id, ambulance_id, vehicle_number, driver_name, driver_mobile, 
            ambulance_type, hospital_name, location, status, 
            latitude, longitude,
            patient_name, patient_mobile, patient_lat, patient_lng, patient_address,
            destination_hospital_id, destination_hospital_name, assigned_at,
            created_at, updated_at
        FROM ambulances
        ORDER BY created_at DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Get all ambulances error:", err);
            return res.status(500).json({ message: "Database error." });
        }
        res.json({
            message: "Ambulances fetched successfully.",
            ambulances: results 
        });
    });
});
// (Naya code yahan khatam 👆)


// =========================================================
// GET SINGLE AMBULANCE
// =========================================================



app.get("/api/ambulances/:id", (req, res) => {

    const id = req.params.id;

    const sql = `
        SELECT
            id,
            ambulance_id,
            vehicle_number,
            driver_name,
            driver_mobile,
            ambulance_type,
            hospital_name,
            location,
            status,
            latitude,
            longitude,
            patient_name,
            patient_mobile,
            patient_lat,
            patient_lng,
            patient_address,
            destination_hospital_id,
            destination_hospital_name,
            assigned_at,
            created_at,
            updated_at
        FROM ambulances
        WHERE id = ?
        LIMIT 1
    `;

    db.query(sql, [id], (err, results) => {

        if (err) {

            console.error(
                "Get single ambulance error:",
                err
            );

            return res.status(500).json({
                message: "Database error."
            });

        }

        if (results.length === 0) {

            return res.status(404).json({
                message: "Ambulance not found."
            });

        }

        res.json({
            message: "Ambulance fetched successfully.",
            ambulance: results[0]
        });

    });

});
// =========================================================
// UPDATE AMBULANCE REAL-TIME LOCATION
// =========================================================

app.put("/api/ambulances/:id/location", (req, res) => {

    // -----------------------------------------
    // AUTH: AMBULANCE_UPDATE_TOKEN (provisioned in .env, was never
    // actually enforced anywhere in this file — closing that gap here).
    // Only enforced if a token is configured, so a deployment that
    // hasn't set one yet doesn't suddenly start rejecting requests.
    // -----------------------------------------

    const configuredToken = process.env.AMBULANCE_UPDATE_TOKEN;

    if (configuredToken) {

        const providedToken =
            req.headers["x-ambulance-token"] ||
            (req.headers.authorization || "").replace(/^Bearer\s+/i, "");

        if (providedToken !== configuredToken) {
            return res.status(401).json({
                message: "Invalid or missing ambulance update token."
            });
        }

    }

    const id = req.params.id;

    const {
        latitude,
        longitude
    } = req.body;

    // -----------------------------------------
    // VALIDATION
    // -----------------------------------------

    if (
        latitude === undefined ||
        longitude === undefined
    ) {

        return res.status(400).json({
            message:
                "Latitude and longitude are required."
        });

    }

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng)
    ) {

        return res.status(400).json({
            message:
                "Invalid latitude or longitude."
        });

    }

    if (
        lat < -90 ||
        lat > 90
    ) {

        return res.status(400).json({
            message:
                "Invalid latitude."
        });

    }

    if (
        lng < -180 ||
        lng > 180
    ) {

        return res.status(400).json({
            message:
                "Invalid longitude."
        });

    }

    // -----------------------------------------
    // UPDATE MYSQL
    // -----------------------------------------

    const sql = `
        UPDATE ambulances
        SET
            latitude = ?,
            longitude = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;

    db.query(
        sql,
        [
            lat,
            lng,
            id
        ],
        (err, result) => {

            if (err) {

                console.error(
                    "Ambulance location update error:",
                    err
                );

                return res.status(500).json({
                    message:
                        "Database error."
                });

            }

            if (
                result.affectedRows === 0
            ) {

                return res.status(404).json({
                    message:
                        "Ambulance not found."
                });

            }

            // -----------------------------------------
            // GET UPDATED AMBULANCE
            // -----------------------------------------

            const getSQL = `
                SELECT
                    id,
                    ambulance_id,
                    vehicle_number,
                    driver_name,
                    driver_mobile,
                    ambulance_type,
                    hospital_name,
                    location,
                    status,
                    latitude,
                    longitude,
                    patient_name,
                    patient_mobile,
                    patient_lat,
                    patient_lng,
                    patient_address,
                    destination_hospital_id,
                    destination_hospital_name,
                    assigned_at,
                    updated_at
                FROM ambulances
                WHERE id = ?
                LIMIT 1
            `;

            db.query(
                getSQL,
                [id],
                (getErr, rows) => {

                    if (getErr) {

                        console.error(
                            "Updated ambulance fetch error:",
                            getErr
                        );

                        return res.status(500).json({
                            message:
                                "Location updated but data fetch failed."
                        });

                    }

                    const ambulance =
                        rows[0];

                    // -----------------------------------------
                    // REAL-TIME SOCKET UPDATE
                    // -----------------------------------------

                    io.emit(
                        "ambulance-location-updated",
                        ambulance
                    );

                    // -----------------------------------------
                    // RESPONSE
                    // -----------------------------------------

                    res.json({

                        success: true,

                        message:
                            "Ambulance location updated successfully.",

                        ambulance

                    });

                }
            );

        }
    );

});

// ADD AMBULANCE
app.post("/api/ambulances", (req, res) => {

    const {
        ambulanceId,
        vehicleNumber,
        driverName,
        driverMobile,
        ambulanceType,
        hospitalName,
        location,
        status,
        latitude,
        longitude
    } = req.body;

    if (!ambulanceId || !vehicleNumber) {

        return res.status(400).json({
            message:
                "Ambulance ID and vehicle number are required."
        });

    }

    const sql = `
        INSERT INTO ambulances
        (
            ambulance_id,
            vehicle_number,
            driver_name,
            driver_mobile,
            ambulance_type,
            hospital_name,
            location,
            status,
            latitude,
            longitude
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            ambulanceId,
            vehicleNumber,
            driverName || null,
            driverMobile || null,
            ambulanceType || null,
            hospitalName || null,
            location || null,
            status || "Available",
            latitude || null,
            longitude || null
        ],
        (err, result) => {

            if (err) {

                console.error("Add ambulance error:", err);

                if (err.code === "ER_DUP_ENTRY") {

                    return res.status(409).json({
                        message:
                            "Ambulance ID or vehicle number already exists."
                    });

                }

                return res.status(500).json({
                    message: "Database error."
                });

            }

            res.status(201).json({

                message:
                    "Ambulance added successfully.",

                ambulanceId:
                    result.insertId

            });

        }
    );

});


// UPDATE AMBULANCE
app.put("/api/ambulances/:id", (req, res) => {

    const id = req.params.id;

    const {
        driverName,
        driverMobile,
        ambulanceType,
        hospitalName,
        location,
        status,
        latitude,
        longitude
    } = req.body;

    const sql = `
        UPDATE ambulances
        SET
            driver_name = ?,
            driver_mobile = ?,
            ambulance_type = ?,
            hospital_name = ?,
            location = ?,
            status = ?,
            latitude = ?,
            longitude = ?
        WHERE id = ?
    `;

    db.query(
        sql,
        [
            driverName || null,
            driverMobile || null,
            ambulanceType || null,
            hospitalName || null,
            location || null,
            status || "Available",
            latitude || null,
            longitude || null,
            id
        ],
        (err, result) => {

            if (err) {

                console.error(
                    "Update ambulance error:",
                    err
                );

                return res.status(500).json({
                    message: "Database error."
                });

            }

            if (result.affectedRows === 0) {

                return res.status(404).json({
                    message: "Ambulance not found."
                });

            }

            res.json({
                message:
                    "Ambulance updated successfully."
            });

        }
    );

});
// =========================================================
// UPDATE AMBULANCE STATUS
// =========================================================

app.put("/api/ambulances/:id/status", (req, res) => {

    const id = req.params.id;

    const {
        status
    } = req.body;

    const allowedStatuses = [
        "Available",
        "Assigned",
        "On The Way",
        "Arrived at Patient",
        "Transporting Patient",
        "Arrived at Hospital",
        // legacy statuses kept for backward compatibility
        "On Duty",
        "Emergency",
        "Offline"
    ];

    if (!status) {

        return res.status(400).json({
            message:
                "Ambulance status is required."
        });

    }

    if (
        !allowedStatuses.includes(status)
    ) {

        return res.status(400).json({
            message:
                "Invalid ambulance status."
        });

    }

    const sql = `
        UPDATE ambulances
        SET
            status = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;

    db.query(
        sql,
        [
            status,
            id
        ],
        (err, result) => {

            if (err) {

                console.error(
                    "Ambulance status update error:",
                    err
                );

                return res.status(500).json({
                    message:
                        "Database error."
                });

            }

            if (
                result.affectedRows === 0
            ) {

                return res.status(404).json({
                    message:
                        "Ambulance not found."
                });

            }

            const getSQL = `
                SELECT
                    id,
                    ambulance_id,
                    vehicle_number,
                    driver_name,
                    driver_mobile,
                    ambulance_type,
                    hospital_name,
                    location,
                    status,
                    latitude,
                    longitude,
                    patient_name,
                    patient_mobile,
                    patient_lat,
                    patient_lng,
                    patient_address,
                    destination_hospital_id,
                    destination_hospital_name,
                    assigned_at,
                    updated_at
                FROM ambulances
                WHERE id = ?
                LIMIT 1
            `;

            db.query(
                getSQL,
                [id],
                (getErr, rows) => {

                    if (getErr) {

                        return res.status(500).json({
                            message:
                                "Status updated but fetch failed."
                        });

                    }

                    const ambulance =
                        rows[0];

                    io.emit(
                        "ambulance-status-updated",
                        ambulance
                    );

                    res.json({

                        success: true,

                        message:
                            "Ambulance status updated successfully.",

                        ambulance

                    });

                }
            );

        }
    );

});

// =========================================================
// ASSIGN AMBULANCE TO AN EMERGENCY
// (patient location + destination hospital)
// =========================================================

const AMBULANCE_DETAIL_COLUMNS = `
    id, ambulance_id, vehicle_number, driver_name, driver_mobile,
    ambulance_type, hospital_name, location, status,
    latitude, longitude,
    patient_name, patient_mobile, patient_lat, patient_lng, patient_address,
    destination_hospital_id, destination_hospital_name, assigned_at,
    created_at, updated_at
`;

app.put("/api/ambulances/:id/assign", (req, res) => {

    const id = req.params.id;

    const {
        patientName,
        patientMobile,
        patientLat,
        patientLng,
        patientAddress,
        destinationHospitalId,
        destinationHospitalName
    } = req.body;

    const pLat = Number(patientLat);
    const pLng = Number(patientLng);

    if (!Number.isFinite(pLat) || !Number.isFinite(pLng)) {
        return res.status(400).json({
            message: "Valid patient latitude and longitude are required."
        });
    }

    const sql = `
        UPDATE ambulances
        SET
            status = 'Assigned',
            patient_name = ?,
            patient_mobile = ?,
            patient_lat = ?,
            patient_lng = ?,
            patient_address = ?,
            destination_hospital_id = ?,
            destination_hospital_name = ?,
            assigned_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status = 'Available'
    `;

    db.query(
        sql,
        [
            patientName || null,
            patientMobile || null,
            pLat,
            pLng,
            patientAddress || null,
            destinationHospitalId || null,
            destinationHospitalName || null,
            id
        ],
        (err, result) => {

            if (err) {
                console.error("Ambulance assign error:", err);
                return res.status(500).json({ message: "Database error." });
            }

            if (result.affectedRows === 0) {
                return res.status(409).json({
                    message: "Ambulance is not available for assignment (already assigned or not found)."
                });
            }

            db.query(
                `SELECT ${AMBULANCE_DETAIL_COLUMNS} FROM ambulances WHERE id = ? LIMIT 1`,
                [id],
                (getErr, rows) => {

                    if (getErr || rows.length === 0) {
                        return res.status(500).json({ message: "Assigned but fetch failed." });
                    }

                    const ambulance = rows[0];

                    io.emit("ambulance-assigned", ambulance);
                    io.emit("ambulance-status-updated", ambulance);

                    res.json({
                        success: true,
                        message: "Ambulance assigned successfully.",
                        ambulance
                    });

                }
            );

        }
    );

});

// =========================================================
// RESET AMBULANCE (clear assignment, back to Available)
// =========================================================

app.put("/api/ambulances/:id/reset", (req, res) => {

    const id = req.params.id;

    const sql = `
        UPDATE ambulances
        SET
            status = 'Available',
            patient_name = NULL,
            patient_mobile = NULL,
            patient_lat = NULL,
            patient_lng = NULL,
            patient_address = NULL,
            destination_hospital_id = NULL,
            destination_hospital_name = NULL,
            assigned_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;

    db.query(sql, [id], (err, result) => {

        if (err) {
            console.error("Ambulance reset error:", err);
            return res.status(500).json({ message: "Database error." });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Ambulance not found." });
        }

        db.query(
            `SELECT ${AMBULANCE_DETAIL_COLUMNS} FROM ambulances WHERE id = ? LIMIT 1`,
            [id],
            (getErr, rows) => {

                if (getErr || rows.length === 0) {
                    return res.status(500).json({ message: "Reset but fetch failed." });
                }

                const ambulance = rows[0];

                io.emit("ambulance-reset", ambulance);
                io.emit("ambulance-status-updated", ambulance);

                res.json({
                    success: true,
                    message: "Ambulance reset successfully.",
                    ambulance
                });

            }
        );

    });

});

// =========================================================
// NEAREST AVAILABLE AMBULANCES (Haversine, DB-driven)
// =========================================================

app.get("/api/ambulances/nearby/search", (req, res) => {

    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const limit = Math.min(Number(req.query.limit) || 5, 20);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return res.status(400).json({ message: "lat and lng query params are required." });
    }

    const sql = `
        SELECT
            id, ambulance_id, vehicle_number, driver_name, driver_mobile,
            ambulance_type, hospital_name, location, status,
            latitude, longitude,
            (6371 * ACOS(
                COS(RADIANS(?)) * COS(RADIANS(latitude)) *
                COS(RADIANS(longitude) - RADIANS(?)) +
                SIN(RADIANS(?)) * SIN(RADIANS(latitude))
            )) AS distance_km
        FROM ambulances
        WHERE status = 'Available'
          AND latitude IS NOT NULL
          AND longitude IS NOT NULL
        ORDER BY distance_km ASC
        LIMIT ?
    `;

    db.query(sql, [lat, lng, lat, limit], (err, results) => {

        if (err) {
            console.error("Nearby ambulances error:", err);
            return res.status(500).json({ message: "Database error." });
        }

        res.json({
            message: "Nearby ambulances fetched successfully.",
            ambulances: results.map(a => ({
                ...a,
                distance_km: a.distance_km !== null ? Number(a.distance_km.toFixed(2)) : null
            }))
        });

    });

});

// DELETE AMBULANCE
app.delete("/api/ambulances/:id", (req, res) => {

    const id = req.params.id;

    const sql = `
        DELETE FROM ambulances
        WHERE id = ?
    `;

    db.query(sql, [id], (err, result) => {

        if (err) {

            console.error(
                "Delete ambulance error:",
                err
            );

            return res.status(500).json({
                message: "Database error."
            });

        }

        if (result.affectedRows === 0) {

            return res.status(404).json({
                message: "Ambulance not found."
            });

        }

        res.json({
            message:
                "Ambulance deleted successfully."
        });

    });

});
// =========================================================
// EMERGENCY DEPARTMENT
// =========================================================

// GET EMERGENCY INFORMATION
app.get("/api/emergency-departments", (req, res) => {

    const sql = `
        SELECT
            id,
            hospital_name,
            emergency_number,
            emergency_type,
            available_doctors,
            available_beds,
            ambulances_available,
            status,
            location,
            created_at,
            updated_at
        FROM emergency_departments
        ORDER BY hospital_name ASC
    `;

    db.query(sql, (err, results) => {

        if (err) {

            console.error(
                "Emergency fetch error:",
                err
            );

            return res.status(500).json({
                message: "Database error."
            });

        }

        res.json({
            message:
                "Emergency departments fetched successfully.",
            emergencyDepartments: results
        });

    });

});


// ADD EMERGENCY DEPARTMENT
app.post("/api/emergency-departments", (req, res) => {

    const {
        hospitalName,
        emergencyNumber,
        emergencyType,
        availableDoctors,
        availableBeds,
        ambulancesAvailable,
        status,
        location
    } = req.body;

    if (!hospitalName) {

        return res.status(400).json({
            message: "Hospital name is required."
        });

    }

    const sql = `
        INSERT INTO emergency_departments
        (
            hospital_name,
            emergency_number,
            emergency_type,
            available_doctors,
            available_beds,
            ambulances_available,
            status,
            location
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            hospitalName,
            emergencyNumber || null,
            emergencyType || null,
            Number(availableDoctors || 0),
            Number(availableBeds || 0),
            Number(ambulancesAvailable || 0),
            status || "Open",
            location || null
        ],
        (err, result) => {

            if (err) {

                console.error(
                    "Add emergency department error:",
                    err
                );

                return res.status(500).json({
                    message: "Database error."
                });

            }

            res.status(201).json({
                message:
                    "Emergency department added successfully.",
                id: result.insertId
            });

        }
    );

});


// UPDATE EMERGENCY DEPARTMENT
app.put("/api/emergency-departments/:id", (req, res) => {

    const id = req.params.id;

    const {
        emergencyNumber,
        emergencyType,
        availableDoctors,
        availableBeds,
        ambulancesAvailable,
        status,
        location
    } = req.body;

    const sql = `
        UPDATE emergency_departments
        SET
            emergency_number = ?,
            emergency_type = ?,
            available_doctors = ?,
            available_beds = ?,
            ambulances_available = ?,
            status = ?,
            location = ?
        WHERE id = ?
    `;

    db.query(
        sql,
        [
            emergencyNumber || null,
            emergencyType || null,
            Number(availableDoctors || 0),
            Number(availableBeds || 0),
            Number(ambulancesAvailable || 0),
            status || "Open",
            location || null,
            id
        ],
        (err, result) => {

            if (err) {

                console.error(
                    "Emergency update error:",
                    err
                );

                return res.status(500).json({
                    message: "Database error."
                });

            }

            if (result.affectedRows === 0) {

                return res.status(404).json({
                    message:
                        "Emergency department not found."
                });

            }

            res.json({
                message:
                    "Emergency department updated successfully."
            });

        }
    );

});
// =========================================================
// HOSPITAL INFORMATION
// =========================================================

// GET ALL HOSPITALS
app.get("/api/hospitals", (req, res) => {

    const sql = `
        SELECT
            id,
            hospital_id,
            hospital_name,
            address,
            phone,
            emergency_number,
            email,
            website,
            hospital_type,
            total_beds,
            icu_beds,
            emergency_beds,
            doctors_count,
            ambulance_count,
            latitude,
            longitude,
            status,
            created_at,
            updated_at
        FROM hospitals
        ORDER BY hospital_name ASC
    `;

    db.query(sql, (err, results) => {

        if (err) {

            console.error(
                "Hospital fetch error:",
                err
            );

            return res.status(500).json({
                message: "Database error."
            });

        }

        res.json({
            message:
                "Hospital information fetched successfully.",
            hospitals: results
        });

    });

});

// GET NEAREST HOSPITALS (Haversine, DB-driven) — used by the emergency flow
app.get("/api/hospitals/nearby/search", (req, res) => {

    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const limit = Math.min(Number(req.query.limit) || 5, 20);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return res.status(400).json({ message: "lat and lng query params are required." });
    }

    const sql = `
        SELECT
            id, hospital_id, hospital_name, address, phone, emergency_number,
            hospital_type, total_beds, icu_beds, emergency_beds, status,
            latitude, longitude,
            (6371 * ACOS(
                COS(RADIANS(?)) * COS(RADIANS(latitude)) *
                COS(RADIANS(longitude) - RADIANS(?)) +
                SIN(RADIANS(?)) * SIN(RADIANS(latitude))
            )) AS distance_km
        FROM hospitals
        WHERE latitude IS NOT NULL
          AND longitude IS NOT NULL
        ORDER BY distance_km ASC
        LIMIT ?
    `;

    db.query(sql, [lat, lng, lat, limit], (err, results) => {

        if (err) {
            console.error("Nearby hospitals error:", err);
            return res.status(500).json({ message: "Database error." });
        }

        res.json({
            message: "Nearby hospitals fetched successfully.",
            hospitals: results.map(h => ({
                ...h,
                distance_km: h.distance_km !== null ? Number(h.distance_km.toFixed(2)) : null
            }))
        });

    });

});


// GET SINGLE HOSPITAL
app.get("/api/hospitals/:hospitalId", (req, res) => {

    const hospitalId =
        req.params.hospitalId;

    const sql = `
        SELECT
            id,
            hospital_id,
            hospital_name,
            address,
            phone,
            emergency_number,
            email,
            website,
            hospital_type,
            total_beds,
            icu_beds,
            emergency_beds,
            doctors_count,
            ambulance_count,
            latitude,
            longitude,
            status
        FROM hospitals
        WHERE hospital_id = ?
        LIMIT 1
    `;

    db.query(
        sql,
        [hospitalId],
        (err, results) => {

            if (err) {

                console.error(
                    "Hospital search error:",
                    err
                );

                return res.status(500).json({
                    message: "Database error."
                });

            }

            if (results.length === 0) {

                return res.status(404).json({
                    message:
                        "Hospital not found."
                });

            }

            res.json({
                message:
                    "Hospital found.",
                hospital:
                    results[0]
            });

        }
    );

});


// =========================================================
// HOSPITAL BEDS BY CATEGORY (Phase 2)
// =========================================================
// Per-hospital, 7-category bed availability (General, ICU,
// Emergency, Private, Semi-Private, Pediatric, Maternity), each
// with total/occupied/available + occupancy %. Backed by the new
// hospital_bed_categories table — the older flat hospital_beds
// table and its /api/hospital/beds route are untouched.

app.get("/api/hospitals/:hospitalId/beds", (req, res) => {

    const hospitalId = req.params.hospitalId;

    const sql = `
        SELECT
            category,
            total_beds,
            occupied_beds,
            (total_beds - occupied_beds) AS available_beds,
            updated_at
        FROM hospital_bed_categories
        WHERE hospital_id = ?
        ORDER BY FIELD(category, 'General','ICU','Emergency','Private','Semi-Private','Pediatric','Maternity')
    `;

    db.query(sql, [hospitalId], (err, results) => {

        if (err) {
            console.error("Hospital beds fetch error:", err);
            return res.status(500).json({ message: "Database error." });
        }

        res.json({
            message: "Bed availability fetched successfully.",
            beds: results
        });

    });

});


// =========================================================
// HOSPITAL TREATMENTS / DEPARTMENTS (Phase 2)
// =========================================================
// Each department shows how many doctors at THIS hospital work in
// it, so the Treatments tab is never just a static text list.

app.get("/api/hospitals/:hospitalId/treatments", (req, res) => {

    const hospitalId = req.params.hospitalId;

    const sql = `
        SELECT
            hd.department_name,
            hd.approx_fee,
            (
                SELECT COUNT(*) FROM doctors doc
                WHERE doc.hospital_id = hd.hospital_id
                AND doc.department = hd.department_name
            ) AS available_doctors
        FROM hospital_departments hd
        WHERE hd.hospital_id = ?
        ORDER BY hd.department_name
    `;

    db.query(sql, [hospitalId], (err, results) => {

        if (err) {
            console.error("Hospital treatments fetch error:", err);
            return res.status(500).json({ message: "Database error." });
        }

        res.json({
            message: "Treatments fetched successfully.",
            treatments: results
        });

    });

});


// =========================================================
// HOSPITAL DOCTORS (Phase 2)
// =========================================================

app.get("/api/hospitals/:hospitalId/doctors", (req, res) => {

    const hospitalId = req.params.hospitalId;

    const sql = `
        SELECT
            id, doctor_id, name, specialization, department,
            qualification, experience, mobile, email,
            consultation_fee, status
        FROM doctors
        WHERE hospital_id = ?
        ORDER BY name
    `;

    db.query(sql, [hospitalId], (err, results) => {

        if (err) {
            console.error("Hospital doctors fetch error:", err);
            return res.status(500).json({ message: "Database error." });
        }

        res.json({
            message: "Hospital doctors fetched successfully.",
            doctors: results
        });

    });

});


// ADD HOSPITAL
app.post("/api/hospitals", (req, res) => {

    const {
        hospitalId,
        hospitalName,
        address,
        phone,
        emergencyNumber,
        email,
        website,
        hospitalType,
        totalBeds,
        icuBeds,
        emergencyBeds,
        doctorsCount,
        ambulanceCount,
        latitude,
        longitude,
        status
    } = req.body;

    if (!hospitalId || !hospitalName) {

        return res.status(400).json({
            message:
                "Hospital ID and hospital name are required."
        });

    }

    const sql = `
        INSERT INTO hospitals
        (
            hospital_id,
            hospital_name,
            address,
            phone,
            emergency_number,
            email,
            website,
            hospital_type,
            total_beds,
            icu_beds,
            emergency_beds,
            doctors_count,
            ambulance_count,
            latitude,
            longitude,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            hospitalId,
            hospitalName,
            address || null,
            phone || null,
            emergencyNumber || null,
            email || null,
            website || null,
            hospitalType || null,
            Number(totalBeds || 0),
            Number(icuBeds || 0),
            Number(emergencyBeds || 0),
            Number(doctorsCount || 0),
            Number(ambulanceCount || 0),
            latitude || null,
            longitude || null,
            status || "Active"
        ],
        (err, result) => {

            if (err) {

                console.error(
                    "Add hospital error:",
                    err
                );

                if (err.code === "ER_DUP_ENTRY") {

                    return res.status(409).json({
                        message:
                            "Hospital ID already exists."
                    });

                }

                return res.status(500).json({
                    message:
                        "Database error."
                });

            }

            res.status(201).json({

                message:
                    "Hospital added successfully.",

                hospitalId:
                    result.insertId

            });

        }
    );

});


// UPDATE HOSPITAL
app.put("/api/hospitals/:id", (req, res) => {

    const id = req.params.id;

    const {
        hospitalName,
        address,
        phone,
        emergencyNumber,
        email,
        website,
        hospitalType,
        totalBeds,
        icuBeds,
        emergencyBeds,
        doctorsCount,
        ambulanceCount,
        latitude,
        longitude,
        status
    } = req.body;

    const sql = `
        UPDATE hospitals
        SET
            hospital_name = ?,
            address = ?,
            phone = ?,
            emergency_number = ?,
            email = ?,
            website = ?,
            hospital_type = ?,
            total_beds = ?,
            icu_beds = ?,
            emergency_beds = ?,
            doctors_count = ?,
            ambulance_count = ?,
            latitude = ?,
            longitude = ?,
            status = ?
        WHERE id = ?
    `;

    db.query(
        sql,
        [
            hospitalName,
            address || null,
            phone || null,
            emergencyNumber || null,
            email || null,
            website || null,
            hospitalType || null,
            Number(totalBeds || 0),
            Number(icuBeds || 0),
            Number(emergencyBeds || 0),
            Number(doctorsCount || 0),
            Number(ambulanceCount || 0),
            latitude || null,
            longitude || null,
            status || "Active",
            id
        ],
        (err, result) => {

            if (err) {

                console.error(
                    "Hospital update error:",
                    err
                );

                return res.status(500).json({
                    message:
                        "Database error."
                });

            }

            if (result.affectedRows === 0) {

                return res.status(404).json({
                    message:
                        "Hospital not found."
                });

            }

            res.json({
                message:
                    "Hospital information updated successfully."
            });

        }
    );

});
// =========================================================
// UPDATE BED AVAILABILITY
// =========================================================

app.put(
    "/api/hospital/beds/:id",
    (req, res) => {

        const id =
            req.params.id;

        const {
            generalBeds,
            icuBeds,
            emergencyBeds,
            privateBeds
        } = req.body;

        if (
            generalBeds === undefined ||
            icuBeds === undefined ||
            emergencyBeds === undefined ||
            privateBeds === undefined
        ) {

            return res.status(400).json({

                message:
                    "All bed values are required."

            });

        }

        const sql = `

            UPDATE hospital_beds

            SET
                general_beds = ?,
                icu_beds = ?,
                emergency_beds = ?,
                private_beds = ?

            WHERE id = ?

        `;

        db.query(
            sql,
            [
                generalBeds,
                icuBeds,
                emergencyBeds,
                privateBeds,
                id
            ],
            (err, result) => {

                if (err) {

                    console.error(
                        "Bed update error:",
                        err
                    );

                    return res
                        .status(500)
                        .json({

                            message:
                                "Database error."

                        });

                }

                if (
                    result.affectedRows === 0
                ) {

                    return res
                        .status(404)
                        .json({

                            message:
                                "Hospital bed record not found."

                        });

                }

                res.json({

                    message:
                        "Bed availability updated successfully."

                });

            }
        );

    }
);

// =========================================================
// PHARMACY - GET ALL MEDICINES
// =========================================================

app.get(
    "/api/pharmacy",
    (req, res) => {

        console.log(
            "➡️ Pharmacy API called"
        );

        const sql = `

            SELECT
                id,
                medicine_name,
                category,
                quantity,
                price,
                availability,
                updated_at

            FROM pharmacy

            ORDER BY medicine_name ASC

        `;

        db.query(
            sql,
            (err, results) => {

                if (err) {

                    console.error(
                        "❌ PHARMACY SQL ERROR:",
                        err
                    );

                    return res
                        .status(500)
                        .json({

                            success: false,

                            message:
                                "Pharmacy database error",

                            error:
                                err.message,

                            medicines: []

                        });

                }

                console.log(
                    "✅ PHARMACY DATA FROM MYSQL:"
                );

                console.log(results);

                res.status(200).json({

                    success: true,

                    message:
                        "Pharmacy data loaded",

                    medicines:
                        results

                });

            }
        );

    }
);

// =========================================================
// PHARMACY - SEARCH MEDICINE
// =========================================================

app.get(
    "/api/pharmacy/search/:medicine",
    (req, res) => {

        const medicine =
            req.params.medicine.trim();

        console.log(
            "🔎 Medicine search:",
            medicine
        );

        if (!medicine) {

            return res.status(400).json({

                success: false,

                message:
                    "Medicine name is required.",

                medicines: []

            });

        }

        const searchValue =
            `%${medicine}%`;

        const sql = `

            SELECT
                id,
                medicine_name,
                category,
                quantity,
                price,
                availability,
                updated_at

            FROM pharmacy

            WHERE LOWER(medicine_name)
                  LIKE LOWER(?)

            ORDER BY medicine_name ASC

        `;

        db.query(
            sql,
            [searchValue],
            (err, results) => {

                if (err) {

                    console.error(
                        "❌ Medicine search SQL error:",
                        err
                    );

                    return res
                        .status(500)
                        .json({

                            success: false,

                            message:
                                "Database error.",

                            medicines: []

                        });

                }

                console.log(
                    "✅ Search result:",
                    results
                );

                res.json({

                    success: true,

                    message:
                        "Medicine search completed.",

                    medicines:
                        results

                });

            }
        );

    }
);

// =========================================================
// PHARMACY - ADD MEDICINE
// =========================================================

app.post(
    "/api/pharmacy",
    (req, res) => {

        const {
            medicineName,
            category,
            quantity,
            price
        } = req.body;

        if (!medicineName) {

            return res.status(400).json({

                message:
                    "Medicine name is required."

            });

        }

        const medicineQuantity =
            Number(quantity || 0);

        const medicinePrice =
            Number(price || 0);

        const availability =
            medicineQuantity > 0
                ? "Available"
                : "Out of Stock";

        const sql = `

            INSERT INTO pharmacy
            (
                medicine_name,
                category,
                quantity,
                price,
                availability
            )

            VALUES (?, ?, ?, ?, ?)

        `;

        db.query(
            sql,
            [
                medicineName,
                category || null,
                medicineQuantity,
                medicinePrice,
                availability
            ],
            (err, result) => {

                if (err) {

                    console.error(
                        "Add medicine error:",
                        err
                    );

                    return res
                        .status(500)
                        .json({

                            message:
                                "Database error."

                        });

                }

                res.status(201).json({

                    message:
                        "Medicine added successfully.",

                    medicineId:
                        result.insertId

                });

            }
        );

    }
);

// =========================================================
// PHARMACY - UPDATE MEDICINE
// =========================================================

app.put(
    "/api/pharmacy/:id",
    (req, res) => {

        const id =
            req.params.id;

        const {
            quantity,
            price,
            availability
        } = req.body;

        const medicineQuantity =
            Number(quantity || 0);

        const medicinePrice =
            Number(price || 0);

        const medicineAvailability =
            availability ||
            (
                medicineQuantity > 0
                    ? "Available"
                    : "Out of Stock"
            );

        const sql = `

            UPDATE pharmacy

            SET
                quantity = ?,
                price = ?,
                availability = ?

            WHERE id = ?

        `;

        db.query(
            sql,
            [
                medicineQuantity,
                medicinePrice,
                medicineAvailability,
                id
            ],
            (err, result) => {

                if (err) {

                    console.error(
                        "Medicine update error:",
                        err
                    );

                    return res
                        .status(500)
                        .json({

                            message:
                                "Database error."

                        });

                }

                if (
                    result.affectedRows === 0
                ) {

                    return res
                        .status(404)
                        .json({

                            message:
                                "Medicine not found."

                        });

                }

                res.json({

                    message:
                        "Medicine updated successfully."

                });

            }
        );

    }
);

// =========================================================
// PHARMACY - OLD PRESCRIPTION RECORD API
// =========================================================
// Purana function bhi rakha gaya hai.
// Ye JSON-based prescription record ke liye hai.

app.post(
    "/api/pharmacy/prescriptions",
    (req, res) => {

        const {
            patientId,
            prescriptionFile,
            doctorName
        } = req.body;

        if (
            !patientId ||
            !prescriptionFile
        ) {

            return res.status(400).json({

                message:
                    "Patient ID and prescription are required."

            });

        }

        const sql = `

            INSERT INTO prescriptions
            (
                patient_id,
                prescription_file,
                doctor_name,
                status
            )

            VALUES (?, ?, ?, ?)

        `;

        db.query(
            sql,
            [
                patientId,
                prescriptionFile,
                doctorName || null,
                "Uploaded"
            ],
            (err, result) => {

                if (err) {

                    console.error(
                        "Prescription record error:",
                        err
                    );

                    return res
                        .status(500)
                        .json({

                            message:
                                "Prescription database error."

                        });

                }

                res.status(201).json({

                    message:
                        "Prescription uploaded successfully.",

                    prescription: {

                        id:
                            result.insertId,

                        patientId,

                        prescriptionFile,

                        doctorName:
                            doctorName || null,

                        status:
                            "Uploaded"

                    }

                });

            }
        );

    }
);

// =========================================================
// PHARMACY - ADD MEDICINE TO CART
// =========================================================

app.post(
    "/api/pharmacy/cart",
    (req, res) => {

        const {
            patientId,
            medicineId,
            medicineName,
            quantity
        } = req.body;

        if (
            !patientId ||
            !medicineId ||
            !medicineName ||
            !quantity
        ) {

            return res.status(400).json({

                message:
                    "Patient ID, medicine and quantity are required."

            });

        }

        const qty =
            Number(quantity);

        if (
            !Number.isFinite(qty) ||
            qty <= 0
        ) {

            return res.status(400).json({

                message:
                    "Invalid quantity."

            });

        }

        const stockSQL = `

            SELECT
                id,
                medicine_name,
                quantity,
                price,
                availability

            FROM pharmacy

            WHERE id = ?

            LIMIT 1

        `;

        db.query(
            stockSQL,
            [medicineId],
            (err, results) => {

                if (err) {

                    console.error(
                        "Medicine stock error:",
                        err
                    );

                    return res
                        .status(500)
                        .json({

                            message:
                                "Database error."

                        });

                }

                if (
                    results.length === 0
                ) {

                    return res
                        .status(404)
                        .json({

                            message:
                                "Medicine not found."

                        });

                }

                const medicine =
                    results[0];

                if (
                    Number(
                        medicine.quantity
                    ) < qty
                ) {

                    return res
                        .status(400)
                        .json({

                            message:
                                `Only ${medicine.quantity} units available.`

                        });

                }

                const total =
                    Number(
                        medicine.price
                    ) * qty;

                const cartSQL = `

                    INSERT INTO pharmacy_cart
                    (
                        patient_id,
                        medicine_id,
                        medicine_name,
                        quantity,
                        price,
                        total
                    )

                    VALUES (?, ?, ?, ?, ?, ?)

                `;

                db.query(
                    cartSQL,
                    [
                        patientId,
                        medicine.id,
                        medicine.medicine_name,
                        qty,
                        medicine.price,
                        total
                    ],
                    (cartErr, result) => {

                        if (cartErr) {

                            console.error(
                                "Cart error:",
                                cartErr
                            );

                            return res
                                .status(500)
                                .json({

                                    message:
                                        "Unable to add medicine to cart."

                                });

                        }

                        res.status(201).json({

                            message:
                                "Medicine added to cart.",

                            cartItem: {

                                id:
                                    result.insertId,

                                patientId,

                                medicineId:
                                    medicine.id,

                                medicineName:
                                    medicine.medicine_name,

                                quantity:
                                    qty,

                                price:
                                    medicine.price,

                                total

                            }

                        });

                    }
                );

            }
        );

    }
);

// =========================================================
// PHARMACY - GET PATIENT CART
// =========================================================

app.get(
    "/api/pharmacy/cart/:patientId",
    (req, res) => {

        const patientId =
            req.params.patientId;

        if (!patientId) {

            return res.status(400).json({

                message:
                    "Patient ID is required."

            });

        }

        const sql = `

            SELECT
                id,
                patient_id,
                medicine_id,
                medicine_name,
                quantity,
                price,
                total,
                created_at

            FROM pharmacy_cart

            WHERE patient_id = ?

            ORDER BY created_at DESC

        `;

        db.query(
            sql,
            [patientId],
            (err, results) => {

                if (err) {

                    console.error(
                        "Cart fetch error:",
                        err
                    );

                    return res
                        .status(500)
                        .json({

                            message:
                                "Database error."

                        });

                }

                let subtotal = 0;

                results.forEach(
                    item => {

                        subtotal +=
                            Number(
                                item.total || 0
                            );

                    }
                );

                res.json({

                    message:
                        "Cart loaded successfully.",

                    items:
                        results,

                    subtotal

                });

            }
        );

    }
);

// =========================================================
// PHARMACY - REMOVE CART ITEM
// =========================================================

app.delete(
    "/api/pharmacy/cart/:id",
    (req, res) => {

        const id =
            req.params.id;

        const sql = `

            DELETE FROM pharmacy_cart

            WHERE id = ?

        `;

        db.query(
            sql,
            [id],
            (err, result) => {

                if (err) {

                    console.error(
                        "Cart delete error:",
                        err
                    );

                    return res
                        .status(500)
                        .json({

                            message:
                                "Database error."

                        });

                }

                if (
                    result.affectedRows === 0
                ) {

                    return res
                        .status(404)
                        .json({

                            message:
                                "Cart item not found."

                        });

                }

                res.json({

                    message:
                        "Medicine removed from cart."

                });

            }
        );

    }
);

// =========================================================
// PHARMACY - CHECKOUT / GENERATE BILL
// =========================================================

app.post(
    "/api/pharmacy/checkout",
    (req, res) => {

        const {
            patientId,
            discount
        } = req.body;

        if (!patientId) {

            return res.status(400).json({

                message:
                    "Patient ID is required."

            });

        }

        const discountAmount =
            Number(discount || 0);

        if (
            !Number.isFinite(
                discountAmount
            ) ||
            discountAmount < 0
        ) {

            return res.status(400).json({

                message:
                    "Invalid discount."

            });

        }

        const cartSQL = `

            SELECT
                id,
                medicine_id,
                medicine_name,
                quantity,
                price,
                total

            FROM pharmacy_cart

            WHERE patient_id = ?

        `;

        db.query(
            cartSQL,
            [patientId],
            (cartErr, cartItems) => {

                if (cartErr) {

                    console.error(
                        "Checkout cart error:",
                        cartErr
                    );

                    return res
                        .status(500)
                        .json({

                            message:
                                "Database error."

                        });

                }

                if (
                    cartItems.length === 0
                ) {

                    return res
                        .status(400)
                        .json({

                            message:
                                "Cart is empty."

                        });

                }

                let subtotal = 0;

                cartItems.forEach(
                    item => {

                        subtotal +=
                            Number(
                                item.total || 0
                            );

                    }
                );

                if (
                    discountAmount >
                    subtotal
                ) {

                    return res
                        .status(400)
                        .json({

                            message:
                                "Discount cannot be greater than total."

                        });

                }

                const finalAmount =
                    subtotal -
                    discountAmount;

                const billNumber =
                    "BILL-" +
                    Date.now();

                const billSQL = `

                    INSERT INTO pharmacy_bills
                    (
                        bill_number,
                        patient_id,
                        subtotal,
                        discount,
                        final_amount,
                        payment_status
                    )

                    VALUES (?, ?, ?, ?, ?, ?)

                `;

                db.query(
                    billSQL,
                    [
                        billNumber,
                        patientId,
                        subtotal,
                        discountAmount,
                        finalAmount,
                        "Pending"
                    ],
                    (billErr, billResult) => {

                        if (billErr) {

                            console.error(
                                "Bill creation error:",
                                billErr
                            );

                            return res
                                .status(500)
                                .json({

                                    message:
                                        "Bill creation failed."

                                });

                        }

                        const billId =
                            billResult.insertId;

                        let completed = 0;
                        let failed = false;

                        cartItems.forEach(
                            item => {

                                const itemSQL = `

                                    INSERT INTO pharmacy_bill_items
                                    (
                                        bill_id,
                                        medicine_id,
                                        medicine_name,
                                        quantity,
                                        price,
                                        total
                                    )

                                    VALUES (?, ?, ?, ?, ?, ?)

                                `;

                                db.query(
                                    itemSQL,
                                    [
                                        billId,
                                        item.medicine_id,
                                        item.medicine_name,
                                        item.quantity,
                                        item.price,
                                        item.total
                                    ],
                                    (itemErr) => {

                                        if (
                                            itemErr
                                        ) {

                                            console.error(
                                                "Bill item error:",
                                                itemErr
                                            );

                                            if (
                                                !failed
                                            ) {

                                                failed =
                                                    true;

                                                return res
                                                    .status(500)
                                                    .json({

                                                        message:
                                                            "Bill item creation failed."

                                                    });

                                            }

                                            return;

                                        }

                                        completed++;

                                        if (
                                            completed ===
                                            cartItems.length &&
                                            !failed
                                        ) {

                                            res
                                                .status(201)
                                                .json({

                                                    message:
                                                        "Bill generated successfully.",

                                                    bill: {

                                                        id:
                                                            billId,

                                                        billNumber,

                                                        patientId,

                                                        items:
                                                            cartItems,

                                                        subtotal,

                                                        discount:
                                                            discountAmount,

                                                        finalAmount,

                                                        paymentStatus:
                                                            "Pending"

                                                    }

                                                });

                                        }

                                    }
                                );

                            }
                        );

                    }
                );

            }
        );

    }
);

// =========================================================
// PHARMACY - GET PATIENT BILLS
// =========================================================

app.get(
    "/api/pharmacy/bills/:patientId",
    (req, res) => {

        const patientId =
            req.params.patientId;

        if (!patientId) {

            return res.status(400).json({

                message:
                    "Patient ID is required."

            });

        }

        const sql = `

            SELECT
                id,
                bill_number,
                patient_id,
                subtotal,
                discount,
                final_amount,
                payment_status,
                created_at

            FROM pharmacy_bills

            WHERE patient_id = ?

            ORDER BY created_at DESC

        `;

        db.query(
            sql,
            [patientId],
            (err, bills) => {

                if (err) {

                    console.error(
                        "Bill fetch error:",
                        err
                    );

                    return res
                        .status(500)
                        .json({

                            message:
                                "Database error."

                        });

                }

                res.json({

                    message:
                        "Patient bills fetched successfully.",

                    bills

                });

            }
        );

    }
);

// =========================================================
// GET PRESCRIPTIONS FOR A PATIENT (medical record tab)
// =========================================================

app.get(
    "/api/prescriptions/:patientId",
    (req, res) => {

        const patientId = req.params.patientId;

        if (!patientId) {
            return res.status(400).json({ message: "Patient ID is required." });
        }

        // SELECT * because this table's column set has evolved
        // (two different insert paths write different columns) —
        // returning everything avoids breaking on either shape.
        const sql = `
            SELECT *
            FROM prescriptions
            WHERE patient_id = ?
            ORDER BY id DESC
        `;

        db.query(sql, [patientId], (err, results) => {

            if (err) {
                console.error("Prescriptions fetch error:", err);
                return res.status(500).json({ message: "Database error." });
            }

            res.json({
                message: "Prescriptions fetched successfully.",
                prescriptions: results
            });

        });

    }
);

// =========================================================
// UPLOAD PRESCRIPTION - ACTUAL FILE UPLOAD
// =========================================================

app.post(
    "/api/prescriptions/upload",
    prescriptionUpload.single(
        "prescriptionFile"
    ),
    async (req, res) => {

        try {

            const {
                patientId,
                uploadedBy,
                doctorName
            } = req.body;

            // -----------------------------------------
            // VALIDATION
            // -----------------------------------------

            if (!patientId) {

                if (req.file) {

                    const uploadedFile =
                        path.join(
                            prescriptionUploadDir,
                            req.file.filename
                        );

                    if (
                        fs.existsSync(
                            uploadedFile
                        )
                    ) {

                        fs.unlinkSync(
                            uploadedFile
                        );

                    }

                }

                return res.status(400).json({

                    success: false,

                    message:
                        "Patient ID is required."

                });

            }

            if (!req.file) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Prescription file is required."

                });

            }

            // -----------------------------------------
            // DATABASE INSERT
            // -----------------------------------------

            /*
              NOTE:
              Ye route un columns ke liye hai:

              patient_id
              original_file_name
              stored_file_name
              file_path
              file_type
              file_size
              uploaded_by
              status
            */

            const sql = `

                INSERT INTO prescriptions
                (
                    patient_id,
                    original_file_name,
                    stored_file_name,
                    file_path,
                    file_type,
                    file_size,
                    uploaded_by,
                    status
                )

                VALUES (?, ?, ?, ?, ?, ?, ?, ?)

            `;

            const filePath =
                `/uploads/prescriptions/${req.file.filename}`;

            const values = [

                patientId,

                req.file.originalname,

                req.file.filename,

                filePath,

                req.file.mimetype,

                req.file.size,

                uploadedBy ||
                    "Patient",

                "Uploaded"

            ];

            const [
                result
            ] =
                await db
                    .promise()
                    .execute(
                        sql,
                        values
                    );

            // -----------------------------------------
            // RESPONSE
            // -----------------------------------------

            res.status(201).json({

                success: true,

                message:
                    "Prescription uploaded successfully.",

                prescription: {

                    id:
                        result.insertId,

                    patientId:

                        patientId,

                    originalFileName:
                        req.file.originalname,

                    fileName:
                        req.file.filename,

                    fileType:
                        req.file.mimetype,

                    fileSize:
                        req.file.size,

                    doctorName:
                        doctorName || null,

                    uploadedBy:
                        uploadedBy ||
                        "Patient",

                    status:
                        "Uploaded",

                    filePath,

                    fileUrl:
                        `http://localhost:5000${filePath}`

                }

            });

        }

        catch (error) {

            console.error(
                "Prescription upload error:",
                error
            );

            // -----------------------------------------
            // DELETE FILE IF DATABASE FAILED
            // -----------------------------------------

            if (req.file) {

                const uploadedFile =
                    path.join(
                        prescriptionUploadDir,
                        req.file.filename
                    );

                if (
                    fs.existsSync(
                        uploadedFile
                    )
                ) {

                    fs.unlinkSync(
                        uploadedFile
                    );

                }

            }

            res.status(500).json({

                success: false,

                message:
                    "Prescription upload failed.",

                error:
                    error.message

            });

        }

    }
);
/* =========================================================
   PHARMACY PAYMENT
   LIFE CARE PORTAL
========================================================= */

app.post(
    "/api/pharmacy/payment",
    (req, res) => {

        const {
            patientId,
            paymentMethod,
            amount,
            items
        } = req.body;


        /* =====================================================
           VALIDATION
        ===================================================== */

        if (!patientId) {

            return res.status(400).json({

                success: false,

                message:
                    "Patient ID is required."

            });

        }


        if (!paymentMethod) {

            return res.status(400).json({

                success: false,

                message:
                    "Payment method is required."

            });

        }


        if (
            amount === undefined ||
            Number(amount) <= 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Valid payment amount is required."

            });

        }


        if (
            !Array.isArray(items) ||
            items.length === 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Cart is empty."

            });

        }


        /* =====================================================
           ALLOWED PAYMENT METHODS
        ===================================================== */

        const allowedMethods = [

            "UPI",

            "Card",

            "Net Banking",

            "COD"

        ];


        if (
            !allowedMethods.includes(
                paymentMethod
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid payment method."

            });

        }


        /* =====================================================
           TRANSACTION ID
        ===================================================== */

        const transactionId =

            "TXN-" +

            Date.now() +

            "-" +

            Math.floor(
                1000 +
                Math.random() * 9000
            );


        /* =====================================================
           BILL NUMBER
        ===================================================== */

        const billNumber =

            "LCB-" +

            Date.now();


        const finalAmount =
            Number(amount);


        /* =====================================================
           INSERT PAYMENT RECORD
           
           IMPORTANT:
           This uses pharmacy_bills because your
           existing backend already creates pharmacy bills.
        ===================================================== */

        const billSQL = `

            INSERT INTO pharmacy_bills
            (
                bill_number,
                patient_id,
                subtotal,
                discount,
                final_amount,
                payment_status
            )

            VALUES (?, ?, ?, ?, ?, ?)

        `;


        db.query(

            billSQL,

            [

                billNumber,

                patientId,

                finalAmount,

                0,

                finalAmount,

                paymentMethod === "COD"
                    ? "Pending"
                    : "Paid"

            ],

            (billError, billResult) => {

                if (billError) {

                    console.error(
                        "Payment bill error:",
                        billError
                    );


                    return res.status(500).json({

                        success: false,

                        message:
                            "Unable to create payment bill.",

                        error:
                            billError.message

                    });

                }


                const billId =
                    billResult.insertId;


                /* =================================================
                   SAVE BILL ITEMS
                ================================================= */

                let completed =
                    0;

                let failed =
                    false;


                items.forEach(
                    item => {

                        const quantity =
                            Number(
                                item.quantity
                            ) || 0;


                        const price =
                            Number(
                                item.price
                            ) || 0;


                        const total =
                            quantity *
                            price;


                        const itemSQL = `

                            INSERT INTO pharmacy_bill_items
                            (
                                bill_id,
                                medicine_id,
                                medicine_name,
                                quantity,
                                price,
                                total
                            )

                            VALUES (?, ?, ?, ?, ?, ?)

                        `;


                        db.query(

                            itemSQL,

                            [

                                billId,

                                item.id ||
                                item.medicineId,

                                item.name ||
                                item.medicineName ||
                                "Medicine",

                                quantity,

                                price,

                                total

                            ],

                            (itemError) => {

                                if (itemError) {

                                    console.error(
                                        "Payment item error:",
                                        itemError
                                    );


                                    if (!failed) {

                                        failed =
                                            true;


                                        return res
                                            .status(500)
                                            .json({

                                                success:
                                                    false,

                                                message:
                                                    "Unable to save payment items."

                                            });

                                    }


                                    return;

                                }


                                completed++;


                                /* =================================
                                   ALL ITEMS SAVED
                                ================================= */

                                if (

                                    completed ===
                                    items.length &&

                                    !failed

                                ) {

                                    /*
                                       Reduce stock after
                                       successful payment.
                                    */

                                    reduceMedicineStock(

                                        items,

                                        () => {

                                            res.status(201)
                                                .json({

                                                    success:
                                                        true,

                                                    message:
                                                        paymentMethod === "COD"

                                                            ? "Order placed successfully."

                                                            : "Payment successful.",

                                                    transactionId,

                                                    billNumber,

                                                    billId,

                                                    patientId,

                                                    paymentMethod,

                                                    amount:
                                                        finalAmount,

                                                    paymentStatus:

                                                        paymentMethod ===
                                                        "COD"

                                                            ? "Pending"

                                                            : "Paid"

                                                });

                                        }

                                    );

                                }

                            }

                        );

                    }

                );

            }

        );

    }

);


/* =========================================================
   REDUCE MEDICINE STOCK
========================================================= */

function reduceMedicineStock(
    items,
    callback
) {

    if (
        !Array.isArray(items) ||
        items.length === 0
    ) {

        callback();

        return;

    }


    let completed =
        0;

    let failed =
        false;


    items.forEach(
        item => {

            const medicineId =
                item.id ||
                item.medicineId;


            const quantity =
                Number(
                    item.quantity
                ) || 0;


            if (
                !medicineId ||
                quantity <= 0
            ) {

                completed++;


                if (
                    completed ===
                    items.length &&
                    !failed
                ) {

                    callback();

                }


                return;

            }


            const sql = `

                UPDATE pharmacy

                SET
                    quantity =
                        GREATEST(
                            quantity - ?,
                            0
                        )

                WHERE id = ?

            `;


            db.query(

                sql,

                [

                    quantity,

                    medicineId

                ],

                (error) => {

                    if (error) {

                        console.error(
                            "Stock update error:",
                            error
                        );


                        if (!failed) {

                            failed =
                                true;

                            callback();

                        }


                        return;

                    }


                    completed++;


                    if (

                        completed ===
                        items.length &&

                        !failed

                    ) {

                        callback();

                    }

                }

            );

        }

    );

}
// =========================================================
// GLOBAL MULTER / UPLOAD ERROR HANDLER
// =========================================================

app.use(
    (err, req, res, next) => {

        if (
            err instanceof
            multer.MulterError
        ) {

            if (
                err.code ===
                "LIMIT_FILE_SIZE"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "File size cannot exceed 10 MB."

                });

            }

            return res.status(400).json({

                success: false,

                message:
                    err.message

            });

        }

        if (
            err &&
            err.message &&
            err.message.includes(
                "Only PDF"
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    err.message

            });

        }

        next(err);

    }
);
// =========================================================
// SOCKET.IO
// =========================================================

io.on("connection", (socket) => {

    console.log(
        "🟢 Client connected:",
        socket.id
    );

    socket.on(
        "join-ambulance-tracking",
        () => {

            socket.join(
                "ambulance-tracking"
            );

            console.log(
                `🚑 Client joined ambulance tracking: ${socket.id}`
            );

        }
    );

    socket.on(
        "disconnect",
        () => {

            console.log(
                "🔴 Client disconnected:",
                socket.id
            );

        }
    );

});
// =========================================================
// 404 API ROUTE
// =========================================================

app.use(
    (req, res) => {

        res.status(404).json({

            message:
                "API route not found."

        });

    }
);

// =========================================================
// GENERAL ERROR HANDLER
// =========================================================

app.use(
    (err, req, res, next) => {

        console.error(
            "❌ Server error:",
            err
        );

        res.status(500).json({

            message:
                "Internal server error.",

            error:
                err.message

        });

    }
);

// =========================================================
// SERVER START
// =========================================================

const PORT = 5000;

server.listen(
    PORT,
    () => {

        console.log(
            `🚀 SmartCity AI Backend running at http://localhost:${PORT}`
        );

        console.log(
            `📡 Socket.IO real-time server running`
        );

    }
);