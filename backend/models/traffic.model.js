/**
 * SmartCity AI - Traffic Domain Model
 * Encapsulates MySQL queries for Junctions, Signals, Violations, Cameras, and Audit Logs.
 */

const pool = require("../config/db").promise();

class TrafficModel {
    static async getAllJunctions() {
        const [rows] = await pool.query(`
            SELECT id, id AS junction_code, name, COALESCE(landmark, zone) AS location, latitude, longitude,
                   congestion_level, avg_speed_kmh AS average_speed_kmh,
                   cycle_time, active_phase, status, updated_at
            FROM traffic_junctions
            ORDER BY id ASC
        `);
        return rows;
    }

    static async getJunctionByCodeOrId(identifier) {
        const [rows] = await pool.query(`
            SELECT *, id AS junction_code FROM traffic_junctions
            WHERE id = ? OR name = ?
            LIMIT 1
        `, [identifier, identifier]);
        return rows[0] || null;
    }

    static async getAllSignals() {
        const [rows] = await pool.query(`
            SELECT s.*, j.name AS junction_name, j.latitude, j.longitude, j.congestion_level
            FROM traffic_signals s
            LEFT JOIN traffic_junctions j ON s.junction_id COLLATE utf8mb4_unicode_ci = j.id COLLATE utf8mb4_unicode_ci
            ORDER BY s.id ASC
        `);
        return rows;
    }

    static async updateSignalPhase(junctionId, phase, greenSeconds, cycleLength, isManual = 0, overrideReason = null) {
        let currentColor = "Green";
        let overrideColor = isManual ? "Force Green" : "None";
        const pUpper = String(phase || "GREEN").toUpperCase();
        if (pUpper.includes("RED")) {
            currentColor = "Red";
            overrideColor = isManual ? "Force Red" : "None";
        } else if (pUpper.includes("YELLOW") || pUpper.includes("AMBER")) {
            currentColor = "Yellow";
            overrideColor = isManual ? "Flash Amber" : "None";
        } else {
            currentColor = "Green";
            overrideColor = isManual ? "Force Green" : "None";
        }

        const mode = isManual ? "MANUAL" : "AUTO";
        const [result] = await pool.query(`
            UPDATE traffic_signals
            SET current_color = ?,
                override_color = ?,
                green_time = COALESCE(?, green_time),
                mode = ?,
                updated_at = NOW()
            WHERE junction_id = ? OR junction_id = (SELECT id FROM traffic_junctions WHERE id = ? OR name = ? LIMIT 1)
        `, [currentColor, overrideColor, greenSeconds, mode, junctionId, junctionId, junctionId]);

        // Also update junction active phase
        await pool.query(`
            UPDATE traffic_junctions
            SET active_phase = ?,
                mode = ?,
                updated_at = NOW()
            WHERE id = ? OR name = ?
        `, [currentColor, mode, junctionId, junctionId]).catch(() => {});

        return result.affectedRows > 0;
    }

    static async getCameras() {
        const [rows] = await pool.query(`
            SELECT id, camera_code, junction_id, camera_name, stream_url,
                   status, camera_type, resolution, fps, direction, updated_at
            FROM traffic_cameras
            ORDER BY id ASC
        `);
        return rows;
    }

    static async getViolations(statusFilter = null) {
        let sql = `SELECT * FROM traffic_violations`;
        const params = [];
        if (statusFilter) {
            sql += ` WHERE status = ?`;
            params.push(statusFilter);
        }
        sql += ` ORDER BY id DESC LIMIT 100`;
        const [rows] = await pool.query(sql, params);
        return rows;
    }

    static async getViolationById(id) {
        const [rows] = await pool.query(`SELECT * FROM traffic_violations WHERE id = ? OR violation_id = ? LIMIT 1`, [id, id]);
        return rows[0] || null;
    }

    static async updateViolationStatus(id, newStatus, verifiedBy, notes = null) {
        const [result] = await pool.query(`
            UPDATE traffic_violations
            SET status = ?,
                verified_by = ?,
                verified_at = NOW(),
                review_notes = ?
            WHERE id = ? OR violation_id = ?
        `, [newStatus, verifiedBy, notes, id, id]);
        return result.affectedRows > 0;
    }

    static async searchChallan(query) {
        const cleanQuery = String(query || "").trim();
        const [rows] = await pool.query(`
            SELECT * FROM traffic_violations
            WHERE vehicle_number = ? OR violation_id = ? OR payment_receipt = ?
            ORDER BY id DESC
        `, [cleanQuery, cleanQuery, cleanQuery]);
        return rows;
    }

    static async payChallan(violationId, paymentReceipt, amountPaid) {
        const [result] = await pool.query(`
            UPDATE traffic_violations
            SET status = 'PAID',
                payment_receipt = ?,
                updated_at = NOW()
            WHERE (id = ? OR violation_id = ?) AND status != 'PAID'
        `, [paymentReceipt, violationId, violationId]);
        return result.affectedRows > 0;
    }
}

module.exports = TrafficModel;
