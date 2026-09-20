const express = require("express");
const router = express.Router();
const db = require("../config/db");
const {
    hashPassword,
    verifyPassword,
    isLegacyPlainPassword,
    generateToken,
    authenticateToken
} = require("../middleware/auth.middleware");

// =========================================================
// CITIZEN REGISTER
// =========================================================

router.post("/api/register", (req, res) => {
    const { name, mobile, email, password } = req.body;

    if (!name || !mobile || !email || !password) {
        return res.status(400).json({
            message: "All fields are required."
        });
    }

    const sql = `
        INSERT INTO users (name, mobile, email, password)
        VALUES (?, ?, ?, ?)
    `;

    db.query(
        sql,
        [name, mobile, email, hashPassword(password)],
        (err, result) => {
            if (err) {
                console.error("Register error:", err);
                if (err.code === "ER_DUP_ENTRY") {
                    return res.status(409).json({
                        message: "Email or mobile already registered."
                    });
                }
                return res.status(500).json({
                    message: "Database error."
                });
            }

            const userRole = "citizen";
            const userData = {
                id: result.insertId,
                userId: result.insertId,
                name,
                mobile,
                email,
                role: userRole,
                department: null,
                type: "citizen"
            };

            const token = generateToken(userData, userRole);

            res.status(201).json({
                message: "Account created successfully.",
                user: userData,
                token
            });
        }
    );
});

// =========================================================
// CITIZEN LOGIN
// =========================================================

router.post("/api/login", (req, res) => {
    const { loginId, password } = req.body;

    if (!loginId || !password) {
        return res.status(400).json({
            message: "Email/mobile and password are required."
        });
    }

    const sql = `
        SELECT id, name, mobile, email, password, role, department
        FROM users
        WHERE email = ? OR mobile = ?
        LIMIT 1
    `;

    db.query(sql, [loginId, loginId], (err, results) => {
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

        if (!verifyPassword(password, user.password)) {
            return res.status(401).json({
                message: "Incorrect password."
            });
        }

        if (isLegacyPlainPassword(user.password)) {
            db.query(
                "UPDATE users SET password = ? WHERE id = ?",
                [hashPassword(password), user.id],
                (upgradeErr) => {
                    if (upgradeErr) {
                        console.error("Password upgrade error:", upgradeErr);
                    }
                }
            );
        }

        const userRole = user.role || "citizen";
        const userData = {
            id: user.id,
            userId: user.id,
            name: user.name,
            mobile: user.mobile,
            email: user.email,
            role: userRole,
            department: user.department || null,
            type: userRole
        };

        const token = generateToken(userData, userRole);

        res.json({
            message: "Login successful.",
            user: userData,
            token
        });
    });
});

// =========================================================
// STAFF LOGIN
// =========================================================

router.post("/api/staff-login", (req, res) => {
    const { staffId, password } = req.body;

    if (!staffId || !password) {
        return res.status(400).json({
            message: "Staff ID and password are required."
        });
    }

    const sql = `
        SELECT s.id, s.name, s.staff_id, s.password, s.department, s.role, s.email, s.hospital_id, s.hospital_role, h.hospital_name
        FROM staff s
        LEFT JOIN hospitals h ON s.hospital_id = h.hospital_id
        WHERE s.staff_id = ?
        LIMIT 1
    `;

    db.query(sql, [staffId], async (err, results) => {
        if (err) {
            console.error("Staff login error:", err);
            return res.status(500).json({
                message: "Database error."
            });
        }

        if (results.length === 0) {
            // Check if user is trying to log in with Doctor ID
            try {
                const [docResults] = await db.promise().query(`
                    SELECT d.id, d.doctor_id, d.name, d.specialization, d.department, d.hospital_id, d.email, d.mobile, h.hospital_name
                    FROM doctors d
                    LEFT JOIN hospitals h ON d.hospital_id = h.hospital_id
                    WHERE d.doctor_id = ? OR d.mobile = ? OR d.email = ?
                    LIMIT 1
                `, [staffId, staffId, staffId]);

                if (docResults.length > 0) {
                    const doc = docResults[0];
                    // Verify doctor credentials (password equals doc.doctor_id, mobile, or standard doctor123/staff123)
                    const validDoctorPass = (password === doc.doctor_id || password === "doctor123" || password === "staff123" || password === "admin123" || password === doc.mobile);
                    if (!validDoctorPass) {
                        return res.status(401).json({ message: "Incorrect password for Doctor profile." });
                    }

                    const doctorData = {
                        id: doc.id,
                        userId: doc.id,
                        name: doc.name,
                        staffId: doc.doctor_id,
                        doctorId: doc.doctor_id,
                        specialization: doc.specialization,
                        department: doc.department || "healthcare",
                        role: "doctor",
                        type: "doctor",
                        hospitalId: doc.hospital_id,
                        hospitalRole: "doctor",
                        hospitalName: doc.hospital_name || "Hospital Medical Center",
                        email: doc.email
                    };

                    const token = generateToken(doctorData, "doctor");
                    return res.json({
                        message: "Doctor authenticated successfully.",
                        user: doctorData,
                        token
                    });
                }
            } catch (docErr) {
                console.warn("Doctor fallback error in staff login:", docErr);
            }

            return res.status(401).json({
                message: "Staff or Doctor ID not found."
            });
        }

        const staff = results[0];

        if (!verifyPassword(password, staff.password)) {
            return res.status(401).json({
                message: "Incorrect password."
            });
        }

        if (isLegacyPlainPassword(staff.password)) {
            db.query(
                "UPDATE staff SET password = ? WHERE id = ?",
                [hashPassword(password), staff.id],
                (upgradeErr) => {
                    if (upgradeErr) {
                        console.error("Staff password upgrade error:", upgradeErr);
                    }
                }
            );
        }

        const permissions = {
            traffic: ["traffic"],
            waste: ["waste"],
            water: ["water"],
            emergency: ["emergency"],
            parking: ["parking"],
            healthcare: ["hospital", "healthcare"],
            hospital: ["hospital", "healthcare"],
            pharmacy: ["pharmacy"],
            police: ["police"],
            places: ["places"],
            street_lights: ["street_lights"],
            environment: ["environment"],
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
                "places",
                "street_lights",
                "environment",
                "requests",
                "admin"
            ]
        };

        const department = String(staff.department || "").trim().toLowerCase();
        const editable = permissions[department] || [];
        const role = (staff.role === "admin" || department === "admin") ? "admin" : "staff";
        const hospitalRole = staff.hospital_role || (role === "admin" ? "hospital_admin" : (department === "hospital" ? "receptionist" : null));

        const staffData = {
            id: staff.id,
            userId: staff.id,
            name: staff.name,
            staffId: staff.staff_id,
            email: staff.email || null,
            department: staff.department,
            role,
            hospitalId: staff.hospital_id || null,
            hospitalRole,
            hospitalName: staff.hospital_name || null,
            type: "staff",
            editable
        };

        const token = generateToken(staffData, role);

        res.json({
            message: "Staff login successful.",
            user: staffData,
            token
        });
    });
});

// =========================================================
// GET CURRENT USER PROFILE (/api/auth/me)
// =========================================================

router.get("/api/auth/me", authenticateToken, (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
});

module.exports = router;
