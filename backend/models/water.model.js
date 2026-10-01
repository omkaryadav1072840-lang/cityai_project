/**
 * SmartCity AI - Water Supply & SCADA Domain Model
 * Encapsulates MySQL queries for Reservoirs, Pipelines, Schedules, Tankers, and Anomalies.
 */

const pool = require("../config/db").promise();

class WaterModel {
    static async getAllTanks() {
        const [rows] = await pool.query(`
            SELECT id, tank_id, name, location, capacity_liters,
                   current_level_liters, current_level_percent,
                   water_quality_index, ph_level, turbidity_ntu,
                   chlorine_ppm, status, latitude, longitude, updated_at
            FROM water_tanks
            ORDER BY name ASC
        `);
        return rows;
    }

    static async getPipelines() {
        const [rows] = await pool.query(`
            SELECT id, pipeline_code, start_location, end_location,
                   zone, pipe_diameter_mm, pressure_bar, flow_rate_lps,
                   status, last_inspection_date, updated_at
            FROM water_pipelines
            ORDER BY id ASC
        `);
        return rows;
    }

    static async getSchedules() {
        const [rows] = await pool.query(`
            SELECT id, ward_number, ward_name, supply_date,
                   morning_start_time, morning_end_time,
                   evening_start_time, evening_end_time,
                   status, remarks, updated_at
            FROM water_supply_schedules
            ORDER BY ward_number ASC
        `);
        return rows;
    }

    static async getAnomalies() {
        // Query both pipelines with low pressure / leak and depleted tanks
        const [pipes] = await pool.query(`
            SELECT id, 'Pipeline Pressure Drop' AS anomaly_type, pipeline_code AS asset_code,
                   zone AS location, status, pressure_bar, 'Pressure below critical threshold (1.2 bar)' AS description,
                   created_at AS updated_at
            FROM water_pipelines
            WHERE status LIKE '%Leak%' OR pressure_bar < 1.5
        `);
        const [tanks] = await pool.query(`
            SELECT id, 'Tank Low Level Alert' AS anomaly_type, tank_id AS asset_code,
                   location, status, current_level_percent AS pressure_bar, 'Water storage depleted below 20%' AS description,
                   updated_at
            FROM water_tanks
            WHERE current_level_percent < 20
        `);
        return [...pipes, ...tanks];
    }

    static async createTankerBooking({ bookingCode, userId, citizenName, mobile, deliveryAddress, capacityLiters, bookingDate, deliverySlot, deliveryNotes }) {
        const [result] = await pool.query(`
            INSERT INTO water_tanker_bookings
            (booking_code, user_id, citizen_name, mobile, delivery_address, capacity_liters, booking_date, delivery_slot, delivery_notes, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Confirmed', NOW())
        `, [bookingCode, userId || null, citizenName, mobile, deliveryAddress, capacityLiters || 5000, bookingDate, deliverySlot || 'Morning (8AM - 11AM)', deliveryNotes || null]);
        return result.insertId;
    }

    static async getUserTankerBookings(userId, mobile = null) {
        let sql = `SELECT * FROM water_tanker_bookings WHERE user_id = ?`;
        const params = [userId];
        if (mobile) {
            sql += ` OR mobile = ?`;
            params.push(mobile);
        }
        sql += ` ORDER BY id DESC LIMIT 50`;
        const [rows] = await pool.query(sql, params);
        return rows;
    }
}

module.exports = WaterModel;
