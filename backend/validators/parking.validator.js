/**
 * SmartCity AI - Parking Input Validators
 */

const { apiError } = require("../utils/response");

function isValidVehicleNumber(plate) {
    if (!plate || typeof plate !== "string") return false;
    const clean = plate.trim().toUpperCase().replace(/[\s-]/g, "");
    if (clean.length < 6 || clean.length > 11) return false;
    // Standard Indian Vehicle Number: 2 state letters, 1-2 RTO digits, 0-3 series letters, 1-4 digits
    const regex = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{1,4}$/;
    return regex.test(clean);
}

function validateParkingBooking(req, res, next) {
    const lotId = req.params.id || req.body.lotId || req.body.lot_id || req.body.parkingCode;
    const { vehicleNumber, vehicle_number, duration, durationHours, duration_hours, mobile, phone } = req.body;

    if (!lotId) {
        return apiError(res, "Parking lot identifier is required.", 400, "VALIDATION_FAILED");
    }

    const plate = String(vehicleNumber || vehicle_number || "").trim().toUpperCase();
    if (!isValidVehicleNumber(plate)) {
        return apiError(res, "Please provide a valid vehicle registration number (e.g. UP-53-AB-1234).", 400, "INVALID_VEHICLE_NUMBER");
    }

    const dur = Number(durationHours || duration_hours || duration || 2);
    if (isNaN(dur) || dur < 1 || dur > 72) {
        return apiError(res, "Duration must be between 1 and 72 hours.", 400, "VALIDATION_FAILED");
    }

    const contact = String(mobile || phone || (req.user && req.user.mobile) || "").replace(/\D/g, "");
    if (contact && contact.length < 10) {
        return apiError(res, "Please provide a valid 10-digit contact mobile number.", 400, "VALIDATION_FAILED");
    }

    req.validatedParking = {
        lotId,
        vehicleNumber: plate,
        durationHours: dur,
        mobile: contact
    };
    next();
}

module.exports = {
    isValidVehicleNumber,
    validateParkingBooking
};
