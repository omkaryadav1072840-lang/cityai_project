const crypto = require("crypto");
const util = require("util");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const { JWT_SECRET, JWT_EXPIRES_IN } = require("../config/env.config");

const DATA_DIR = path.join(__dirname, "..", "data");
const REVOKED_TOKENS_FILE = path.join(DATA_DIR, "revoked_tokens.json");

let employeeStatusChecker = null;
function registerEmployeeStatusChecker(fn) {
    employeeStatusChecker = fn;
}

function isEmployeeSuspended(staffId) {
    if (!staffId) return false;
    if (typeof employeeStatusChecker === "function") {
        return Boolean(employeeStatusChecker(staffId));
    }
    return false;
}

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
        worker_id: user.worker_id || (user.staffId === "WRK-001" ? 1 : (user.staffId === "WRK-002" ? 2 : (user.staffId === "WRK-003" ? 3 : null))),
        assigned_bin_code: user.assigned_bin_code || null,
        assigned_route_id: user.assigned_route_id || null,
        hospitalId: user.hospitalId || user.hospital_id || null,
        hospitalRole: user.hospitalRole || user.hospital_role || null,
        editable: user.editable || [],
        permitted_sectors: user.permitted_sectors || user.permittedSectors || [],
        permitted_assets: user.permitted_assets || user.permittedAssets || []
    };

    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
        issuer: "smartcity.gorakhpur.gov.in",
        audience: "smartcity-portal"
    });
}

// =========================================================
// JWT AUTHENTICATION MIDDLEWARE
// =========================================================
// =========================================================
// TOKEN REVOCATION & BLACKLIST (Server-side Invalidation with TTL & Cross-Restart Persistence)
// =========================================================
const revokedTokens = new Map(); // token or sha256(token) -> expiresAtMs
const userRevocationTime = new Map(); // userId -> revokedAtMs

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) {}
    }
}

function loadPersistedRevocations() {
    try {
        if (fs.existsSync(REVOKED_TOKENS_FILE)) {
            const raw = fs.readFileSync(REVOKED_TOKENS_FILE, "utf8");
            const data = JSON.parse(raw);
            const now = Date.now();
            if (Array.isArray(data)) {
                for (const item of data) {
                    if (item && item.hash && item.expMs > now) {
                        revokedTokens.set(item.hash, item.expMs);
                    }
                }
            }
        }
    } catch (_) {}
}

function savePersistedRevocations() {
    try {
        ensureDataDir();
        const now = Date.now();
        const list = [];
        for (const [key, expMs] of revokedTokens.entries()) {
            if (expMs > now && key.length === 64) {
                list.push({ hash: key, expMs });
            }
        }
        fs.writeFileSync(REVOKED_TOKENS_FILE, JSON.stringify(list, null, 2), "utf8");
    } catch (_) {}
}

// Initial load of active revocations from disk
loadPersistedRevocations();

// Periodic prune every 10 minutes to prevent unbounded memory growth
const PRUNE_INTERVAL_MS = 10 * 60 * 1000;
const MAX_SESSION_RECORD_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days (JWT_EXPIRES_IN)

const pruneInterval = setInterval(() => {
    const now = Date.now();
    let changed = false;
    for (const [token, expMs] of revokedTokens.entries()) {
        if (now > expMs) {
            revokedTokens.delete(token);
            changed = true;
        }
    }
    if (changed) savePersistedRevocations();

    for (const [userId, revokedAt] of userRevocationTime.entries()) {
        if (now - revokedAt > MAX_SESSION_RECORD_AGE_MS) {
            userRevocationTime.delete(userId);
        }
    }
}, PRUNE_INTERVAL_MS);
if (pruneInterval.unref) pruneInterval.unref();

function revokeToken(token) {
    if (typeof token === "string" && token.length > 0) {
        let expMs = Date.now() + (7 * 24 * 60 * 60 * 1000);
        try {
            const decoded = jwt.decode(token);
            if (decoded && decoded.exp) {
                expMs = decoded.exp * 1000;
            }
        } catch (_) {}

        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        revokedTokens.set(token, expMs);
        revokedTokens.set(tokenHash, expMs);
        savePersistedRevocations();

        try {
            const { pool } = require("../config/db");
            if (pool) {
                pool.query(
                    "INSERT IGNORE INTO revoked_tokens (token_hash, expires_at) VALUES (?, FROM_UNIXTIME(?))",
                    [tokenHash, Math.floor(expMs / 1000)]
                ).catch(() => {});
            }
        } catch (_) {}
    }
}

function isTokenRevoked(token) {
    if (!token) return false;
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    let expMs = revokedTokens.get(token) || revokedTokens.get(tokenHash);

    // Multi-instance check: check file if not present in current memory
    if (!expMs) {
        try {
            if (fs.existsSync(REVOKED_TOKENS_FILE)) {
                const raw = fs.readFileSync(REVOKED_TOKENS_FILE, "utf8");
                const data = JSON.parse(raw);
                const found = data.find(x => x.hash === tokenHash);
                if (found && found.expMs > Date.now()) {
                    revokedTokens.set(tokenHash, found.expMs);
                    return true;
                }
            }
        } catch (_) {}
        return false;
    }

    if (Date.now() > expMs) {
        revokedTokens.delete(token);
        revokedTokens.delete(tokenHash);
        savePersistedRevocations();
        return false;
    }
    return true;
}

function revokeAllUserSessions(userId) {
    if (userId) {
        userRevocationTime.set(String(userId), Date.now());
    }
}

function isUserSessionRevoked(userId, iat) {
    if (!userId || !iat) return false;
    const revokedAt = userRevocationTime.get(String(userId));
    if (!revokedAt) return false;
    // iat is in seconds, revokedAt is in ms
    return (iat * 1000) < (revokedAt - 1000);
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

        if (decoded && isUserSessionRevoked(decoded.id, decoded.iat)) {
            return res.status(401).json({
                success: false,
                message: "Authentication session has been revoked following a password change. Please sign in again."
            });
        }

        // Strict Issuer & Audience validation (reject forged/tampered tokens)
        if (decoded) {
            if (decoded.iss && decoded.iss !== "smartcity.gorakhpur.gov.in") {
                return res.status(403).json({
                    success: false,
                    message: "Invalid token issuer."
                });
            }
            if (decoded.aud && decoded.aud !== "smartcity-portal") {
                return res.status(403).json({
                    success: false,
                    message: "Invalid token audience."
                });
            }
        }

        // Check if employee account is suspended or inactive
        if (decoded && decoded.staffId && isEmployeeSuspended(decoded.staffId)) {
            return res.status(403).json({
                success: false,
                message: "Staff account is suspended or inactive. Please contact the administrator."
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

// =========================================================
// LAYER 3: OBJECT-LEVEL AUTHORIZATION GUARDS (IDOR / BOLA)
// =========================================================

/**
 * Enforce strict ownership: only the owner of the resource or an administrator
 * can access or modify the object.
 * 
 * @param {Function} getOwnerIdFn - Async function (req) => ownerUserId
 */
function requireOwnership(getOwnerIdFn) {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        const userRole = (req.user.role || req.user.type || "").toLowerCase();
        // Super admins and system admins have administrative bypass
        if (userRole === "admin" || userRole === "super_admin" || userRole === "superadmin") {
            return next();
        }

        try {
            const ownerId = await getOwnerIdFn(req);
            const currentUserId = req.user.id || req.user.userId;

            if (ownerId == null) {
                return res.status(404).json({
                    success: false,
                    message: "Resource not found."
                });
            }

            if (String(ownerId) !== String(currentUserId)) {
                return res.status(403).json({
                    success: false,
                    message: "Access denied. You do not have permission to access or modify this resource (Object Ownership Violation)."
                });
            }

            next();
        } catch (err) {
            console.error("[Layer 3 Auth Error]", err);
            return res.status(500).json({
                success: false,
                message: "Error verifying resource ownership."
            });
        }
    };
}

/**
 * Departmental Resource Access Guard: Ensures municipal staff can only access
 * resources mapped to their own authorized department or assigned jurisdiction.
 * 
 * @param {Function} getResourceDeptFn - Async function (req) => resourceDepartment
 */
function requireResourceDepartment(getResourceDeptFn) {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: "Authentication required." });
        }

        const userRole = (req.user.role || req.user.type || "").toLowerCase();
        if (userRole === "admin" || userRole === "super_admin" || userRole === "superadmin") {
            return next();
        }

        try {
            const resourceDept = await getResourceDeptFn(req);
            const userDept = (req.user.department || "").toLowerCase();
            const editable = (req.user.editable || []).map(e => e.toLowerCase());

            if (!resourceDept) {
                return res.status(404).json({ success: false, message: "Resource not found." });
            }

            const targetDept = String(resourceDept).toLowerCase();
            if (userDept === targetDept || editable.includes(targetDept)) {
                return next();
            }

            return res.status(403).json({
                success: false,
                message: `Access denied. Resource belongs to [${resourceDept}] department, but caller is in [${userDept}].`
            });
        } catch (err) {
            console.error("[Layer 3 Dept Auth Error]", err);
            return res.status(500).json({ success: false, message: "Error verifying departmental resource access." });
        }
    };
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
    revokeAllUserSessions,
    isUserSessionRevoked,
    requireRole,
    requireDepartment,
    requireDoctorOrStaff,
    requireOwnership,
    requireResourceDepartment,
    registerEmployeeStatusChecker,
    isEmployeeSuspended,
    JWT_SECRET,
    JWT_EXPIRES_IN
};
