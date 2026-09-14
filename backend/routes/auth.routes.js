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

            const user = {
                userId: result.insertId,
                name,
                mobile,
                email,
                role: "citizen",
                type: "citizen"
            };

            const token = generateToken(user, "citizen");

            res.status(201).json({
                message: "Account created successfully.",
                user,
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
        SELECT id, name, mobile, email, password
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

        const userData = {
            userId: user.id,
            name: user.name,
            mobile: user.mobile,
            email: user.email,
            role: "citizen",
            type: "citizen"
        };

        const token = generateToken(userData, "citizen");

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
        SELECT id, name, staff_id, password, department
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

        const department = String(staff.department || "").trim().toLowerCase();
        const editable = permissions[department] || [];
        const role = department === "admin" ? "admin" : "staff";

        const staffData = {
            userId: staff.id,
            name: staff.name,
            staffId: staff.staff_id,
            department: staff.department,
            role,
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
