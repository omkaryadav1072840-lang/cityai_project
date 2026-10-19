/**
 * SmartCity AI – OTP Service
 * ==========================
 * Cryptographically secure, single-use, time-limited OTP system.
 * Uses Node.js built-in crypto (no external dependency for generation).
 * Delivery via Nodemailer (email SMTP – free tier compatible).
 *
 * Security properties:
 *  - 6-digit OTP generated via crypto.randomInt (CSPRNG)
 *  - Only a scrypt hash of the OTP is stored, never the plaintext
 *  - 10-minute expiry, single-use, 5-attempt limit
 *  - Per-account resend cooldown (60 seconds)
 *  - Generic error messages to prevent enumeration
 *  - OTPs are never logged or returned in API responses
 *  - Development-only console delivery is clearly marked DEV-ONLY
 *
 * Free-tier limits (documented honestly):
 *  - Gmail SMTP (App Password): 500 emails/day per account
 *  - Brevo (formerly Sendinblue): 300 emails/day free tier
 *  - Mailtrap (development sandbox): free, not for production delivery
 *  - SMS OTP is NOT free permanently. Twilio/MSG91 require paid credits.
 *    Use SMS only if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are configured.
 */

const crypto = require("crypto");
const util = require("util");
const nodemailer = require("nodemailer");
const pool = require("../config/db").promise();

const scryptAsync = util.promisify(crypto.scrypt);

// =========================================================
// CONSTANTS
// =========================================================

const OTP_EXPIRY_MS = 10 * 60 * 1000;   // 10 minutes
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds between resends
const OTP_MAX_ATTEMPTS = 5;               // Lock after 5 wrong attempts
const OTP_LENGTH = 6;                      // 6-digit OTP

// =========================================================
// CRYPTOGRAPHIC HELPERS
// =========================================================

/**
 * Generate a cryptographically secure 6-digit OTP.
 * crypto.randomInt uses a CSPRNG (Fortuna/ChaCha20 depending on OS).
 * The result is never logged in production.
 */
function generateOtp() {
    return crypto.randomInt(100000, 999999).toString();
}

/**
 * Hash an OTP using scrypt for storage.
 * We use a short hash (32 bytes) since OTPs are short-lived and single-use.
 */
async function hashOtp(otp) {
    const salt = crypto.randomBytes(16).toString("hex");
    const derived = await scryptAsync(String(otp), salt, 32);
    return `scrypt$${salt}$${derived.toString("hex")}`;
}

/**
 * Verify a plaintext OTP against its stored hash using timing-safe comparison.
 */
async function verifyOtpHash(plainOtp, storedHash) {
    if (!storedHash || !storedHash.startsWith("scrypt$")) return false;
    const parts = storedHash.split("$");
    if (parts.length !== 3) return false;
    const [, salt, hashHex] = parts;
    try {
        const candidate = await scryptAsync(String(plainOtp), salt, 32);
        const stored = Buffer.from(hashHex, "hex");
        if (candidate.length !== stored.length) return false;
        return crypto.timingSafeEqual(candidate, stored);
    } catch {
        return false;
    }
}

// =========================================================
// EMAIL TRANSPORT (Nodemailer)
// =========================================================

function createMailTransport() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || "587", 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    // Development: Use Mailtrap or console-only delivery
    if (process.env.NODE_ENV !== "production" && !host) {
        // Return a null transport that logs to console
        return null;
    }

    if (!host || !user || !pass) {
        console.warn("[OTP] SMTP not fully configured. OTPs will only be logged to console in development.");
        return null;
    }

    return nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        tls: { rejectUnauthorized: process.env.NODE_ENV === "production" }
    });
}

/**
 * Send OTP via email.
 * In development without SMTP config: logs OTP to console (DEV-ONLY, never in production).
 */
async function sendOtpEmail(email, otp, purpose = "verification") {
    const transport = createMailTransport();
    const fromName = process.env.SMTP_FROM_NAME || "SmartCity AI Gorakhpur";
    const fromAddr = process.env.SMTP_FROM_ADDR || process.env.SMTP_USER || "noreply@smartcity.gorakhpur.gov.in";

    const purposeText = {
        verification: "Email Verification",
        login: "Secure Login",
        reset: "Password Reset",
        phone_otp: "Phone Verification"
    }[purpose] || "One-Time Verification";

    const subject = `[SmartCity AI] Your ${purposeText} OTP`;
    const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;background:#f9fafb;border-radius:8px">
      <h2 style="color:#166534;margin-bottom:8px">SmartCity AI – Gorakhpur</h2>
      <p>Your one-time password for <strong>${purposeText}</strong> is:</p>
      <div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#166534;text-align:center;padding:16px 0">${otp}</div>
      <p style="color:#6b7280;font-size:13px">This OTP is valid for <strong>10 minutes</strong> and can only be used once.</p>
      <p style="color:#6b7280;font-size:13px">If you did not request this, please ignore this email.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
      <p style="color:#9ca3af;font-size:11px">Gorakhpur Municipal Corporation — SmartCity AI Initiative</p>
    </div>`;

    if (!transport) {
        if (process.env.NODE_ENV !== "production") {
            // ⚠️ DEV-ONLY: OTP logged to server console. NEVER enabled in production.
            console.log(`\n[OTP-DEV-ONLY] ⚠️  Email: ${email} | Purpose: ${purposeText} | OTP: ${otp}\n`);
            return { messageId: "dev-console-delivery", devMode: true };
        }
        throw new Error("SMTP not configured. Cannot deliver OTP in production.");
    }

    const info = await transport.sendMail({
        from: `"${fromName}" <${fromAddr}>`,
        to: email,
        subject,
        html
    });

    return { messageId: info.messageId, devMode: false };
}

// =========================================================
// DATABASE OTP STORAGE
// =========================================================

/**
 * Store OTP record in database. Invalidates all prior OTPs for this target.
 */
async function storeOtp(targetType, targetValue, hashedOtp, purpose) {
    // Invalidate all prior OTPs for this account+purpose
    await pool.query(
        `UPDATE otp_records SET used = 1, invalidated_at = NOW()
         WHERE target_type = ? AND target_value = ? AND purpose = ? AND used = 0 AND expires_at > NOW()`,
        [targetType, targetValue, purpose]
    );

    await pool.query(
        `INSERT INTO otp_records (target_type, target_value, otp_hash, purpose, expires_at, attempt_count)
         VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE), 0)`,
        [targetType, targetValue, hashedOtp, purpose]
    );
}

/**
 * Retrieve the active OTP record for verification.
 */
async function getActiveOtpRecord(targetType, targetValue, purpose) {
    const [rows] = await pool.query(
        `SELECT id, otp_hash, expires_at, attempt_count, created_at
         FROM otp_records
         WHERE target_type = ? AND target_value = ? AND purpose = ?
           AND used = 0 AND invalidated_at IS NULL AND expires_at > NOW()
         ORDER BY created_at DESC LIMIT 1`,
        [targetType, targetValue, purpose]
    );
    return rows.length > 0 ? rows[0] : null;
}

/**
 * Check resend cooldown for a target.
 * Returns ms remaining before next resend is allowed, or 0 if allowed.
 */
async function checkResendCooldown(targetType, targetValue, purpose) {
    const [rows] = await pool.query(
        `SELECT created_at FROM otp_records
         WHERE target_type = ? AND target_value = ? AND purpose = ?
         ORDER BY created_at DESC LIMIT 1`,
        [targetType, targetValue, purpose]
    );
    if (rows.length === 0) return 0;

    const lastSent = new Date(rows[0].created_at).getTime();
    const elapsed = Date.now() - lastSent;
    const remaining = OTP_RESEND_COOLDOWN_MS - elapsed;
    return remaining > 0 ? remaining : 0;
}

/**
 * Increment attempt count on failed verification atomically.
 * Automatically marks invalidated_at if threshold reached.
 */
async function incrementAttempts(otpId) {
    const [result] = await pool.query(
        `UPDATE otp_records 
         SET attempt_count = attempt_count + 1,
             invalidated_at = CASE WHEN attempt_count + 1 >= ? THEN NOW() ELSE invalidated_at END
         WHERE id = ? AND used = 0`,
        [OTP_MAX_ATTEMPTS, otpId]
    );
    return result;
}

/**
 * Invalidate (consume) OTP atomically after successful verification.
 * Returns true if consumed, false if already consumed/invalidated by concurrent request.
 */
async function consumeOtp(otpId) {
    const [result] = await pool.query(
        `UPDATE otp_records SET used = 1, used_at = NOW() WHERE id = ? AND used = 0`,
        [otpId]
    );
    return result.affectedRows > 0;
}

// =========================================================
// PUBLIC API
// =========================================================

/**
 * Send an OTP to an email address.
 * Returns: { success, cooldownMs, devMode }
 * Never returns the OTP itself.
 */
async function sendEmailOtp(email, purpose = "verification") {
    if (!email || typeof email !== "string") {
        throw new Error("Valid email address is required.");
    }
    const cleanEmail = email.trim().toLowerCase();

    // Cooldown check
    const cooldownMs = await checkResendCooldown("email", cleanEmail, purpose);
    if (cooldownMs > 0) {
        return {
            success: false,
            cooldown: true,
            retryAfterSeconds: Math.ceil(cooldownMs / 1000),
            message: `Please wait ${Math.ceil(cooldownMs / 1000)} seconds before requesting another OTP.`
        };
    }

    const otp = generateOtp();
    const hashedOtp = await hashOtp(otp);

    await storeOtp("email", cleanEmail, hashedOtp, purpose);
    const delivery = await sendOtpEmail(cleanEmail, otp, purpose);

    // otp is intentionally NOT returned in any field
    return {
        success: true,
        message: "OTP sent to your email address.",
        devMode: delivery.devMode || false,
        expiresInMinutes: 10
    };
}

/**
 * Verify an OTP submitted by a user.
 * Returns: { success, message }
 * Does NOT reveal the stored hash or OTP.
 * Atomic verification prevents replay and concurrent race conditions.
 */
async function verifyEmailOtp(email, submittedOtp, purpose = "verification") {
    if (!email || !submittedOtp) {
        return { success: false, message: "Email and OTP are required." };
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanOtp = String(submittedOtp).trim();

    const record = await getActiveOtpRecord("email", cleanEmail, purpose);
    if (!record) {
        // Generic message — do not reveal whether email exists
        return { success: false, message: "OTP is invalid or has expired. Please request a new one." };
    }

    // Check attempt limit
    if (record.attempt_count >= OTP_MAX_ATTEMPTS) {
        await pool.query(
            `UPDATE otp_records SET invalidated_at = NOW() WHERE id = ?`,
            [record.id]
        );
        return { success: false, message: "Too many incorrect attempts. Please request a new OTP." };
    }

    const isValid = await verifyOtpHash(cleanOtp, record.otp_hash);

    if (!isValid) {
        await incrementAttempts(record.id);
        const remaining = OTP_MAX_ATTEMPTS - (record.attempt_count + 1);
        return {
            success: false,
            message: remaining > 0
                ? `Incorrect OTP. ${remaining} attempt(s) remaining.`
                : "Too many incorrect attempts. Please request a new OTP."
        };
    }

    // Atomic consumption: ensures single-use and prevents TOCTOU race conditions
    const consumed = await consumeOtp(record.id);
    if (!consumed) {
        return { success: false, message: "OTP has already been used or invalidated." };
    }

    return { success: true, message: "OTP verified successfully." };
}

module.exports = {
    sendEmailOtp,
    verifyEmailOtp,
    // Exported for testing purposes only
    _generateOtp: generateOtp,
    _hashOtp: hashOtp,
    _verifyOtpHash: verifyOtpHash,
    OTP_EXPIRY_MS,
    OTP_RESEND_COOLDOWN_MS,
    OTP_MAX_ATTEMPTS
};
