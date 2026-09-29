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
                    SELECT d.id, d.doctor_id, d.name, d.specialization, d.department, d.hospital_id, d.email, d.mobile, d.password, h.hospital_name
                    FROM doctors d
                    LEFT JOIN hospitals h ON d.hospital_id = h.hospital_id
                    WHERE d.doctor_id = ? OR d.mobile = ? OR d.email = ?
                    LIMIT 1
                `, [staffId, staffId, staffId]);

                if (docResults.length > 0) {
                    const doc = docResults[0];
                    // Verify doctor credentials securely
                    if (!verifyPassword(password, doc.password)) {
                        return res.status(401).json({ message: "Incorrect password for Doctor profile." });
                    }

                    if (isLegacyPlainPassword(doc.password)) {
                        db.promise().query(
                            "UPDATE doctors SET password = ? WHERE id = ?",
                            [hashPassword(password), doc.id]
                        ).catch(e => console.warn("Doctor password upgrade error:", e.message));
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

router.get(["/api/auth/me", "/api/user/profile"], authenticateToken, (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
});

// =========================================================
// UPDATE USER PROFILE (/api/auth/profile)
// =========================================================

router.put("/api/auth/profile", authenticateToken, (req, res) => {
    const {
        name,
        email,
        mobile,
        vehicleNumber,
        ward,
        bloodGroup,
        emergencyContactName,
        emergencyContactPhone
    } = req.body;

    const userId = req.user.id;
    const userRole = (req.user.role || "").toLowerCase();

    // If citizen and we have DB connection, update core fields
    if (userRole === "citizen" && userId) {
        const updateSql = `
            UPDATE users 
            SET name = COALESCE(?, name),
                email = COALESCE(?, email)
            WHERE id = ? OR mobile = ?
        `;
        db.query(updateSql, [name || null, email || null, userId, req.user.mobile || ''], (err) => {
            if (err) {
                console.error("Profile update error:", err);
            }

            const updatedUser = {
                ...req.user,
                name: name || req.user.name,
                email: email || req.user.email,
                mobile: mobile || req.user.mobile,
                vehicleNumber: vehicleNumber || req.user.vehicleNumber,
                ward: ward || req.user.ward,
                bloodGroup: bloodGroup || req.user.bloodGroup,
                emergencyContactName: emergencyContactName || req.user.emergencyContactName,
                emergencyContactPhone: emergencyContactPhone || req.user.emergencyContactPhone
            };

            return res.json({
                success: true,
                message: "Profile updated successfully.",
                user: updatedUser
            });
        });
    } else {
        // Staff or admin profile updates
        const updatedUser = {
            ...req.user,
            name: name || req.user.name,
            email: email || req.user.email,
            mobile: mobile || req.user.mobile,
            vehicleNumber: vehicleNumber || req.user.vehicleNumber,
            ward: ward || req.user.ward,
            bloodGroup: bloodGroup || req.user.bloodGroup,
            emergencyContactName: emergencyContactName || req.user.emergencyContactName,
            emergencyContactPhone: emergencyContactPhone || req.user.emergencyContactPhone
        };

        return res.json({
            success: true,
            message: "Profile updated successfully.",
            user: updatedUser
        });
    }
});
// =========================================================
// DEMO PERSONA LOGIN (/api/auth/demo-login)
// Allows quick role switching for testing/demos without exposing
// plaintext credentials in frontend client source code.
// =========================================================

router.post("/api/auth/demo-login", async (req, res) => {
    try {
        if (process.env.ALLOW_DEMO_LOGIN === "false") {
            return res.status(403).json({
                success: false,
                message: "Demo login is disabled in this environment."
            });
        }

        const persona = String(req.body.persona || req.body.role || "citizen").toLowerCase();

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
                "traffic", "waste", "water", "emergency", "parking",
                "hospital", "healthcare", "pharmacy", "police",
                "places", "street_lights", "environment", "requests", "admin"
            ]
        };

        if (persona === "doctor") {
            const [docs] = await db.promise().query(`
                SELECT d.id, d.doctor_id, d.name, d.specialization, d.department, d.hospital_id, d.email, d.mobile, h.hospital_name
                FROM doctors d
                LEFT JOIN hospitals h ON d.hospital_id = h.hospital_id
                LIMIT 1
            `);
            if (docs.length > 0) {
                const doc = docs[0];
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
                    hospitalName: doc.hospital_name || "Civil Hospital Gorakhpur",
                    email: doc.email
                };
                const token = generateToken(doctorData, "doctor");
                return res.json({
                    success: true,
                    message: "Demo Doctor authenticated.",
                    user: doctorData,
                    token
                });
            }
        }

        if (persona === "admin" || persona.includes("admin")) {
            const [admins] = await db.promise().query(`
                SELECT id, name, staff_id, department, role, email, hospital_id, hospital_role
                FROM staff
                WHERE role = 'admin' OR department = 'admin' OR staff_id IN ('TR-ADMIN', 'STAFF-001')
                LIMIT 1
            `);
            if (admins.length > 0) {
                const adm = admins[0];
                const adminData = {
                    id: adm.id,
                    userId: adm.id,
                    name: adm.name,
                    staffId: adm.staff_id,
                    email: adm.email,
                    department: adm.department || "admin",
                    role: "admin",
                    hospitalId: adm.hospital_id,
                    hospitalRole: "hospital_admin",
                    type: "staff",
                    editable: permissions.admin
                };
                const token = generateToken(adminData, "admin");
                return res.json({
                    success: true,
                    message: "Demo Admin authenticated.",
                    user: adminData,
                    token
                });
            }
        }

        if (persona === "traffic" || persona === "traffic_staff") {
            const [staffRows] = await db.promise().query(`
                SELECT id, name, staff_id, department, role, email
                FROM staff
                WHERE department = 'traffic' OR staff_id LIKE 'TR-%'
                LIMIT 1
            `);
            if (staffRows.length > 0) {
                const st = staffRows[0];
                const staffData = {
                    id: st.id,
                    userId: st.id,
                    name: st.name,
                    staffId: st.staff_id,
                    email: st.email,
                    department: "traffic",
                    role: "staff",
                    type: "staff",
                    editable: permissions.traffic
                };
                const token = generateToken(staffData, "staff");
                return res.json({
                    success: true,
                    message: "Demo Traffic Officer authenticated.",
                    user: staffData,
                    token
                });
            }
        }

        if (persona === "hospital" || persona === "hospital_staff" || persona === "receptionist") {
            const [hospStaff] = await db.promise().query(`
                SELECT s.id, s.name, s.staff_id, s.department, s.role, s.email, s.hospital_id, s.hospital_role, h.hospital_name
                FROM staff s
                LEFT JOIN hospitals h ON s.hospital_id = h.hospital_id
                WHERE s.department IN ('hospital', 'healthcare') OR s.hospital_id IS NOT NULL
                LIMIT 1
            `);
            if (hospStaff.length > 0) {
                const hs = hospStaff[0];
                const staffData = {
                    id: hs.id,
                    userId: hs.id,
                    name: hs.name,
                    staffId: hs.staff_id,
                    email: hs.email,
                    department: hs.department || "hospital",
                    role: "staff",
                    hospitalId: hs.hospital_id || 1,
                    hospitalRole: hs.hospital_role || "receptionist",
                    hospitalName: hs.hospital_name || "AIIMS Gorakhpur",
                    type: "staff",
                    editable: permissions.healthcare
                };
                const token = generateToken(staffData, "staff");
                return res.json({
                    success: true,
                    message: "Demo Hospital Staff authenticated.",
                    user: staffData,
                    token
                });
            }
        }

        if (persona === "waste" || persona === "waste_staff") {
            const [wasteRows] = await db.promise().query(`
                SELECT id, name, staff_id, department, role, email
                FROM staff
                WHERE department = 'waste' OR staff_id LIKE 'WST%'
                LIMIT 1
            `);
            if (wasteRows.length > 0) {
                const ws = wasteRows[0];
                const staffData = {
                    id: ws.id,
                    userId: ws.id,
                    name: ws.name,
                    staffId: ws.staff_id,
                    email: ws.email,
                    department: "waste",
                    role: "staff",
                    type: "staff",
                    editable: permissions.waste
                };
                const token = generateToken(staffData, "staff");
                return res.json({
                    success: true,
                    message: "Demo Waste Officer authenticated.",
                    user: staffData,
                    token
                });
            }
        }

        // Default: Citizen persona
        const [users] = await db.promise().query(`
            SELECT id, name, mobile, email, role, department
            FROM users
            ORDER BY id ASC
            LIMIT 1
        `);

        let citizenUser = null;
        if (users.length > 0) {
            citizenUser = users[0];
        } else {
            // Fallback demo user
            citizenUser = {
                id: 1,
                name: "Rahul Sharma",
                mobile: "9876543210",
                email: "rahul.sharma@example.com",
                role: "citizen",
                department: null
            };
        }

        const citizenData = {
            id: citizenUser.id,
            userId: citizenUser.id,
            name: citizenUser.name,
            mobile: citizenUser.mobile,
            email: citizenUser.email,
            role: "citizen",
            department: null,
            type: "citizen"
        };
        const token = generateToken(citizenData, "citizen");

        return res.json({
            success: true,
            message: "Demo Citizen authenticated.",
            user: citizenData,
            token
        });
    } catch (err) {
        console.error("Demo login error:", err);
        return res.status(500).json({
            success: false,
            message: "Error processing demo login: " + err.message
        });
    }
});

module.exports = router;


