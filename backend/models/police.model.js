/**
 * SmartCity AI - Police & Community Safety Domain Model
 * Encapsulates MySQL queries for Police Stations, Complaints, and Patrol Stats.
 */

const pool = require("../config/db").promise();

class PoliceModel {
    static async getStations() {
        const [rows] = await pool.query(`
            SELECT id, station_code, name, address, area,
                   sho_name, sho_contact, emergency_phone,
                   latitude, longitude, status, updated_at
            FROM police_stations
            ORDER BY name ASC
        `);
        return rows;
    }

    static async getStationById(identifier) {
        const [rows] = await pool.query(`
            SELECT * FROM police_stations
            WHERE id = ? OR station_code = ?
            LIMIT 1
        `, [identifier, identifier]);
        return rows[0] || null;
    }

    static async getComplaints(userId = null) {
        let sql = `SELECT * FROM police_complaints`;
        const params = [];
        if (userId) {
            sql += ` WHERE user_id = ?`;
            params.push(userId);
        }
        sql += ` ORDER BY id DESC LIMIT 50`;
        const [rows] = await pool.query(sql, params);
        return rows;
    }

    static async createComplaint({ complaintCode, userId, citizenName, mobile, incidentType, incidentLocation, description }) {
        const [result] = await pool.query(`
            INSERT INTO police_complaints
            (complaint_code, user_id, citizen_name, mobile, incident_type, incident_location, description, status, filed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Submitted', NOW())
        `, [complaintCode, userId || null, citizenName, mobile, incidentType || 'General Grievance', incidentLocation, description]);
        return result.insertId;
    }

    static async getStats() {
        const [rows] = await pool.query(`SELECT * FROM police_stats ORDER BY id DESC LIMIT 1`);
        return rows[0] || { total_stations: 12, active_patrols: 28, solved_rate_percent: 88.5 };
    }
}

module.exports = PoliceModel;
