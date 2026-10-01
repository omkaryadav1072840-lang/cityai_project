/**
 * SmartCity AI - Water Supply & SCADA Controller
 * Mediates between Water routes, services, and models.
 */

const WaterModel = require("../models/water.model");
const { apiSuccess, apiError } = require("../utils/response");

class WaterController {
    static async getTanks(req, res) {
        try {
            const tanks = await WaterModel.getAllTanks();
            return apiSuccess(res, tanks, "Water reservoirs retrieved.", 200, {
                count: tanks.length,
                tanks: tanks
            });
        } catch (err) {
            console.error("WaterController.getTanks error:", err);
            return apiError(res, "Failed to retrieve reservoir telemetry.", 500, "DB_ERROR", err.message);
        }
    }

    static async getPipelines(req, res) {
        try {
            const pipes = await WaterModel.getPipelines();
            return apiSuccess(res, pipes, "SCADA pipelines retrieved.", 200, {
                count: pipes.length,
                pipelines: pipes
            });
        } catch (err) {
            console.error("WaterController.getPipelines error:", err);
            return apiError(res, "Failed to retrieve pipeline telemetry.", 500, "DB_ERROR", err.message);
        }
    }

    static async getSchedules(req, res) {
        try {
            const schedules = await WaterModel.getSchedules();
            return apiSuccess(res, schedules, "Ward water schedules retrieved.", 200, {
                count: schedules.length,
                schedules: schedules
            });
        } catch (err) {
            console.error("WaterController.getSchedules error:", err);
            return apiError(res, "Failed to retrieve water schedules.", 500, "DB_ERROR", err.message);
        }
    }

    static async getAnomalies(req, res) {
        try {
            const anomalies = await WaterModel.getAnomalies();
            return apiSuccess(res, anomalies, "SCADA hydraulic anomalies retrieved.", 200, {
                count: anomalies.length,
                anomalies: anomalies
            });
        } catch (err) {
            console.error("WaterController.getAnomalies error:", err);
            return apiError(res, "Failed to retrieve water anomalies.", 500, "DB_ERROR", err.message);
        }
    }

    static async bookTanker(req, res) {
        try {
            const bookingCode = "TNK-" + Date.now().toString(36).toUpperCase();
            const userId = req.user ? req.user.id : null;
            const citizenName = req.body.citizenName || req.body.name || (req.user && req.user.name) || "Citizen Guest";
            const mobile = req.body.mobile || req.body.phone || (req.user && req.user.mobile) || "6306880000";
            const deliveryAddress = req.body.deliveryAddress || req.body.address || "Gorakhpur City";
            const capacityLiters = Number(req.body.capacity || req.body.capacityLiters || 5000);
            const bookingDate = req.body.bookingDate || req.body.date || new Date().toISOString().split("T")[0];
            const deliverySlot = req.body.deliverySlot || req.body.slot || "Morning (8AM - 11AM)";
            const deliveryNotes = req.body.deliveryNotes || req.body.notes || null;

            await WaterModel.createTankerBooking({
                bookingCode,
                userId,
                citizenName,
                mobile,
                deliveryAddress,
                capacityLiters,
                bookingDate,
                deliverySlot,
                deliveryNotes
            });

            const ticketPayload = {
                bookingCode,
                bookingId: bookingCode,
                citizenName,
                deliveryAddress,
                capacityLiters,
                bookingDate,
                deliverySlot,
                status: "Confirmed"
            };

            return apiSuccess(res, ticketPayload, "Potable water tanker scheduled for delivery.", 201, {
                booking: ticketPayload,
                tanker: ticketPayload
            });
        } catch (err) {
            console.error("WaterController.bookTanker error:", err);
            return apiError(res, "Failed to schedule water tanker.", 500, "BOOKING_ERROR", err.message);
        }
    }

    static async getUserBookings(req, res) {
        try {
            const userId = req.user ? req.user.id : null;
            const mobile = req.user ? req.user.mobile : null;
            const bookings = await WaterModel.getUserTankerBookings(userId, mobile);
            return apiSuccess(res, bookings, "User tanker bookings retrieved.", 200, {
                count: bookings.length,
                bookings: bookings
            });
        } catch (err) {
            console.error("WaterController.getUserBookings error:", err);
            return apiError(res, "Failed to retrieve tanker bookings.", 500, "DB_ERROR", err.message);
        }
    }
}

module.exports = WaterController;
