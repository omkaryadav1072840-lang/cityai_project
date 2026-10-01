/**
 * SmartCity AI - Traffic Controller
 * Mediates between Traffic routes, services, and models.
 */

const TrafficModel = require("../models/traffic.model");
const trafficEngine = require("../services/traffic_engine");
const trafficAIService = require("../services/traffic_ai_service");
const { apiSuccess, apiError } = require("../utils/response");

class TrafficController {
    static async getJunctions(req, res) {
        try {
            const junctions = await TrafficModel.getAllJunctions();
            return apiSuccess(res, junctions, "Junctions retrieved successfully", 200, {
                count: junctions.length,
                junctions: junctions
            });
        } catch (err) {
            console.error("TrafficController.getJunctions error:", err);
            return apiError(res, "Failed to retrieve traffic junctions.", 500, "DB_ERROR", err.message);
        }
    }

    static async getSignals(req, res) {
        try {
            const signals = await TrafficModel.getAllSignals();
            return apiSuccess(res, signals, "Signals retrieved successfully", 200, {
                count: signals.length,
                signals: signals
            });
        } catch (err) {
            console.error("TrafficController.getSignals error:", err);
            return apiError(res, "Failed to retrieve traffic signals.", 500, "DB_ERROR", err.message);
        }
    }

    static async overrideSignal(req, res) {
        try {
            const id = req.params.id || req.body.junctionId || req.body.junction_id || 'GKP-JNC-001';
            let action = req.body.action || req.body.override_action || req.body.activePhase || "FORCE_GREEN";
            const duration = Number(req.body.duration || req.body.greenSeconds || 60);

            let phase = "GREEN";
            if (action === "FORCE_RED") phase = "RED";
            if (action === "FLASHING_YELLOW") phase = "YELLOW";

            const success = await TrafficModel.updateSignalPhase(id, phase, duration, null, 1, `Manual override: ${action}`);

            // Broadcast real-time update via Socket.IO if available
            const io = req.app.get("io");
            if (io) {
                io.emit("traffic:signal-updated", {
                    junctionId: id,
                    phase: phase,
                    action: action,
                    timestamp: new Date().toISOString()
                });
            }

            return apiSuccess(res, { junctionId: id, activePhase: phase, duration }, `Traffic signal overridden to ${phase}.`, 200, {
                junctionId: id,
                status: "OVERRIDDEN"
            });
        } catch (err) {
            console.error("TrafficController.overrideSignal error:", err);
            return apiError(res, "Failed to override traffic signal.", 500, "OVERRIDE_ERROR", err.message);
        }
    }

    static async getCameras(req, res) {
        try {
            const cameras = await TrafficModel.getCameras();
            return apiSuccess(res, cameras, "Cameras retrieved successfully", 200, {
                count: cameras.length,
                cameras: cameras
            });
        } catch (err) {
            console.error("TrafficController.getCameras error:", err);
            return apiError(res, "Failed to retrieve traffic cameras.", 500, "DB_ERROR", err.message);
        }
    }

    static async getViolations(req, res) {
        try {
            const status = req.query.status || null;
            const violations = await TrafficModel.getViolations(status);
            return apiSuccess(res, violations, "Violations retrieved successfully", 200, {
                count: violations.length,
                violations: violations
            });
        } catch (err) {
            console.error("TrafficController.getViolations error:", err);
            return apiError(res, "Failed to retrieve traffic violations.", 500, "DB_ERROR", err.message);
        }
    }

    static async verifyViolation(req, res) {
        try {
            const id = req.params.id;
            const decision = String(req.body.decision || "APPROVE").toUpperCase();
            const staffUsername = req.body.staff_username || (req.user && (req.user.name || req.user.username)) || "traffic_officer";
            const notes = req.body.notes || req.body.review_notes || "Officer inspection approved.";

            const newStatus = decision === "APPROVE" ? "VERIFIED_CHALLAN_REFERRED" : "REJECTED_DISMISSED";
            const updated = await TrafficModel.updateViolationStatus(id, newStatus, staffUsername, notes);

            if (!updated) {
                return apiError(res, "Violation record not found.", 404, "NOT_FOUND");
            }

            return apiSuccess(res, { violationId: id, status: newStatus, verifiedBy: staffUsername }, `Violation status transitioned to ${newStatus}.`, 200, {
                violation_id: id,
                status: newStatus
            });
        } catch (err) {
            console.error("TrafficController.verifyViolation error:", err);
            return apiError(res, "Failed to verify violation.", 500, "VERIFY_ERROR", err.message);
        }
    }

    static async searchChallan(req, res) {
        try {
            const query = req.query.q || req.query.vehicleNumber || req.query.vehicle_number || req.query.challanId || req.body.vehicleNumber;
            const records = await TrafficModel.searchChallan(query);
            return apiSuccess(res, records, "Challan records found.", 200, {
                count: records.length,
                records: records,
                challans: records
            });
        } catch (err) {
            console.error("TrafficController.searchChallan error:", err);
            return apiError(res, "Failed to search challan records.", 500, "DB_ERROR", err.message);
        }
    }

    static async payChallan(req, res) {
        try {
            const id = req.body.violationId || req.body.violation_id || req.body.challanId || req.params.id;
            const receipt = "RCP-" + Date.now().toString(36).toUpperCase();
            const amount = Number(req.body.amount || 1000);

            const paid = await TrafficModel.payChallan(id, receipt, amount);
            if (!paid) {
                return apiError(res, "Challan not found or already settled.", 400, "PAYMENT_REJECTED");
            }

            return apiSuccess(res, { violationId: id, receipt: receipt, amountPaid: amount, status: "PAID" }, "e-Challan payment received successfully.", 200, {
                receipt: receipt,
                status: "PAID"
            });
        } catch (err) {
            console.error("TrafficController.payChallan error:", err);
            return apiError(res, "Failed to settle challan.", 500, "PAYMENT_ERROR", err.message);
        }
    }
}

module.exports = TrafficController;
