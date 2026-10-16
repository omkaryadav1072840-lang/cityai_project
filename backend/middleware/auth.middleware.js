const crypto = require("crypto");
const util = require("util");
const jwt = require("jsonwebtoken");
const { JWT_SECRET, JWT_EXPIRES_IN } = require("../config/env.config");

const scryptAsync = util.promisify(crypto.scrypt);

// =========================================================
// PASSWORD HASHING (built-in crypto, asynchronous scrypt)
// =========================================================

async function hashPassword(plainPassword) {
    const salt = crypto.randomBytes(16).toString("hex");
    const derivedKey = await scryptAsync(String(plainPassword), salt, 64);
    return `scrypt$${salt}$${derivedKey.toString("hex")}`;
}

async function verifyPassword(plainPassword, storedPassword) {
    if (!storedPassword) return false;

    if (typeof storedPassword === "string" && storedPassword.startsWith("scrypt$")) {
        const parts = storedPassword.split("$");
        if (parts.length !== 3) return false;
        const [, salt, hashHex] = parts;
        try {
            const candidateHash = await scryptAsync(
                String(plainPassword),
                salt,
                64
            );
            const storedHash = Buffer.from(hashHex, "hex");
            if (candidateHash.length !== storedHash.length) return false;
            return crypto.timingSafeEqual(candidateHash, storedHash);
        } catch (err) {
            console.error("[scrypt verification error]", err);
            return false;
        }
    }

    // Legacy plain-text password fallback
    return storedPassword === plainPassword;
}

// Synchronous helpers preserved for backward compatibility in synchronous migration scripts
function hashPasswordSync(plainPassword) {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(String(plainPassword), salt, 64).toString("hex");
    return `scrypt$${salt}$${hash}`;
}

function verifyPasswordSync(plainPassword, storedPassword) {
    if (!storedPassword) return false;
    if (typeof storedPassword === "string" && storedPassword.startsWith("scrypt$")) {
        const parts = storedPassword.split("$");
        if (parts.length !== 3) return false;
        const [, salt, hashHex] = parts;
        const candidateHash = crypto.scryptSync(String(plainPassword), salt, 64);
        const storedHash = Buffer.from(hashHex, "hex");
        if (candidateHash.length !== storedHash.length) return false;
        return crypto.timingSafeEqual(candidateHash, storedHash);
    }
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
        hospitalId: user.hospitalId || user.hospital_id || null,
        hospitalRole: user.hospitalRole || user.hospital_role || null,
        editable: user.editable || [],
        permitted_sectors: user.permitted_sectors || user.permittedSectors || [],
        permitted_assets: user.permitted_assets || user.permittedAssets || []
    };

    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN
    });
}

// =========================================================
// JWT AUTHENTICATION MIDDLEWARE
// =========================================================
// TOKEN REVOCATION & BLACKLIST (Server-side Invalidation)
// =========================================================
const revokedTokens = new Set();

function revokeToken(token) {
    if (typeof token === "string" && token.length > 0) {
        revokedTokens.add(token);
    }
}

function isTokenRevoked(token) {
    return revokedTokens.has(token);
}

function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"] || req.headers["x-access-token"];
    const token = authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.slice(7).trim()
        : authHeader;

    if (!token) {
        // If REQUIRE_AUTH is explicitly set to "false", allow bypass in development as guest (never admin)
        if (process.env.REQUIRE_AUTH === "false") {
            req.user = { id: 0, name: "Dev Guest", role: "guest", type: "guest" };
            return next();
        }

        return res.status(401).json({
            success: false,
            message: "Access denied. Authentication token required."
        });
    }

    if (isTokenRevoked(token)) {
        return res.status(401).json({
            success: false,
            message: "Authentication token has been revoked / logged out. Please sign in again."
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

        const userRole = (req.user.role || "").toLowerCase();
        const userType = (req.user.type || "").toLowerCase();
        const accountType = (req.user.accountType || "").toLowerCase();

        // Admins, Super Admins, and Hospital Admins always have administrative access
        if (
            userRole === "admin" ||
            userRole === "super_admin" ||
            userRole === "superadmin" ||
            userRole === "hospital_admin" ||
            userType === "admin" ||
            userType === "super_admin" ||
            userType === "hospital_admin" ||
            accountType === "super_admin" ||
            accountType === "hospital_admin"
        ) {
            return next();
        }

        const normalizedAllowed = allowedRoles.map(r => r.toLowerCase());

        if (
            normalizedAllowed.includes(userRole) ||
            normalizedAllowed.includes(userType) ||
            normalizedAllowed.includes(accountType) ||
            (normalizedAllowed.includes("staff") && (userType === "staff" || Boolean(req.user.hospitalRole) || Boolean(req.user.hospitalId))) ||
            (normalizedAllowed.includes("admin") && (userRole.includes("admin") || accountType.includes("admin")))
        ) {
            return next();
        }

        return res.status(403).json({
            success: false,
            message: `Access denied. Requires one of [${allowedRoles.join(", ")}] permissions.`
        });
    };
}

// Department check for municipal staff with strict departmental isolation
function requireDepartment(allowedDepartments = []) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        const userRole = (req.user.role || req.user.type || "").toLowerCase();
        const accountType = (req.user.accountType || "").toLowerCase();
        const userDept = (req.user.department || "").toLowerCase();

        // 1. Super Admin has universal access
        if (userRole === "super_admin" || accountType === "super_admin" || (userRole === "admin" && (userDept === "admin" || !userDept || userDept === "municipal"))) {
            return next();
        }

        const normalizedAllowed = allowedDepartments.map(d => d.toLowerCase());

        // 2. Department-specific Admin has access to their department
        if ((userRole === "admin" || userRole.endsWith("_admin") || accountType.endsWith("_admin")) && normalizedAllowed.includes(userDept)) {
            return next();
        }

        // 3. Department staff with explicitly allowed department or editable permission
        if (normalizedAllowed.includes(userDept) || (req.user.editable && req.user.editable.some(e => normalizedAllowed.includes(e.toLowerCase())))) {
            return next();
        }

        return res.status(403).json({
            success: false,
            message: `Access denied. This action is reserved for [${allowedDepartments.join(", ")}] staff.`
        });
    };
}

// Healthcare Doctor or Medical Staff Guard
function requireDoctorOrStaff(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Authentication required."
        });
    }

    const role = (req.user.role || "").toLowerCase();
    const type = (req.user.type || "").toLowerCase();
    const allowed = [
        "admin", "super_admin", "staff", "doctor",
        "hospital_admin", "receptionist", "nurse", "lab_technician", "radiologist", "pharmacy", "billing"
    ];

    if (allowed.includes(role) || allowed.includes(type) || Boolean(req.user.hospitalId) || Boolean(req.user.hospitalRole)) {
        return next();
    }

    return res.status(403).json({
        success: false,
        message: "Access denied. Action reserved for healthcare doctors, medical staff, or administrators."
    });
}

module.exports = {
    hashPassword,
    verifyPassword,
    hashPasswordSync,
    verifyPasswordSync,
    isLegacyPlainPassword,
    generateToken,
    authenticateToken,
    optionalToken,
    revokeToken,
    isTokenRevoked,
    requireRole,
    requireDepartment,
    requireDoctorOrStaff,
    JWT_SECRET,
    JWT_EXPIRES_IN
};
