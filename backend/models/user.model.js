/**
 * SmartCity AI - User & Staff Identity Model
 * Encapsulates MySQL queries for Citizens, Staff, Auth, and Audit Logs.
 */

const pool = require("../config/db").promise();

class UserModel {
    static async findByEmail(email) {
        const [rows] = await pool.query(`SELECT * FROM users WHERE email = ? LIMIT 1`, [email]);
        return rows[0] || null;
    }

    static async findByMobile(mobile) {
        const [rows] = await pool.query(`SELECT * FROM users WHERE mobile = ? LIMIT 1`, [mobile]);
        return rows[0] || null;
    }

    static async findById(id) {
        const [rows] = await pool.query(`SELECT id, name, email, mobile, ward, vehicle_number, blood_group, emergency_contact, role, created_at FROM users WHERE id = ? LIMIT 1`, [id]);
        return rows[0] || null;
    }

    static async createUser({ name, email, mobile, password, ward, vehicleNumber, bloodGroup, emergencyContact, role = 'citizen' }) {
        const [result] = await pool.query(`
            INSERT INTO users
            (name, email, mobile, password, ward, vehicle_number, blood_group, emergency_contact, role, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [name, email, mobile, password, ward || 'Ward 1 - Golghar', vehicleNumber || null, bloodGroup || null, emergencyContact || null, role]);
        return result.insertId;
    }

    static async findStaffByStaffId(staffId) {
        const [rows] = await pool.query(`SELECT * FROM staff WHERE staff_id = ? AND is_active = 1 LIMIT 1`, [staffId]);
        return rows[0] || null;
    }

    static async logAudit({ userId, staffId, action, entityType, entityId, details, ipAddress }) {
        try {
            await pool.query(`
                INSERT INTO audit_logs
                (user_id, staff_id, action, entity_type, entity_id, details, ip_address, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
            `, [userId || null, staffId || null, action, entityType, String(entityId || ''), JSON.stringify(details || {}), ipAddress || null]);
        } catch (e) {
            console.warn("Audit logging error (non-fatal):", e.message);
        }
    }

    static async getUserActivities(userId, mobile = null) {
        const [logs] = await pool.query(`
            SELECT id, action, entity_type, entity_id, details, created_at AS timestamp, 'audit' AS activity_type
            FROM audit_logs
            WHERE user_id = ?
            ORDER BY id DESC LIMIT 20
        `, [userId]);

        const [bookings] = await pool.query(`
            SELECT id, booking_code AS code, lot_id AS target, total_amount, status, created_at AS timestamp, 'parking' AS activity_type
            FROM parking_bookings
            WHERE user_id = ? OR mobile = ?
            ORDER BY id DESC LIMIT 20
        `, [userId, mobile]);

        const [requests] = await pool.query(`
            SELECT id, request_code AS code, department AS target, priority, status, created_at AS timestamp, 'grievance' AS activity_type
            FROM service_requests
            WHERE user_id = ? OR citizen_mobile = ?
            ORDER BY id DESC LIMIT 20
        `, [userId, mobile]);

        const combined = [...logs, ...bookings, ...requests].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        return combined.slice(0, 50);
    }
}

module.exports = UserModel;
