/**
 * SmartCity AI - Water Input Validators
 */

const { apiError } = require("../utils/response");

function validateTankerBooking(req, res, next) {
    const { deliveryAddress, address, mobile, phone, bookingDate } = req.body;
    const dest = deliveryAddress || address;
    const contact = String(mobile || phone || (req.user && req.user.mobile) || "").replace(/\D/g, "");

    if (!dest || dest.trim().length < 5) {
        return apiError(res, "Please provide complete delivery street address.", 400, "VALIDATION_FAILED");
    }
    if (!contact || contact.length < 10) {
        return apiError(res, "Valid 10-digit contact mobile number is required.", 400, "VALIDATION_FAILED");
    }
    next();
}

module.exports = {
    validateTankerBooking
};
