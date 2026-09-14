/**
 * SmartCity AI - Production Security & Rate Limiting Middleware
 * -------------------------------------------------------------
 * Provides lightweight, zero-dependency HTTP security headers
 * and an in-memory sliding-window rate limiter for sensitive routes.
 */

/**
 * Injects essential production HTTP security headers.
 * Protects against MIME-type sniffing, clickjacking, and XSS.
 */
function securityHeaders(req, res, next) {
    // Prevent MIME-sniffing
    res.setHeader("X-Content-Type-Options", "nosniff");

    // Clickjacking defense: only allow embedding from same origin
    res.setHeader("X-Frame-Options", "SAMEORIGIN");

    // XSS filter enable
    res.setHeader("X-XSS-Protection", "1; mode=block");

    // Referrer policy
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

    // Remove server fingerprint
    res.removeHeader("X-Powered-By");

    next();
}

/**
 * Factory for an in-memory sliding-window rate limiter.
 *
 * @param {object} options
 * @param {number} options.windowMs - Time window in milliseconds (default: 60,000 / 1 min)
 * @param {number} options.max - Maximum requests allowed per window (default: 30)
 * @param {string} options.message - Custom error message
 */
function createRateLimiter(options = {}) {
    const windowMs = options.windowMs || 60 * 1000;
    const max = options.max || 30;
    const message = options.message || "Too many requests. Please slow down and try again later.";

    // Store IP -> array of timestamps
    const ipHits = new Map();

    // Clean up stale entries periodically every 5 minutes
    const cleanupInterval = setInterval(() => {
        const now = Date.now();
        for (const [ip, timestamps] of ipHits.entries()) {
            const valid = timestamps.filter(t => now - t < windowMs);
            if (valid.length === 0) {
                ipHits.delete(ip);
            } else {
                ipHits.set(ip, valid);
            }
        }
    }, 5 * 60 * 1000);

    // Unref so the interval doesn't prevent graceful shutdown
    if (cleanupInterval.unref) cleanupInterval.unref();

    return function rateLimitMiddleware(req, res, next) {
        // Skip rate limiting if explicitly disabled in environment
        if (process.env.DISABLE_RATE_LIMIT === "true") {
            return next();
        }

        const ip = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.socket.remoteAddress || "127.0.0.1";
        const now = Date.now();

        const timestamps = ipHits.get(ip) || [];
        // Keep only timestamps within the current window
        const recentTimestamps = timestamps.filter(t => now - t < windowMs);

        if (recentTimestamps.length >= max) {
            const oldest = recentTimestamps[0];
            const retryAfterSec = Math.ceil((oldest + windowMs - now) / 1000);
            res.setHeader("Retry-After", Math.max(1, retryAfterSec));
            return res.status(429).json({
                error: "Too Many Requests",
                message: message,
                retryAfterSeconds: Math.max(1, retryAfterSec)
            });
        }

        recentTimestamps.push(now);
        ipHits.set(ip, recentTimestamps);

        // Standard rate limit headers
        res.setHeader("X-RateLimit-Limit", max);
        res.setHeader("X-RateLimit-Remaining", Math.max(0, max - recentTimestamps.length));

        next();
    };
}

// Preset rate limiters for specific endpoint classes
const authRateLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 20,
    message: "Too many authentication attempts. Please wait 1 minute before trying again."
});

const aiRateLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 40,
    message: "SmartCity AI engine request rate limit reached. Please wait a moment."
});

const sosRateLimiter = createRateLimiter({
    windowMs: 30 * 1000,
    max: 10,
    message: "Emergency broadcast limit reached. If this is a life-threatening crisis, please dial 108 or 112 directly."
});

module.exports = {
    securityHeaders,
    createRateLimiter,
    authRateLimiter,
    aiRateLimiter,
    sosRateLimiter
};
