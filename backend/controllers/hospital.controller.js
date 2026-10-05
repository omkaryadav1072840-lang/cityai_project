/**
 * SmartCity AI - Hospital & Healthcare Controller
 * Mediates between Healthcare routes, services, and models.
 */

const crypto = require("crypto");
const HospitalModel = require("../models/hospital.model");
const { apiSuccess, apiError } = require("../utils/response");

class HospitalController {
    static async getHospitals(req, res) {
        try {
            const hospitals = await HospitalModel.getAllHospitals();
            return apiSuccess(res, hospitals, "Hospitals retrieved successfully", 200, {
                count: hospitals.length,
                hospitals: hospitals
            });
        } catch (err) {
            console.error("HospitalController.getHospitals error:", err);
            return apiError(res, "Failed to retrieve hospital directory.", 500, "DB_ERROR", err.message);
        }
    }

    static async getHospitalDetails(req, res) {
        try {
            const id = req.params.id;
            const hospital = await HospitalModel.getHospitalById(id);
            if (!hospital) {
                return apiError(res, "Hospital not found.", 404, "NOT_FOUND");
            }
            const bedCategories = await HospitalModel.getBedCategories(hospital.id);
            const doctors = await HospitalModel.getDoctors(hospital.id);
            return apiSuccess(res, { ...hospital, bedCategories, doctors }, "Hospital details retrieved.", 200, {
                hospital: hospital,
                bedCategories: bedCategories,
                doctors: doctors
            });
        } catch (err) {
            console.error("HospitalController.getHospitalDetails error:", err);
            return apiError(res, "Failed to retrieve hospital details.", 500, "DB_ERROR", err.message);
        }
    }

    static async getBedCategories(req, res) {
        try {
            const hospitalId = req.query.hospitalId || req.query.hospital_id || null;
            const categories = await HospitalModel.getBedCategories(hospitalId);
            return apiSuccess(res, categories, "Bed categories retrieved.", 200, {
                count: categories.length,
                categories: categories,
                bedCategories: categories
            });
        } catch (err) {
            console.error("HospitalController.getBedCategories error:", err);
            return apiError(res, "Failed to retrieve bed categories.", 500, "DB_ERROR", err.message);
        }
    }

    static async getBedAvailability(req, res) {
        try {
            const hospitalId = req.query.hospitalId || req.query.hospital_id || req.query.hospital || null;
            const data = await HospitalModel.getGorakhpurBedAvailability({ hospitalId });
            return apiSuccess(res, data, "Bed availability retrieved successfully.", 200, data);
        } catch (err) {
            console.error("HospitalController.getBedAvailability error:", err);
            return apiError(res, "Unable to load bed availability.", 500, "BED_FETCH_ERROR", err.message);
        }
    }


    static async getDoctors(req, res) {
        try {
            const { hospitalId, hospital_id, department } = req.query;
            const doctors = await HospitalModel.getDoctors(hospitalId || hospital_id, department);
            return apiSuccess(res, doctors, "Doctors list retrieved.", 200, {
                count: doctors.length,
                doctors: doctors
            });
        } catch (err) {
            console.error("HospitalController.getDoctors error:", err);
            return apiError(res, "Failed to retrieve doctors.", 500, "DB_ERROR", err.message);
        }
    }

    static async bookAppointment(req, res) {
        try {
            const docId = req.body.doctorId || req.body.doctor_id || 1;
            const doc = await HospitalModel.getDoctorById(docId);
            if (!doc) {
                return apiError(res, "Selected doctor was not found.", 404, "NOT_FOUND");
            }

            const apptNumber = "APT-" + Date.now().toString(36).toUpperCase();
            const tokenNumber = Math.floor(Math.random() * 50) + 1;
            const appointmentDate = req.body.appointmentDate || req.body.appointment_date || new Date().toISOString().split("T")[0];
            const slotTime = req.body.slotTime || req.body.slot_time || "10:00 AM";
            const patientId = req.body.patientId || (req.user && req.user.patientId) || `PT-${Date.now().toString().slice(-6)}`;
            const symptom = req.body.symptom || req.body.reason || "General Consultation";

            await HospitalModel.bookAppointment({
                appointmentNumber: apptNumber,
                patientId: patientId,
                doctorId: doc.id,
                hospitalId: doc.hospital_id,
                appointmentDate: appointmentDate,
                slotTime: slotTime,
                symptom: symptom,
                tokenNumber: tokenNumber
            });

            const ticketPayload = {
                appointmentNumber: apptNumber,
                appointmentId: apptNumber,
                tokenNumber: tokenNumber,
                doctorName: doc.name,
                specialization: doc.specialization,
                hospitalName: doc.hospital_name,
                appointmentDate: appointmentDate,
                slotTime: slotTime,
                status: "Confirmed"
            };

            return apiSuccess(res, ticketPayload, "Doctor consultation booked successfully.", 201, {
                appointment: ticketPayload,
                ticket: ticketPayload
            });
        } catch (err) {
            console.error("HospitalController.bookAppointment error:", err);
            return apiError(res, "Failed to book appointment.", 500, "BOOKING_ERROR", err.message);
        }
    }

    static async getPatientProfile(req, res) {
        try {
            const id = req.params.id;
            const patient = await HospitalModel.getPatientById(id);
            if (!patient) {
                return apiError(res, "Patient profile not found.", 404, "NOT_FOUND");
            }
            const records = await HospitalModel.getPatientRecords(patient.patient_id);
            const reports = await HospitalModel.getPatientReports(patient.patient_id);

            return apiSuccess(res, { patient, records, reports }, "Patient profile retrieved.", 200, {
                patient: patient,
                records: records,
                reports: reports
            });
        } catch (err) {
            console.error("HospitalController.getPatientProfile error:", err);
            return apiError(res, "Failed to retrieve patient profile.", 500, "DB_ERROR", err.message);
        }
    }

    static async verifyPatientQR(req, res) {
        try {
            const qrToken = req.body.qrToken || req.body.qr_token || req.body.token;
            if (!qrToken) {
                return apiError(res, "QR Token is required.", 400, "VALIDATION_FAILED");
            }
            const patient = await HospitalModel.getPatientById(qrToken);
            if (!patient) {
                return apiError(res, "Invalid or unrecognized patient QR pass.", 404, "NOT_FOUND");
            }

            const role = req.user ? (req.user.role || req.user.type || "").toLowerCase() : "visitor";
            const isMedicalStaff = ["doctor", "hospital_staff", "staff", "admin"].includes(role);

            if (!isMedicalStaff) {
                // Return masked privacy-preserving summary
                const nameParts = (patient.name || "Citizen").split(" ");
                const maskedName = nameParts.map(p => p[0] + "*".repeat(Math.max(1, p.length - 1))).join(" ");
                return apiSuccess(res, {
                    isValid: true,
                    patientId: patient.patient_id,
                    maskedName: maskedName,
                    status: patient.status,
                    abhaStatus: patient.abha_status
                }, "Ayushman pass is valid.", 200, {
                    authorized: false,
                    verification: {
                        isValid: true,
                        patientId: patient.patient_id,
                        maskedName: maskedName,
                        status: patient.status
                    }
                });
            }

            // Return full EHR for medical personnel
            const records = await HospitalModel.getPatientRecords(patient.patient_id);
            const reports = await HospitalModel.getPatientReports(patient.patient_id);

            return apiSuccess(res, { patient, records, reports }, "Medical record access authorized.", 200, {
                authorized: true,
                status: "ACCESS_GRANTED",
                patient: patient,
                records: records,
                reports: reports
            });
        } catch (err) {
            console.error("HospitalController.verifyPatientQR error:", err);
            return apiError(res, "Failed to verify QR pass.", 500, "QR_VERIFY_ERROR", err.message);
        }
    }
}

module.exports = HospitalController;
