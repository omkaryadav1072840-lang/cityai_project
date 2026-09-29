/**
 * SmartCity AI - Input Validation & Anti-Spam Middleware
 * Production-grade request validation, sanitization, and duplicate protection
 */

// Regular expressions for strict validation
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const MOBILE_REGEX = /^[6-9]\d{9}$/; // Standard 10-digit Indian mobile number
const VEHICLE_PLATE_REGEX = /^[A-Z]{2}[-\s]?[0-9]{1,2}[-\s]?[A-Z]{1,3}[-\s]?[0-9]{4}$/i;
const SQL_INJECTION_PATTERN = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|EXEC|TRUNCATE)\b\s+[^;]+--|--|\/\*|\*\/|;)/i;

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
 * Recursively sanitizes an object's string properties
 */
function sanitizeObject(obj) {
    if (!obj || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(sanitizeObject);

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
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
            // Return fake success or 400 to fool the bot without processing
            return res.status(400).json({ success: false, message: "Spam submission detected." });
        }
    }
    next();
}

/**
 * Middleware: Prevents rapid duplicate form submissions (within 2 seconds)
 */
const recentSubmissions = new Map();
setInterval(() => {
    const now = Date.now();
    for (const [key, timestamp] of recentSubmissions.entries()) {
        if (now - timestamp > 5000) recentSubmissions.delete(key);
    }
}, 30000).unref();

function duplicateSubmissionGuard(req, res, next) {
    if (req.method !== "POST" && req.method !== "PUT") return next();

    const clientIp = req.ip || req.socket.remoteAddress || "127.0.0.1";
    const fingerprint = `${clientIp}:${req.path}:${JSON.stringify(req.body).slice(0, 100)}`;
    const now = Date.now();

    if (recentSubmissions.has(fingerprint)) {
        const lastTime = recentSubmissions.get(fingerprint);
        if (now - lastTime < 2000) {
            return res.status(429).json({
                success: false,
                message: "Duplicate request detected. Please wait a moment before resubmitting."
            });
        }
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
    validators
};
