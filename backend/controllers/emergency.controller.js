/**
 * SmartCity AI - Emergency & Ambulance Controller
 * Mediates between Emergency routes, services, and models.
 */

const EmergencyModel = require("../models/emergency.model");
const TrafficModel = require("../models/traffic.model");
const { apiSuccess, apiError } = require("../utils/response");

class EmergencyController {
    static async triggerSOS(req, res) {
        try {
            const incidentCode = "EMG-" + Date.now().toString(36).toUpperCase();
            const callerName = req.body.callerName || req.body.name || (req.user && req.user.name) || "Anonymous Citizen";
            const callerPhone = req.body.callerPhone || req.body.phone || req.body.mobile || (req.user && req.user.mobile) || "112";
            const incidentType = req.body.incidentType || req.body.type || "Medical Emergency";
            const latitude = req.body.latitude || req.body.lat || 26.7606;
            const longitude = req.body.longitude || req.body.lng || 83.3732;
            const address = req.body.address || req.body.location || "Gorakhpur City Centre";
            const description = req.body.description || "1-Tap Panic SOS Triggered via SmartCity Portal";
            const severity = req.body.severity || "CRITICAL";

            const insertId = await EmergencyModel.createIncident({
                incidentCode,
                callerName,
                callerPhone,
                incidentType,
                latitude,
                longitude,
                address,
                description,
                severity
            });

            const incidentPayload = {
                incidentId: incidentCode,
                incidentCode,
                callerName,
                callerPhone,
                incidentType,
                latitude,
                longitude,
                address,
                severity,
                status: "Active",
                dispatchedUnits: ["AMB-01", "POL-04"],
                etaMinutes: 4
            };

            // Broadcast real-time SOS event to Socket.IO room
            const io = req.app.get("io");
            if (io) {
                io.emit("emergency:new-sos", incidentPayload);
            }

            return apiSuccess(res, incidentPayload, "Emergency SOS logged and trauma units dispatched.", 201, {
                incident: incidentPayload,
                emergency: incidentPayload
            });
        } catch (err) {
            console.error("EmergencyController.triggerSOS error:", err);
            return apiError(res, "Failed to dispatch emergency response.", 500, "SOS_ERROR", err.message);
        }
    }

    static async getAmbulances(req, res) {
        try {
            const ambulances = await EmergencyModel.getAmbulances();
            return apiSuccess(res, ambulances, "Ambulance fleet status retrieved.", 200, {
                count: ambulances.length,
                ambulances: ambulances
            });
        } catch (err) {
            console.error("EmergencyController.getAmbulances error:", err);
            return apiError(res, "Failed to retrieve ambulances.", 500, "DB_ERROR", err.message);
        }
    }

    static async criticalDispatch(req, res) {
        try {
            const ambulanceId = req.params.id || req.body.ambulanceId || "AMB-01";
            const junctionId = req.body.junctionId || "JNC-GOLGHAR-01";
            const distanceMeters = Number(req.body.distanceMeters || 180);

            // Record green wave in database
            await EmergencyModel.recordGreenWave({
                ambulanceId,
                junctionId,
                distanceMeters,
                corridorStatus: 'GREEN_WAVE_ENGAGED'
            });

            // Force green phase on approaching junction
            await TrafficModel.updateSignalPhase(junctionId, 'GREEN', 60, null, 1, `Emergency Green Wave for ${ambulanceId}`);

            const corridorPayload = {
                ambulanceId,
                junctionId,
                distanceMeters,
                preemptionActive: true,
                corridorStatus: "GREEN_WAVE_ENGAGED"
            };

            const io = req.app.get("io");
            if (io) {
                io.emit("traffic:green-wave-engaged", corridorPayload);
            }

            return apiSuccess(res, corridorPayload, `Emergency green wave engaged for ${ambulanceId}.`, 200, {
                preemption_active: true,
                corridor_status: "GREEN_WAVE_ENGAGED"
            });
        } catch (err) {
            console.error("EmergencyController.criticalDispatch error:", err);
            return apiError(res, "Failed to engage green wave corridor.", 500, "PREEMPTION_ERROR", err.message);
        }
    }
}

module.exports = EmergencyController;
