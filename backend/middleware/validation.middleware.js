/**
 * SmartCity AI - Input Validation & Anti-Spam Middleware
 * Production-grade request validation, sanitization, and duplicate protection
 */

// Regular expressions for strict validation
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const MOBILE_REGEX = /^[6-9]\d{9}$/; // Standard 10-digit Indian mobile number
const VEHICLE_PLATE_REGEX = /^[A-Z]{2}[-\s]?[0-9]{1,2}[-\s]?[A-Z]{1,3}[-\s]?[0-9]{4}$/i;
const SQL_INJECTION_PATTERN = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|EXEC|TRUNCATE)\b\s+[^;]+--|--|\/\*|\*\/|;)/i;

// Keys that must NEVER be mutated, trimmed, or HTML-entity encoded by the input sanitizer
const SENSITIVE_FIELD_NAMES = new Set([
    "password",
    "oldpassword",
    "newpassword",
    "confirmpassword",
    "currentpassword",
    "adminpassword",
    "admin_password",
    "token",
    "accesstoken",
    "refreshtoken",
    "secret",
    "hash",
    "salt",
    "signature",
    "key",
    "authorization",
    "qrtoken",
    "qrentrytoken",
    "credential"
]);

/**
 * Strips dangerous HTML and script tags to prevent XSS
 */
function sanitizeString(str) {
    if (typeof str !== "string") return str;
    return str
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/[<>]/g, (tag) => (tag === "<" ? "&lt;" : "&gt;"))
        .trim();
}

/**
 * Recursively sanitizes an object's string properties, strictly preserving passwords and credentials
 */
function sanitizeObject(obj) {
    if (!obj || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(sanitizeObject);

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        // Exclude passwords, credentials, and tokens from mutation/trimming
        const normalizedKey = String(key).toLowerCase().replace(/[-_]/g, "");
        if (SENSITIVE_FIELD_NAMES.has(normalizedKey)) {
            sanitized[key] = value;
            continue;
        }

        if (typeof value === "string") {
            sanitized[key] = sanitizeString(value);
        } else if (typeof value === "object" && value !== null) {
            sanitized[key] = sanitizeObject(value);
        } else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}

/**
 * Middleware: Global body and query input sanitizer
 */
function inputSanitizer(req, res, next) {
    if (req.body && typeof req.body === "object") {
        req.body = sanitizeObject(req.body);
    }
    if (req.query && typeof req.query === "object") {
        req.query = sanitizeObject(req.query);
    }
    next();
}

/**
 * Middleware: Anti-bot honeypot check
 * If a hidden 'website_hp' or 'honeypot' field is filled by a bot, quietly reject.
 */
function honeypotCheck(req, res, next) {
    if (req.body) {
        if (req.body.website_hp || req.body.honeypot || req.body._hp) {
            console.warn(`[AntiSpam] Bot detected via honeypot from IP: ${req.ip}`);
            return res.status(400).json({ success: false, message: "Spam submission detected." });
        }
    }
    next();
}

/**
 * Middleware: Prevents rapid duplicate form submissions with bounded memory and safe eviction
 */
const MAX_CACHE_ENTRIES = 5000;
const SUBMISSION_COOLDOWN_MS = 2000;
const ENTRY_TTL_MS = 5000;
const CLEANUP_INTERVAL_MS = 10000;

const recentSubmissions = new Map();

setInterval(() => {
    const now = Date.now();
    for (const [key, timestamp] of recentSubmissions.entries()) {
        if (now - timestamp > ENTRY_TTL_MS) {
            recentSubmissions.delete(key);
        }
    }
}, CLEANUP_INTERVAL_MS).unref();

function duplicateSubmissionGuard(req, res, next) {
    if (req.method !== "POST" && req.method !== "PUT") return next();

    const clientIp = req.ip || req.socket.remoteAddress || "127.0.0.1";
    const userIdentifier = req.user ? (req.user.id || req.user.userId || clientIp) : clientIp;

    // Create fingerprint without leaking or storing sensitive password fields
    let bodyFingerprint = "";
    if (req.body && typeof req.body === "object") {
        const bodyClone = { ...req.body };
        for (const k of Object.keys(bodyClone)) {
            const norm = String(k).toLowerCase().replace(/[-_]/g, "");
            if (SENSITIVE_FIELD_NAMES.has(norm)) {
                delete bodyClone[k];
            }
        }
        bodyFingerprint = JSON.stringify(bodyClone).slice(0, 150);
    }

    const fingerprint = `${userIdentifier}:${req.method}:${req.path}:${bodyFingerprint}`;
    const now = Date.now();

    if (recentSubmissions.has(fingerprint)) {
        const lastTime = recentSubmissions.get(fingerprint);
        if (now - lastTime < SUBMISSION_COOLDOWN_MS) {
            return res.status(429).json({
                success: false,
                message: "Duplicate request detected. Please wait a moment before resubmitting."
            });
        }
    }

    // Enforce strict memory cap with FIFO eviction if limit exceeded
    if (recentSubmissions.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = recentSubmissions.keys().next().value;
        if (oldestKey) recentSubmissions.delete(oldestKey);
    }

    recentSubmissions.set(fingerprint, now);
    next();
}

/**
 * Validator helpers
 */
const validators = {
    isValidEmail: (email) => typeof email === "string" && EMAIL_REGEX.test(email.trim()),
    isValidMobile: (mobile) => typeof mobile === "string" && MOBILE_REGEX.test(mobile.replace(/[\s-]/g, "")),
    isValidVehiclePlate: (plate) => typeof plate === "string" && VEHICLE_PLATE_REGEX.test(plate.trim()),
    isStrongPassword: (password) => typeof password === "string" && password.length >= 6
};

module.exports = {
    inputSanitizer,
    honeypotCheck,
    duplicateSubmissionGuard,
    sanitizeString,
    sanitizeObject,
    validators,
    // Exported for testing and cache inspection
    _recentSubmissions: recentSubmissions,
    _MAX_CACHE_ENTRIES: MAX_CACHE_ENTRIES
};
