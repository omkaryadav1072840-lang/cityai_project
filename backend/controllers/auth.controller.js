/**
 * SmartCity AI - Authentication & Profile Controller
 * Mediates between Auth routes, services, and models.
 */

const db = require("../config/db");
const UserModel = require("../models/user.model");
const {
    hashPassword,
    verifyPassword,
    isLegacyPlainPassword,
    generateToken
} = require("../middleware/auth.middleware");
const { logAudit } = require("../services/audit_logger");
const { apiSuccess, apiError } = require("../utils/response");

class AuthController {
    static async register(req, res) {
        try {
            const { name, mobile, email, password } = req.body;
            const existingEmail = await UserModel.findByEmail(email);
            if (existingEmail) {
                return apiError(res, "Email already registered in system.", 409, "DUPLICATE_ENTRY");
            }
            const existingMobile = await UserModel.findByMobile(mobile);
            if (existingMobile) {
                return apiError(res, "Mobile number already registered.", 409, "DUPLICATE_ENTRY");
            }

            const insertId = await UserModel.createUser({
                name,
                email,
                mobile,
                password: hashPassword(password),
                ward: req.body.ward,
                vehicleNumber: req.body.vehicleNumber || req.body.vehicle_number,
                bloodGroup: req.body.bloodGroup || req.body.blood_group,
                emergencyContact: req.body.emergencyContact,
                role: "citizen"
            });

            const userData = {
                id: insertId,
                userId: insertId,
                name,
                mobile,
                email,
                role: "citizen",
                department: null,
                type: "citizen"
            };

            const token = generateToken(userData, "citizen");
            logAudit(insertId, "USER_REGISTER", "users", insertId, { name, email, mobile }, req.ip);

            return apiSuccess(res, { user: userData, token }, "Account registered successfully.", 201, {
                user: userData,
                token: token
            });
        } catch (err) {
            console.error("AuthController.register error:", err);
            return apiError(res, "Failed to register citizen account.", 500, "DB_ERROR", err.message);
        }
    }

    static async login(req, res) {
        try {
            const { identifier, username, email, mobile, password } = req.body;
            const loginUser = String(identifier || username || email || mobile || "").trim();

            let user = await UserModel.findByEmail(loginUser);
            if (!user) user = await UserModel.findByMobile(loginUser);

            if (!user) {
                return apiError(res, "Invalid credentials or account does not exist.", 401, "INVALID_CREDENTIALS");
            }

            if (!verifyPassword(password, user.password)) {
                return apiError(res, "Incorrect password provided.", 401, "INVALID_CREDENTIALS");
            }

            // Upgrade legacy plaintext passwords if needed
            if (isLegacyPlainPassword(user.password)) {
                db.promise().query("UPDATE users SET password = ? WHERE id = ?", [hashPassword(password), user.id])
                    .catch(e => console.warn("Password upgrade error:", e.message));
            }

            const userRole = user.role || "citizen";
            const userData = {
                id: user.id,
                userId: user.id,
                name: user.name,
                mobile: user.mobile,
                email: user.email,
                ward: user.ward,
                vehicleNumber: user.vehicle_number,
                bloodGroup: user.blood_group,
                role: userRole,
                department: user.department || null,
                type: userRole
            };

            const token = generateToken(userData, userRole);
            logAudit(user.id, "USER_LOGIN", "users", user.id, { loginUser }, req.ip);

            return apiSuccess(res, { user: userData, token }, "Login successful.", 200, {
                user: userData,
                token: token
            });
        } catch (err) {
            console.error("AuthController.login error:", err);
            return apiError(res, "Authentication failed.", 500, "AUTH_ERROR", err.message);
        }
    }

    static async staffLogin(req, res) {
        try {
            const staffId = req.body.staffId || req.body.staff_id || req.body.username;
            const password = req.body.password;

            if (!staffId || !password) {
                return apiError(res, "Staff ID and password are required.", 400, "VALIDATION_FAILED");
            }

            const staff = await UserModel.findStaffByStaffId(staffId);
            if (!staff) {
                // Check if user is trying doctor credentials
                const [docs] = await db.promise().query(
                    `SELECT d.*, h.name AS hospital_name FROM doctors d LEFT JOIN hospitals h ON d.hospital_id = h.id WHERE d.doctor_code = ? OR d.mobile = ? OR d.email = ? LIMIT 1`,
                    [staffId, staffId, staffId]
                );
                if (docs.length > 0) {
                    const doc = docs[0];
                    if (!verifyPassword(password, doc.password)) {
                        return apiError(res, "Incorrect password for Doctor profile.", 401, "INVALID_CREDENTIALS");
                    }
                    const doctorData = {
                        id: doc.id,
                        userId: doc.id,
                        name: doc.name,
                        staffId: doc.doctor_code,
                        doctorId: doc.doctor_code,
                        specialization: doc.specialization,
                        department: "healthcare",
                        role: "doctor",
                        type: "doctor",
                        hospitalId: doc.hospital_id,
                        hospitalName: doc.hospital_name || "Hospital",
                        email: doc.email
                    };
                    const token = generateToken(doctorData, "doctor");
                    return apiSuccess(res, { user: doctorData, token }, "Doctor authenticated successfully.", 200, {
                        user: doctorData,
                        token: token
                    });
                }
                return apiError(res, "Staff or Doctor ID not found.", 401, "NOT_FOUND");
            }

            if (!verifyPassword(password, staff.password)) {
                return apiError(res, "Incorrect staff password.", 401, "INVALID_CREDENTIALS");
            }

            const staffData = {
                id: staff.id,
                userId: staff.id,
                name: staff.name,
                staffId: staff.staff_id,
                department: staff.department,
                role: staff.role || "staff",
                type: "staff"
            };

            const token = generateToken(staffData, staff.role || "staff");
            return apiSuccess(res, { user: staffData, token }, "Staff authenticated successfully.", 200, {
                user: staffData,
                token: token
            });
        } catch (err) {
            console.error("AuthController.staffLogin error:", err);
            return apiError(res, "Staff authentication failed.", 500, "AUTH_ERROR", err.message);
        }
    }

    static async demoLogin(req, res) {
        try {
            const persona = String(req.body.persona || req.body.role || "citizen").toLowerCase();
            let demoData;

            if (persona === "traffic") {
                demoData = { id: 101, name: "Officer Rajesh Verma", role: "staff", department: "traffic", staffId: "TR-VERMA" };
            } else if (persona === "hospital" || persona === "doctor") {
                demoData = { id: 102, name: "Dr. A. Verma", role: "doctor", department: "healthcare", doctorId: "DOC-BRD-02", hospitalName: "BRD Medical College" };
            } else if (persona === "waste") {
                demoData = { id: 103, name: "Sanitation Supervisor Rao", role: "staff", department: "waste", staffId: "WST001" };
            } else if (persona === "admin") {
                demoData = { id: 999, name: "Municipal Commissioner", role: "admin", department: "admin" };
            } else {
                demoData = { id: 1, name: "Omkar Yadav", role: "citizen", mobile: "6306880179", email: "omkaryadav@gmail.com" };
            }

            const token = generateToken(demoData, demoData.role);
            return apiSuccess(res, { user: demoData, token }, `Demo login as ${persona} successful.`, 200, {
                user: demoData,
                token: token
            });
        } catch (err) {
            console.error("AuthController.demoLogin error:", err);
            return apiError(res, "Demo login failed.", 500, "AUTH_ERROR", err.message);
        }
    }

    static async getMe(req, res) {
        try {
            if (!req.user) {
                return apiError(res, "Unauthorized session.", 401, "UNAUTHORIZED");
            }
            return apiSuccess(res, req.user, "Active user session retrieved.", 200, {
                user: req.user
            });
        } catch (err) {
            return apiError(res, "Failed to get user details.", 500, "AUTH_ERROR", err.message);
        }
    }

    static async updateProfile(req, res) {
        try {
            if (!req.user) {
                return apiError(res, "Unauthorized session.", 401, "UNAUTHORIZED");
            }
            const userId = req.user.id;
            const { name, vehicleNumber, ward, bloodGroup, emergencyContact } = req.body;

            await db.promise().query(`
                UPDATE users
                SET name = COALESCE(?, name),
                    vehicle_number = COALESCE(?, vehicle_number),
                    ward = COALESCE(?, ward),
                    blood_group = COALESCE(?, blood_group),
                    emergency_contact = COALESCE(?, emergency_contact),
                    updated_at = NOW()
                WHERE id = ?
            `, [name, vehicleNumber, ward, bloodGroup, emergencyContact, userId]);

            return apiSuccess(res, { userId }, "Profile updated successfully.", 200);
        } catch (err) {
            console.error("AuthController.updateProfile error:", err);
            return apiError(res, "Failed to update profile.", 500, "DB_ERROR", err.message);
        }
    }

    static async getUserActivities(req, res) {
        try {
            const userId = req.user ? req.user.id : null;
            const mobile = req.user ? req.user.mobile : null;
            const activities = await UserModel.getUserActivities(userId, mobile);
            return apiSuccess(res, activities, "User activities retrieved.", 200, {
                count: activities.length,
                activities: activities
            });
        } catch (err) {
            console.error("AuthController.getUserActivities error:", err);
            return apiError(res, "Failed to retrieve user activities.", 500, "DB_ERROR", err.message);
        }
    }

    static async logout(req, res) {
        try {
            if (req.user) {
                logAudit(req.user.id, "USER_LOGOUT", "users", req.user.id, {}, req.ip);
            }
            return apiSuccess(res, {}, "User session invalidated successfully.", 200);
        } catch (err) {
            return apiError(res, "Failed to logout.", 500, "AUTH_ERROR", err.message);
        }
    }
}

module.exports = AuthController;
