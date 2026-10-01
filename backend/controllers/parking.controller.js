/**
 * SmartCity AI - Parking Controller
 * Mediates between Parking routes, services, and models.
 */

const crypto = require("crypto");
const ParkingModel = require("../models/parking.model");
const { apiSuccess, apiError } = require("../utils/response");

class ParkingController {
    static async getLots(req, res) {
        try {
            const lots = await ParkingModel.getAllLots();
            const stats = await ParkingModel.getLotsStats();

            // Normalize for frontend compatibility
            const normalizedLots = lots.map(lot => ({
                ...lot,
                status: lot.status ? lot.status.toLowerCase() : "open",
                availableSlots: lot.available_slots,
                totalSlots: lot.total_slots,
                occupiedSlots: lot.occupied_slots
            }));

            return apiSuccess(res, normalizedLots, "Parking lots retrieved successfully", 200, {
                count: normalizedLots.length,
                lots: normalizedLots,
                stats: stats
            });
        } catch (err) {
            console.error("ParkingController.getLots error:", err);
            return apiError(res, "Failed to retrieve parking lots.", 500, "DB_ERROR", err.message);
        }
    }

    static async getLotDetails(req, res) {
        try {
            const id = req.params.id;
            const lot = await ParkingModel.getLotByCodeOrId(id);
            if (!lot) {
                return apiError(res, "Parking lot not found.", 404, "NOT_FOUND");
            }
            const slots = await ParkingModel.getSlots(lot.parking_code);
            return apiSuccess(res, { ...lot, slots }, "Lot details retrieved.", 200, {
                lot: lot,
                slots: slots
            });
        } catch (err) {
            console.error("ParkingController.getLotDetails error:", err);
            return apiError(res, "Failed to retrieve lot details.", 500, "DB_ERROR", err.message);
        }
    }

    static async getSlots(req, res) {
        try {
            const { status, lot_id } = req.query;
            const slots = await ParkingModel.getSlots(lot_id, status);
            return apiSuccess(res, slots, "Parking slots retrieved.", 200, {
                count: slots.length,
                slots: slots
            });
        } catch (err) {
            console.error("ParkingController.getSlots error:", err);
            return apiError(res, "Failed to retrieve parking slots.", 500, "DB_ERROR", err.message);
        }
    }

    static async bookSlot(req, res) {
        try {
            const lotId = req.params.id || req.body.lotId || req.body.lot_id || req.body.parkingCode || "PARK-001";
            const lot = await ParkingModel.getLotByCodeOrId(lotId);
            if (!lot) {
                return apiError(res, "Selected parking lot was not found.", 404, "NOT_FOUND");
            }

            if (lot.available_slots <= 0) {
                return apiError(res, "Selected parking lot is currently at full capacity.", 400, "CAPACITY_EXCEEDED");
            }

            // Find an available slot bay
            const slot = await ParkingModel.getAvailableSlot(lot.parking_code);
            const slotNumber = slot ? slot.slot_number : `BAY-A-${Math.floor(Math.random() * 20) + 1}`;

            const vehicleNumber = (req.body.vehicleNumber || req.body.vehicle_number || "UP-53-XX-0000").toUpperCase();
            const citizenName = req.body.citizenName || req.body.name || (req.user && req.user.name) || "Citizen Guest";
            const mobile = req.body.mobile || req.body.phone || (req.user && req.user.mobile) || "6306880000";
            const duration = Number(req.body.duration || req.body.durationHours || 2);
            const hourlyRate = Number(lot.hourly_rate || 20);
            const totalAmount = duration * hourlyRate;

            const bookingCode = "PKG-" + Date.now().toString(36).toUpperCase();
            const qrToken = "SCPKG-" + crypto.randomBytes(8).toString("hex");

            await ParkingModel.createBooking({
                bookingCode,
                lotId: lot.parking_code,
                slotId: slotNumber,
                userId: req.user ? req.user.id : null,
                citizenName,
                mobile,
                vehicleNumber,
                durationHours: duration,
                totalAmount,
                qrToken
            });

            const ticketPayload = {
                bookingId: bookingCode,
                bookingCode: bookingCode,
                lotId: lot.parking_code,
                lotName: lot.name,
                slotNumber: slotNumber,
                vehicleNumber: vehicleNumber,
                duration: duration,
                totalAmount: totalAmount,
                qrToken: qrToken,
                status: "Active"
            };

            // Emit live parking update to WebSockets
            const io = req.app.get("io");
            if (io) {
                io.emit("parking:slot-updated", {
                    lotId: lot.parking_code,
                    availableSlots: Math.max(0, lot.available_slots - 1),
                    occupiedSlots: lot.occupied_slots + 1
                });
            }

            return apiSuccess(res, ticketPayload, "Parking slot reserved successfully.", 201, {
                booking: ticketPayload,
                ticket: ticketPayload
            });
        } catch (err) {
            console.error("ParkingController.bookSlot error:", err);
            return apiError(res, "Failed to complete parking reservation.", 500, "BOOKING_ERROR", err.message);
        }
    }

    static async getUserBookings(req, res) {
        try {
            const userId = req.user ? req.user.id : null;
            const mobile = req.query.mobile || (req.user && req.user.mobile) || null;
            const bookings = await ParkingModel.getUserBookings(userId, mobile);
            return apiSuccess(res, bookings, "User bookings retrieved.", 200, {
                count: bookings.length,
                bookings: bookings
            });
        } catch (err) {
            console.error("ParkingController.getUserBookings error:", err);
            return apiError(res, "Failed to retrieve user bookings.", 500, "DB_ERROR", err.message);
        }
    }

    static async getStaffOverview(req, res) {
        try {
            const stats = await ParkingModel.getLotsStats();
            const activeEntries = await ParkingModel.getActiveEntries();
            return apiSuccess(res, { stats, activeEntries }, "Staff parking overview retrieved.", 200, {
                overview: stats,
                activeCount: activeEntries.length,
                activeEntries: activeEntries,
                bookings: activeEntries
            });
        } catch (err) {
            console.error("ParkingController.getStaffOverview error:", err);
            return apiError(res, "Failed to retrieve staff overview.", 500, "DB_ERROR", err.message);
        }
    }
}

module.exports = ParkingController;
