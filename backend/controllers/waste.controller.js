/**
 * SmartCity AI - Waste Management Controller
 * Mediates between Waste routes, services, and models.
 */

const WasteModel = require("../models/waste.model");
const { apiSuccess, apiError } = require("../utils/response");

class WasteController {
    static async getBins(req, res) {
        try {
            const bins = await WasteModel.getAllBins();
            return apiSuccess(res, bins, "Smart dustbins retrieved.", 200, {
                count: bins.length,
                bins: bins
            });
        } catch (err) {
            console.error("WasteController.getBins error:", err);
            return apiError(res, "Failed to retrieve dustbin telemetry.", 500, "DB_ERROR", err.message);
        }
    }

    static async getRequests(req, res) {
        try {
            const role = req.user ? (req.user.role || req.user.type || "").toLowerCase() : "";
            const isStaff = ["admin", "staff"].includes(role);
            const userId = req.user ? req.user.id : null;
            const mobile = req.user ? req.user.mobile : null;
            const status = req.query.status || null;

            const requests = await WasteModel.getRequests({ status, userId, mobile, isStaff });
            return apiSuccess(res, requests, "Waste requests retrieved.", 200, {
                count: requests.length,
                requests: requests
            });
        } catch (err) {
            console.error("WasteController.getRequests error:", err);
            return apiError(res, "Failed to retrieve waste requests.", 500, "DB_ERROR", err.message);
        }
    }

    static async submitReport(req, res) {
        try {
            const requestCode = "WST-" + Date.now().toString(36).toUpperCase();
            const trackingId = "TRK-" + Math.floor(100000 + Math.random() * 900000);
            const userId = req.user ? req.user.id : null;
            const citizenName = req.body.citizenName || (req.user && req.user.name) || "Citizen Guest";
            const citizenMobile = req.body.citizenMobile || req.body.mobile || (req.user && req.user.mobile) || "6306880000";
            const category = req.body.category || "Garbage Overflow";
            const description = req.body.description || "Overflowing municipal dustbin";
            const location = req.body.location || "Golghar, Gorakhpur";
            const landmark = req.body.landmark || null;
            const photoUrl = req.file ? `/uploads/evidence/${req.file.filename}` : null;
            const priority = req.body.priority || "MEDIUM";
            const slaHours = priority === "CRITICAL" ? 2 : (priority === "HIGH" ? 6 : 24);
            const deadline = new Date(Date.now() + slaHours * 3600 * 1000);

            await WasteModel.createReport({
                requestCode,
                trackingId,
                userId,
                citizenName,
                citizenMobile,
                category,
                description,
                location,
                landmark,
                photoUrl,
                priority,
                slaHours,
                slaDeadline: deadline
            });

            const reportPayload = {
                id: requestCode,
                requestCode: requestCode,
                trackingId: trackingId,
                status: "Pending",
                slaDeadline: deadline,
                slaHours: slaHours
            };

            return apiSuccess(res, reportPayload, "Waste grievance report filed successfully.", 201, {
                request: reportPayload,
                report: reportPayload
            });
        } catch (err) {
            console.error("WasteController.submitReport error:", err);
            return apiError(res, "Failed to submit waste report.", 500, "REPORT_ERROR", err.message);
        }
    }

    static async updateStatus(req, res) {
        try {
            const id = req.body.requestId || req.body.id || req.body.requestCode;
            let status = req.body.status || "In Progress";
            if (status.toLowerCase() === "in_progress") status = "In Progress";
            const assignedWorker = req.body.assignedTo || req.body.assignedWorker || null;

            const updated = await WasteModel.updateRequestStatus(id, status, assignedWorker);
            if (!updated) {
                return apiError(res, "Waste request record not found.", 404, "NOT_FOUND");
            }

            return apiSuccess(res, { id, status, assignedWorker }, `Waste request status transitioned to ${status}.`, 200, {
                id: id,
                status: status
            });
        } catch (err) {
            console.error("WasteController.updateStatus error:", err);
            return apiError(res, "Failed to update waste request.", 500, "UPDATE_ERROR", err.message);
        }
    }

    static async getVehicles(req, res) {
        try {
            const vehicles = await WasteModel.getVehicles();
            return apiSuccess(res, vehicles, "Compactor vehicles retrieved.", 200, {
                count: vehicles.length,
                vehicles: vehicles
            });
        } catch (err) {
            console.error("WasteController.getVehicles error:", err);
            return apiError(res, "Failed to retrieve waste vehicles.", 500, "DB_ERROR", err.message);
        }
    }
}

module.exports = WasteController;
