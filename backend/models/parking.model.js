/**
 * SmartCity AI - Parking Domain Model
 * Encapsulates MySQL queries for Parking Lots, Slots, Reservations, Entries, and Telemetry.
 */

const pool = require("../config/db").promise();

class ParkingModel {
    static async getAllLots() {
        const [rows] = await pool.query(`
            SELECT id, parking_code, name, address, area,
                   total_slots, available_slots, occupied_slots,
                   hourly_rate, status, latitude, longitude,
                   vehicle_types, cctv_available, security_available,
                   opening_time, closing_time, active, updated_at
            FROM parking_lots
            WHERE active = 1
            ORDER BY name ASC
        `);
        return rows;
    }

    static async getLotsStats() {
        const [[stats]] = await pool.query(`
            SELECT
                COUNT(*) AS total_lots,
                COALESCE(SUM(total_slots), 0) AS total_slots,
                COALESCE(SUM(available_slots), 0) AS available_slots,
                COALESCE(SUM(occupied_slots), 0) AS occupied_slots
            FROM parking_lots
            WHERE active = 1
        `);
        return stats || { total_lots: 0, total_slots: 0, available_slots: 0, occupied_slots: 0 };
    }

    static async getLotByCodeOrId(identifier) {
        const [rows] = await pool.query(`
            SELECT * FROM parking_lots
            WHERE id = ? OR parking_code = ?
            LIMIT 1
        `, [identifier, identifier]);
        return rows[0] || null;
    }

    static async getSlots(lotId = null, status = null) {
        let sql = `
            SELECT s.*, l.name AS lot_name, l.hourly_rate
            FROM parking_slots s
            LEFT JOIN parking_lots l ON s.lot_id = l.parking_code OR s.lot_id = CAST(l.id AS CHAR)
        `;
        const params = [];
        const conds = [];
        if (lotId) {
            conds.push("(s.lot_id = ? OR l.id = ?)");
            params.push(lotId, lotId);
        }
        if (status) {
            conds.push("s.status = ?");
            params.push(status);
        }
        if (conds.length) sql += " WHERE " + conds.join(" AND ");
        sql += " ORDER BY s.id ASC LIMIT 200";

        const [rows] = await pool.query(sql, params);
        return rows;
    }

    static async getAvailableSlot(lotCode, vehicleType = '4-wheeler') {
        const [rows] = await pool.query(`
            SELECT * FROM parking_slots
            WHERE (lot_id = ? OR lot_id = (SELECT parking_code FROM parking_lots WHERE id = ? LIMIT 1))
              AND status = 'Available'
            ORDER BY slot_number ASC
            LIMIT 1
        `, [lotCode, lotCode]);
        return rows[0] || null;
    }

    static async createBooking({ bookingCode, lotId, slotId, userId, citizenName, mobile, vehicleNumber, durationHours, totalAmount, qrToken }) {
        const [result] = await pool.query(`
            INSERT INTO parking_bookings
            (booking_code, lot_id, slot_id, user_id, citizen_name, mobile, vehicle_number, duration_hours, total_amount, qr_token, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', NOW())
        `, [bookingCode, lotId, slotId, userId, citizenName, mobile, vehicleNumber, durationHours, totalAmount, qrToken]);

        // Atomic decrement lot available slots
        await pool.query(`
            UPDATE parking_lots
            SET available_slots = GREATEST(0, available_slots - 1),
                occupied_slots = LEAST(total_slots, occupied_slots + 1),
                updated_at = NOW()
            WHERE parking_code = ? OR id = ?
        `, [lotId, lotId]);

        // Mark slot as Booked
        if (slotId) {
            await pool.query(`UPDATE parking_slots SET status = 'Booked' WHERE id = ? OR slot_number = ?`, [slotId, slotId]);
        }

        return result.insertId;
    }

    static async getUserBookings(userId, mobile = null) {
        let sql = `
            SELECT b.*, l.name AS lot_name, l.address AS lot_address, l.hourly_rate
            FROM parking_bookings b
            LEFT JOIN parking_lots l ON b.lot_id = l.parking_code
            WHERE b.user_id = ?
        `;
        const params = [userId];
        if (mobile) {
            sql += ` OR b.mobile = ?`;
            params.push(mobile);
        }
        sql += ` ORDER BY b.id DESC LIMIT 50`;
        const [rows] = await pool.query(sql, params);
        return rows;
    }

    static async getActiveEntries() {
        const [rows] = await pool.query(`
            SELECT b.*, l.name AS lot_name
            FROM parking_bookings b
            LEFT JOIN parking_lots l ON b.lot_id = l.parking_code
            WHERE b.status = 'Active'
            ORDER BY b.id DESC
            LIMIT 50
        `);
        return rows;
    }
}

module.exports = ParkingModel;
