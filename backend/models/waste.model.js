/**
 * SmartCity AI - Waste Management Domain Model
 * Encapsulates MySQL queries for Bins, Requests, Vehicles, and Collection Routes.
 */

const pool = require("../config/db").promise();

class WasteModel {
    static async getAllBins() {
        const [rows] = await pool.query(`
            SELECT id, bin_code, location, ward_number, area,
                   capacity_liters, current_fill_percent, battery_level_percent,
                   waste_type, status, last_collection_time, latitude, longitude, updated_at
            FROM waste_bins
            ORDER BY ward_number ASC, bin_code ASC
        `);
        return rows;
    }

    static async getBinById(identifier) {
        const [rows] = await pool.query(`
            SELECT * FROM waste_bins
            WHERE id = ? OR bin_code = ?
            LIMIT 1
        `, [identifier, identifier]);
        return rows[0] || null;
    }

    static async getRequests({ status, userId, mobile, isStaff }) {
        let sql = `SELECT * FROM service_requests WHERE department = 'waste'`;
        const params = [];
        if (!isStaff && (userId || mobile)) {
            sql += ` AND (user_id = ? OR citizen_mobile = ?)`;
            params.push(userId, mobile);
        }
        if (status) {
            sql += ` AND status = ?`;
            params.push(status);
        }
        sql += ` ORDER BY id DESC LIMIT 100`;
        const [rows] = await pool.query(sql, params);
        return rows;
    }

    static async createReport({ requestCode, trackingId, userId, citizenName, citizenMobile, category, description, location, landmark, photoUrl, priority, slaHours, slaDeadline }) {
        const [result] = await pool.query(`
            INSERT INTO service_requests
            (request_code, tracking_id, user_id, citizen_name, citizen_mobile, department, category, description, location, landmark, evidence_photo, priority, sla_hours, sla_deadline, status, created_at)
            VALUES (?, ?, ?, ?, ?, 'waste', ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', NOW())
        `, [requestCode, trackingId, userId || null, citizenName, citizenMobile, category || 'Garbage Dump', description, location, landmark || null, photoUrl || null, priority || 'MEDIUM', slaHours || 24, slaDeadline]);
        return result.insertId;
    }

    static async updateRequestStatus(id, newStatus, assignedWorker = null) {
        const [result] = await pool.query(`
            UPDATE service_requests
            SET status = ?,
                assigned_worker_name = COALESCE(?, assigned_worker_name),
                resolved_at = CASE WHEN ? IN ('Resolved', 'Completed') THEN NOW() ELSE resolved_at END,
                updated_at = NOW()
            WHERE (id = ? OR request_code = ?) AND department = 'waste'
        `, [newStatus, assignedWorker, newStatus, id, id]);
        return result.affectedRows > 0;
    }

    static async getVehicles() {
        const [rows] = await pool.query(`
            SELECT * FROM waste_vehicles
            ORDER BY id ASC
        `);
        return rows;
    }
}

module.exports = WasteModel;
