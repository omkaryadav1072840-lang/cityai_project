/**
 * SmartCity AI - Police & Community Safety Controller
 * Mediates between Police routes, services, and models.
 */

const PoliceModel = require("../models/police.model");
const { apiSuccess, apiError } = require("../utils/response");

class PoliceController {
    static async getStations(req, res) {
        try {
            const stations = await PoliceModel.getStations();
            return apiSuccess(res, stations, "Police stations retrieved.", 200, {
                count: stations.length,
                stations: stations
            });
        } catch (err) {
            console.error("PoliceController.getStations error:", err);
            return apiError(res, "Failed to retrieve police stations.", 500, "DB_ERROR", err.message);
        }
    }

    static async getStationDetails(req, res) {
        try {
            const id = req.params.id;
            const station = await PoliceModel.getStationById(id);
            if (!station) {
                return apiError(res, "Police station not found.", 404, "NOT_FOUND");
            }
            return apiSuccess(res, station, "Station details retrieved.", 200, {
                station: station
            });
        } catch (err) {
            console.error("PoliceController.getStationDetails error:", err);
            return apiError(res, "Failed to retrieve station details.", 500, "DB_ERROR", err.message);
        }
    }

    static async submitComplaint(req, res) {
        try {
            const complaintCode = "FIR-" + Date.now().toString(36).toUpperCase();
            const userId = req.user ? req.user.id : null;
            const citizenName = req.body.citizenName || req.body.name || (req.user && req.user.name) || "Citizen Complainant";
            const mobile = req.body.mobile || req.body.phone || (req.user && req.user.mobile) || "6306880000";
            const incidentType = req.body.incidentType || req.body.type || "General Complaint";
            const incidentLocation = req.body.incidentLocation || req.body.location || "Gorakhpur";
            const description = req.body.description || "Citizen grievance";

            await PoliceModel.createComplaint({
                complaintCode,
                userId,
                citizenName,
                mobile,
                incidentType,
                incidentLocation,
                description
            });

            const complaintPayload = {
                complaintId: complaintCode,
                complaintCode: complaintCode,
                status: "Submitted",
                citizenName,
                incidentType,
                incidentLocation
            };

            return apiSuccess(res, complaintPayload, "Police grievance recorded successfully.", 201, {
                complaint: complaintPayload
            });
        } catch (err) {
            console.error("PoliceController.submitComplaint error:", err);
            return apiError(res, "Failed to record police complaint.", 500, "COMPLAINT_ERROR", err.message);
        }
    }

    static async getComplaints(req, res) {
        try {
            const userId = req.user ? req.user.id : null;
            const complaints = await PoliceModel.getComplaints(userId);
            return apiSuccess(res, complaints, "Police complaints retrieved.", 200, {
                count: complaints.length,
                complaints: complaints
            });
        } catch (err) {
            console.error("PoliceController.getComplaints error:", err);
            return apiError(res, "Failed to retrieve complaints.", 500, "DB_ERROR", err.message);
        }
    }

    static async getStats(req, res) {
        try {
            const stats = await PoliceModel.getStats();
            return apiSuccess(res, stats, "Police telemetry statistics retrieved.", 200, {
                stats: stats
            });
        } catch (err) {
            console.error("PoliceController.getStats error:", err);
            return apiError(res, "Failed to retrieve police stats.", 500, "DB_ERROR", err.message);
        }
    }
}

module.exports = PoliceController;
