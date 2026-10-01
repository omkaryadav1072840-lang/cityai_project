/**
 * SmartCity AI - Auth & User Validators
 */

const { apiError } = require("../utils/response");

function validateRegistration(req, res, next) {
    const { name, email, mobile, password } = req.body;
    if (!name || typeof name !== "string" || name.trim().length < 2) {
        return apiError(res, "Full name must be at least 2 characters.", 400, "VALIDATION_FAILED");
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return apiError(res, "Please provide a valid email address.", 400, "VALIDATION_FAILED");
    }
    const cleanMobile = String(mobile || "").replace(/\D/g, "");
    if (!cleanMobile || cleanMobile.length < 10) {
        return apiError(res, "Please provide a valid 10-digit mobile number.", 400, "VALIDATION_FAILED");
    }
    if (!password || password.length < 6) {
        return apiError(res, "Password must be at least 6 characters.", 400, "VALIDATION_FAILED");
    }
    next();
}

function validateLogin(req, res, next) {
    const { identifier, username, email, mobile, password } = req.body;
    const loginUser = identifier || username || email || mobile;
    if (!loginUser) {
        return apiError(res, "Please provide your email or mobile number.", 400, "VALIDATION_FAILED");
    }
    if (!password) {
        return apiError(res, "Password is required.", 400, "VALIDATION_FAILED");
    }
    next();
}

module.exports = {
    validateRegistration,
    validateLogin
};
