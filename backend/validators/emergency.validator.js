/**
 * SmartCity AI - Emergency Input Validators
 */

const { apiError } = require("../utils/response");

function validateSOSTrigger(req, res, next) {
    const { callerName, callerPhone, phone, mobile } = req.body;
    const contact = String(callerPhone || phone || mobile || (req.user && req.user.mobile) || "112").replace(/\D/g, "");
    if (!contact || contact.length < 3) {
        return apiError(res, "Contact number is required for emergency dispatch.", 400, "VALIDATION_FAILED");
    }
    next();
}

module.exports = {
    validateSOSTrigger
};
