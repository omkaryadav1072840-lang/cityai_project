const multer = require("multer");
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
require("dotenv").config();

const app = express();

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
    host: "localhost",
    user: "root",
    password: "omkar",
    database: "smartcity"
});

db.connect((err) => {
    if (err) {
        console.error("❌ MySQL connection failed:", err.message);
        return;
    }

    console.log("✅ MySQL connected successfully");
});

// =========================================================
// UPLOAD DIRECTORY
// =========================================================

const uploadDir = path.join(__dirname, "uploads");
const prescriptionDir = path.join(uploadDir, "prescriptions");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(prescriptionDir)) {
    fs.mkdirSync(prescriptionDir, { recursive: true });
}

// Serve uploaded files
app.use("/uploads", express.static(uploadDir));

// =========================================================
// MULTER
// =========================================================

const prescriptionStorage = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, prescriptionDir);
    },

    filename: (req, file, cb) => {

        const extension =
            path.extname(file.originalname);

        const filename =
            "prescription-" +
            Date.now() +
            "-" +
            Math.round(Math.random() * 1000000) +
            extension;

        cb(null, filename);
    }
});

const prescriptionUpload = multer({

    storage: prescriptionStorage,

    fileFilter: (req, file, cb) => {

        const allowed = [
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(
                new Error(
                    "Only PDF, JPG, PNG and WEBP files are allowed."
                )
            );
        }
    },

    limits: {
        fileSize: 10 * 1024 * 1024
    }
});

// =========================================================
// TEST
// =========================================================

app.get("/", (req, res) => {

    res.json({
        success: true,
        message: "SmartCity AI Backend is running"
    });

});

// =========================================================
// CITY STATUS
// =========================================================

app.get("/api/city-status", (req, res) => {

    res.json({

        success: true,

        traffic: "Moderate",
        aqi: 82,
        ambulances: 12,
        temperature: 31,
        hospitals: 8

    });

});

// =========================================================
// CITIZEN REGISTER
// =========================================================

app.post("/api/register", (req, res) => {

    const {
        name,
        mobile,
        email,
        password
    } = req.body;

    if (!name || !mobile || !email || !password) {

        return res.status(400).json({
            message: "All fields are required."
        });

    }

    const sql = `
        INSERT INTO users
        (name, mobile, email, password)
        VALUES (?, ?, ?, ?)
    `;

    db.query(
        sql,
        [name, mobile, email, password],
        (err, result) => {

            if (err) {

                console.error("Register error:", err);

                if (err.code === "ER_DUP_ENTRY") {

                    return res.status(409).json({
                        message:
                            "Email or mobile already registered."
                    });

                }

                return res.status(500).json({
                    message: "Database error."
                });
            }

            res.status(201).json({

                message:
                    "Account created successfully.",

                user: {
                    userId: result.insertId,
                    name,
                    mobile,
                    email,
                    type: "citizen"
                }

            });

        }
    );

});

// =========================================================
// CITIZEN LOGIN
// =========================================================

app.post("/api/login", (req, res) => {

    const {
        loginId,
        password
    } = req.body;

    if (!loginId || !password) {

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
        WHERE email = ? OR mobile = ?
        LIMIT 1
    `;

    db.query(
        sql,
        [loginId, loginId],
        (err, results) => {

            if (err) {

                console.error("Login error:", err);

                return res.status(500).json({
                    message: "Database error."
                });
            }

            if (results.length === 0) {

                return res.status(401).json({
                    message: "User not found."
                });
            }

            const user = results[0];

            if (user.password !== password) {

                return res.status(401).json({
                    message: "Incorrect password."
                });
            }

            res.json({

                message:
                    "Login successful.",

                user: {

                    userId: user.id,
                    name: user.name,
                    mobile: user.mobile,
                    email: user.email,
                    type: "citizen"

                }

            });

        }
    );

});

// =========================================================
// STAFF LOGIN
// =========================================================

app.post("/api/staff-login", (req, res) => {

    const {
        staffId,
        password
    } = req.body;

    if (!staffId || !password) {

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

    db.query(sql, [staffId], (err, results) => {

        if (err) {

            console.error("Staff login error:", err);

            return res.status(500).json({
                message: "Database error."
            });

        }

        if (results.length === 0) {

            return res.status(401).json({
                message: "Staff ID not found."
            });

        }

        const staff = results[0];

        if (staff.password !== password) {

            return res.status(401).json({
                message: "Incorrect password."
            });

        }

        const permissions = {

            traffic: ["traffic"],
            waste: ["waste"],
            water: ["water"],
            emergency: ["emergency"],
            parking: ["parking"],

            hospital: [
                "hospital",
                "healthcare"
            ],

            healthcare: [
                "hospital",
                "healthcare"
            ],

            pharmacy: ["pharmacy"],
            police: ["police"],
            places: ["places"],

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
            String(staff.department || "")
                .trim()
                .toLowerCase();

        const editable =
            permissions[department] || [];

        res.json({

            message:
                "Staff login successful.",

            user: {

                userId: staff.id,
                name: staff.name,
                staffId: staff.staff_id,
                department: staff.department,
                type: "staff",
                editable

            }

        });

    });

});

// =========================================================
// PATIENT REGISTER
// =========================================================

app.post("/api/patients", (req, res) => {

    const {
        patientId,
        name,
        age,
        gender,
        mobile,
        bloodGroup,
        address
    } = req.body;

    if (!patientId || !name || !mobile) {

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

                if (err.code === "ER_DUP_ENTRY") {

                    return res.status(409).json({
                        message:
                            "Patient ID already exists."
                    });

                }

                return res.status(500).json({
                    message: "Database error."
                });

            }

            res.status(201).json({

                message:
                    "Patient registered successfully.",

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
// GET PATIENTS
// =========================================================

app.get("/api/patients", (req, res) => {

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

    db.query(sql, (err, results) => {

        if (err) {

            console.error("Get patients error:", err);

            return res.status(500).json({
                message: "Database error."
            });

        }

        res.json({
            message:
                "Patients fetched successfully.",
            patients: results
        });

    });

});

// =========================================================
// SEARCH PATIENT
// =========================================================

app.get("/api/patients/search/:patientId", (req, res) => {

    const patientId =
        req.params.patientId.trim();

    if (!patientId) {

        return res.status(400).json({
            message: "Patient ID is required."
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

        }
    );

});

// =========================================================
// PATIENT BY ID
// =========================================================

app.get("/api/patients/:patientId", (req, res) => {

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

        }
    );

});

// =========================================================
// DOCTOR MANAGEMENT
// =========================================================

// GET DOCTORS

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
            message:
                "Doctors fetched successfully.",
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
            message:
                "Doctor ID and name are required."
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

                if (err.code === "ER_DUP_ENTRY") {

                    return res.status(409).json({
                        message:
                            "Doctor ID already exists."
                    });

                }

                console.error(err);

                return res.status(500).json({
                    message: "Database error."
                });

            }

            res.status(201).json({

                message:
                    "Doctor added successfully.",

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
                message:
                    "Doctor updated successfully."
            });

        }
    );

});

// DELETE DOCTOR

app.delete("/api/doctors/:id", (req, res) => {

    const id = req.params.id;

    db.query(
        "DELETE FROM doctors WHERE id = ?",
        [id],
        (err, result) => {

            if (err) {

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
                message:
                    "Doctor deleted successfully."
            });

        }
    );

});

// =========================================================
// DOCTOR SLOTS
// =========================================================

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

            return res.status(500).json({
                message: "Database error."
            });

        }

        res.json({
            message:
                "Doctor slots fetched successfully.",
            slots: results
        });

    });

});

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

    db.query(
        sql,
        [doctorId],
        (err, results) => {

            if (err) {

                return res.status(500).json({
                    message: "Database error."
                });

            }

            res.json({
                slots: results
            });

        }
    );

});

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
            booked_patients,
            status
        )
        VALUES (?, ?, ?, ?, ?, 0, 'Available')
    `;

    db.query(
        sql,
        [
            doctorId,
            slotDate,
            startTime,
            endTime,
            Number(maxPatients || 1)
        ],
        (err, result) => {

            if (err) {

                console.error(err);

                return res.status(500).json({
                    message: "Database error."
                });

            }

            res.status(201).json({

                message:
                    "Doctor slot created successfully.",

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

app.delete("/api/doctor-slots/:id", (req, res) => {

    db.query(
        "DELETE FROM doctor_slots WHERE id = ?",
        [req.params.id],
        (err, result) => {

            if (err) {

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
                message:
                    "Doctor slot deleted successfully."
            });

        }
    );

});

// =========================================================
// APPOINTMENTS
// =========================================================

app.post("/api/appointments", (req, res) => {

    const {
        patientId,
        doctor,
        appointmentDate,
        appointmentTime
    } = req.body;

    if (!patientId || !doctor || !appointmentDate) {

        return res.status(400).json({
            message:
                "Patient ID, doctor and appointment date are required."
        });

    }

    let mysqlTime = null;

    if (appointmentTime) {

        const time =
            appointmentTime.trim();

        if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(time)) {

            const parts = time.split(":");

            mysqlTime =
                parts[0].padStart(2, "0") +
                ":" +
                parts[1] +
                ":" +
                (parts[2] || "00");

        } else {

            const match =
                time.match(
                    /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i
                );

            if (!match) {

                return res.status(400).json({
                    message:
                        "Invalid appointment time format."
                });

            }

            let hours =
                parseInt(match[1]);

            const minutes = match[2];
            const period =
                match[3].toUpperCase();

            if (period === "AM" && hours === 12) {
                hours = 0;
            }

            if (period === "PM" && hours !== 12) {
                hours += 12;
            }

            mysqlTime =
                String(hours).padStart(2, "0") +
                ":" +
                minutes +
                ":00";

        }

    }

    const sql = `
        INSERT INTO appointments
        (
            patient_id,
            doctor,
            appointment_date,
            appointment_time,
            status
        )
        VALUES (?, ?, ?, ?, 'Confirmed')
    `;

    db.query(
        sql,
        [
            patientId,
            doctor,
            appointmentDate,
            mysqlTime
        ],
        (err, result) => {

            if (err) {

                console.error(err);

                return res.status(500).json({
                    message:
                        "Appointment booking failed."
                });

            }

            res.status(201).json({

                message:
                    "Appointment booked successfully.",

                appointment: {
                    id: result.insertId,
                    patientId,
                    doctor,
                    appointmentDate,
                    appointmentTime: mysqlTime,
                    status: "Confirmed"
                }

            });

        }
    );

});

app.get("/api/appointments/:patientId", (req, res) => {

    const sql = `
        SELECT
            id,
            patient_id,
            doctor,
            appointment_date,
            appointment_time,
            status,
            created_at
        FROM appointments
        WHERE patient_id = ?
        ORDER BY appointment_date DESC,
                 appointment_time DESC
    `;

    db.query(
        sql,
        [req.params.patientId],
        (err, results) => {

            if (err) {

                return res.status(500).json({
                    message: "Database error."
                });

            }

            res.json({
                message:
                    "Appointments fetched successfully.",
                appointments: results
            });

        }
    );

});

// =========================================================
// HOSPITALS
// =========================================================

app.get("/api/hospitals", (req, res) => {

    const sql = `
        SELECT *
        FROM hospitals
        ORDER BY hospital_name ASC
    `;

    db.query(sql, (err, results) => {

        if (err) {

            console.error(err);

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

app.get("/api/hospitals/:hospitalId", (req, res) => {

    const sql = `
        SELECT *
        FROM hospitals
        WHERE hospital_id = ?
        LIMIT 1
    `;

    db.query(
        sql,
        [req.params.hospitalId],
        (err, results) => {

            if (err) {

                return res.status(500).json({
                    message: "Database error."
                });

            }

            if (results.length === 0) {

                return res.status(404).json({
                    message: "Hospital not found."
                });

            }

            res.json({
                message: "Hospital found.",
                hospital: results[0]
            });

        }
    );

});

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

                if (err.code === "ER_DUP_ENTRY") {

                    return res.status(409).json({
                        message:
                            "Hospital ID already exists."
                    });

                }

                return res.status(500).json({
                    message: "Database error."
                });

            }

            res.status(201).json({

                message:
                    "Hospital added successfully.",

                id: result.insertId

            });

        }
    );

});

app.put("/api/hospitals/:id", (req, res) => {

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
            req.params.id
        ],
        (err, result) => {

            if (err) {

                return res.status(500).json({
                    message: "Database error."
                });

            }

            if (result.affectedRows === 0) {

                return res.status(404).json({
                    message: "Hospital not found."
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
// HOSPITAL BEDS
// =========================================================

app.get("/api/hospital/beds", (req, res) => {

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

    db.query(sql, (err, results) => {

        if (err) {

            return res.status(500).json({
                message: "Database error."
            });

        }

        res.json({
            message:
                "Bed availability fetched successfully.",
            beds: results
        });

    });

});

app.put("/api/hospital/beds/:id", (req, res) => {

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
            req.params.id
        ],
        (err, result) => {

            if (err) {

                return res.status(500).json({
                    message: "Database error."
                });

            }

            if (result.affectedRows === 0) {

                return res.status(404).json({
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

});

// =========================================================
// AMBULANCES
// =========================================================

app.get("/api/ambulances", (req, res) => {

    db.query(
        `
        SELECT *
        FROM ambulances
        ORDER BY ambulance_id ASC
        `,
        (err, results) => {

            if (err) {

                return res.status(500).json({
                    message: "Database error."
                });

            }

            res.json({
                message:
                    "Ambulances fetched successfully.",
                ambulances: results
            });

        }
    );

});

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
                id: result.insertId
            });

        }
    );

});

app.put("/api/ambulances/:id", (req, res) => {

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
            req.params.id
        ],
        (err, result) => {

            if (err) {

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

app.delete("/api/ambulances/:id", (req, res) => {

    db.query(
        "DELETE FROM ambulances WHERE id = ?",
        [req.params.id],
        (err, result) => {

            if (err) {

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

        }
    );

});

// =========================================================
// EMERGENCY DEPARTMENT
// =========================================================

app.get("/api/emergency-departments", (req, res) => {

    db.query(
        `
        SELECT *
        FROM emergency_departments
        ORDER BY hospital_name ASC
        `,
        (err, results) => {

            if (err) {

                return res.status(500).json({
                    message: "Database error."
                });

            }

            res.json({
                message:
                    "Emergency departments fetched successfully.",
                emergencyDepartments: results
            });

        }
    );

});

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

app.put("/api/emergency-departments/:id", (req, res) => {

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
            req.params.id
        ],
        (err, result) => {

            if (err) {

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
// PHARMACY
// =========================================================

// GET MEDICINES

app.get("/api/pharmacy", (req, res) => {

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

    db.query(sql, (err, results) => {

        if (err) {

            console.error(
                "Pharmacy error:",
                err
            );

            return res.status(500).json({
                success: false,
                message: "Pharmacy database error.",
                medicines: []
            });

        }

        res.json({
            success: true,
            medicines: results
        });

    });

});

// SEARCH MEDICINE

app.get("/api/pharmacy/search/:medicine", (req, res) => {

    const medicine =
        req.params.medicine.trim();

    if (!medicine) {

        return res.status(400).json({
            success: false,
            message:
                "Medicine name is required.",
            medicines: []
        });

    }

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
        WHERE medicine_name LIKE ?
        ORDER BY medicine_name ASC
    `;

    db.query(
        sql,
        [`%${medicine}%`],
        (err, results) => {

            if (err) {

                return res.status(500).json({
                    success: false,
                    message: "Database error.",
                    medicines: []
                });

            }

            res.json({
                success: true,
                medicines: results
            });

        }
    );

});

// ADD MEDICINE

app.post("/api/pharmacy", (req, res) => {

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

    const qty = Number(quantity || 0);
    const medicinePrice = Number(price || 0);

    const availability =
        qty > 0
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
            qty,
            medicinePrice,
            availability
        ],
        (err, result) => {

            if (err) {

                return res.status(500).json({
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

});

// UPDATE MEDICINE

app.put("/api/pharmacy/:id", (req, res) => {

    const {
        quantity,
        price,
        availability
    } = req.body;

    const qty = Number(quantity || 0);
    const medicinePrice = Number(price || 0);

    const finalAvailability =
        availability ||
        (
            qty > 0
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
            qty,
            medicinePrice,
            finalAvailability,
            req.params.id
        ],
        (err, result) => {

            if (err) {

                return res.status(500).json({
                    message:
                        "Database error."
                });

            }

            if (result.affectedRows === 0) {

                return res.status(404).json({
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

});

// =========================================================
// PHARMACY CART
// =========================================================

app.post("/api/pharmacy/cart", (req, res) => {

    const {
        patientId,
        medicineId,
        medicineName,
        quantity
    } = req.body;

    const qty = Number(quantity);

    if (
        !patientId ||
        !medicineId ||
        !medicineName ||
        !Number.isFinite(qty) ||
        qty <= 0
    ) {

        return res.status(400).json({
            message:
                "Patient ID, medicine and valid quantity are required."
        });

    }

    db.query(
        `
        SELECT
            id,
            medicine_name,
            quantity,
            price,
            availability
        FROM pharmacy
        WHERE id = ?
        LIMIT 1
        `,
        [medicineId],
        (err, results) => {

            if (err) {

                return res.status(500).json({
                    message: "Database error."
                });

            }

            if (results.length === 0) {

                return res.status(404).json({
                    message: "Medicine not found."
                });

            }

            const medicine = results[0];

            if (Number(medicine.quantity) < qty) {

                return res.status(400).json({
                    message:
                        `Only ${medicine.quantity} units available.`
                });

            }

            const total =
                Number(medicine.price) * qty;

            const sql = `
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
                sql,
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

                        return res.status(500).json({
                            message:
                                "Unable to add medicine to cart."
                        });

                    }

                    res.status(201).json({

                        message:
                            "Medicine added to cart.",

                        cartItem: {
                            id: result.insertId,
                            patientId,
                            medicineId: medicine.id,
                            medicineName:
                                medicine.medicine_name,
                            quantity: qty,
                            price: medicine.price,
                            total
                        }

                    });

                }
            );

        }
    );

});

app.get("/api/pharmacy/cart/:patientId", (req, res) => {

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
        [req.params.patientId],
        (err, results) => {

            if (err) {

                return res.status(500).json({
                    message: "Database error."
                });

            }

            const subtotal =
                results.reduce(
                    (sum, item) =>
                        sum + Number(item.total || 0),
                    0
                );

            res.json({
                message:
                    "Cart loaded successfully.",
                items: results,
                subtotal
            });

        }
    );

});

app.delete("/api/pharmacy/cart/:id", (req, res) => {

    db.query(
        "DELETE FROM pharmacy_cart WHERE id = ?",
        [req.params.id],
        (err, result) => {

            if (err) {

                return res.status(500).json({
                    message: "Database error."
                });

            }

            if (result.affectedRows === 0) {

                return res.status(404).json({
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

});

// =========================================================
// PHARMACY CHECKOUT
// =========================================================

app.post("/api/pharmacy/checkout", (req, res) => {

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
        !Number.isFinite(discountAmount) ||
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

                return res.status(500).json({
                    message:
                        "Database error."
                });

            }

            if (cartItems.length === 0) {

                return res.status(400).json({
                    message:
                        "Cart is empty."
                });

            }

            const subtotal =
                cartItems.reduce(
                    (sum, item) =>
                        sum + Number(item.total || 0),
                    0
                );

            if (discountAmount > subtotal) {

                return res.status(400).json({
                    message:
                        "Discount cannot be greater than total."
                });

            }

            const finalAmount =
                subtotal - discountAmount;

            const billNumber =
                "BILL-" + Date.now();

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
                VALUES (?, ?, ?, ?, ?, 'Pending')
            `;

            db.query(
                billSQL,
                [
                    billNumber,
                    patientId,
                    subtotal,
                    discountAmount,
                    finalAmount
                ],
                (billErr, billResult) => {

                    if (billErr) {

                        return res.status(500).json({
                            message:
                                "Bill creation failed."
                        });

                    }

                    const billId =
                        billResult.insertId;

                    let completed = 0;
                    let failed = false;

                    cartItems.forEach(item => {

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

                                if (itemErr) {

                                    if (!failed) {

                                        failed = true;

                                        return res.status(500).json({
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

                                    res.status(201).json({

                                        message:
                                            "Bill generated successfully.",

                                        bill: {

                                            id: billId,
                                            billNumber,
                                            patientId,
                                            items: cartItems,
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

                    });

                }
            );

        }
    );

});

app.get("/api/pharmacy/bills/:patientId", (req, res) => {

    db.query(
        `
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
        `,
        [req.params.patientId],
        (err, results) => {

            if (err) {

                return res.status(500).json({
                    message: "Database error."
                });

            }

            res.json({
                message:
                    "Patient bills fetched successfully.",
                bills: results
            });

        }
    );

});

// =========================================================
// PRESCRIPTION JSON RECORD
// =========================================================

app.post("/api/pharmacy/prescriptions", (req, res) => {

    const {
        patientId,
        prescriptionFile,
        doctorName
    } = req.body;

    if (!patientId || !prescriptionFile) {

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
        VALUES (?, ?, ?, 'Uploaded')
    `;

    db.query(
        sql,
        [
            patientId,
            prescriptionFile,
            doctorName || null
        ],
        (err, result) => {

            if (err) {

                return res.status(500).json({
                    message:
                        "Prescription database error."
                });

            }

            res.status(201).json({

                message:
                    "Prescription uploaded successfully.",

                prescription: {
                    id: result.insertId,
                    patientId,
                    prescriptionFile,
                    doctorName:
                        doctorName || null,
                    status: "Uploaded"
                }

            });

        }
    );

});

// =========================================================
// ACTUAL PRESCRIPTION FILE UPLOAD
// =========================================================

app.post(
    "/api/prescriptions/upload",
    prescriptionUpload.single("prescriptionFile"),
    async (req, res) => {

        try {

            const {
                patientId,
                uploadedBy,
                doctorName
            } = req.body;

            if (!patientId) {

                if (req.file) {

                    fs.unlinkSync(
                        path.join(
                            prescriptionDir,
                            req.file.filename
                        )
                    );

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

            const filePath =
                `/uploads/prescriptions/${req.file.filename}`;

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
                    doctor_name,
                    status
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Uploaded')
            `;

            const values = [

                patientId,
                req.file.originalname,
                req.file.filename,
                filePath,
                req.file.mimetype,
                req.file.size,
                uploadedBy || "Patient",
                doctorName || null

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

            res.status(201).json({

                success: true,

                message:
                    "Prescription uploaded successfully.",

                prescription: {

                    id: result.insertId,
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
                        uploadedBy || "Patient",
                    status: "Uploaded",
                    filePath,
                    fileUrl:
                        `http://localhost:5000${filePath}`

                }

            });

        } catch (error) {

            console.error(
                "Prescription upload error:",
                error
            );

            if (req.file) {

                const file =
                    path.join(
                        prescriptionDir,
                        req.file.filename
                    );

                if (fs.existsSync(file)) {
                    fs.unlinkSync(file);
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

// =========================================================
// GET PRESCRIPTIONS
// =========================================================

app.get("/api/prescriptions/:patientId", (req, res) => {

    const sql = `
        SELECT *
        FROM prescriptions
        WHERE patient_id = ?
        ORDER BY created_at DESC
    `;

    db.query(
        sql,
        [req.params.patientId],
        (err, results) => {

            if (err) {

                return res.status(500).json({
                    message: "Database error."
                });

            }

            res.json({
                message:
                    "Prescriptions fetched successfully.",
                prescriptions: results
            });

        }
    );

});

// =========================================================
// MULTER ERROR HANDLER
// =========================================================

app.use((err, req, res, next) => {

    if (err instanceof multer.MulterError) {

        if (err.code === "LIMIT_FILE_SIZE") {

            return res.status(400).json({
                success: false,
                message:
                    "File size cannot exceed 10 MB."
            });

        }

        return res.status(400).json({
            success: false,
            message: err.message
        });

    }

    if (
        err &&
        err.message &&
        err.message.includes("Only PDF")
    ) {

        return res.status(400).json({
            success: false,
            message: err.message
        });

    }

    next(err);

});

// =========================================================
// 404
// =========================================================

app.use((req, res) => {

    res.status(404).json({
        success: false,
        message:
            "API route not found."
    });

});

// =========================================================
// GENERAL ERROR
// =========================================================

app.use((err, req, res, next) => {

    console.error("❌ Server error:", err);

    res.status(500).json({
        success: false,
        message:
            "Internal server error.",
        error:
            err.message
    });

});

// =========================================================
// SERVER START
// =========================================================

const PORT = 5000;

app.listen(PORT, () => {

    console.log(
        `🚀 SmartCity AI Backend running at http://localhost:${PORT}`
    );

});