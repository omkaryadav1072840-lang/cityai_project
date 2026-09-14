const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const JWT_SECRET =
    process.env.JWT_SECRET || "smartcity_super_secret_jwt_key_gorakhpur_2026";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// =========================================================
// PASSWORD HASHING (built-in crypto, scrypt)
// =========================================================

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

    // Legacy plain-text password fallback
    return storedPassword === plainPassword;
}

function isLegacyPlainPassword(storedPassword) {
    return !!storedPassword && !storedPassword.startsWith("scrypt$");
}

// =========================================================
// JWT TOKEN GENERATION
// =========================================================

function generateToken(user, role = "citizen") {
    const payload = {
        id: user.userId || user.id,
        name: user.name,
        role: role || user.role || "citizen",
        type: role || user.type || "citizen",
        email: user.email || null,
        mobile: user.mobile || null,
        staffId: user.staffId || user.staff_id || null,
        department: user.department || null,
        editable: user.editable || []
    };

    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN
    });
}

// =========================================================
// JWT AUTHENTICATION MIDDLEWARE
// =========================================================

function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"] || req.headers["x-access-token"];
    const token = authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.slice(7).trim()
        : authHeader;

    if (!token) {
        // If REQUIRE_AUTH is explicitly set to "false", allow bypass in development
        if (process.env.REQUIRE_AUTH === "false") {
            req.user = { id: 0, name: "Dev Guest", role: "admin", type: "admin" };
            return next();
        }

        return res.status(401).json({
            success: false,
            message: "Access denied. Authentication token required."
        });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            console.error("JWT Verification Error:", err.message);
            return res.status(403).json({
                success: false,
                message: "Invalid or expired authentication token."
            });
        }

        req.user = decoded;
        next();
    });
}

// Optional token: extracts user if token provided, continues without error if absent
function optionalToken(req, res, next) {
    const authHeader = req.headers["authorization"] || req.headers["x-access-token"];
    const token = authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.slice(7).trim()
        : authHeader;

    if (!token) {
        return next();
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (!err && decoded) {
            req.user = decoded;
        }
        next();
    });
}

// =========================================================
// ROLE-BASED ACCESS CONTROL (RBAC) GUARDS
// =========================================================

function requireRole(allowedRoles = []) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        const userRole = (req.user.role || req.user.type || "").toLowerCase();

        // Admins always have access to everything
        if (userRole === "admin") {
            return next();
        }

        const normalizedAllowed = allowedRoles.map(r => r.toLowerCase());

        if (normalizedAllowed.includes(userRole)) {
            return next();
        }

        return res.status(403).json({
            success: false,
            message: `Access denied. Requires one of [${allowedRoles.join(", ")}] permissions.`
        });
    };
}

// Department check for municipal staff
function requireDepartment(allowedDepartments = []) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        const userRole = (req.user.role || req.user.type || "").toLowerCase();
        if (userRole === "admin") {
            return next();
        }

        const userDept = (req.user.department || "").toLowerCase();
        const normalizedAllowed = allowedDepartments.map(d => d.toLowerCase());

        if (normalizedAllowed.includes(userDept) || (req.user.editable && req.user.editable.some(e => normalizedAllowed.includes(e.toLowerCase())))) {
            return next();
        }

        return res.status(403).json({
            success: false,
            message: `Access denied. This action is reserved for [${allowedDepartments.join(", ")}] staff.`
        });
    };
}

module.exports = {
    hashPassword,
    verifyPassword,
    isLegacyPlainPassword,
    generateToken,
    authenticateToken,
    optionalToken,
    requireRole,
    requireDepartment
};
