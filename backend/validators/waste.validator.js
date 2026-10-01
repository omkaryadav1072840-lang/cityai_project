/**
 * SmartCity AI - Waste Input Validators
 */

const { apiError } = require("../utils/response");

function validateWasteReport(req, res, next) {
    const { description, location } = req.body;
    if (!description || description.trim().length < 5) {
        return apiError(res, "Please describe the waste issue (minimum 5 characters).", 400, "VALIDATION_FAILED");
    }
    if (!location || location.trim().length < 3) {
        return apiError(res, "Please provide the location or municipal ward.", 400, "VALIDATION_FAILED");
    }
    next();
}

function validateWasteStatusUpdate(req, res, next) {
    const id = req.body.requestId || req.body.id || req.body.requestCode;
    const { status } = req.body;
    if (!id) {
        return apiError(res, "Waste request identifier is required.", 400, "VALIDATION_FAILED");
    }
    if (!status) {
        return apiError(res, "Updated status is required.", 400, "VALIDATION_FAILED");
    }
    next();
}

module.exports = {
    validateWasteReport,
    validateWasteStatusUpdate
};
