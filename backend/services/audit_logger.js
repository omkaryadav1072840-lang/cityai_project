/**
 * SmartCity AI - Centralized Audit Logger
 * Asynchronously writes audit trails for sensitive operations, administrative changes,
 * and departmental staff actions.
 */

const pool = require("../config/db").promise();

/**
 * Log an audit event.
 * @param {Object} req - Express request object (optional, extracts user & IP)
 * @param {Object} entry - { userId, userName, role, department, action, module, recordId, metadata }
 */
async function logAudit(req, entry) {
    try {
        let userId = entry.userId || null;
        let userName = entry.userName || null;
        let role = entry.role || null;
        let department = entry.department || null;
        let ipAddress = null;

        if (req) {
            const user = req.user || {};
            userId = userId || user.id || user.userId || null;
            userName = userName || user.name || null;
            role = role || user.role || user.type || null;
            department = department || user.department || null;

            ipAddress = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
        }

        const action = entry.action || "UNKNOWN_ACTION";
        const moduleName = entry.module || "SYSTEM";
        const recordId = entry.recordId ? String(entry.recordId) : null;
        const metadata = entry.metadata ? JSON.stringify(entry.metadata) : null;

        await pool.query(
            `INSERT INTO audit_logs (user_id, user_name, role, department, action, module, record_id, ip_address, metadata)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, userName, role, department, action, moduleName, recordId, ipAddress, metadata]
        );
    } catch (err) {
        // Log locally but never crash primary operation
        console.error("⚠️ [AuditLogger Error]:", err.message);
    }
}

module.exports = {
    logAudit
};
