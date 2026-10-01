/**
 * SmartCity AI - Traffic Input Validators
 */

const { apiError } = require("../utils/response");

function validateSignalOverride(req, res, next) {
    const junctionId = req.params.id || req.body.junctionId || req.body.junction_id;
    const action = req.body.action || req.body.override_action || req.body.activePhase;

    if (!junctionId) {
        return apiError(res, "Junction identifier is required.", 400, "VALIDATION_FAILED");
    }
    if (!action) {
        return apiError(res, "Signal action or active phase is required.", 400, "VALIDATION_FAILED");
    }
    next();
}

function validateChallanSearch(req, res, next) {
    const query = req.query.q || req.query.vehicleNumber || req.query.vehicle_number || req.query.challanId || req.body.vehicleNumber;
    if (!query || String(query).trim().length < 3) {
        return apiError(res, "Search query must be at least 3 characters (e.g. vehicle number or challan ID).", 400, "VALIDATION_FAILED");
    }
    next();
}

function validateViolationVerification(req, res, next) {
    const { decision } = req.body;
    if (!decision || !['APPROVE', 'DISMISS', 'REJECT'].includes(String(decision).toUpperCase())) {
        return apiError(res, "Valid decision ('APPROVE' or 'DISMISS') is required.", 400, "VALIDATION_FAILED");
    }
    next();
}

module.exports = {
    validateSignalOverride,
    validateChallanSearch,
    validateViolationVerification
};
