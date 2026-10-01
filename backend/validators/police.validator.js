/**
 * SmartCity AI - Police Input Validators
 */

const { apiError } = require("../utils/response");

function validatePoliceComplaint(req, res, next) {
    const { incidentLocation, location, description, mobile, phone } = req.body;
    const loc = incidentLocation || location;
    const desc = description;
    const contact = String(mobile || phone || (req.user && req.user.mobile) || "").replace(/\D/g, "");

    if (!loc || loc.trim().length < 3) {
        return apiError(res, "Incident location or nearest landmark is required.", 400, "VALIDATION_FAILED");
    }
    if (!desc || desc.trim().length < 5) {
        return apiError(res, "Please describe the incident (minimum 5 characters).", 400, "VALIDATION_FAILED");
    }
    if (!contact || contact.length < 10) {
        return apiError(res, "Valid 10-digit citizen mobile number is required.", 400, "VALIDATION_FAILED");
    }
    next();
}

module.exports = {
    validatePoliceComplaint
};
