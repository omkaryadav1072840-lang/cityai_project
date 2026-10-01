/**
 * SmartCity AI - Hospital & Healthcare Input Validators
 */

const { apiError } = require("../utils/response");

function validateAppointmentBooking(req, res, next) {
    const { doctorId, doctor_id, patientName, patient_name, mobile, phone, appointmentDate, appointment_date } = req.body;
    const docId = doctorId || doctor_id;
    const patName = patientName || patient_name || (req.user && req.user.name);
    const contact = String(mobile || phone || (req.user && req.user.mobile) || "").replace(/\D/g, "");
    const date = appointmentDate || appointment_date;

    if (!docId) {
        return apiError(res, "Doctor selection is required.", 400, "VALIDATION_FAILED");
    }
    if (!patName || patName.trim().length < 2) {
        return apiError(res, "Patient name must be at least 2 characters.", 400, "VALIDATION_FAILED");
    }
    if (!contact || contact.length < 10) {
        return apiError(res, "Valid 10-digit mobile number is required.", 400, "VALIDATION_FAILED");
    }
    if (!date) {
        return apiError(res, "Appointment date is required.", 400, "VALIDATION_FAILED");
    }
    next();
}

function validatePatientRegistration(req, res, next) {
    const { name, mobile, bloodGroup, blood_group } = req.body;
    if (!name || name.trim().length < 2) {
        return apiError(res, "Patient name is required.", 400, "VALIDATION_FAILED");
    }
    const cleanMobile = String(mobile || "").replace(/\D/g, "");
    if (!cleanMobile || cleanMobile.length < 10) {
        return apiError(res, "Valid 10-digit mobile number is required.", 400, "VALIDATION_FAILED");
    }
    const bg = String(bloodGroup || blood_group || "").trim();
    if (bg && bg.length > 10) {
        return apiError(res, "Blood group string must be 10 characters or fewer (e.g. O+, A+, B+).", 400, "VALIDATION_FAILED");
    }
    next();
}

module.exports = {
    validateAppointmentBooking,
    validatePatientRegistration
};
