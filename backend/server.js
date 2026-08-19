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
                password
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
                    user.password !==
                    password
                ) {

                    return res
                        .status(401)
                        .json({

                            message:
                                "Incorrect password."

                        });

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
                    staff.password !==
                    password
                ) {

                    return res
                        .status(401)
                        .json({

                            message:
                                "Incorrect password."

                        });

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
// BOOK DOCTOR APPOINTMENT
// =========================================================

app.post(
    "/api/appointments",
    (req, res) => {

        const {
            patientId,
            doctor,
            appointmentDate,
            appointmentTime
        } = req.body;

        if (
            !patientId ||
            !doctor ||
            !appointmentDate
        ) {

            return res.status(400).json({

                message:
                    "Patient ID, doctor and appointment date are required."

            });

        }

        let mysqlTime = null;

        if (appointmentTime) {

            const time =
                appointmentTime.trim();

            if (
                /^\d{1,2}:\d{2}(:\d{2})?$/.test(
                    time
                )
            ) {

                const parts =
                    time.split(":");

                const hours =
                    parts[0].padStart(
                        2,
                        "0"
                    );

                const minutes =
                    parts[1];

                const seconds =
                    parts[2] || "00";

                mysqlTime =
                    `${hours}:${minutes}:${seconds}`;

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
                    parseInt(
                        match[1]
                    );

                const minutes =
                    match[2];

                const period =
                    match[3].toUpperCase();

                if (
                    period === "AM"
                ) {

                    if (
                        hours === 12
                    ) {
                        hours = 0;
                    }

                } else {

                    if (
                        hours !== 12
                    ) {
                        hours += 12;
                    }

                }

                mysqlTime =
                    String(hours)
                        .padStart(
                            2,
                            "0"
                        ) +
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

            VALUES (?, ?, ?, ?, ?)

        `;

        db.query(
            sql,
            [
                patientId,
                doctor,
                appointmentDate,
                mysqlTime,
                "Confirmed"
            ],
            (err, result) => {

                if (err) {

                    console.error(
                        "Appointment booking error:",
                        err
                    );

                    return res
                        .status(500)
                        .json({

                            message:
                                "Appointment booking failed."

                        });

                }

                res.status(201).json({

                    message:
                        "Appointment booked successfully.",

                    appointment: {

                        id:
                            result.insertId,

                        patientId,

                        doctor,

                        appointmentDate,

                        appointmentTime:
                            mysqlTime,

                        status:
                            "Confirmed"

                    }

                });

            }
        );

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

app.listen(
    PORT,
    () => {

        console.log(
            `🚀 SmartCity AI Backend running at http://localhost:${PORT}`
        );

    }
);